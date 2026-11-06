# Arscity v4.0.0 — In-Depth Codebase Survey & Technical Analysis
**Focus**: Tahap 6 (Realistic Furniture, First-Person Realism, Universal CAD Studio) & Tahap 7 (Verification Setup)  
**Survey Agent**: `teamwork_explorer_survey_3`  
**Date**: 2026-10-29  

---

## 1. Executive Summary

A comprehensive investigation of the Arscity codebase has been executed with direct inspection of code implementations, unit tests, build pipelines, and runtime dev servers.

Key takeaways:
1. **Tahap 6 — Furniture (`FirstPersonFurnitureCatalog.ts`)**:
   - The current furniture builder (`FirstPersonFurnitureBuilder.buildFurniture`) relies almost exclusively on primitive `THREE.BoxGeometry` blocks (e.g. 3 raw boxes for `sofa_l`, 3 boxes for `sofa_3seater`, 5 boxes for `bed_king` with only 2 pillows and no lamps, solid box for `desk_office` chair, a single `DodecahedronGeometry` for `plant_monstera`).
   - Upgrading to realistic geometry requires articulated cushions, 105° ergonomic backrest tilts, rounded armrests, tapered cylindrical legs, multi-stem cascading Monstera foliage in terracotta pots, and warm illuminated lamps.
2. **Tahap 6 — First-Person Realism (`FirstPersonController.ts`, `InteriorMeshBuilder.ts`, `InteriorInteractiveSystem.ts`)**:
   - **Doors**: Currently built with a single leaf and a handle on only one side (`+Z`), lacking 3D door frames (jambs & casings) and lacking dual-sided handles. Opening is strictly proximity-based; `KeyE` interaction is completely absent in `FirstPersonController.onKeyDown`.
   - **Threshold Collision**: Stepping onto door thresholds flips `isStrictlyInside` to `false`, causing grounding height drops and waist/chest raycaster collision catches against door frames/plinths.
   - **Stairs & Upper Slab Voids**: `InteriorMeshBuilder.buildBuildingStairwell` builds 16-step stairs, but `PrefabMeshBuilder.ts` (e.g. line 891) and `CustomBuildingMeshBuilder.ts` place solid rectangular floor slabs covering the entire building footprint, blocking the stairwell void so upper floors seal the stair opening.
   - **Floor Teleportation**: `FirstPersonController` implements `traverseFloor` and `goToFloor`, but `[PageUp]` and `[PageDown]` are unbound in `onKeyDown`. `FirstPersonHUD.tsx` lacks clickable floor pills for instant level switching.
   - **Building-to-Road Connection**: No automated paving path exists between the building front terrace and adjacent road sidewalk edges upon placement.
3. **Tahap 6 — Universal CAD Studio (`CustomBuildingCreatorModal.tsx`, `CustomBuildingMeshBuilder.ts`)**:
   - `CustomBuildingCreatorModal.tsx` currently only contains a single mode (Architectural Building with 4 tabs). Mode 2 (Custom Furniture & Interior) and Mode 3 (Pavilion & Park Elements) are not yet implemented in the CAD Studio.
   - **Dark Roof Bug**: Joglo and Limasan roofs in `Building3DLivePreview` are constructed via primitive `ConeGeometry(..., 4)` scaled non-uniformly without environment maps (`scene.environment` is undefined) and without `uv2` for AO maps, causing dark zinc and terracotta textures to render pitch black under directional lighting.
   - **Dimension Labels**: Billboard sprites for 3D dimension lines are scaled to only 1.15m height with 84px fonts, rendering too small for clear readability on large building footprints.
4. **Tahap 7 — Verification Setup**:
   - TypeScript compilation (`npx tsc --noEmit`): **0 errors**.
   - Vitest test suite (`npx vitest run`): **45 test files, 300 tests passed 100%** (duration ~45s).
   - Production build (`npm run build`): Clean production bundle in **8.77s**.
   - Dev server (`vite`): Actively running on **`http://localhost:5173`** (TCP port 5173 established).

---

## 2. In-Depth Survey of Tahap 6

### 2.1 First-Person Furniture Catalog (`src/buildings/FirstPersonFurnitureCatalog.ts`)

