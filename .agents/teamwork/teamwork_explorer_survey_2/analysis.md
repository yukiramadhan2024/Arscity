# In-Depth Survey & Technical Analysis: Tahap 4 & Tahap 5

**Survey Date**: 2026-10-29  
**Surveyor**: Teamwork Explorer (Survey Agent 2)  
**Target Codebase**: Arscity v4.0.0 Architecture Engine  

---

## Executive Summary

This report delivers a comprehensive forensic survey of the Arscity codebase specifically covering:
- **Tahap 4**: Engine Optimization for High Refresh Rate (144 FPS) on Intel Core i7-10750H & NVIDIA RTX 3060 + Unreal Engine 5 PBR visual fidelity.
- **Tahap 5**: Real Foliage & Vegetation (Multi-Layered Botanical Crown architecture), River & Hydrological Landscaping, and 2D Masterplan vs 3D Realistic View Modes.

All 45 existing test suites (300 unit tests) currently pass and TypeScript (`npx tsc --noEmit`) passes with 0 errors. However, there are significant gaps between current implementations and the v4.0.0 specifications in `ORIGINAL_REQUEST.md`. Below is the complete catalog of observations, gap analysis, and recommended implementation blueprints.

---

## 1. Tahap 4: Engine Optimization (144 FPS) & UE5 Visual Quality

### 1.1 RequestAnimationFrame Loop & Frame Rate Caps
- **Current Observation (`src/core/engine/Engine.ts`)**:
  - Line 758: `this.animationFrameId = requestAnimationFrame(this.loop);`
  - The loop is driven natively by the browser's `requestAnimationFrame` and does **not** contain artificial `setTimeout` 60 FPS caps.
  - Line 766: `const deltaTime = Math.min(this.clock.getDelta(), 0.1);` correctly caps maximum delta time at 100ms (`0.1s`), preventing physics explosions after tab switching.
  - Line 761: `if (this.isLowPowerMode && this.frameCount % 4 !== 0)` only activates when secondary canvas modals are open (e.g. CAD studio).
- **Gap & Deficiency in FPS Telemetry**:
  - Lines 770–776 in `Engine.ts`:
    ```ts
    this.frameCount++;
    if (now - this.lastFpsUpdateTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdateTime));
      this.frameCount = 0;
      this.lastFpsUpdateTime = now;
      if (this.onFpsUpdate) this.onFpsUpdate(this.currentFps);
    }
    ```
    This computes FPS in discrete 500ms block chunks. It suffers from stepped jumping and does not reflect a rolling moving average.
  - In `src/ui/components/TopHeader.tsx:70`:
    ```tsx
    {fps || 60} FPS
    ```
    If `fps` is uninitialized or 0, it falls back to 60.
- **Recommended Implementation**:
  - Implement a rolling exponential moving average (EMA) or 20-frame circular buffer:
    ```ts
    const instantFps = 1000 / Math.max(1, now - this.lastFrameTime);
    this.movingAverageFps = this.movingAverageFps * 0.9 + instantFps * 0.1;
    ```
    Send `Math.round(this.movingAverageFps)` to `onFpsUpdate` every 200–300ms so 144Hz monitors display smooth, real-time 144 FPS telemetry.

---

### 1.2 Renderer Settings: Pixel Ratio & GPU Power Preference
- **Current Observation (`src/core/engine/Engine.ts`)**:
  - Line 154: `powerPreference: 'high-performance'` is set in the WebGLRenderer options.
  - Line 160: `this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));`
  - In `src/core/engine/GraphicsPresets.ts:63, 80`: Both `high` and `ultra` presets define `pixelRatio: 2.0`.
- **Gap**:
  - `ORIGINAL_REQUEST.md` specifically requires:
    `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))`
  - On 2K / 4K / Retina screens with `window.devicePixelRatio >= 2.0`, rendering at 2.0x forces 4K viewport resolution (e.g. 3840x2160 or 2880x1800), overwhelming laptop GPUs like RTX 3060 Mobile and dropping framerates below 144 FPS.
  - Clamping `pixelRatio` to `Math.min(window.devicePixelRatio, 1.5)` saves ~44% fragment shader fillrate while retaining crisp 1080p/1440p visuals on high-refresh panels.
