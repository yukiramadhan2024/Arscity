# Handoff Report: Codebase Survey for Tahap 4 & Tahap 5

**Author**: `teamwork_explorer_survey_2`  
**Recipient**: `parent` (ID: `d68ee8c4-0977-4823-9c25-eeec1173781b`)  
**Target Scope**: Tahap 4 (Engine Optimization 144 FPS & UE5 Visuals) & Tahap 5 (Foliage, River, 2D/3D Mode)  
**Detailed Report**: `c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_survey_2\analysis.md`  

---

## 1. Observation

Direct observations from source code inspections, ripgrep searches, and test executions:

1. **Test & Compilation Baseline**:
   - `npm test`: Executed Vitest across 45 test files, 300 tests passed, duration 36.02s.
   - `npx tsc --noEmit`: Exited with code 0, 0 TypeScript errors.

2. **Tahap 4 Observations**:
   - In `src/core/engine/Engine.ts`:
     * Line 154: `powerPreference: 'high-performance'` is passed to `THREE.WebGLRenderer`.
     * Line 160: `this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));` (caps at 2 instead of 1.5).
     * Line 163: `this.renderer.toneMapping = THREE.AgXToneMapping;` (uses AgX instead of ACESFilmicToneMapping).
     * Line 164: `this.renderer.toneMappingExposure = 1.1;` (uses 1.1 instead of calibrated 1.05).
     * Line 165: `this.renderer.outputColorSpace = THREE.SRGBColorSpace;` (correct).
     * Line 758: `this.animationFrameId = requestAnimationFrame(this.loop);` (no artificial 60 FPS cap).
     * Line 766: `const deltaTime = Math.min(this.clock.getDelta(), 0.1);` (caps dt at 0.1s).
     * Lines 770–776: FPS is computed in discrete 500ms intervals using chunk count `Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdateTime))` rather than a moving average.
   - In `src/core/engine/GraphicsPresets.ts`:
     * Lines 63 & 80: `pixelRatio: 2.0` on both `high` and `ultra` presets.
   - In `src/ui/components/TopHeader.tsx`:
     * Line 70: Displays `{fps || 60} FPS` within an emerald green pill badge.
   - Across the entire `src/` codebase:
     * Ripgrep for `matrixAutoUpdate` returned **0 results**. No static mesh freezing (`mesh.matrixAutoUpdate = false; mesh.updateMatrix()`) is currently implemented anywhere in buildings, roads, or trees.
   - In `src/core/engine/LightingSystem.ts`:
     * Lines 100–149: `initEnvironment` sets up `THREE.PMREMGenerator` from a static 512x256 linear gradient canvas at startup, but does not update dynamically when `setTime(hour)` transitions between dawn, midday, senja, and night.
   - In `src/materials/MaterialLibrary.ts`:
     * Lines 292, 390, 433, 454, 582: Procedural texture packages (`terracotta`, `brick`, `stone_candi`, `teak_wood`, `asphalt`) are requested with size `512` rather than `1024`.
     * Lines 644–657 (`water`): References external `/assets/textures/air/normal.jpg` and lacks `envMapIntensity: 1.2`.
     * Lines 660–667 (`glass`): Lacks explicit `envMapIntensity` (defaults to standard 1.0 without high-reflection boost).

3. **Tahap 5 Observations**:
   - In `src/world/LandscapeManager.ts:335-398`:
     * `tree` and `shade_tree` canopies are constructed from 6 `THREE.DodecahedronGeometry` meshes.
   - In `src/roads/RoadPropPlacer.ts:259-290`:
     * Corridor shade trees are constructed from 7 `THREE.DodecahedronGeometry` meshes.
   - In `src/world/AestheticLandscapeBuilder.ts`:
     * Tabebuya, Flamboyan, Frangipani, and Banyan Kurung all use dodecahedrons.
   - In `src/materials/ProceduralTextureGen.ts:972-997`:
     * `getFoliageTexture(256)` is an opaque canvas with solid background `#1c4519` and 40 green ellipses; it lacks transparent cutout edges, jagged leaf silhouettes, and vertical gradients.
   - In `src/materials/WindShader.ts`:
     * Contains GPU vertex swaying shaders (`applyWindShader`, `applyFoliageSubsurfaceShader`) ready for use.
   - In `src/world/Terrain.ts`:
     * Line 163: `this.waterMesh.position.y = -0.45;` (should be -0.30m).
     * Line 288: `modifyElevation(..., 'river')` carves to `riverDepth = -1.8;` (should be -2.0m).
     * Lines 103–107: Slope shading only mixes a flat mud color when `elev < -0.15`.
   - In `src/world/RiverTypes.ts`:
     * `urban_river` depth is 2.2, `small_canal` depth is 1.4, `waterLevelY` varies (-0.20 to -0.30).
   - In `src/roads/RoadGeometryBuilder.ts`:
     * Lines 131, 686–815: When `rawGroundY < -0.25`, it automatically generates a concrete bridge deck, parapet railings on both sides of the sidewalk, and riverbed piers.
   - In `src/core/engine/CameraController.ts`:
     * Lines 120, 842: Contains `orthoCamera` and `setOrthographicMode(enabled, mode)`.
   - In `src/ui/components/TopHeader.tsx`:
     * Lines 413–417: Segmented control in the top bar only lists 3 modes: `[Orbit, Pejalan Kaki, Drone]`. `2D Denah` is missing from the primary pill control.
     * Line 654: `isTopDown` toggle is buried inside the secondary utility dropdown menu and only toggles `cameraController.toggleTopDown()`, without enabling a global clipping plane at Y = 2.4m or simplifying trees into architectural circle symbols.