#### Current Implementation (Lines 255–526)
`FirstPersonFurnitureBuilder.buildFurniture(type: string)` instantiates meshes for 13 catalog types. The geometry is primitive and boxy:
1. **`sofa_l` (Lines 279–305)**:
   ```ts
   const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 0.9), fabricGray);
   const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 0.25), fabricGray);
   const ret = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.42, 0.9), fabricGray);
   const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.15), fabricBlue);
   const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.15), brassMat);
   ```
   *Deficiencies*: Completely flat rectangular boxes. No seat cushion separation, no rounded armrests, no 105° angled backrest, no legs underneath (sits directly on floor).
2. **`sofa_3seater` (Lines 308–325)**:
   ```ts
   const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.85), fabricGray);
   const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.25), fabricGray);
   const table = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.36, 0.6), woodMat);
   ```
   *Deficiencies*: Single solid box base, flat vertical backrest, raw rectangular table box. No individual seat cushions, no accent pillows, no tapered legs.
3. **`bed_king` (Lines 327–355)**:
   ```ts
   const platform = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 2.1), darkWoodMat);
   const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 2.0), whiteMat);
   // Only 2 pillows:
   const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.4), whiteMat);
   const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.4), whiteMat);
   const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.08, 1.0), fabricBlue);
   const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.1), darkWoodMat);
   ```
   *Deficiencies*: Only 2 pillows (requirement specifies 4 pillows); blanket is a rigid flat block rather than a layered duvet; headboard is bare wood rather than padded fabric; missing bedside tables (nakas) with reading lamps.
4. **`dining_set` (Lines 357–382)**:
   ```ts
   const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.76, 0.9), woodMat);
   // Chairs:
   const chSeat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), woodMat);
   const chLeg = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.45, 0.38), steelMat); // 1 giant box leg!
   const chBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.05), woodMat);
   ```
   *Deficiencies*: Table is a solid block without tabletop overhang or slender legs. Chair legs are built as a single solid box (`0.38 x 0.45 x 0.38`) under the seat; chair back is a flat board with zero curvature.
5. **`desk_office` (Lines 384–403)**:
   ```ts
   const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.74, 0.7), woodMat);
   const monitorStand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.12), steelMat);
   const monitorScreen = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.38, 0.04), steelMat);
   const chair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.9, 0.48), steelMat);
   ```
   *Deficiencies*: Desk is a massive block; chair is a single solid monolithic box `0.48 x 0.9 x 0.48`; monitor lacks an aluminum base/neck and bezels.
6. **`plant_monstera` (Lines 435–445)**:
   ```ts
   const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.45, 12), ceramicMat);
   const plantFoliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38), plantMat);
   ```
   *Deficiencies*: Foliage is a single dodecahedron geometry. Requirement specifies: terracotta ceramic pot with cascading Monstera leaves drooping realistically in multiple directions.
7. **`floor_lamp` (Lines 447–460)**:
   ```ts
   const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 12), steelMat);
   const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 8), steelMat);
   const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.35, 12, 1, true), warmLightMat);
   ```
   *Deficiencies*: While having cylindrical components, it lacks a warm glowing PointLight / emissive inner core and realistic metal fixtures.

#### Required Realistic Geometry Architecture
To fulfill Tahap 6 requirements:
- **Sofas (L-Shape & 3-Seater)**:
  - Base frame with 4–6 tapered cylindrical metal/wood legs (`CylinderGeometry(0.025, 0.018, 0.16, 8)`).
  - Thick, beveled seat cushions (`BoxGeometry` with rounded bevel or composite cushions).
  - Ergonomic 105° tilted backrest (`rotation.x = -Math.PI * (15 / 180)`).
  - Rounded armrests on both ends.
  - Accent pillows with subtle yaw and pitch rotations.
- **Dining / Work Desk & Chair**:
  - Thin tabletop slab (0.035m thick) with smooth beveled chamfer.
  - 4 slender cylindrical legs tapered toward the floor (`CylinderGeometry(0.028, 0.016, 0.72, 8)`).
  - Scandinavian / ergonomic chair with curved backrest (`CylinderGeometry` curved arc or tilted curved plate) and 4 angled legs.
  - Slim monitor: anodized aluminum cylindrical base, vertical neck, and ultra-thin bezel frame with dark screen face.
- **King Bed**:
  - Warm teak wood bed platform frame with 4 solid low corner legs.
  - Thick white mattress (0.28m) with rounded edges.
  - Folded duvet blanket layered across the bottom two-thirds with fabric creases.
  - 4 pillows: 2 large sleeping pillows propped at the back + 2 accent pillows in front.
  - Upholstered fabric headboard with vertical quilted channel seams.
  - Pair of matching teak bedside tables (nakas) flanking left & right, each holding a ceramic/metal mini lamp.
