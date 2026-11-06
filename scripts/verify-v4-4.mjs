import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const artifactDir = 'C:/Users/Yuki/.gemini/antigravity/brain/d057346e-bf24-4ae9-841a-bad285766aee';
const docsDir = 'c:/Projects/Arscity/docs/visual';

if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9345;
const args = [
  '--headless',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  `--remote-debugging-port=${port}`,
  '--window-size=1600,1000',
  '--disable-gpu-shader-disk-cache',
  'about:blank'
];

console.log('[Verify] Launching Chrome on port', port);
const chrome = spawn(chromePath, args);

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function run() {
  await sleep(1500);

  const initialUrl = 'http://127.0.0.1:5173/';
  const tab = await new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${port}/json/new?${encodeURIComponent(initialUrl)}`,
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

  console.log('[Verify] Tab opened:', tab.id, tab.url);
  const wsUrl = tab.webSocketDebuggerUrl;

  const { WebSocket } = await import('ws').catch(async () => {
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
  };

  await new Promise((res) => (ws.onopen = res));
  console.log('[Verify] WebSocket connected');

  await send('Page.enable');
  await send('Runtime.enable');

  async function takeScreenshot(name) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    if (res && res.data) {
      const buf = Buffer.from(res.data, 'base64');
      const p1 = path.join(artifactDir, `${name}.png`);
      const p2 = path.join(docsDir, `${name}.png`);
      fs.writeFileSync(p1, buf);
      fs.writeFileSync(p2, buf);
      console.log(`[Verify] Saved screenshot "${name}.png" (${buf.length} bytes) to:\n  - ${p1}\n  - ${p2}`);
      return p1;
    }
    return null;
  }

  // Wait for initial load
  console.log('[Verify] Waiting for app initialization...');
  await sleep(3500);

  // 1. Enter directly into game session with default map and dismiss onboarding
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (window.__ARSCITY_UI_STORE__) {
        window.__ARSCITY_UI_STORE__.setState({
          isLoggedIn: true,
          currentScreen: 'game',
          isMapHubOpen: false,
          showOnboarding: false,
          activeTool: 'build'
        });
      }
    })()`
  });
  await sleep(2000);

  // Capture Screenshot 1: Building Catalog in tab "Bangun" with distinct 2.5D architectural isometric previews!
  console.log('[Verify] Capturing building catalog preview cards...');
  await takeScreenshot('v4_4_building_previews_catalog');

  // 2. Open Settings Modal to verify high contrast text (#072D59) and no heartbeat on buttons
  console.log('[Verify] Opening Settings Modal...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (window.__ARSCITY_UI_STORE__) {
        window.__ARSCITY_UI_STORE__.setState({ showSettings: true });
      }
    })()`
  });
  await sleep(1000);
  await takeScreenshot('v4_4_settings_modal_high_contrast');

  // Close Settings Modal and open Help Modal to verify hotkeys 1-8
  console.log('[Verify] Opening Help Modal...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (window.__ARSCITY_UI_STORE__) {
        window.__ARSCITY_UI_STORE__.setState({ showSettings: false, showHelp: true });
      }
    })()`
  });
  await sleep(1000);
  await takeScreenshot('v4_4_help_modal_shortcuts');

  // Close Help Modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (window.__ARSCITY_UI_STORE__) {
        window.__ARSCITY_UI_STORE__.setState({ showHelp: false });
      }
    })()`
  });
  await sleep(500);

  // 3. Switch to 2D Mode and verify HUD (toolbars, mode toggle, panels) remain visible!
  console.log('[Verify] Switching to 2D Denah Mode...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (window.__ARSCITY_ENGINE__) {
        window.__ARSCITY_ENGINE__.setCameraMode('2d');
      }
    })()`
  });
  await sleep(1500);
  await takeScreenshot('v4_4_2d_mode_hud_visible');

  // 4. Switch back to 3D Orbit Mode and build an authentic 3-way T-junction and 4-way crossroad
  console.log('[Verify] Switching back to 3D Orbit Mode and creating roads...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const eng = window.__ARSCITY_ENGINE__;
      if (!eng) return;
      eng.setCameraMode('orbit');
      eng.roadManager.clearAll();

      // East-West Arterial Road
      eng.roadManager.addRoad(
        new THREE.Vector3(-45, 0, 0),
        new THREE.Vector3(45, 0, 0),
        'arterial'
      );

      // North-South Crossing Road (4-Way Intersection at (0, 0, 0))
      eng.roadManager.addRoad(
        new THREE.Vector3(0, 0, -35),
        new THREE.Vector3(0, 0, 35),
        'collector'
      );

      // Branching T-Junction Stem Road at (25, 0, 0)
      eng.roadManager.addRoad(
        new THREE.Vector3(25, 0, 0),
        new THREE.Vector3(25, 0, 30),
        'local'
      );

      // Position camera for a cinematic perspective of both intersections
      eng.cameraController.setTarget(10, 0, 5);
      eng.cameraController.orbit(0.4, 0.65);
      eng.cameraController.zoom(-15);
    })()`
  });
  await sleep(2500);
  await takeScreenshot('v4_4_road_intersections_3way_4way');

  console.log('[Verify] All 5 V4.4 visual verifications successfully captured!');
  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('[Verify Failed]', err);
  chrome.kill();
  process.exit(1);
});

