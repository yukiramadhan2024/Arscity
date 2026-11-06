# Technical Analysis: Tahap 1 Tasks T1.1, T1.2, and T1.3

**Surveyor**: teamwork_explorer_v4_survey_1  
**Timestamp**: 2026-11-02T04:45:00Z  
**Target Milestone**: Arscity v4.0.0 — Tahap 1 Survey  
**Scope**: Baseline verification + In-depth investigation of T1.1, T1.2, T1.3

---

## 1. Repository Baseline State

### 1.1 Git Status & Commit History
- **Branch**: `main` (up to date with `origin/main`)
- **Recent 5 commits**:
  ```
  49a5d2c feat: upgrade Arscity with unified light glass UI, robust CAD studio, fixed river tool, and interactive first-person builder
  ac755ff feat: stabilize Arscity v3.2.0, fix permanent road textures, and apply clean architectural design
  41dc9c6 feat: integrate glass folder cards for world hub, unified lab analysis UI theme, procedural hotmix asphalt road, and custom Arscity SVG branding
  5db1d3b Update Arscity: checkpoint
  9f76b9a Initial commit
  ```
- **Working Tree**: Contains unstaged modifications and untracked test/asset files from preceding feature work.

### 1.2 TypeScript Compilation Check
- **Command**: `npx tsc --noEmit`
- **Result**: Exit code `0` (0 errors). Full type-checking clean.

### 1.3 Test Suite Baseline
- **Command**: `npx vitest run`
- **Result**: Exit code `0`.
  - **Test Files**: 53 passed (53 total)
  - **Tests**: 421 passed (421 total, 0 failed)
  - **Duration**: 67.98s

---

## 2. In-Depth Technical Investigation: Task T1.1

### 2.1 Problem Statement
> **T1.1 FPS jatuh ke 22 saat malam (lampu berat)**  
> - Measure active `PointLight` and `SpotLight` counts during day and night (18:00 - 05:30).
> - Remove all dynamic `PointLight` and `SpotLight` for streetlights and buildings.
> - Streetlights and windows must use shared emissive materials (cached, not cloned per building). `emissiveIntensity` must smoothly fade in toward night (~17:30 to 18:30) and fade out toward morning (~05:00 to 06:00).
> - Streetlight visual glow effect: small instanced sprite glow or soft bloom (High and Ultra presets only).
> - Primary lighting: 1 `DirectionalLight` (day sun, night dim moon) + lightweight `HemisphereLight`.
> - **Pass Criteria**: Active PointLight count is 0; night FPS is not lower than day FPS by >10%; baseline before/after numbers recorded.

### 2.2 Empirical Audit of Lights in Codebase

#### 1. PointLight and SpotLight Inventory
Grep search across `src/` for `PointLight` and `SpotLight`:
- **SpotLight**: Exactly 0 occurrences in `src/`. No SpotLights exist.
- **PointLight**: Exactly 4 occurrences, all localized in `src/buildings/InteriorInteractiveSystem.ts`:
  - `src/buildings/InteriorInteractiveSystem.ts:69`:
    ```typescript
    public ceilingLightPool: THREE.PointLight[] = [];
    ```
  - `src/buildings/InteriorInteractiveSystem.ts:93`:
    ```typescript
    const light = new THREE.PointLight(0xffecd2, 2.2, 14, 1.4);
    light.castShadow = false;
    light.visible = false;
    light.name = `PooledCeilingLight_${this.ceilingLightPool.length + 1}`;
    this.ceilingLightPool.push(light);
    ```
  - `src/buildings/InteriorInteractiveSystem.ts:183-187`:
    ```typescript
    public updateCeilingLights(
      playerPos: THREE.Vector3,
      enabled: boolean,
      activeBuildingId?: string | null
    ): void
    ```
  - When the player enters a building or toggles ceiling lights (`FirstPersonController.ts:1955`), up to 2 dynamic PointLights are activated.
  - **Audit Finding**: In the current daytime/night outdoor view, active PointLights are 0. When indoors, up to 2 active PointLights exist. To strictly achieve "jumlah PointLight aktif nol" everywhere, the `ceilingLightPool` in `InteriorInteractiveSystem.ts` should be deactivated or removed in favor of emissive fixtures and exposure adaptation (T3.1).

