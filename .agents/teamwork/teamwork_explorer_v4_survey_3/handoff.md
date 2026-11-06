# Handoff Report: Survey of Tahap 2 (3-Zone LOD) and Tahap 3 (First-Person 6 Logics)

**Author**: `teamwork_explorer_v4_survey_3`  
**Date**: 2026-11-02  
**Handoff Type**: Hard (Investigation & Codebase Architecture Survey Complete)  
**Target Milestone**: Tahap 2 (T2.1–T2.6) & Tahap 3 (T3.1–T3.6) from `c:\Projects\Arscity\.agents\teamwork\ORIGINAL_REQUEST.md`

---

## 1. Observation

### Codebase Baseline State
- **TypeScript Type Check**: `npx tsc --noEmit` exited with code 0 (0 errors).
- **Unit Test Suite**: `npx vitest run` exited with code 0 (53 test files passed, 421 tests passed, duration 78.30s).

### Tahap 2 (3-Zone LOD Rendering) Observations
1. **LOD Trigger & Distance Metric**:
   - `src/buildings/BuildingManager.ts:600-705`: Contains legacy `updateLOD(cameraPosition, cameraMode, isSectionCutActive, isSubsurfaceLensActive, lodCutoffDistance, graphicsPreset)`.
   - `src/buildings/BuildingManager.ts:623`: Distance is computed as `const distSq = bld.position.distanceToSquared(cameraPosition);` (center-to-center distance). There is no distance-to-footprint-edge calculation.
   - `src/core/engine/Engine.ts:891-904`: LOD runs on frame modulo `if (this.lodFrameCount % 6 === 0)`. There is no 120ms or camera displacement > 1.5m throttle.
   - `src/core/math/PolygonMath.ts:112-129`: Contains `distancePointToSegment` and `isPointInPolygon` which can compute perpendicular distance from camera position to polygon footprint edges.
2. **Zones & Glass Materials**:
   - `src/buildings/BuildingManager.ts:612-616`: Uses hardcoded distance cutoffs (80m and 250m). There is no dual hysteresis (24m/27m and 62m/68m).
   - `src/materials/MaterialLibrary.ts:892-932`: Has `glass`, `glass_lit`, `glass_dark`, but no `kacaDekat` (opacity 0.32) or `kacaJauh` (opacity 0.88, roughness 0.1).
   - `src/world/LandscapeManager.ts`: Has 0 LOD methods. Tree canopy meshes and fallen petals are never culled at distance.
3. **Room Focus When Indoors**:
   - `src/core/engine/FirstPersonController.ts:1143 & 1213`: Sets `this.insideBuildingId = bld.id` on entry and `this.insideBuildingId = null` on exit.
   - `src/buildings/BuildingManager.ts`: Does not prioritize host building as Zone 0 when indoors, nor does it hide other buildings' `InteriorDetails` / `DynamicFurnitureGroup` or landscape props > 35m away.
4. **Raycaster Hierarchy Filtering**:
   - `src/core/engine/RaycastManager.ts:124-158`: `raycastObjects(objects)` delegates to `this.raycaster.intersectObjects(objects, true)` without verifying ancestor visibility.
   - `src/core/engine/FirstPersonController.ts:1370`: Checks `this.centerRaycaster.intersectObjects(bldGroup.children, true)` for furniture hover without verifying if parent groups (`DynamicFurnitureGroup`, `InteriorDetails`) are visible.
5. **Matrix Freezing for Static Objects**:
   - `grep_search` across `src/` for `matrixAutoUpdate` returned 0 results. All static buildings and landscape meshes currently update their matrices every frame.
6. **Developer LOD Overlay**:
   - `src/ui/components/SettingsModal.tsx:622-649`: Provides "Indikator FPS Real-Time", but no LOD zone counts overlay.

### Tahap 3 (First-Person 6 Logics) Observations
1. **T3.1 Eye Light Adaptation**:
   - `src/core/engine/Engine.ts:164`: `this.renderer.toneMappingExposure = 1.0;` is set once and never updated dynamically.
   - `src/core/engine/FirstPersonController.ts:195`: `this.upRaycaster.far = 30.0;` instead of 6m.
   - `src/core/engine/FirstPersonController.ts:892-899`: `isUnderRoof` is debounced every 150ms, but does not adjust exposure.