- **Indoor Plants & Floor Lamp**:
  - Terracotta pot (`CylinderGeometry` with reddish-brown terracotta material `#b45309`) containing dark soil disc.
  - Multi-stem Monstera: 5–7 curved stem stalks holding angled green leaves drooping outward and cascading downward.
  - Modern floor lamp: heavy weighted base disc, slim matte black/brass pole, cylinder fabric shade with warm emissive glow (2700K) and optional point light.

---

### 2.2 First-Person Realism (`FirstPersonController.ts`, `InteriorMeshBuilder.ts`, `InteriorInteractiveSystem.ts`)

#### A. Real Doors & Interactive Edge Hinges
- **Location**: `src/buildings/InteriorMeshBuilder.ts` (lines 303–387) & `src/buildings/InteriorInteractiveSystem.ts` (lines 301–313).
- **Current State**:
  - In `InteriorMeshBuilder.ts`, swing doors create a single `doorPivot` with `leafMesh` and ONE handle at `position.set(doorLeafW - 0.08, doorLeafH * 0.45, 0.035)`. There is no handle on the opposite side (`-0.035`).
  - No 3D door frame: The door opening in partition walls is just a rectangular gap between wall slices. There is no architrave or jamb frame trim.
  - Pivot is already at the edge (`doorCenter - doorW * 0.5 + 0.02`), but only rotates via proximity in `InteriorInteractiveSystem.ts` (lines 271–279: `< 2.2m open, > 2.8m close`).
  - `FirstPersonController.ts` has **NO `KeyE` interaction listener** in `onKeyDown` (lines 374–462). Pressing E does nothing.
- **Requirements**:
  1. Add 3D door frame casing (jambs + head trim) around all door openings in `InteriorMeshBuilder.ts`.
  2. Add dual-sided metal handles (`stainlessMat` / `brassMat`) at `+0.035` and `-0.035` on the door leaf.
  3. Support manual toggling via **`E` key** when the player looks at or is within 2.5m of a door, in addition to smooth proximity swing.
  4. Ensure door leaves do not push or trap the player: in `FirstPersonController.ts` (line 1084), `hit.object.userData?.isDoor` is ignored, but door frame jambs and threshold geometry must be flagged `isWalkThroughPortal` or `isDoor` so horizontal raycasts never snag the player.

#### B. Physical Stairs & Ceiling Stairwell Void
- **Location**: `src/buildings/InteriorMeshBuilder.ts` (lines 23–192), `src/buildings/PrefabMeshBuilder.ts` (lines 886–895), `src/core/engine/FirstPersonController.ts` (lines 1144–1198).
- **Current State**:
  - `InteriorMeshBuilder.buildBuildingStairwell` builds 16 treads (`FlightX`, `woodMat`), handrails, balusters, and elevator shaft for every floor transition.
  - In `FirstPersonController.ts` (lines 1163–1198), physical stair climbing evaluates `inStairFootprint` and interpolates `t = (localZ - zStart) / (zEnd - zStart)` to elevate the player.
  - **The Ceiling Void Problem**:
    In `PrefabMeshBuilder.ts` (line 891):
    ```ts
    // Floor 2 structural slab
    this.addBox(group, w, 0.22, l, 0, plinthH + flH, 0, concreteMat);
    ```
    This creates an unbroken slab covering the entire `w × l` footprint. When a player climbs the stairs to Floor 2, their head walks directly into the solid floor slab!
- **Requirements**:
  1. Upper floor slabs in multi-story buildings must cut out a stairwell opening matching the stairwell circulation zone:
     ```ts
     const stairW = 2.8;
     const stairL = 4.2;
     const coreX = -Math.max(1.2, Math.min(building.width * 0.35, (building.width || 12) * 0.22));
     ```
     The upper slab must be split into perimeter segments (e.g. left slab, right slab, front/back slabs) leaving the stairwell void open, exactly as done in `FacadeMeshBuilder.ts` (lines 114–119).
  2. The ceiling raycaster (`upRaycaster`) must recognize the stairwell void so players can climb from Floor 1 to Floor 2 without head collision.