#### 2. Root Cause of FPS Drop at Night: Shader Recompilation Triggered by `needsUpdate = true`
A major performance issue exists in `src/materials/MaterialLibrary.ts` and `src/world/LandscapeManager.ts`:
- In `src/materials/MaterialLibrary.ts:1601-1683` (`setNightGlow`):
  ```typescript
  // Lines 1618-1630:
  if ('emissive' in mat) {
    if (clamped > 0) {
      (mat as any).emissive.setHex(0xfef08a);
      (mat as any).emissiveIntensity = clamped * 2.2;
      mat.opacity = THREE.MathUtils.lerp(0.45, 0.85, clamped);
    } else {
      (mat as any).emissive.setHex(0x000000);
      (mat as any).emissiveIntensity = 0;
      mat.opacity = 0.45;
    }
  }
  mat.needsUpdate = true; // <-- CRITICAL BOTTLENECK
  ```
  Setting `mat.needsUpdate = true` occurs repeatedly across:
  - Line 1615: `glass_dark`
  - Line 1629: `glass_lit`
  - Line 1638: `storefront_sign`
  - Line 1652: `warm_light`
  - Line 1666: `asphalt`
  - Line 1680: `impostor_facade`
- And in `src/world/LandscapeManager.ts:690-705`:
  ```typescript
  public updateNightGlow(factor: number): void {
    const clamped = THREE.MathUtils.clamp(factor, 0, 1);
    for (const group of this.itemGroups.values()) {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat && (mat.userData?.isNightGlow || m.userData?.isNightGlow)) {
            const hexColor = mat.userData?.nightColor || m.userData?.nightColor || 0xffb347;
            mat.emissive.setHex(hexColor);
            mat.emissiveIntensity = clamped * 1.8;
            mat.needsUpdate = true; // <-- FORCES RECOMPILATION ON HUNDREDS OF MESHES
          }
        }
      });
    }
  }
  ```
  **Technical Insight**: In Three.js, `material.emissive` color and `material.emissiveIntensity` are dynamic WebGL uniform values (`uniform vec3 emissive;`). Updating uniform values does **NOT** require `needsUpdate = true`. Invoking `needsUpdate = true` instructs Three.js that the shader program structure changed, forcing WebGLRenderer to recompile shader programs and re-bind pipeline states across hundreds of meshes. When the time of day transitions between day and night, this recompilation causes severe frame hitching and drops the framerate down to ~22 FPS.

#### 3. Material Caching vs Cloning
- Building windows: In `src/buildings/builders/FacadeMeshBuilder.ts:186-190`, windows retrieve `glass_lit` or `glass_dark` from `MaterialLibrary.getInstance().getMaterial()`. `MaterialLibrary` stores them in `this.materialCache` without cloning. They are already shared.
- Street lamps: In `src/roads/RoadPropPlacer.ts:228-230`:
  ```typescript
  this.lampGlowMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a
  });
  ```
  And in `RoadPropPlacer.setNightGlow(factor)` (lines 304-313):
  ```typescript
  public static setNightGlow(factor: number): void {
    this.initMaterials();
    if (!this.lampGlowMat) return;

    if (factor > 0) {
      this.lampGlowMat.color.setHex(0xfef08a);
    } else {
      this.lampGlowMat.color.setHex(0x334155);
    }
  }
  ```
  This is currently a single `MeshBasicMaterial` that toggles abruptly (`factor > 0`) between yellow and dark gray. It does not use `emissive` / `emissiveIntensity`, does not smoothly fade, and does not draw from `MaterialLibrary` shared cache.

