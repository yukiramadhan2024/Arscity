import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const outPath = process.argv[2] || 'docs/visual/screenshot.png';
const url = process.argv[3] || 'http://localhost:5173/?autoload=malioboro&time=16.25&azimuth=45&elevation=35&dist=85';

const dir = path.dirname(path.resolve(outPath));
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9333;
const args = [
  '--headless',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  `--remote-debugging-port=${port}`,
  '--window-size=1920,1080',
  '--disable-gpu-shader-disk-cache',
  'about:blank'
];

console.log('[CDP] Launching Chrome with remote debugging on port', port);
const chrome = spawn(chromePath, args);

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function run() {
  await sleep(1500);

  // 1. Create target tab via PUT
  const tab = await new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`,
      { method: 'PUT' },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(JSON.parse(data)));
      }
    );
    req.on('error', reject);
    req.end();
  });

  console.log('[CDP] Created tab:', tab.id, tab.url);
  const wsUrl = tab.webSocketDebuggerUrl;

  const { WebSocket } = await import('ws').catch(async () => {
    // In Node 22, globalThis.WebSocket is built-in!
    return { WebSocket: globalThis.WebSocket };
  });

  const ws = new WebSocket(wsUrl);

  let reqId = 1;
  const pending = new Map();

  const send = (method, params = {}) => {
    const id = reqId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const argsText = msg.params.args.map((a) => a.value || a.description).join(' ');
      console.log(`[Browser Console ${msg.params.type}]`, argsText);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[Browser Exception]', msg.params.exceptionDetails);
    }
  };

  await new Promise((res) => (ws.onopen = res));
  console.log('[CDP] WebSocket connected');

  await send('Page.enable');
  await send('Runtime.enable');

  // Wait 3.5 seconds for scene to populate & render
  console.log('[CDP] Waiting for 3D scene rendering...');
  await sleep(3500);

  console.log('[CDP] Capturing screenshot...');
  const res = await send('Page.captureScreenshot', { format: 'png' });

  if (res && res.data) {
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(outPath, buffer);
    console.log(`[CDP] Successfully saved ${buffer.length} bytes to ${outPath}`);
  } else {
    console.error('[CDP] Failed to capture screenshot:', res);
  }

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('[CDP] Error:', err);
  chrome.kill();
  process.exit(1);
});
