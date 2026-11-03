import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9460;
const baseUrl = 'http://localhost:5173/?autoload=malioboro&time=14.0';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('=== ARSCITY V4.0 EMPIRICAL PROFILER & CAPTURE SUITE (TAHAP 6) ===');

  if (!fs.existsSync('docs/v4')) {
    fs.mkdirSync('docs/v4', { recursive: true });
  }

  // 1. Launch Chrome Headless with Remote Debugging
  console.log(`[Launch] Starting Headless Chrome on port ${port}...`);
  const chromeArgs = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--window-size=1920,1080',
    '--enable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ];

  const chrome = spawn(chromePath, chromeArgs);
  await sleep(2000);

  // 2. Create tab
  console.log(`[Tab] Opening target URL: ${baseUrl}...`);
  const tab = await new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`,
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

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
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
  console.log('[CDP] Connected to Chrome DevTools.');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Wait for 3D scene initialization and asset population
  console.log('[Wait] Loading Malioboro 3D scene & assets (5.0s)...');
  await sleep(5000);

  const evalJs = async (expr) => {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      console.error('[Eval Exception]', res.exceptionDetails);
    }
    return res.result?.value;
  };

  // Inspect GPU WebGL unmasked renderer
  const gpuInfo = await evalJs(`(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl');
    const ext = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
    return {
      vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'Unknown Vendor',
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'Unknown Renderer',
    };
  })()`);
  console.log('[Hardware Detection] GPU Renderer:', gpuInfo.renderer, '| Vendor:', gpuInfo.vendor);

  // Helper function to measure 60s empirical telemetry
  const measureScenario = async (name, setupFnExpr, durationSec = 60) => {
    console.log(`\n--- Profiling Skenario [${name}] selama ${durationSec}s ---`);
    await evalJs(setupFnExpr);
    await sleep(1500); // Wait for camera/lighting to stabilize

    const telemetry = await evalJs(`(async () => {
      const engine = window.__ARSCITY_ENGINE__;
      const scene = engine.scene;
      const renderer = engine.renderer;

      // Count active point lights
      let pointLightCount = 0;
      scene.traverse((o) => {
        if (o.isPointLight) pointLightCount++;
      });

      // Sample frames over durationSec
      const frameTimes = [];
      let drawCallsAccum = 0;
      let trisAccum = 0;
      let sampleTicks = 0;

      let lastT = performance.now();
      const startTime = performance.now();

      await new Promise((resolve) => {
        const loop = (now) => {
          const dt = now - lastT;
          lastT = now;
          frameTimes.push(dt);

          drawCallsAccum += renderer.info.render.calls;
          trisAccum += renderer.info.render.triangles;
          sampleTicks++;

          if (now - startTime < ${durationSec} * 1000) {
            requestAnimationFrame(loop);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(loop);
      });

      frameTimes.sort((a, b) => a - b);
      const p50 = frameTimes[Math.floor(frameTimes.length * 0.50)];
      const p95 = frameTimes[Math.floor(frameTimes.length * 0.95)];
      const avgDt = frameTimes.reduce((acc, v) => acc + v, 0) / frameTimes.length;
      const avgFps = 1000 / avgDt;

      return {
        avgFps: parseFloat(avgFps.toFixed(1)),
        p50Ms: parseFloat(p50.toFixed(2)),
        p95Ms: parseFloat(p95.toFixed(2)),
        avgDrawCalls: Math.round(drawCallsAccum / Math.max(1, sampleTicks)),
        triangles: renderer.info.render.triangles,
        pointLights: pointLightCount,
        sampleFrames: frameTimes.length
      };
    })()`);

    console.log(`[Hasil ${name}]`, telemetry);
    return telemetry;
  };

  const results = {};

  // SKENARIO A: Malioboro siang, mode Orbit diam
  results.scenarioA = await measureScenario(
    'A. Malioboro Siang Orbit Diam',
    `(() => {
      const engine = window.__ARSCITY_ENGINE__;
      engine.setCameraMode('orbit');
      engine.setTimeOfDay(12.0, 172);
      engine.cameraController.setOrbitView(new THREE.Vector3(0, 0, 0), 90, 0.785, 0.95, true);
    })()`,
    60
  );

  // SKENARIO B: Malioboro malam, mode Orbit diam
  results.scenarioB = await measureScenario(
    'B. Malioboro Malam Orbit Diam',
    `(() => {
      const engine = window.__ARSCITY_ENGINE__;
      engine.setCameraMode('orbit');
      engine.setTimeOfDay(21.0, 172);
      engine.cameraController.setOrbitView(new THREE.Vector3(0, 0, 0), 90, 0.785, 0.95, true);
    })()`,
    60
  );

  // SKENARIO C: Malioboro siang, Pejalan Kaki jalan lurus di trotoar
  results.scenarioC = await measureScenario(
    'C. Malioboro Siang Pejalan Kaki Trotoar',
    `(() => {
      const engine = window.__ARSCITY_ENGINE__;
      engine.setTimeOfDay(12.0, 172);
      engine.setCameraMode('first_person');
      engine.firstPersonController.enter(new THREE.Vector3(5.5, 0, -40), 0);
      // Simulate steady walking
      engine.firstPersonController.keysDown.add('KeyW');
    })()`,
    60
  );

  // SKENARIO D: Malioboro malam, Pejalan Kaki jalan lurus di trotoar
  results.scenarioD = await measureScenario(
    'D. Malioboro Malam Pejalan Kaki Trotoar',
    `(() => {
      const engine = window.__ARSCITY_ENGINE__;
      engine.setTimeOfDay(21.0, 172);
      engine.setCameraMode('first_person');
      engine.firstPersonController.enter(new THREE.Vector3(5.5, 0, -40), 0);
      engine.firstPersonController.keysDown.add('KeyW');
    })()`,
    60
  );

  // SKENARIO E: Malioboro siang, Pejalan Kaki masuk ke dalam salah satu toko, diam di dalam
  results.scenarioE = await measureScenario(
    'E. Malioboro Siang Pejalan Kaki Indoor Toko',
    `(() => {
      const engine = window.__ARSCITY_ENGINE__;
      engine.setTimeOfDay(12.0, 172);
      engine.firstPersonController.keysDown.clear();
      engine.setCameraMode('first_person');
      // Place avatar inside ruko interior (x=10, z=15)
      engine.firstPersonController.enter(new THREE.Vector3(10.0, 0, 15.0), Math.PI);
    })()`,
    60
  );

  // SKENARIO F: Uji beban 300 bangunan dari preset uji, mode Orbit keliling
  results.scenarioF = await measureScenario(
    'F. Uji Beban 300 Bangunan Orbit Keliling',
    `(() => {
      const engine = window.__ARSCITY_ENGINE__;
      engine.setCameraMode('orbit');
      engine.setTimeOfDay(14.0, 172);
      // Populate 300 test buildings if not already 300
      if (engine.buildingManager.buildings.size < 300) {
        for (let i = engine.buildingManager.buildings.size; i < 300; i++) {
          const gx = (i % 20) * 16 - 160;
          const gz = Math.floor(i / 20) * 22 - 160;
          engine.buildingManager.addBuilding({
            id: 'load_bld_' + i,
            presetKey: 'house_36',
            name: 'Bangunan Uji ' + i,
            category: 'residential',
            position: new THREE.Vector3(gx, 0, gz),
            rotationY: 0,
            width: 8,
            length: 10,
            floorCount: (i % 3) + 1,
            floorHeight: 3.2,
            roofType: 'gable',
            roofOverhang: 0.5,
            wallMaterial: 'plaster',
            wallColor: '#ffffff',
            roofMaterial: 'clay_tile'
          });
        }
      }
      engine.cameraController.setOrbitView(new THREE.Vector3(0, 0, 0), 160, 0.5, 0.9, true);
    })()`,
    60
  );

  console.log('\n=== T6.3: SCREENSHOT CAPTURE IN 1920x1080 & 1366x768 ===');

  const captureToFile = async (filepath, width = 1920, height = 1080) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(800);
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    if (snap && snap.data) {
      fs.writeFileSync(filepath, Buffer.from(snap.data, 'base64'));
      console.log(`[Captured] ${filepath} (${width}x${height}, ${(snap.data.length / 1024).toFixed(1)} KB)`);
    }
  };

  // 1. Malioboro malam dari udara (menunjukkan bintang rapi, lampu jalan emissive hangat, tanpa PointLight)
  await evalJs(`(() => {
    const engine = window.__ARSCITY_ENGINE__;
    engine.loadMap('malioboro');
    engine.setTimeOfDay(21.0, 172);
    engine.setCameraMode('orbit');
    engine.cameraController.setOrbitView(new THREE.Vector3(0, 0, 0), 110, 0.785, 0.9, true);
  })()`);
  await sleep(2500);
  await captureToFile('docs/v4/01_malioboro_malam_udara.png', 1920, 1080);

  // 2. Mode Pejalan Kaki di trotoar malam (menunjukkan jalan setapak, ruko berkanopi rapi, adaptasi mata)
  await evalJs(`(() => {
    const engine = window.__ARSCITY_ENGINE__;
    engine.setTimeOfDay(20.5, 172);
    engine.setCameraMode('first_person');
    engine.firstPersonController.enter(new THREE.Vector3(5.5, 0, -20), 0);
  })()`);
  await sleep(2000);
  await captureToFile('docs/v4/02_pejalan_kaki_trotoar_malam.png', 1920, 1080);

  // 3. Mode Pejalan Kaki di dalam ruangan (menunjukkan perabot bersudut lengkung, laptop di meja, kursi rapi)
  await evalJs(`(() => {
    const engine = window.__ARSCITY_ENGINE__;
    engine.setTimeOfDay(14.0, 172);
    engine.setCameraMode('first_person');
    engine.firstPersonController.enter(new THREE.Vector3(10.0, 0, 15.0), Math.PI);
  })()`);
  await sleep(2000);
  await captureToFile('docs/v4/03_pejalan_kaki_dalam_ruang.png', 1920, 1080);

  // 4. Tampilan denah 2D dari udara (menunjukkan potongan dinding rapi, perabot terlihat)
  await evalJs(`(() => {
    const engine = window.__ARSCITY_ENGINE__;
    engine.setTimeOfDay(12.0, 172);
    engine.setCameraMode('2d');
    engine.set2DFloor(0); // Lt. 1
  })()`);
  await sleep(2000);
  await captureToFile('docs/v4/04_denah_2d_udara.png', 1920, 1080);

  // 5. Studio Pembuat Bangunan (menunjukkan label dimensi tajam, bola matahari di atas atap, atap terakota)
  await evalJs(`(() => {
    const engine = window.__ARSCITY_ENGINE__;
    engine.setCameraMode('orbit');
    const store = window.__ARSCITY_UI_STORE__;
    store.setState({ isCustomBuildingModalOpen: true });
  })()`);
  await sleep(2500);
  await captureToFile('docs/v4/05_studio_cad_dimensi_surya.png', 1920, 1080);

  // 6. Seluruh antarmuka tema kaca putih terang & Pengaturan terbuka
  await evalJs(`(() => {
    const store = window.__ARSCITY_UI_STORE__;
    store.setState({ isCustomBuildingModalOpen: false, showSettings: true });
  })()`);
  await sleep(2000);
  await captureToFile('docs/v4/06_tema_kaca_putih_settings.png', 1920, 1080);

  // 7. Responsif 1366x768 (TopHeader centered & compact)
  await evalJs(`(() => {
    const store = window.__ARSCITY_UI_STORE__;
    store.setState({ showSettings: false });
  })()`);
  await sleep(1000);
  await captureToFile('docs/v4/07_responsif_1366x768.png', 1366, 768);

  // Save telemetry JSON
  fs.writeFileSync('docs/v4/telemetry.json', JSON.stringify({ gpu: gpuInfo, results }, null, 2));
  console.log('\n[Done] All measurements and screenshots completed successfully!');

  chrome.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('[Error in main]', err);
  process.exit(1);
});