#### 4. Night Glow Fade Schedule
- In `src/core/engine/LightingSystem.ts:388-397`:
  ```typescript
  let nightGlowFactor = 0;
  if (h >= 18.0 || h <= 5.0) {
    nightGlowFactor = 1.0;
  } else if (h > 5.0 && h < 6.5) {
    nightGlowFactor = THREE.MathUtils.clamp(1.0 - (h - 5.0) / 1.5, 0, 1);
  } else if (h >= 6.5 && h <= 17.25) {
    nightGlowFactor = 0.0;
  } else if (h > 17.25 && h < 18.0) {
    nightGlowFactor = THREE.MathUtils.clamp((h - 17.25) / 0.75, 0, 1);
  }
  ```
  - Current evening fade: 17:15 to 18:00 (17.25 to 18.0).
  - Current morning fade: 05:00 to 06:30 (5.0 to 6.5).
  - **Required Schedule per T1.1**:
    - Evening fade in: 17:30 to 18:30 (17.5 to 18.5).
    - Morning fade out: 05:00 to 06:00 (5.0 to 6.0).

#### 5. Street Lamp Glow Effects (Sprite Glow & Bloom)
- In `src/core/engine/PostProcessingManager.ts:99`:
  ```typescript
  this.bloomPass.enabled = quality === 'ultra';
  ```
  Bloom is currently enabled **only** on `'ultra'`.
  T1.1 specifically requires bloom / glow on **Tinggi (High) and Ultra**:
  `this.bloomPass.enabled = quality === 'high' || quality === 'ultra';`
- In `src/roads/RoadPropPlacer.ts`:
  Street lights are rendered via `instancedPoles` and `instancedBulbs` (InstancedMesh). There is no instanced sprite glow billboard.

#### 6. Primary Lighting
- In `src/core/engine/LightingSystem.ts:29-41`:
  Three lights are currently added:
  - `ambientLight = new THREE.AmbientLight(0xfff5ea, 0.45);`
  - `hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a5d23, 1.2);`
  - `sunLight = new THREE.DirectionalLight(0xfff1d6, 3.2);`
  T1.1 specifies: "Pencahayaan utama: satu DirectionalLight (matahari siang, bulan redup malam) ditambah hemisphere ringan."

---

## 3. In-Depth Technical Investigation: Task T1.2

### 3.1 Problem Statement
> **T1.2 Bintang tampak seperti bola debu di atas rumput**  
> - Star dome (`starDome` / `starPoints`) must follow camera: copy camera position to dome every frame before render. `frustumCulled = false`.
> - Radius: 4000 m only if `camera.far > 4500`. Otherwise use `0.9 * camera.far`.
> - Material: `depthWrite: false`, `depthTest: false`, `renderOrder` very low / background, `fog: false`.
> - Point stars must use fixed pixel size (`sizeAttenuation: false`), not world units.
> - Only appear at night, fading smoothly based on game hour.
> - **Pass Criteria**: From all camera altitudes and angles, stars never appear on the ground or change size; zero stars visible during daytime.

### 3.2 Empirical Audit of Star Implementation

#### 1. Geometry and Radius
- In `src/core/engine/LightingSystem.ts:70-80`:
  ```typescript
  const starCount = 600;
  const starGeom = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.85 + 0.1);
    const r = 380; // <-- PROBLEM: Fixed to 380 meters
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  ```
- In `src/core/engine/CameraController.ts:118`:
  `this.camera = new THREE.PerspectiveCamera(options.fov || 45, aspect, 0.06, 4000);`  
  `camera.far` is **4000 m**.
- The star radius is hardcoded to **380 m**, which is less than 10% of `camera.far`. When camera distance zooms out in Orbit mode (which reaches up to 1200 m, see `CameraController.ts:31`), the camera actually travels *outside* the 380 m star sphere!