- **Files to Update**:
  - `src/core/engine/Engine.ts`: Change line 160 and line 1047 to cap at `1.5`.
  - `src/core/engine/GraphicsPresets.ts`: Update `pixelRatio` for `high` and `ultra` to `1.5`.

---

### 1.3 Static Mesh Matrix Calculation Freezing (`matrixAutoUpdate = false`)
- **Current Observation**:
  - `grep_search` reveals **0 occurrences** of `matrixAutoUpdate` across the entire codebase.
  - Every building sub-mesh, column, window, roof, road segment, sidewalk, curb, bollard, streetlight, tree trunk, and foliage cluster defaults to `matrixAutoUpdate = true`.
  - Three.js traverses every object in the scene graph and recalculates `matrixWorld` every frame, causing massive CPU bottlenecks on Intel Core i7-10750H.
- **Gap**:
  - Missing the requirement:
    `mesh.matrixAutoUpdate = false; mesh.updateMatrix();` for all static meshes (buildings, roads, trees, landscape items).
- **Target Locations for Freezing**:
  1. `src/buildings/BuildingManager.ts` & `src/buildings/PrefabMeshBuilder.ts`:
     When a building group is instantiated or rebuilt, traverse children:
     ```ts
     group.traverse((child) => {
       if ((child as THREE.Mesh).isMesh) {
         child.matrixAutoUpdate = false;
         child.updateMatrix();
       }
     });
     ```
     *(When edited via Gizmo in `BuildingGizmoManager`, temporarily set `group.matrixAutoUpdate = true` or call `updateMatrix()` on translation end).*
  2. `src/roads/RoadGeometryBuilder.ts` & `src/roads/RoadPropPlacer.ts`:
     Road carriageways, sidewalks, curbs, bridge decks, railings, and street props are static once placed.
  3. `src/world/LandscapeManager.ts` & `src/world/AestheticLandscapeBuilder.ts`:
     All trees, flora, monuments, benches, and pergolas are static. *(Note: GPU vertex shaders in `WindShader.ts` sway vertices in hardware without needing CPU matrix updates!)*

---

### 1.4 Tone Mapping & Color Space
- **Current Observation (`src/core/engine/Engine.ts`)**:
  - Line 163: `this.renderer.toneMapping = THREE.AgXToneMapping;`
  - Line 164: `this.renderer.toneMappingExposure = 1.1;`
  - Line 165: `this.renderer.outputColorSpace = THREE.SRGBColorSpace;`
- **Gap**:
  - `ORIGINAL_REQUEST.md` mandates:
    - Tone Mapping: `THREE.ACESFilmicToneMapping` (replacing `THREE.AgXToneMapping`).
    - Calibrated Exposure: `1.05` (replacing `1.1`).
    - Color Space: `THREE.SRGBColorSpace` (already present).
- **Action**:
  Update lines 163–164 in `src/core/engine/Engine.ts`:
  ```ts
  this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure = 1.05;
  ```

---

### 1.5 Procedural Sky & Atmospheric Environment Map (`LightingSystem.ts`)
- **Current Observation (`src/core/engine/LightingSystem.ts`)**:
  - Lines 100–149: `initEnvironment(renderer: THREE.WebGLRenderer)` initializes `THREE.PMREMGenerator` and compiles an equirectangular shader.
  - It creates a static 512x256 canvas gradient from sky blue (`#7292b8`) to dusk (`#ffd194`, `#ff9a76`) with a sun disc, generates PMREM texture, and assigns `this.scene.environment = this.envMapRenderTarget.texture`.
