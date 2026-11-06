import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const outPath = process.argv[2] || 'docs/visual/screenshot.png';
const url = process.argv[3] || 'http://localhost:5173/?autoload=malioboro&time=16.25&azimuth=45&elevation=35&dist=85';

const dir = path.dirname(path.resolve(outPath));
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const tmpUserData = path.join(os.tmpdir(), 'chrome_headless_' + Date.now());

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  '--headless',
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  `--user-data-dir=${tmpUserData}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-sync',
  `--screenshot=${path.resolve(outPath)}`,
  '--window-size=1920,1080',
  url
];

console.log(`[Capture] Launching Chrome to capture "${url}" -> "${outPath}"...`);
const p = spawn(chromePath, args);

p.stdout.on('data', (d) => process.stdout.write(d));
p.stderr.on('data', (d) => process.stderr.write(d));

p.on('close', (code) => {
  console.log(`[Capture] Chrome finished with exit code ${code}`);
  if (fs.existsSync(outPath)) {
    const stat = fs.statSync(outPath);
    console.log(`[Capture] Successfully wrote ${stat.size} bytes to ${outPath}`);
  } else {
    console.warn(`[Capture] Warning: ${outPath} was not created.`);
  }
  try {
    fs.rmSync(tmpUserData, { recursive: true, force: true });
  } catch {}
});