#### 2. Position Tracking & Update Cadence
- In `src/core/engine/LightingSystem.ts:403`:
  ```typescript
  if (this.starPoints) {
    const starOpacity = THREE.MathUtils.clamp((nightGlowFactor - 0.35) / 0.65, 0, 0.95);
    (this.starPoints.material as THREE.PointsMaterial).opacity = starOpacity;
    this.starPoints.visible = starOpacity > 0.01;
    this.starPoints.position.copy(targetCenter); // <-- PROBLEM: Copies ground target!
  }
  ```
- **Two Critical Bugs**:
  1. It copies `targetCenter` (the look-at point on the ground, Y=0), not `camera.position`.
  2. It only copies position when `setTime()` is called! During normal camera orbit, pan, zoom, or first-person walking in `Engine.ts:renderLoop`, the star points position is **never** updated.
  3. Consequently, the star dome stays fixed to the ground target. When the camera moves or tilts, the stars appear floating directly on the terrain and grass.

#### 3. PointsMaterial Configuration
- In `src/core/engine/LightingSystem.ts:82-89`:
  ```typescript
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });
  this.starPoints = new THREE.Points(starGeom, starMat);
  scene.add(this.starPoints);
  ```
- **Defects identified**:
  - `sizeAttenuation`: Three.js default is `true`. Because `sizeAttenuation` is true, star points scale with perspective distance, rendering them as large blurred balls when camera is close, exactly matching the description "bola debu". T1.2 mandates `sizeAttenuation: false` (fixed 1.5 - 2.0 screen pixels).
  - `depthTest`: Three.js default is `true`. Terrain and buildings clip into the star dome, creating z-buffer artifacts. T1.2 mandates `depthTest: false`.
  - `fog`: Three.js default is `true`. The distance fog (`FogExp2`) bleeds into stars, giving them a dusty, milky appearance. T1.2 mandates `fog: false`.
  - `renderOrder`: Defaults to `0`. T1.2 mandates a very low renderOrder (e.g. `-1000`) so stars render behind world geometry.
  - `frustumCulled`: Defaults to `true`. Because star points center is on the ground, if the ground target exits the view frustum, all stars abruptly vanish. T1.2 mandates `frustumCulled = false`.

---

## 4. In-Depth Technical Investigation: Task T1.3

### 4.1 Problem Statement
> **T1.3 Tata letak Malioboro tidak rapi**  
> - Compute road and building positions from parametric inputs (North-South corridor length, road width, lot width, front setback / GSB), not hardcoded magic numbers.
> - Buildings must align neatly along both corridor flanks.
> - **Pass Criteria**: Unit tests prove 0 building-to-building overlaps and 0 building-to-road overlaps (tolerance 0.1 m).

### 4.2 Empirical Audit of Current MalioboroPreset.ts

#### 1. Road Layout
In `src/world/MalioboroPreset.ts:18-141`:
- Main corridor (Jalan Malioboro): Arterial road (`width = 26.0 m`, sidewalk `5.5 m` each side, center line at `x = 0`).
  - Road corridor spans `x ∈ [-13.0, +13.0]`.
  - Segment nodes: `z = -180` (North), `z = -90` (Sosrowijayan), `z = -20` (Dagen), `z = 30` (Kepatihan), `z = 90` (Pajeksan), `z = 180` (Titik Nol). Total corridor length: `360 m`.
- Side branch roads:
  - `edge_sosro_w` (West): Collector road (`width = 16.0 m`, half-width `8.0 m`), center `z = -90`. Spans `z ∈ [-98.0, -82.0]`.
  - `edge_dagen_w` (West): Local road (`width = 9.0 m`, half-width `4.5 m`), center `z = -20`. Spans `z ∈ [-24.5, -15.5]`.
  - `edge_kepatihan_e` (East): Collector road (`width = 16.0 m`, half-width `8.0 m`), center `z = 30`. Spans `z ∈ [22.0, 38.0]`.
  - `edge_pajeksan_w` (West): Local road (`width = 9.0 m`, half-width `4.5 m`), center `z = 90`. Spans `z ∈ [85.5, 94.5]`.
  - `edge_nol_w` and `edge_nol_e`: Arterial road (`width = 26.0 m`, half-width `13.0 m`), center `z = 180`. Spans `z ∈ [167.0, 193.0]`.