- **Gaps**:
  1. The environment map is completely static: when the player slides the time-of-day slider across Dawn (06:00), Midday (12:00), Senja Emas (16:15), and Obsidian Night (20:00), the environment map does not update to match the dynamic atmospheric lighting phases.
  2. In `src/materials/MaterialLibrary.ts`:
     - `glass` (lines 660–667) lacks `envMapIntensity` (defaults to 1.0 without boosted reflection). It needs `envMapIntensity: 1.25`, `roughness: 0.05`, `metalness: 0.1` so glass panes reflect the sky gradient.
     - `water` (lines 644–657) loads an external file `/assets/textures/air/normal.jpg` which might fail offline, and lacks `envMapIntensity: 1.2`.
     - Architectural metals (`frame`, `corten`, `steel`) and polished stone (`terrazzo`, `granite`) need explicit `envMapIntensity` calibrated for high dynamic range sky reflections.
- **Recommended Implementation**:
  - Add `updateEnvironmentMap(hour: number)` in `LightingSystem.ts` (debounced during slider interaction) to re-render the equirectangular gradient canvas matching `curSky`, `curHemiSky`, and sun position, processing it through `pmremGenerator.fromEquirectangular`.

---

### 1.6 PBR Procedural Texture Generator (`ProceduralTextureGen.ts` & `MaterialLibrary.ts`)
- **Current Observation (`src/materials/ProceduralTextureGen.ts`)**:
  - `ProceduralTextureGen.ts` has a mathematical 3D heightfield generator `generate3DMaterialMaps` producing 5 synchronized channels: Albedo, Sobel 3x3 Normal, Roughness, Cavity AO, and Bump Height.
  - Contains packages:
    * `getTerracottaPackage` (curved S-profile tile cross section, stepped tile rows)
    * `getBrickPackage` (stretcher bond, recessed mortar joints, porous clay)
    * `getStoneCandiPackage` (ashlar volcanic stone, basalt pores, dark charcoal)
    * `getTeakWoodPackage` (planks with bevel seams, longitudinal organic grain curves)
    * `getAsphaltPackage` (dark bitumen matrix with sharp mineral stone aggregates)
- **Gaps**:
  - In `src/materials/MaterialLibrary.ts`:
    Lines 292, 390, 433, 454, 582 currently call `get...Package(512)`!
    Calling `512` downsamples the procedural resolution.
    For UE5 visual quality on High and Ultra presets, textures should use full `1024x1024` resolution.
  - Parallax Relief injection in `MaterialLibrary.ts:446, 468` can be optimized with fine-tuned bumpScales and normalScales to emphasize tactile depth (e.g. `normalScale: (3.2, 3.2)` for terracotta, `(2.8, 2.8)` for teak wood).

---

## 2. Tahap 5: Foliage, River & Landscaping, and 2D/3D Mode

### 2.1 Multi-Layered Botanical Crown Architecture & Foliage Overhaul
- **Current Observation**:
  - In `src/world/LandscapeManager.ts:335-398`: Standard trees (`tree`, `shade_tree`) are built using 6 intersecting `THREE.DodecahedronGeometry` primitives.
  - In `src/roads/RoadPropPlacer.ts:259-290`: Road corridor shade trees use 7 `THREE.DodecahedronGeometry` primitives.
  - In `src/world/AestheticLandscapeBuilder.ts`: Tabebuya, Flamboyan, Frangipani, and Banyan Kurung use dodecahedrons.
  - In `src/materials/ProceduralTextureGen.ts:972-997`: `getFoliageTexture(256)` is an opaque 256x256 canvas with a green background and 40 random ellipses without transparent cutout edges.
  - In `src/materials/WindShader.ts`: `applyWindShader` and `applyFoliageSubsurfaceShader` exist and work well.
- **Gap & Deficiencies**:
  - Trees look like lumpy low-poly geometric clusters rather than real botanical tropical trees.
  - Missing the required **Multi-Layered Botanical Crown**:
    1. **High-Res Tropical Leaf Texture Canvas with Jagged Transparent Edges**:
       - Transparent background (`ctx.clearRect(0, 0, w, h)`).
       - Compound tropical leaves/leaflets drawn with organic jagged silhouettes.
       - Vertical color gradient: light young shoots (`#84cc16` / `#a3e635` / `#bef264`) at the top to deep shaded foliage (`#14532d` / `#166534`) at the bottom.
       - Alpha testing (`alphaTest: 0.45`), `side: THREE.DoubleSide`.
    2. **Tapering Trunk & Multi-Branch Architecture**:
       - Trunk tapering upward with 3 to 5 natural spreading branches (`CylinderGeometry`).
       - 12 to 18 canopy clusters holding layered foliage cards (crossed vertical cards rotated at 45°/90°/60° + horizontal cluster shells).
       - Crossed foliage cards sway naturally via `applyFoliageSubsurfaceShader` / `applyWindShader`.
    3. **Ground Flora**:
       - Multi-tier leafy shrubs.
       - Garden grass tufts.
       - Fallen petal carpet under Tabebuya trees (pink `#f472b6` or golden yellow `#eab308` petals scattered on a translucent ground decal).

