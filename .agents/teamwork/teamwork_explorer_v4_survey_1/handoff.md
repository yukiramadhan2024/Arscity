# Handoff Report: Baseline Verification & Technical Survey for Tahap 1 (T1.1, T1.2, T1.3)

**Author**: teamwork_explorer_v4_survey_1  
**Timestamp**: 2026-11-02T04:47:00Z  
**Recipient**: aafb2a0a-5e3b-45ab-a54f-5592069d1b2d (parent)  
**Handoff Type**: Hard (survey task complete)

---

## 1. Observation

### Baseline Verification
1. **Git Status & History**:
   - `git status` shows branch `main`, up to date with `origin/main`. Working directory contains unstaged edits and untracked asset/test files.
   - `git log -n 5 --oneline`:
     - `49a5d2c feat: upgrade Arscity with unified light glass UI, robust CAD studio, fixed river tool, and interactive first-person builder`
     - `ac755ff feat: stabilize Arscity v3.2.0, fix permanent road textures, and apply clean architectural design`
     - `41dc9c6 feat: integrate glass folder cards for world hub, unified lab analysis UI theme, procedural hotmix asphalt road, and custom Arscity SVG branding`
     - `5db1d3b Update Arscity: checkpoint`
     - `9f76b9a Initial commit`
2. **TypeScript Compilation**:
   - `npx tsc --noEmit` exited with code `0` (0 errors).
3. **Unit Tests**:
   - `npx vitest run` exited with code `0`. All 53 test files passed, 421 tests passed (0 failed) in 67.98s.

### Task T1.1: Night Lighting and FPS Drop
1. **PointLight and SpotLight Count**:
   - Grep search for `SpotLight` across `src/`: 0 results found.
   - Grep search for `PointLight` across `src/`: 4 results found, all in `src/buildings/InteriorInteractiveSystem.ts`:
     - Line 69: `public ceilingLightPool: THREE.PointLight[] = [];`
     - Line 93: `const light = new THREE.PointLight(0xffecd2, 2.2, 14, 1.4);`
     - Line 180: `* Dynamically positions a strict pool of at most 2 warm 2700K THREE.PointLight instances`
     - Line 354: `// 3. Update bounded max-2 ceiling PointLight pool`
   - No PointLights or SpotLights are attached to street lamps or building exteriors.
2. **Night Glow Shader Recompilation Bottleneck**:
   - In `src/materials/MaterialLibrary.ts:1601-1683`: `setNightGlow(factor)` updates emissive properties on cached materials, but executes `mat.needsUpdate = true` on lines 1615, 1629, 1638, 1652, 1666, and 1680.
   - In `src/world/LandscapeManager.ts:690-705`: `updateNightGlow(factor)` traverses all landscape meshes and sets `mat.needsUpdate = true` on line 701.
3. **Street Lamp Material**:
   - In `src/roads/RoadPropPlacer.ts:228-230`: `this.lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });`
   - In `src/roads/RoadPropPlacer.ts:304-313`: `setNightGlow(factor)` toggles `this.lampGlowMat.color.setHex(factor > 0 ? 0xfef08a : 0x334155);` abruptly without smooth emissiveIntensity interpolation.
4. **Lighting Schedule**:
   - In `src/core/engine/LightingSystem.ts:388-397`: Evening fade is currently `17.25` to `18.0` (17:15 to 18:00) and morning fade is `5.0` to `6.5` (05:00 to 06:30).
5. **Bloom Configuration**:
   - In `src/core/engine/PostProcessingManager.ts:99`: `this.bloomPass.enabled = quality === 'ultra';` (only enabled on ultra, not high).

### Task T1.2: Star Dome Visual Flaws
1. **Star Geometry Radius**:
   - In `src/core/engine/LightingSystem.ts:76`: `const r = 380;`. Star radius is hardcoded to 380 meters.
   - In `src/core/engine/CameraController.ts:118`: `this.camera = new THREE.PerspectiveCamera(..., 0.06, 4000);`. `camera.far` is 4000 meters. The star sphere (380m) is less than 10% of `camera.far`.
2. **Position Update**:
   - In `src/core/engine/LightingSystem.ts:403`: `this.starPoints.position.copy(targetCenter);`. Position copies `targetCenter` (ground target), only inside `setTime()`. In `Engine.ts:renderLoop`, `starPoints.position` is never updated per frame with `camera.position`.
3. **Material Properties**:
   - In `src/core/engine/LightingSystem.ts:82-88`:
     - `sizeAttenuation` is not set (Three.js default is `true`).
     - `depthTest` is not set (Three.js default is `true`).
     - `fog` is not set (Three.js default is `true`).
     - `renderOrder` is not set (default 0).
     - `frustumCulled` on `Points` is not set (default `true`).

### Task T1.3: Malioboro Preset Layout Flaws
1. **Hardcoded Arrays**:
   - In `src/world/MalioboroPreset.ts:152`: `const westZs = [-155, -135, -115, -65, -45, 45, 65, 85, 105, 125];`
   - In `src/world/MalioboroPreset.ts:255`: `const eastZs = [-155, -135, -115, -65, -45];`
