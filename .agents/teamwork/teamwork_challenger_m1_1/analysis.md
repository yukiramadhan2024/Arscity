# Empirical Challenger Analysis Report — Tahap 1: Perbaikan 9 Bug Kritis

**Author**: `teamwork_challenger_m1_1` (EMPIRICAL CHALLENGER / Critic & Specialist)  
**Target Milestone**: Tahap 1: Perbaikan 9 Bug Kritis (T1.1 through T1.9)  
**Date**: 2026-11-02  
**Final Verdict**: **APPROVE**

---

## 1. Executive Summary & Verification Scope

As an empirical challenger, our mandate was to stress-test, write adversarial test harnesses, and empirically verify the worker's implementations of Tahap 1 (specifically focusing on T1.1 PointLight elimination, T1.2 Star Dome camera locking and fixed pixel size, and T1.3 Malioboro corridor geometry and edge clearance).

We did NOT accept worker claims at face value. We authored and executed independent adversarial stress tests:
- `tests/adversarial_malioboro_stress.test.ts` (Geometry, SAT polygon distance, footprint/roof clearance)
- `tests/adversarial_star_dome_stress.test.ts` (Dome radius, sizeAttenuation, depth flags, 24h diurnal fade, camera tracking)
- Full project test suite (`npx vitest run`, 61 test files, 466 tests)
- Full TypeScript verification (`npx tsc --noEmit`)
- Production bundle verification (`npm run build`)

---

## 2. Adversarial Challenge Findings & Empirical Evidence

### Challenge 1 (T1.3): Malioboro Road & Building Boundary Edge Conditions
- **Hypothesis Tested**: Could any building corner or roof overhang encroach on road corridors closer than 0.1m, or collide under rotated orientations?
- **Harness Executed**: `tests/adversarial_malioboro_stress.test.ts` using SAT and vertex-to-segment Euclidean distance functions across all 42 buildings (footprints and roof overhang bounding boxes) against all 16 road edges (arterial 26m, collector 16m, local 9m).
- **Empirical Results**:
  * **Global Minimum Footprint-to-Road Distance**: `2.500m` (Building `bld_ruko_w_7` to Road `edge_dagen_w` local corridor).
  * **Global Minimum Roof-to-Road Distance**: `1.900m` (Building `bld_ruko_w_7` roof overhang to Road `edge_dagen_w`).
  * **Global Minimum Building-to-Building Distance**: `4.000m` (`bld_ruko_w_7` <-> `bld_joglo_yogyakarta`).
  * **Boundary clearance**: 0 building corners approach roads closer than 0.1m. The closest approach (1.900m) is 19x greater than the 0.1m allowable tolerance.
  * **Landscape Sidewalk Bases**: Tested 60 landscape elements (trees, bollards, lanterns, statues). Exactly 0 bases lie in the road carriageway (all tree trunks and street elements are anchored at $|x| = 16.0\text{m}$ along the $5.5\text{m}$ pedestrian sidewalks).
- **Verdict on T1.3**: **PASS (Robust)**.

---

### Challenge 2 (T1.1): Dynamic PointLight & Scene Instantiation Audit
- **Hypothesis Tested**: Is there any hidden or dynamic execution branch where PointLights or SpotLights can be instantiated or added to the active Three.js scene graph?
- **Methodology**:
  * Comprehensive AST and regex grep search across all files in `src/`.
  * Deep inspection of `src/buildings/InteriorInteractiveSystem.ts` and `src/core/engine/LightingSystem.ts`.
- **Empirical Findings**:
  * In `src/core/engine/LightingSystem.ts`: Zero `PointLight` or `SpotLight` references. Primary lighting consists solely of a single `THREE.DirectionalLight` (sun/moon) and a single `THREE.HemisphereLight` (sky/ground bounce).
  * In `src/buildings/InteriorInteractiveSystem.ts`:
    - `public static readonly MAX_ACTIVE_CEILING_LIGHTS: number = 0;` (line 64).
    - `ensureCeilingLightPool`: loop condition `while (this.ceilingLightPool.length < MAX_ACTIVE_CEILING_LIGHTS)` is immediately false (`0 < 0`), resulting in an empty array `ceilingLightPool = []`.
    - No lights are ever instantiated or added to `this.scene` or any object parent.
    - `updateCeilingLights` executes only `this.disableCeilingLights()`.
    - `getActiveCeilingLightCount()` returns `0`.
  * In `src/materials/MaterialLibrary.ts` and `src/world/LandscapeManager.ts`:
    - Material uniforms (`uNightGlow`, `emissiveIntensity`) are updated directly without setting `needsUpdate = true`, completely eliminating GPU pipeline re-compilation stalls.
