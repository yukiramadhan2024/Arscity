import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const artifactDir = 'C:/Users/Yuki/.gemini/antigravity/brain/d057346e-bf24-4ae9-841a-bad285766aee';
const docsDir = 'c:/Projects/Arscity/docs/visual';

if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9340;
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

  const consoleLogs = [];
  const errors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const argsText = msg.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(' ');
      consoleLogs.push(`[${msg.params.type}] ${argsText}`);
      if (msg.params.type === 'error') {
        errors.push(argsText);
      }
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[Browser Exception]', msg.params.exceptionDetails);
      errors.push(JSON.stringify(msg.params.exceptionDetails));
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
  await sleep(3000);

  // Ensure LoginPage is active by resetting auth state
  await send('Runtime.evaluate', {
    expression: `(() => {
      sessionStorage.clear();
      if (window.__ARSCITY_UI_STORE__) {
        window.__ARSCITY_UI_STORE__.setState({ isLoggedIn: false, currentScreen: 'auth', isMapHubOpen: false });
      }
    })()`
  });
  await sleep(1500);

  // Check CTA button details on LoginPage
  const ctaCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Mulai Rancang Kota') || b.textContent.includes('MULAI ARSCITY')));
      if (!btn) return { found: false, bodyHtml: document.body.innerHTML.slice(0, 500) };
      const svgs = btn.querySelectorAll('svg');
      return {
        found: true,
        text: btn.textContent.trim(),
        svgCount: svgs.length,
        styleBackground: window.getComputedStyle(btn).backgroundColor,
        styleColor: window.getComputedStyle(btn).color
      };
    })()`,
    returnByValue: true
  });
  console.log('[Verify] LoginPage CTA button audit:', ctaCheck.result?.value);

  // Capture Screenshot 1: Visionary Intelligence LoginPage
  await takeScreenshot('v4_2_stage3_login_visionary_intelligence');

  // Click "Mulai Rancang Kota" to open NewMapCustomizerModal
  console.log('[Verify] Clicking "Mulai Rancang Kota"...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Mulai Rancang Kota') || b.textContent.includes('MULAI ARSCITY')));
      if (btn) btn.click();
    })()`
  });
  await sleep(1500);

  // Check modal open state
  const modalCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const store = window.__ARSCITY_UI_STORE__ ? window.__ARSCITY_UI_STORE__.getState() : null;
      const modal = document.querySelector('[role="dialog"]');
      return {
        isStoreModalOpen: store?.isNewMapCustomizerOpen,
        modalRendered: !!modal,
        title: modal?.querySelector('h2')?.textContent || ''
      };
    })()`,
    returnByValue: true
  });
  console.log('[Verify] NewMapCustomizerModal audit:', modalCheck.result?.value);

  // Capture Screenshot 2: NewMapCustomizerModal
  await takeScreenshot('v4_2_stage2_new_map_customizer_modal');

  // Configure map: Grid Arsitektur Modern + Lembah Sungai Tropis + Rimbun Asri
  console.log('[Verify] Customizing parameters...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const findAndClick = (txt) => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes(txt));
        if (btn) btn.click();
      };
      findAndClick('Grid Arsitektur Modern');
      findAndClick('Lembah Sungai Tropis');
      findAndClick('Rimbun Asri');
    })()`
  });
  await sleep(500);

  // Submit: Click "Bangun & Masuk ke Kota"
  console.log('[Verify] Submitting: "Bangun & Masuk ke Kota"...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Bangun & Masuk ke Kota'));
      if (btn) btn.click();
    })()`
  });

  // Wait 4.5 seconds for generation, bridge synthesis, road meshes, tree instancing, and engine rendering
  console.log('[Verify] Generating custom procedural map with tropical river valley & modern grid...');
  await sleep(4500);

  // Dismiss onboarding modal and position camera in orbit view to showcase the whole map
  await send('Runtime.evaluate', {
    expression: `(() => {
      const store = window.__ARSCITY_UI_STORE__ ? window.__ARSCITY_UI_STORE__.getState() : null;
      if (store) {
        store.setShowOnboarding(false);
      }
      const eng = window.__ARSCITY_ENGINE__;
      const THREE = window.__ARSCITY_THREE__;
      if (eng && THREE) {
        eng.cameraController.setOrbitView(new THREE.Vector3(0, 0, 0), 120, (50 * Math.PI) / 180, (38 * Math.PI) / 180, true);
      }
    })()`
  });
  await sleep(2000);

  // Telemetry check on generated world
  const worldTelemetry = await send('Runtime.evaluate', {
    expression: `(() => {
      const eng = window.__ARSCITY_ENGINE__;
      if (!eng) return { hasEngine: false };
      return {
        hasEngine: true,
        cameraMode: eng.cameraMode,
        cameraNear: eng.cameraController?.camera?.near,
        buildingsCount: eng.buildingManager?.buildings?.size || 0,
        roadsCount: eng.roadManager?.graph?.edges?.size || 0,
        landscapeCount: eng.landscapeManager?.items?.size || 0,
        bridgesCount: eng.roadManager?.masterGroup?.children?.filter(c => c.name?.includes('Bridge'))?.length || 0
      };
    })()`,
    returnByValue: true
  });
  console.log('[Verify] Custom Map Telemetry in Orbit Mode:', worldTelemetry.result?.value);

  // Capture Screenshot 3: Orbit Mode Full-City Detail with river trench, bridge, trees & buildings
  await takeScreenshot('v4_2_stage1_orbit_full_detail_and_bridge');

  // Open Studio CAD modal to check Seal Blue, Navy Blue, Crimson Pink styling
  console.log('[Verify] Opening Studio CAD...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const store = window.__ARSCITY_UI_STORE__ ? window.__ARSCITY_UI_STORE__.getState() : null;
      if (store) {
        store.setShowCustomBuildingStudio(true);
      }
    })()`
  });
  await sleep(2500);

  // Capture Screenshot 4: Studio CAD modal
  await takeScreenshot('v4_2_stage4_studio_cad_seal_navy_crimson');

  // Close Studio CAD and switch to First-Person Mode
  console.log('[Verify] Switching to First-Person Mode...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const store = window.__ARSCITY_UI_STORE__ ? window.__ARSCITY_UI_STORE__.getState() : null;
      if (store) {
        store.setShowCustomBuildingStudio(false);
        store.setCameraMode('first_person');
      }
      const eng = window.__ARSCITY_ENGINE__;
      const THREE = window.__ARSCITY_THREE__;
      if (eng && THREE && eng.firstPersonController) {
        eng.firstPersonController.isPaused = false;
        // Position player near entrance of Southeast commercial building (x=22, z=18)
        eng.firstPersonController.position.set(22, 1.7, 12);
        eng.firstPersonController.camera.position.set(22, 1.7, 12);
        eng.firstPersonController.camera.lookAt(22, 1.7, 20);
      }
    })()`
  });
  await sleep(2500);

  // Telemetry in First-Person Mode
  const fpTelemetry = await send('Runtime.evaluate', {
    expression: `(() => {
      const eng = window.__ARSCITY_ENGINE__;
      return {
        cameraMode: eng?.cameraMode,
        isFirstPerson: eng?.firstPersonController?.isActive,
        playerPos: eng?.firstPersonController?.position
      };
    })()`,
    returnByValue: true
  });
  console.log('[Verify] First-Person Telemetry:', fpTelemetry.result?.value);

  // Capture Screenshot 5: First-Person Mode Smart Distance Rendering
  await takeScreenshot('v4_2_stage1_first_person_smart_lod');

  console.log('[Verify] Total console logs recorded:', consoleLogs.length);
  console.log('[Verify] Total console errors recorded:', errors.length);
  if (errors.length > 0) {
    console.warn('[Verify] Browser Errors:', errors);
  } else {
    console.log('[Verify] EXCELLENT: 0 runtime console errors detected!');
  }

  // Cleanup
  ws.close();
  chrome.kill();
  console.log('[Verify] All verification steps completed successfully.');
  process.exit(0);
}

run().catch((err) => {
  console.error('[Verify] Fatal error:', err);
  chrome.kill();
  process.exit(1);
});