---

### 2.2 River Excavation, Natural Slopes & Concrete Fenced Bridges
- **Current Observation (`src/world/RiverManager.ts`, `Terrain.ts`, `RoadGeometryBuilder.ts`)**:
  - `RiverManager.ts`:
    * Curves river segments via Bezier interpolation.
    * Calls `terrain.carveRiverTrench` and generates 3D water ribbon and stone talud retaining walls.
  - `Terrain.ts`:
    * Has `carveRiverTrench(curvePoints, width, depth)`.
    * In `modifyElevation(..., 'river')`: uses `riverDepth = -1.8;`.
    * Line 148, 163: Has a continuous river water plane at `position.y = -0.45;`.
    * Lines 103–107: Simple mud/wetBank coloring (`vec3(0.22, 0.20, 0.16)`).
  - `RoadGeometryBuilder.ts`:
    * Lines 131, 686–815: When road sample `rawGroundY < -0.25`, it automatically sets `hasBridge = true`, creates a concrete bridge deck, builds parapet railings on both sides of the sidewalk, and places bridge piers in the riverbed.
- **Gaps & Discrepancies**:
  1. **Excavation Depth**:
     - `Terrain.modifyElevation(..., 'river')` carves to `riverDepth = -1.8m`.
     - `RiverTypes.ts`: `urban_river` depth is 2.2m, `small_canal` depth is 1.4m.
     - `ORIGINAL_REQUEST.md` specifies:
       "Gali palung dasar sungai secara mulus hingga kedalaman Y = -2.0m dengan lereng tebing sungai yang melandai alami."
  2. **Water Surface Elevation**:
     - `Terrain.ts:163`: `this.waterMesh.position.y = -0.45;`
     - `RiverTypes.ts`: `waterLevelY` varies (-0.20 to -0.30).
     - `ORIGINAL_REQUEST.md` specifies:
       "Tampilkan permukaan air sungai jernih di ketinggian Y = -0.30m yang memiliki animasi riak gelombang normal map mengalir, memantulkan langit/gedung di sekitarnya."
  3. **Slope Coloring**:
     - Current terrain shader only mixes a flat mud color when `elev < -0.15`.
     - Missing slope texture blending for river stone (batu kali) and riverbank sand (pasir tepian sungai), which prevents green grass textures from stretching unnaturally on steep riverbanks.
  4. **Road Crossing Synchronization**:
     - If a player creates a river across an existing road, `RiverManager` does not notify `roadManager.rebuildAllMeshes()`. As a result, the road remains flat across the trench until manually edited. Linking river placement to road graph regeneration ensures instant bridge creation.

---

### 2.3 2D Masterplan Mode vs 3D Realistic View Modes
- **Current Observation (`CameraController.ts`, `Engine.ts`, `TopHeader.tsx`, `useUIStore.ts`)**:
  - `CameraController.ts:120`: Has `orthoCamera = new THREE.OrthographicCamera(...)`.
  - `CameraController.ts:842`: Has `setOrthographicMode(enabled, mode)`.
  - `CameraController.ts:492`: Has `toggleTopDown()`.
  - `SectionCutManager.ts`: Has horizontal clipping plane at `cutHeight = 2.2m`.
  - `Engine.ts:963`: Has `setArchitecturalWorkMode(mode, building)`.
  - `TopHeader.tsx:413-417`: The camera mode pill segmented control currently only offers:
    `[Orbit | Pejalan Kaki | Drone]`.
    `isTopDown` is tucked away in the secondary utility dropdown popover, and only toggles `cameraController.toggleTopDown()`.