2. **T3.2 Auto Step-Up**:
   - `src/core/engine/FirstPersonController.ts:856-885`: Hard-snaps `this.position.y = targetY` when ground elevation changes.
   - `src/core/engine/FirstPersonController.ts:1070-1071`: `testWallCollision` casts rays at `y - 0.75` (waist, ~0.9m) and `y - 0.35` (chest, ~1.3m). Low walls (e.g. 0.6m) are below waist height and do not block horizontal motion.
   - There is no step-up damping (lambda ~12) for 0.05m–0.42m steps.
3. **T3.3 Two-Way Swing Doors**:
   - `src/buildings/InteriorInteractiveSystem.ts:275-277`: Proximity open is `< 2.2m`, close is `> 2.8m` (spec is `> 3.2m`).
   - `src/buildings/InteriorInteractiveSystem.ts:303-304`: `const angle = door.currentRatio * door.swingAngle; door.leftLeafMesh.rotation.y = angle;` swings in one fixed direction without dot product against player position.
   - `src/buildings/InteriorMeshBuilder.ts:356`: `swingAngle: Math.PI * 0.5` (~90°) instead of ~100° (~1.745 rad).
4. **T3.4 Dual Floor Navigation**:
   - `src/core/engine/FirstPersonController.ts:1859-1922`: `traverseFloor` and `goToFloor` only mutate `position.y = baseY + (targetFloor - 1) * flH + eyeHeight`. They do not compute a safe landing point on the target floor, do not trigger a 150ms screen fade, and do not refresh LOD or microclimate cards.
   - `src/ui/components/FirstPersonHUD.tsx:1604-1644`: Contains only `<ChevronUp>` and `<ChevronDown>` buttons, missing direct floor number buttons (Lt. 1, Lt. 2, ...).
5. **T3.5 Surface Material Footstep Audio**:
   - `src/audio/ProceduralAudio.ts`: Contains no footstep methods.
   - `src/core/engine/FirstPersonController.ts`: Contains no footstep distance accumulation or downward surface raycast.
6. **T3.6 Smooth Head Bobbing**:
   - `src/core/engine/FirstPersonController.ts:913`: Camera directly takes `smoothedCameraY` with zero head bobbing offset.
   - `src/ui/state/useUIStore.ts:111`: Tracks `reduceMotion: boolean`, but there is no `cameraBobbing` toggle in `SettingsModal.tsx`.

---

## 2. Logic Chain

1. **LOD Efficiency & Accuracy (T2.1 & T2.2)**:
   - *From Observation 1 & 2*: Using center distance causes large structures (e.g., 30m+ footprints) to drop into Zone 1 or Zone 2 even when the player is next to their perimeter.
   - *Therefore*: Distance calculation must measure the shortest Euclidean distance from the camera `(x, z)` to the building footprint polygon edges (`PolygonMath.distancePointToSegment`), returning 0 if the camera is inside the footprint.
   - *Furthermore*: Running LOD checks every frame or modulo 6 wastes CPU on high refresh rate monitors (144Hz). Throttling by time (>= 120ms) or displacement (> 1.5m) guarantees deterministic execution. Dual hysteresis (24m/27m and 62m/68m) prevents thrashing / popping at boundaries.

2. **Indoor Room Focus & Hierarchy Culling (T2.3 & T2.4)**:
   - *From Observation 3 & 4*: When a player enters a building (`insideBuildingId !== null`), rendering all other buildings' interior furniture and distant small props wastes GPU draw calls and fill rate.
   - *Therefore*: The host building must be clamped to Zone 0, while all other buildings have `InteriorDetails` and `DynamicFurnitureGroup` set to `visible = false`.
   - *However*: Because Three.js raycasting does not check parent visibility, hidden furniture in other buildings would still trigger cursor hover labels and delete actions unless an ancestor visibility check (`isObjectHierarchyVisible`) is added to all raycast routines.