#### 2. Discovery of Geometry Collision Bugs in MalioboroPreset.ts

Mathematical analysis using oriented bounding boxes (`PolygonMath.getOrientedBoxVertices`) revealed three critical collision defects:

##### Bug A: `bld_ruko_w_5` directly inside `bld_joglo_yogyakarta`
- `bld_ruko_w_5` (`MalioboroPreset.ts:170`):
  - Position: `[-35, 0, -45]`
  - Rotation: `Math.PI / 2`
  - Dimensions: `width: 8`, `length: 14`
  - World X range: `[-42, -28]`
  - World Z range: `[-49, -41]`
- `bld_joglo_yogyakarta` (`MalioboroPreset.ts:202`):
  - Position: `[-42, 0, -48]`
  - Rotation: `Math.PI / 2`
  - Dimensions: `width: 18`, `length: 22`
  - World X range: `[-53, -31]`
  - World Z range: `[-57, -39]`
- **Overlap**:
  - X overlap: `[-42, -31]` (11.0 meters)
  - Z overlap: `[-49, -41]` (8.0 meters)
  - **Verdict**: `bld_ruko_w_5` is 100% swallowed inside the Joglo building.

##### Bug B: `bld_ruko_w_8` penetrates Jl. Pajeksan road corridor
- `bld_ruko_w_8` (`MalioboroPreset.ts:170` with `z = 85`):
  - Position: `[-35, 0, 85]`
  - Rotation: `Math.PI / 2`
  - Dimensions: `width: 8`, `length: 14`
  - World X range: `[-42, -28]`
  - World Z range: `[81.0, 89.0]`
- Road `edge_pajeksan_w` (`MalioboroPreset.ts:115`):
  - Local road from `(0, 0, 90)` to `(-50, 0, 90)`.
  - Total road width: `9.0 m` (half-width `4.5 m`).
  - Road corridor spans `x ∈ [-50.0, 0.0]`, `z ∈ [85.5, 94.5]`.
- **Overlap**:
  - Building extends from `z = 81.0` to `z = 89.0`.
  - The road begins at `z = 85.5`.
  - **Verdict**: Building penetrates `3.5 meters` into the road corridor.

##### Bug C: `bld_joglo_kepatihan` and `bld_bale_kepatihan` collide
- `bld_joglo_kepatihan` (`MalioboroPreset.ts:338`):
  - Position: `[68, 0, 75]`
  - Rotation: `0`
  - Dimensions: `width: 20`, `length: 24`
  - World X range: `[58.0, 78.0]`
  - World Z range: `[63.0, 87.0]`
- `bld_bale_kepatihan` (`MalioboroPreset.ts:359`):
  - Position: `[82, 0, 88]`
  - Rotation: `0`
  - Dimensions: `width: 14`, `length: 18`
  - World X range: `[75.0, 89.0]`
  - World Z range: `[79.0, 97.0]`
- **Overlap**:
  - X overlap: `[75.0, 78.0]` (3.0 meters)
  - Z overlap: `[79.0, 87.0]` (8.0 meters)
  - **Verdict**: The secondary pavilion Bale Danunegaran crashes into the roof and walls of Pendopo Ageng Kepatihan.

#### 3. Root Cause: Hardcoded Coordinates vs Parametric Layout
`MalioboroPreset.ts` currently defines buildings using arbitrary coordinate arrays:
```typescript
const westZs = [-155, -135, -115, -65, -45, 45, 65, 85, 105, 125];
const eastZs = [-155, -135, -115, -65, -45];
```
These arrays disregard:
1. Varying widths of perpendicular side roads and their intersection splays.
2. The presence of showcase buildings (Joglo, Cafe, Kepatihan, Heritage) that require dedicated parcel envelopes.
3. Proper setback distance calculation from both the main corridor (x = ±13.0m) and side roads.