#### C. Instant Floor Teleport HUD & Hotkeys
- **Location**: `src/core/engine/FirstPersonController.ts` (lines 1853–1916), `src/ui/components/FirstPersonHUD.tsx` (lines 570–576, 1602–1640).
- **Current State**:
  - `FirstPersonController` already has `traverseFloor(direction: 'up' | 'down')` and `goToFloor(floorNum: number)`.
  - However, in `FirstPersonController.onKeyDown` (lines 374–462), there are NO handlers for:
    - `PageUp` (should call `traverseFloor('up')`)
    - `PageDown` (should call `traverseFloor('down')`)
  - In `FirstPersonHUD.tsx`:
    - Floor indicator is just a static text label `Lt.{currentFloor}/{totalFloors}`.
    - It only has two tiny chevrons hidden inside the drawer/pill.
- **Requirements**:
  1. Bind `PageUp` to `traverseFloor('up')` and `PageDown` to `traverseFloor('down')` in `FirstPersonController.onKeyDown`.
  2. In `FirstPersonHUD.tsx`, provide an Instant Floor Teleport Segmented Control on the bottom HUD when inside a multi-story building (`totalFloors > 1`), rendering clickable pills for `Lt. 1`, `Lt. 2`, ... up to top floor (`Lt. Puncak`). Clicking any pill directly calls `fp.goToFloor(num)`.

#### D. Building-to-Road Connection (Automatic Entrance Paving Path)
- **Location**: `src/tools/BuildingTool.ts`, `src/buildings/BuildingManager.ts`, `src/roads/RoadManager.ts`.
- **Current State**:
  - When placing buildings with `BuildingTool.ts`, buildings sit on their base plinth.
  - If placed next to a road, there is a gap of green grass or dirt between the front terrace/porch and the road's sidewalk curb.
  - Currently no automatic paving path is generated.