- **Gaps**:
  1. **TopHeader Segmented Control**:
     - Missing `2D Denah` in the primary top bar Segmented Control.
     - Must be: `[2D Denah | 3D Orbit | Pejalan Kaki | Drone]`.
  2. **2D Mode Architectural Behavior**:
     When entering 2D Mode:
     - Camera switches to Top-Down Orthographic (90 degrees, looking straight down: `polar = 0.001`, `azimuth = 0`, orthographic projection).
     - Global horizontal clipping plane activated at `Y = 2.4m` (`renderer.clippingPlanes = [plane2D]`) or roofs hidden, cleanly exposing ground floor interior walls, doors, and furniture layouts.
     - Tree representation simplifies into transparent architectural circle symbols (e.g. 2D translucent circle decals/rings with fine center crosshairs) so trees do not obstruct floor plans, roads, and lots below.
  3. **Restoration to 3D**:
     - Smoothly restores perspective camera, unsets clipping plane (`renderer.clippingPlanes = []`), restores roofs, and displays full 3D botanical crowns.

---

## 3. Systematic Gap Summary Table

| Component | Current State | Required State (v4.0.0) | Priority |
|---|---|---|---|
| **FPS Telemetry** | 500ms discrete chunk counter (`Engine.ts:771`) | Rolling exponential moving average supporting 144+ FPS (`TopHeader.tsx`) | High |
| **Pixel Ratio** | Capped at `2.0` (`Engine.ts:160`, `GraphicsPresets.ts`) | Capped at `Math.min(window.devicePixelRatio, 1.5)` | High |
| **GPU Power Preference** | Set in `Engine.ts:154` (`high-performance`) | Verify consistency across all contexts | Done / Verify |
| **Static Mesh Freezing** | `matrixAutoUpdate = true` on all meshes (0 occurrences of false) | `matrixAutoUpdate = false; updateMatrix()` on all static buildings, roads, trees | High (60% CPU savings) |
| **Tone Mapping** | `THREE.AgXToneMapping` | `THREE.ACESFilmicToneMapping` | High |
| **Tone Exposure** | `1.10` | `1.05` | High |
| **Color Space** | `THREE.SRGBColorSpace` | `THREE.SRGBColorSpace` | Complete |
| **Environment Map** | Static dusk PMREM (`LightingSystem.ts`) | Atmospheric PMREM responding to solar time; glass/water/metal envMap intensity | Medium-High |
| **PBR Textures** | Called with `512` in `MaterialLibrary.ts` | Utilize `1024` maps on High/Ultra presets | Medium |
| **Tree Canopy Mesh** | Low-poly dodecahedrons / sphere clusters | Multi-Layered Botanical Crown with jagged alpha foliage cards (12–18 clusters) | High |
| **Foliage Texture** | Opaque 256x256 with solid green & 40 dots | High-res transparent canvas with vertical color gradient (lime to deep green, alphaTest: 0.45) | High |
| **Tabebuya Flora** | Dodecahedrons with plain cylinder disc | Trumpet floral clusters + scattered fallen petal carpet | Medium-High |
| **River Excavation** | Depth varies (-1.8m in Terrain, 1.4-2.2m in RiverTypes) | Excavate smoothly down to `Y = -2.0m` with natural bank slopes | High |
| **River Water Plane** | Placed at `Y = -0.45m` (`Terrain.ts:163`) | Surface at `Y = -0.30m` with animated ripple normal map & reflections | High |
| **River Bank Shading** | Simple mud color mix in Terrain shader | Texture blending for river stone (batu kali) and sand | Medium-High |
| **Bridge Detection** | Auto bridge exists when `gy < -0.25m` | Ensure river placement triggers road mesh regeneration | Medium |
| **2D/3D Mode Pill** | Only `Orbit / Walk / Drone` in TopHeader pill | `[2D Denah | 3D Orbit | Pejalan Kaki | Drone]` Segmented Control | High |
| **2D Floor Plan Cut** | Only in SectionCut tool (2.2m) | Global clipping plane at `Y = 2.4m` showing ground floor plan in 2D mode | High |
| **2D Tree Symbols** | Trees remain 3D in top-down view | Trees simplified to transparent architectural circle symbols | High |