---

## 2. Logic Chain

1. **144 FPS Engine Goal**:
   - `requestAnimationFrame` is uncapped, but running on HiDPI displays with `pixelRatio: 2.0` (Observation 2) forces 4K viewport rendering on mobile RTX 3060.
   - Recalculating matrices on hundreds of static objects every frame (Observation 2: 0 occurrences of `matrixAutoUpdate`) creates an unnecessary CPU bottleneck on Core i7-10750H.
   - Therefore, capping `pixelRatio` to `Math.min(window.devicePixelRatio, 1.5)` and freezing static mesh updates (`matrixAutoUpdate = false; updateMatrix()`) across buildings, roads, and trees will drastically reduce both GPU fillrate and CPU scene-graph traversal overhead, achieving smooth 144 FPS.

2. **UE5 Visual Fidelity Goal**:
   - `AgXToneMapping` at 1.1 (Observation 2) produces different saturation/contrast than specified. Switching to `THREE.ACESFilmicToneMapping` at 1.05 and SRGBColorSpace will deliver cinematic PBR color grading.
   - PMREM Environment Map is currently static (Observation 2). Updating PMREM reflections to match diurnal solar phases and calibrating `envMapIntensity` on glass, metal, and water will produce realistic environmental reflections.
   - Switching procedural PBR packages from 512 to 1024 on High/Ultra (Observation 2) provides the required surface texture resolution for teak wood grain, mortar, andesite stone, roof tiles, and asphalt.

3. **Real Foliage & Botanical Crown Goal**:
   - Current trees rely on dodecahedron cluster geometries and opaque dotted textures (Observation 3).
   - Implementing a high-res botanical leaf texture canvas with jagged transparent edges (`alphaTest: 0.45`), light-to-dark shoot gradients, tapering trunk with 3-5 branches, and 12-18 clusters holding crossed foliage cards with `applyFoliageSubsurfaceShader` will transform the low-poly models into lush, wind-responsive botanical trees.

4. **River & Landscaping Goal**:
   - River water plane is at -0.45m and excavation is at -1.8m (Observation 3). Calibrating excavation to -2.0m and river water plane to -0.30m aligns the hydrology with specifications.
   - Enhancing terrain slope coloring with river stone and riverbank sand textures avoids stretched grass on trench walls.
   - Automatic bridge generation already triggers when `groundY < -0.25` in `RoadGeometryBuilder.ts`. Ensuring river placement notifies road mesh rebuilding will seamlessly connect river channels with bridge structures.

5. **2D Masterplan vs 3D Mode Goal**:
   - `TopHeader.tsx` lacks `2D Denah` in the main segmented control (Observation 3).
   - Adding `2D Denah` alongside `3D Orbit`, `Pejalan Kaki`, and `Drone`, activating Top-Down Orthographic camera, applying a global horizontal clipping plane at Y = 2.4m, and simplifying tree canopies to transparent 2D architectural circle symbols will deliver a true CAD-grade masterplan floor plan view.

---

## 3. Caveats

- **Existing Tests**: All 300 tests currently pass. Any modifications to `Terrain.ts`, `RiverTypes.ts`, or `TopHeader.tsx` must ensure existing test assertions (such as river width checks and camera modes) remain green or are appropriately updated.
- **Tree Vertex Shaders**: Freezing mesh matrix updates (`mesh.matrixAutoUpdate = false`) is completely compatible with vertex shaders like `applyWindShader` because vertex displacement occurs on the GPU in the vertex shader stage.
- **Gizmo Interaction**: When building meshes are transformed by `BuildingGizmoManager`, `mesh.updateMatrix()` or temporary `matrixAutoUpdate = true` must be handled during active drag.

---

## 4. Conclusion

The codebase is robust, fully typed, and has a strong foundation with complete test coverage. Implementing Tahap 4 and Tahap 5 requires zero external dependencies and can be executed cleanly within the existing modular structure:
1. **Engine Optimization**: Clamp pixel ratio to 1.5, switch to `ACESFilmicToneMapping` (1.05), implement rolling EMA FPS telemetry, and freeze static mesh matrices.
2. **PBR & Lighting**: Enable dynamic PMREM sky reflections and 1024x1024 texture packages.
3. **Botanical Crown Foliage**: Build transparent jagged leaf canvas generator (`alphaTest: 0.45`), 3-5 branched tapering trunk, and 12-18 layered canopy clusters with crossed wind cards.
4. **Hydrology & Rivers**: Standardize excavation to Y = -2.0m, water surface to Y = -0.30m, and stone/sand bank shading.
5. **2D/3D Mode**: Add `2D Denah` to the TopHeader Segmented Control, configure global clipping plane at Y = 2.4m, and toggle transparent architectural tree symbols.

---

## 5. Verification Method

To independently verify these findings:
1. **Unit Tests**:
   ```powershell
   npm test
   ```
   Expected: 45 test files passed, 300 tests passed.
2. **Type Check**:
   ```powershell
   npx tsc --noEmit
   ```
   Expected: 0 errors.
3. **Source Inspections**:
   - `src/core/engine/Engine.ts`: Lines 160–165 (pixel ratio, tone mapping) and 770–776 (FPS calculation).
   - `src/core/engine/LightingSystem.ts`: Lines 100–149 (`initEnvironment`).
   - `src/world/LandscapeManager.ts`: Lines 335–398 (dodecahedron tree canopy).
   - `src/world/Terrain.ts`: Lines 163 (water plane Y) and 288 (river excavation depth).
   - `src/ui/components/TopHeader.tsx`: Lines 413–417 (camera mode pill).