- **Requirements**:
  1. In `BuildingManager` or `BuildingTool`, upon placing or repositioning a building:
     - Query `roadManager` for nearby road edges within proximity threshold (e.g. 1.0m to 16.0m from the building's front boundary `bld.position.z + bld.length * 0.5`).
     - If an adjacent road is detected, calculate the vector from the front terrace entrance to the nearest road sidewalk point.
     - Automatically instantiate an entrance paving walkway ribbon (`paving_block` / `sidewalk_paving`) with width 2.4m – 3.2m spanning from the terrace to the sidewalk edge, aligned flush with the terrain/plinth.

---

### 2.3 Universal CAD Studio (`CustomBuildingCreatorModal.tsx` & `CustomBuildingMeshBuilder.ts`)

#### A. Studio Creation Mode Selector (3 Modes)
- **Location**: `src/ui/components/CustomBuildingCreatorModal.tsx` (lines 3262–3350).
- **Current State**:
  - The CAD Studio header bar only displays:
    - Left: Title "Studio CAD" + Name Input.
    - Center: View preset switcher (`3D | Denah | Depan | Samping`).
    - Right: Render mode, Sun, Presets, Export, Close.
  - The Studio is locked exclusively to Building creation (Mode 1).
- **Requirements**:
  - Add a high-visibility Studio Mode Selector in the Top Header Bar:
    1. **Mode 1: Rancang Gedung Arsitektur**:
       - Massing options: Box, L-Shape, U-Shape Courtyard, Stepped Podium, Cantilever.
       - Tropical roofs, window frames, glass balconies, secondary skin louvers, terrace columns, dual-material plinth.
    2. **Mode 2: Rancang Furnitur & Interior Kustom**:
       - 3D stage displays a standalone furniture preview (Sofa, Dining Table, Workstation Desk, Bed, Cabinet/Partition).
       - Controls to customize dimensions (width, depth, height), materials (teak wood, marble, leather, woven fabric), and colors.
       - "Simpan ke Katalog First-Person" button that persists custom furniture to the local catalog (`FIRST_PERSON_FURNITURE_CATALOG` / `localStorage`) for immediate placement in First-Person mode.
    3. **Mode 3: Rancang Paviliun & Elemen Taman**:
       - 3D stage displays outdoor pavilion and park structures:
         - Garden Gazebo (wooden deck, limasan roof, baluster railings).
         - Area Entrance Gate (Gapura Candi Bentar / modern gate with signage).
         - Custom City Monument (stepped plinth, tapering obelisk/pillar, golden pinnacle).
       - Controls for dimensions, stone/wood/metal finishes, and "Bangun di Peta Kota" placement action.

#### B. 3D Studio CAD Lighting Fix (Limasan/Joglo Roof Texture Rendering)
- **Location**: `src/ui/components/CustomBuildingCreatorModal.tsx` (lines 498–523, 730–741, 1217–1246, 1309–1328).
- **Why Roofs Render Pitch Black**:
  1. **Cone Geometry Normals**: Lines 1219, 1231, and 1311 construct Joglo and Limasan roofs using `THREE.ConeGeometry(..., 4)` and non-uniformly scale the mesh (`scale.set(rw / hypot, 1, rl / hypot)`). In Three.js, non-uniform scaling without `computeVertexNormals()` distorts normals, causing lighting calculations to evaluate negative dot products against light vectors.
  2. **Missing Environment Map**: In `Building3DLivePreview`, `scene.environment` is completely undefined. High-metalness materials (such as `dark_zinc`, metalness: 0.65) require environment reflections; without an environment map, they reflect absolute blackness.
  3. **Missing UV2 for Ambient Occlusion**: `MaterialLibrary` assigns `aoMap: pkg.ao` with `aoMapIntensity: 0.95`. Three.js requires `uv2` attributes to sample AO maps correctly; when `uv2` is absent, AO map sampling can evaluate to 0 (pitch black).
  4. **Light Angles**: The Key Sun light is placed at `(4, 38, 4)` (almost directly overhead) and the Fill Light is at `(-18, 20, -16)`. The steep faces of Joglo and Limasan roofs (slopes of 35°–55°) face angles that receive minimal diffuse illumination from these two lights.
- **Fix Architecture**:
  1. Build proper quad-slope geometry for Limasan roofs using `RoofMeshBuilder.buildLimasanRoof` (which constructs 4 separate planar faces with explicit vertex positions, normals, and UVs) rather than a deformed cone.
  2. For Joglo roofs, use `RoofMeshBuilder.buildJogloRoof` with planar faceted geometry, or ensure `ConeGeometry` has explicit facet normals via `.toNonIndexed()` and `.computeVertexNormals()`.
  3. Add a soft hemispherical ambient fill (`HemisphereLight(0xffffff, 0xcbd5e1, 1.6)`) and a wrap-around fill light in `CustomBuildingCreatorModal.tsx`.
  4. Ensure `dark_zinc` and `roof_tile` materials in the CAD preview set `aoMapIntensity: 0.35` (or supply cloned `uv2` coordinates) and ensure `roughness` and `color` produce visible diffuse reflection.

#### C. 3D Dimension Line Labels Readability
- **Location**: `src/ui/components/CustomBuildingCreatorModal.tsx` (lines 63–111, 1421–1450).
- **Current State**:
  - `createTextSprite` creates a sprite scaled to `sprH = 1.15` and `sprW = 3.8 – 8.0` with font `bold 84px "Space Mono"`.
  - When the camera is positioned at standard CAD distances (20–40 meters away), labels appear diminutive and difficult to decipher.
- **Fix Architecture**:
  - Increase canvas resolution to `1024 x 256` with high-DPI scaling.
  - Enlarge font size to `bold 100px "Space Mono"`.
  - Increase sprite scale: `sprH = 1.65`, `sprW = Math.max(5.2, text.length * 0.38)`.
  - Add bold contrast background pill (`rgba(15, 23, 42, 0.92)` in blueprint mode, `rgba(255, 255, 255, 0.95)` with `#007AFF` border in light mode) for crisp legibility at all camera zoom levels.

---

## 3. In-Depth Survey of Tahap 7: Verification Setup

### 3.1 Project Configuration & Tooling

| Config File | Configuration / Role | Status |
|---|---|---|
| `package.json` | Dependencies: `three` v0.160, `react` v18.2, `zustand` v4.5, `lucide-react` v0.359, `framer-motion` v14.2. Dev: `vitest` v2.1.8, `vite` v5.1.4, `typescript` v5.3.3. | Clean, all packages installed |
| `tsconfig.json` | Target `ES2022`, module `ESNext`, `moduleResolution: "bundler"`, `strict: true`, path alias `@/* -> src/*`. | 0 errors (`npx tsc --noEmit`) |
| `vite.config.ts` | Base `./`, React plugin, `@` alias pointing to `./src`, server `port: 5173, host: true`. | Valid, builds production cleanly |
| `vitest.config.ts` | Not a separate file; Vitest natively consumes `vite.config.ts` with TypeScript support and path aliases. | All 45 test files execute cleanly |

### 3.2 Existing Test Suite Telemetry
Execution of `npx vitest run`:
- **Test Files**: 45 passed (100%)
- **Tests**: 300 passed (100%)
- **Execution Time**: 45.57s
- **Key Test Suites Covering Tahap 6**:
  1. `tests/first_person_interactive_interior.test.ts` (6 tests):
     - Door proximity detection (<2.2m open, >2.8m close).
     - Door typology distinction (swing for residential/joglo vs sliding for commercial).
     - Ergonomic seating zones (0.45m seat, 0.93m seated eye level).
     - Spinning ceiling fans & proximity lighting.
     - Real-time user furniture placement in 3D scene.
  2. `tests/first_person_builder_suite.test.ts` (13 tests):
     - Indoor jump ceiling head clearance (0.25m).
     - Furniture placement validity & collision checks against walls.
     - Hotbar switching (Digits 1–9) and furniture rotation.
     - Material painter tool and laser measure tool.
  3. `tests/batch3_furniture_lifecycle.test.ts` (6 tests):
     - `DynamicFurnitureGroup` initialization and disposal.
     - Furniture persistence in `placedFurniture` data structure.
  4. `tests/custom_building_cad_studio_v33.test.ts` (6 tests):
     - KDB & KLB calculations for all massing shapes (L, U, Podium, Cantilever).
     - L-shape structural corner columns and wooden terrace deck.
     - Integration with `BuildingTool.setCustomTemplate`.
  5. `tests/batch3_cad_studio_validator.test.ts` (4 tests):
     - Building design validations against SNI setbacks and heights.

### 3.3 Dev Server & Browser Verification Protocol
- Dev server command: `npm run dev` (`vite`).
- Dev server port: `http://localhost:5173`.
- Port status: Verified via `Get-NetTCPConnection` — actively listening on port 5173 (`Listen` / `Established`).
- Browser Agent Verification Checklist:
  1. `http://localhost:5173`: Splash / Login screen renders vector logo `ArscityLogo.tsx` cleanly.
  2. Top bar: No "Misi & Skor" button. Kontrol Cepat popup: No "Misi Kota", "Glosarium SNI", or "Kuis Arsitektur".
  3. Settings Modal: Title and toggle labels use dark charcoal text (`#0F172A`) and subtext (`#475569`) on frosted glass (zero white-on-white text). Theme selector is removed.
  4. First-Person mode (`P` or view mode selector):
     - Sofas show ergonomic tilted backrests, rounded armrests, and legs.
     - Desks show thin tops, 4 cylindrical tapered legs, and curved chairs.
     - King bed has 4 pillows, folded duvet, fabric headboard, and bedside table lamps.
     - Plants show cascading Monstera leaves in terracotta pots; floor lamps emit warm light.
     - Doors have 3D frames, double-sided handles, edge hinge rotation, and open on `E` key or proximity without getting stuck on thresholds.
     - Stairs have open ceiling voids to Floor 2; HUD bottom displays instant floor teleport pills (`Lt. 1`, `Lt. 2`, ...) and responds to `PageUp`/`PageDown`.
  5. Studio CAD (`CustomBuildingCreatorModal`):
     - Studio mode selector in top bar toggles between Mode 1 (Building), Mode 2 (Furniture & Interior), and Mode 3 (Pavilion & Park).
     - Limasan and Joglo roofs show crisp terracotta tile / dark zinc metal textures with zero pitch-black shading.
     - 3D dimension line text labels are enlarged, sharp, and clearly legible.

---

## 4. File-by-File Technical Modification Plan

| File | Target Lines | Planned Changes | Rationale / Invariant |
|---|---|---|---|
| `src/buildings/FirstPersonFurnitureCatalog.ts` | 278–460 | Rewrite `FirstPersonFurnitureBuilder.buildFurniture`: replace rough box geometries with detailed ergonomic multi-part meshes for `sofa_l`, `sofa_3seater`, `bed_king`, `dining_set`, `desk_office`, `plant_monstera`, and `floor_lamp`. | Must maintain `userData.isFurniture = true`, `userData.furnitureType = type`, and valid bounding boxes. |
| `src/buildings/InteriorMeshBuilder.ts` | 303–387 | 1. Add 3D door frame casing (jambs + head casing).<br>2. Add dual-sided metal handles at `+0.035` and `-0.035`.<br>3. Flag frame meshes with `userData.isDoor = true` and `userData.isWalkThroughPortal = true`. | Ensures doors have realistic architectural frames and dual handles without blocking player movement. |
| `src/buildings/InteriorInteractiveSystem.ts` | 249–320 | Add `toggleDoorManual(doorId: string)` or `toggleNearestDoor(playerPos)` for E-key manual interaction alongside existing proximity check. | Supports explicit E-key interaction requested in Tahap 6. |
| `src/core/engine/FirstPersonController.ts` | 374–462 | 1. In `onKeyDown`: handle `KeyE` to trigger nearest door toggle.<br>2. In `onKeyDown`: handle `PageUp` (`traverseFloor('up')`) and `PageDown` (`traverseFloor('down')`). | Provides required interaction hotkeys. |
| `src/core/engine/FirstPersonController.ts` | 1080–1105, 1115–1145 | In `canMoveHorizontal` and `calculateGroundHeight`: refine threshold detection so player does not fall or get stuck when transitioning between inside and outside. | Smooth door threshold crossing without snagging. |
| `src/buildings/PrefabMeshBuilder.ts` | 890–895 | In multi-floor buildings (e.g. `house_2fl` Villa Tropis, etc.): cut out the stairwell void (`stairW = 2.8, stairL = 4.2`) from the Floor 2 structural slab instead of building an unbroken solid slab. | Lets player walk up stairs through open stairwell void without clipping ceiling slab. |
| `src/ui/components/FirstPersonHUD.tsx` | 570–576, 1600–1640 | Render Instant Floor Teleport HUD buttons (`Lt. 1`, `Lt. 2`, ... `Lt. {totalFloors}`) allowing one-click teleportation to any floor when `totalFloors > 1`. | Implements Tahap 6 floor teleport HUD requirement. |
| `src/tools/BuildingTool.ts` / `src/buildings/BuildingManager.ts` | Placement hooks | When placing a building near a road (distance < 16m), query `roadManager` for the nearest sidewalk edge and create a connecting paving entrance path. | Automates building-to-road entrance connection. |
| `src/ui/components/CustomBuildingCreatorModal.tsx` | 63–111 | In `createTextSprite`: increase canvas resolution to 1024x256, font size to bold 100px, and sprite scale to `sprH = 1.65` for crisp readability. | Fixes tiny dimension label text in 3D CAD. |
| `src/ui/components/CustomBuildingCreatorModal.tsx` | 498–525, 730–741 | In `Building3DLivePreview`: adjust hemisphere and ambient lighting; reduce AO intensity on roof materials; add wrap-around directional fill light so steep roof slopes are never black. | Fixes pitch-black roof textures in 3D Studio CAD. |
| `src/ui/components/CustomBuildingCreatorModal.tsx` | 1217–1246, 1309–1328 | Replace raw non-uniformly scaled `ConeGeometry` for Joglo and Limasan roofs with proper faceted roof geometries with valid vertex normals and planar UVs. | Ensures tile/zinc textures render cleanly without distortion or black facets. |
| `src/ui/components/CustomBuildingCreatorModal.tsx` | Top Bar (lines 3262–3350) & Body | Add Studio Mode Selector (Mode 1: Architectural Building, Mode 2: Custom Furniture & Interior, Mode 3: Pavilion & Park Elements). Provide dedicated customization panels and 3D preview switching for Modes 2 & 3. | Implements the Universal Creation Studio requirement. |

---

## 5. Risk Assessment & Invariant Guardrails

1. **Test Suite Invariant**: All existing 45 test files and 300 tests must continue to pass 100%. Any modifications to `FirstPersonFurnitureCatalog.ts` must maintain item IDs (`sofa_l`, `sofa_3seater`, `bed_king`, etc.), dimensions, and `userData` keys (`isFurniture`, `furnitureType`).
2. **First-Person Controller Collision Invariant**: Expanding furniture detail must not increase collision bounding boxes beyond `computeRotatedFurnitureHalfExtents` or cause the player to get trapped inside furniture geometry.
3. **TypeScript Compilation Invariant**: `npx tsc --noEmit` must remain strictly at 0 errors with no type assertions that violate strict mode.
4. **Bundle Performance Invariant**: Production build (`npm run build`) must complete without errors and stay within memory limits.