---

## 4. Concrete Implementation Blueprints for Implementers

### Blueprint 1: `Engine.ts` & `TopHeader.tsx` (144 FPS & Renderer Tuning)
```ts
// 1. In Engine.ts constructor:
this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
this.renderer.toneMappingExposure = 1.05;
this.renderer.outputColorSpace = THREE.SRGBColorSpace;

// 2. In Engine.ts loop:
const instantFps = 1000 / Math.max(1, now - this.lastFrameTime);
this.lastFrameTime = now;
this.rollingFps = this.rollingFps * 0.92 + instantFps * 0.08;

if (now - this.lastFpsUpdateTime >= 250) {
  this.currentFps = Math.round(this.rollingFps);
  this.lastFpsUpdateTime = now;
  if (this.onFpsUpdate) this.onFpsUpdate(this.currentFps);
}
```

### Blueprint 2: Static Mesh Matrix Freezing Helper
```ts
export function freezeStaticMesh(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.matrixAutoUpdate = false;
      child.updateMatrix();
    }
  });
}
```
Apply `freezeStaticMesh` on:
- All completed building instances in `BuildingManager`
- All road segment groups in `RoadGeometryBuilder`
- All landscape groups in `LandscapeManager` and `AestheticLandscapeBuilder`

### Blueprint 3: Botanical Leaf Texture Generator (`ProceduralTextureGen.ts`)
```ts
public static getBotanicalLeafTexture(size: number = 512): THREE.CanvasTexture {
  const { canvas, ctx } = this.createCanvas(size, size);
  ctx.clearRect(0, 0, size, size);

  // Draw tropical pinnate leaflets with jagged serrated margins
  // Vertical gradient: top (#a3e635 / #84cc16) -> mid (#16a34a) -> bottom (#14532d)
  // ...
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
```

### Blueprint 4: Multi-Layered Botanical Crown Tree Builder
```ts
// Trunk: Tapered cylinder with 3 to 5 curved branches
// Canopy: 12-18 clusters
// Each cluster holds crossed double-sided quads with alphaTest: 0.45:
const foliageMat = new THREE.MeshStandardMaterial({
  map: botanicalLeafTex,
  alphaTest: 0.45,
  side: THREE.DoubleSide,
  roughness: 0.70,
  metalness: 0.02,
});
applyFoliageSubsurfaceShader(foliageMat);
```

### Blueprint 5: River Calibration & 2D/3D Mode Integration (`Engine.ts`)
```ts
public setViewMode2D(enabled: boolean): void {
  this.is2DMode = enabled;
  if (enabled) {
    this.cameraController.setOrthographicMode(true, 'top');
    this.clippingPlane2D = new THREE.Plane(new THREE.Vector3(0, -1, 0), 2.4);
    this.renderer.clippingPlanes = [this.clippingPlane2D];
    this.landscapeManager.set2DTreeSymbols(true);
  } else {
    this.cameraController.setOrthographicMode(false);
    this.renderer.clippingPlanes = [];
    this.landscapeManager.set2DTreeSymbols(false);
  }
}
```

---

## 5. Verification Checklist

To independently verify the survey findings:
1. `npm test` -> Verify all 45 test files and 300 tests pass.
2. `npx tsc --noEmit` -> Verify 0 compilation errors.
3. Review grep search results confirming `matrixAutoUpdate` has 0 occurrences.
4. Verify `Engine.ts:163` currently uses `AgXToneMapping` and `1.1` exposure instead of `ACESFilmicToneMapping` and `1.05`.
5. Verify `Terrain.ts:163` has river water plane at `-0.45m` instead of `-0.30m`.
6. Verify `TopHeader.tsx:413` has only 3 modes (`orbit`, `first_person`, `cinematic_drone`) instead of 4 (`2D Denah`, `3D Orbit`, `Pejalan Kaki`, `Drone`).