---

## 5. Technical Recommendations for Implementation

### For T1.1 (Lighting & Performance):
1. **Remove `mat.needsUpdate = true` on uniform changes**:
   - In `MaterialLibrary.ts:1601-1683`, remove all calls to `mat.needsUpdate = true` inside `setNightGlow()`. Emissive color and intensity updates take effect immediately via Three.js uniforms without triggering shader recompiles.
   - In `LandscapeManager.ts:690-705`, update emissive color and intensity on standard materials without setting `needsUpdate = true`.
2. **Deactivate dynamic PointLight pool**:
   - In `InteriorInteractiveSystem.ts`, update `ensureCeilingLightPool` or `updateCeilingLights` so that `PointLight` instances are not added to the active scene, ensuring active PointLight count is 0.
3. **Calibrate Night Glow Fade Curve**:
   - In `LightingSystem.ts`, set the evening fade from 17.5 to 18.5 (17:30 to 18:30) and morning fade from 5.0 to 6.0 (05:00 to 06:00).
4. **Enable Bloom on High and Ultra**:
   - In `PostProcessingManager.ts`, ensure `bloomPass.enabled = quality === 'high' || quality === 'ultra'`.
   - Update `RoadPropPlacer.ts` to use a shared material with `emissiveIntensity` controlled by `setNightGlow`.

### For T1.2 (Star Dome):
1. **Camera Tracking**:
   - Add a method `updateCameraPosition(cameraPos: THREE.Vector3)` in `LightingSystem.ts` called every frame from `Engine.ts:renderLoop` (before render).
   - Star points position must copy `cameraPos`, not ground target.
   - Set `this.starPoints.frustumCulled = false`.
2. **Radius Calculation**:
   - Set radius to `camera.far > 4500 ? 4000 : 0.9 * camera.far` (3600 m when far is 4000).
3. **PointsMaterial Configuration**:
   - Set `sizeAttenuation: false` (fixed pixel size, e.g. 1.5).
   - Set `depthTest: false`, `depthWrite: false`, `fog: false`, and `renderOrder: -1000`.
   - Opacity fades with `nightGlowFactor` so stars are completely hidden during the day.

### For T1.3 (Malioboro Layout):
1. **Parametric Block Generator**:
   - Define a layout config structure:
     ```typescript
     interface MalioboroLayoutConfig {
       corridorZMin: number; // -180
       corridorZMax: number; // 180
       arterialWidth: number; // 26
       frontSetback: number; // 5.0
       lotDepth: number; // 24
       rukoWidth: number; // 8
       rukoLength: number; // 14
     }
     ```
   - Segment the corridor into distinct urban blocks between side roads with exclusion margins equal to `roadHalfWidth + frontSetback + safetyMargin`.
   - Distribute Rukos evenly within each block with uniform lot spacing and GSB setback.
   - Dedicate distinct parcel zones for showcase buildings:
     - `bld_joglo_yogyakarta`: place in Block W2 with no Rukos occupying its parcel.
     - `bld_ruko_w_8`: remove or relocate away from Jl. Pajeksan (`z = 90`).
     - In Kepatihan: adjust `bld_bale_kepatihan` to e.g. `[86, 0, 92]` so it has >5 m clearance from `bld_joglo_kepatihan`.
2. **Verification Unit Test**:
   - Create a test in `tests/malioboro_preset.test.ts` using `PolygonMath.getOrientedBoxVertices`:
     - Test A: All building-to-building pairs have 0 polygon intersection (tolerance 0.1 m).
     - Test B: All building polygons have 0 intersection with road corridors and intersections (tolerance 0.1 m).