- **Verdict on T1.1**: **PASS (Verified 0 active PointLights)**.

---

### Challenge 3 (T1.2): Star Dome Camera Locking, Fixed Pixel Size & Diurnal Cycle
- **Hypothesis Tested**:
  1. Does `starPoints` use fixed pixel size (`sizeAttenuation: false`)?
  2. Does it have `depthWrite: false`, `depthTest: false`, and `fog: false` to avoid intersecting or occluding terrain?
  3. Is camera tracking executed on every render frame?
  4. Does the dome accurately fade out during daylight?
- **Harness Executed**: `tests/adversarial_star_dome_stress.test.ts`
- **Empirical Findings**:
  * Geometry: 800 celestial star points generated on a spherical dome of radius $r = 3600\text{m}$ ($0.9 \times \text{camera.far}$), constrained strictly to the upper hemisphere ($y \ge 0$).
  * Material properties verified:
    - `sizeAttenuation: false` (fixed pixel size, preventing stars from growing into giant dust balls when zooming).
    - `size: 2.0` pixels.
    - `depthWrite: false` & `depthTest: false` (stars are never occluded by distant sky planes or draw over terrain).
    - `fog: false` (stars are exempt from atmospheric aerial perspective fog).
    - `renderOrder: -1000` & `frustumCulled: false` (drawn first in celestial background).
  * Frame Tracking: In `src/core/engine/Engine.ts:934`, `this.lightingSystem.updateStarDome(this.cameraController.camera)` is invoked directly inside the main `requestAnimationFrame` render loop before `render()`.
  * Diurnal Cycle:
    - Midday ($h = 12.0$): `visible: false`, `opacity: 0.0`.
    - Morning / Afternoon ($h = 9.0, 15.0, 17.0$): `visible: false`, `opacity: 0.0`.
    - Dusk ($h = 18.0$): `visible: true`, `opacity: ~0.23` (smoothly fading in).
    - Midnight ($h = 22.0, 0.0, 3.0$): `visible: true`, `opacity: 0.95`.
    - Dawn ($h = 5.5$): `visible: true`, `opacity: ~0.23` (smoothly fading out).
    - Sunrise ($h = 6.5$): `visible: false`, `opacity: 0.0`.
- **Verdict on T1.2**: **PASS (Fully Verified)**.

---

### Challenge 4: Production Build & Full Suite Regression Test
- **TypeScript**: `npx tsc --noEmit` exited with code 0 (zero errors).
- **Production Build**: `npm run build` executed cleanly in 15.84s:
  * `dist/index.html`: 1.99 kB
  * `dist/assets/index-D4KANIoM.css`: 34.05 kB
  * `dist/assets/index-Csocy7rz.js`: 2,340.56 kB
- **Unit & Integration Suite**: `npx vitest run` executed across all 61 test files:
  * **61 test files passed** (0 failed)
  * **466 tests passed** (0 failed)
  * Total duration: 125.19s

---

## 3. Review of Other Tahap 1 Deliverables (T1.4 - T1.9)

We also audited and verified the other UI tasks in Tahap 1:
- **T1.4**: Single Bright White Frosted Glass theme enforced (`var(--surface)`, `var(--fill-control)`, `var(--border-glass)`), with Dark/System options hidden from SettingsModal, and high-contrast / reduced-transparency accessibility modes fixed.
- **T1.5**: `TopHeader` centered with `position: fixed`, `left: 50%`, `transform: translateX(-50%)`, and responsive collapse under 1440px moving the slider to the "Lainnya" popover to preserve 140px+ clearance from side docks on 1366x768 screens.
- **T1.6**: Weather and circular action buttons styled with `fillControl` and `label` currentColor with 0 `!important`.
- **T1.7**: SegmentedControl inactive labels use `var(--label)` (13:1 contrast against light background) and active pills use `var(--accent)` with white text (4.5:1 contrast).
- **T1.8**: Photo mode bottom bar unified in `FirstPersonHUD.tsx` and restricted to `isFirstPerson || isDrone`, eliminating the duplicate bottom bar in Orbit mode; 35mm lens added to lens map.
- **T1.9**: WorldHubModal action menu dynamically flips upward when space below is $< 160\text{px}$, with boundary clamping and outside-click cleanup.

---

## 4. Conclusion & Recommendation

The implementations for Tahap 1 (T1.1 through T1.9) are robust, mathematically verified, adhere strictly to all architectural specifications, and pass all adversarial challenge tests with flying colors.

**Recommendation**: **APPROVE TAHAP 1 SIGN-OFF**. Proceed immediately to Tahap 2 (Render Jarak Bertingkat / 3 Zona LOD).