3. **CPU Overhead Elimination (T2.5)**:
   - *From Observation 5*: Hundreds of static building walls, slabs, windows, and trees have `matrixAutoUpdate = true`. Three.js traverses and recalculates their local matrices every frame, consuming significant CPU time on Intel Core i7-10750H.
   - *Therefore*: Setting `matrixAutoUpdate = false` and calling `updateMatrixWorld(true)` on static meshes upon placement/instantiation eliminates redundant per-frame matrix recalculations, while keeping animated door leaves and ceiling fans dynamic.

4. **First-Person Immersion & Ergonomics (T3.1 - T3.6)**:
   - *From Observation 7 (T3.1)*: Tone mapping exposure is currently static at 1.0. Stepping under roofs without exposure adjustment feels flat. Damping between 1.05 and 1.28 (factor ~1.22) using `THREE.MathUtils.damp(..., 3.0, dt)` simulates natural eye pupil dilation.
   - *From Observation 8 (T3.2)*: Snapping ground elevation causes abrupt visual jumps. Damping elevation (lambda ~12) for 0.05m–0.42m height deltas provides natural walking over curbs and plinths, while raycasting at 0.48m blocks walls > 0.42m.
   - *From Observation 9 (T3.3)*: Doors opening into the player's face breaks immersion. Computing `(playerPos - doorWorldPos).dot(doorNormal)` determines which side the player is on and reverses the swing direction so the door always swings away.
   - *From Observation 10 (T3.4)*: Mutating only Y on floor traversal risks spawning the player inside furniture or walls. Finding a safe landing spot near the stair landing, accompanied by a 150ms screen fade and HUD floor pills, ensures safe navigation.
   - *From Observation 11 & 12 (T3.5 & T3.6)*: Procedural footsteps (synthesized via Web Audio API based on the surface material tag below feet) and ~0.015m vertical head bobbing that settles in ~0.15s when stopping or aiming complete the AAA tactile experience.

---

## 3. Caveats

1. **CSG Geometry Operations**: No CSG libraries are present or permitted. All geometry optimizations must rely on Three.js BufferGeometry transformations and `mergeGeometries`.
2. **Audio Autoplay Policies**: Web Audio API `AudioContext` starts suspended until user interaction (pointer down / click). `ProceduralAudio.initContext()` already handles `resume()`, which must be called on first user gesture.
3. **Compatibility with Existing Tests**: Existing tests in `tests/v6_lod_and_performance.test.ts` call `buildingManager.updateLOD(...)`. When implementing `updateSpatialLOD(...)`, maintain `updateLOD(...)` as a forwarding adapter so legacy test suites pass without regression.

---

## 4. Conclusion

The Arscity v4.0 architecture is clean, highly modular, and well-tested (53 test files, 421 tests passing). Tahap 2 and Tahap 3 requirements can be cleanly mapped onto existing systems without architectural friction:
- **Tahap 2**: Implement `updateSpatialLOD` in `BuildingManager` and `LandscapeManager`, integrate dual hysteresis and edge distance via `PolygonMath`, add `kacaDekat`/`kacaJauh` in `MaterialLibrary`, enforce `matrixAutoUpdate = false` on static meshes, and add hierarchy visibility filtering in `RaycastManager`.
- **Tahap 3**: Implement dynamic eye light exposure damping, predictive auto step-up, two-way door swing in `InteriorInteractiveSystem`, safe floor teleportation with 150ms fade, procedural footstep audio across 6 surface types, and smooth head bobbing respecting `reduceMotion`.

Detailed technical blueprints and code-level gap analyses are documented in `c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_v4_survey_3\analysis.md`.

---

## 5. Verification Method

To independently verify the codebase state and future implementations:
1. **TypeScript Type Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: 0 errors.
2. **Unit Test Suite**:
   ```powershell
   npx vitest run
   ```
   *Expected result*: All 53 test files and 421 tests pass.
3. **Inspect Implementation Artifacts**:
   - `c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_v4_survey_3\analysis.md`
   - `c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_v4_survey_3\handoff.md`