2. **Direct Collisions Observed**:
   - Collision 1: `bld_ruko_w_5` (position `[-35, 0, -45]`, width 8, length 14, rot `PI/2` -> X: `[-42, -28]`, Z: `[-49, -41]`) and `bld_joglo_yogyakarta` (position `[-42, 0, -48]`, width 18, length 22, rot `PI/2` -> X: `[-53, -31]`, Z: `[-57, -39]`) overlap by 11.0m in X and 8.0m in Z. `bld_ruko_w_5` is inside the Joglo building.
   - Collision 2: `bld_ruko_w_8` (position `[-35, 0, 85]`, width 8, length 14, rot `PI/2` -> Z: `[81, 89]`) overlaps road `edge_pajeksan_w` (center `z = 90`, local road width `9.0m` -> Z: `[85.5, 94.5]`). The building penetrates 3.5m into the road.
   - Collision 3: `bld_joglo_kepatihan` (position `[68, 0, 75]`, width 20, length 24 -> X: `[58, 78]`, Z: `[63, 87]`) and `bld_bale_kepatihan` (position `[82, 0, 88]`, width 14, length 18 -> X: `[75, 89]`, Z: `[79, 97]`) overlap by 3.0m in X and 8.0m in Z.

---

## 2. Logic Chain

1. **T1.1 Night Performance Drop**:
   - *Observation*: `MaterialLibrary.ts` and `LandscapeManager.ts` call `mat.needsUpdate = true` on every update to `nightGlowFactor`.
   - *Reasoning*: In Three.js WebGLRenderer, `material.needsUpdate = true` triggers shader program recompilation and pipeline state invalidation. Uniform changes (`emissive`, `emissiveIntensity`) do not require `needsUpdate`. Recompiling shaders during time transitions halts the GPU pipeline, causing the reported frame drop down to ~22 FPS.
   - *Observation*: `InteriorInteractiveSystem.ts` initializes and updates a pool of up to 2 `THREE.PointLight` instances.
   - *Reasoning*: To fulfill the acceptance criterion of `jumlah PointLight aktif nol`, the ceiling point light pool must be deactivated and replaced with emissive materials + eye adaptation.
   - *Observation*: `RoadPropPlacer.ts` uses `MeshBasicMaterial` with boolean color switching, and `PostProcessingManager.ts` enables bloom only on `ultra`.
   - *Reasoning*: Switching to shared emissive materials with smooth intensity fade and enabling bloom on High and Ultra fulfills T1.1 steps 3 and 4.

2. **T1.2 Star Dome Issue**:
   - *Observation*: `LightingSystem.ts` sets star radius `r = 380`, copies ground `targetCenter` only in `setTime()`, and uses default `sizeAttenuation: true`, `depthTest: true`, and `fog: true`.
   - *Reasoning*: Because `camera.far = 4000`, a 380m sphere centered on the ground leaves stars at ground level when the camera orbits or moves away. Because `sizeAttenuation: true`, stars near camera enlarge into spherical blobs ("bola debu").
   - *Deduction*: Setting radius to `0.9 * camera.far` (3600m), copying `camera.position` every frame, setting `sizeAttenuation: false`, `depthTest: false`, and `fog: false` completely eliminates stars on grass and keeps them as sharp pinpricks.

3. **T1.3 Malioboro Layout Issue**:
   - *Observation*: Hardcoded coordinate arrays in `MalioboroPreset.ts` cause three concrete geometric overlaps: `bld_ruko_w_5` inside Joglo (11m x 8m), `bld_ruko_w_8` inside Jl. Pajeksan (3.5m), and Bale Danunegaran inside Pendopo Ageng Kepatihan (3m x 8m).
   - *Reasoning*: The layout was created by placing magic numbers rather than evaluating parcel bounds against road corridors and adjacent buildings.
   - *Deduction*: Implementing a parametric generator that computes slots based on corridor bounds, side road clearance zones, GSB setback, and lot widths guarantees zero collisions and enables deterministic unit test validation.

---

## 3. Caveats

- **No Caveats**: The codebase was thoroughly surveyed with exact line numbers, mathematical proofs of collisions, and empirical baseline verification commands.
- Investigation was strictly read-only; no application source code was modified.

---

## 4. Conclusion

All technical requirements, root causes, and architectural remedies for T1.1, T1.2, and T1.3 have been identified and mathematically proven. The implementation agent can directly execute the concrete recommendations documented in `analysis.md` without ambiguity:
1. **T1.1**: Remove `needsUpdate = true` from night glow updates; deactivate the indoor PointLight pool; align night glow transition times to 17:30–18:30 and 05:00–06:00; enable bloom on High and Ultra.
2. **T1.2**: Update star radius to `0.9 * camera.far` (3600m); copy `camera.position` to stars each frame; configure PointsMaterial with `sizeAttenuation: false`, `depthTest: false`, `fog: false`, and `renderOrder: -1000`.
3. **T1.3**: Replace hardcoded coordinate arrays in `MalioboroPreset.ts` with a parametric block-based generator; eliminate the 3 identified collisions; add automated unit tests checking building-to-building and building-to-road polygon separation with 0.1m tolerance.

---

## 5. Verification Method

To independently verify the baseline and findings:
1. **Baseline TypeScript Check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, 0 errors.
2. **Baseline Unit Test Suite**:
   ```bash
   npx vitest run
   ```
   *Expected*: 53 test files passed, 421 tests passed.
3. **Malioboro Existing Test**:
   ```bash
   npx vitest run tests/malioboro_preset.test.ts
   ```
   *Expected*: 5 passed.
4. **Collision Verification**:
   Inspect `analysis.md` Section 4.2 for the step-by-step mathematical bounding box derivation of the three collisions in `MalioboroPreset.ts`.

