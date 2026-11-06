# Project: Arscity v4.0.0 (Versi Diperjelas)

## Architecture
Arscity v4.0.0 is an advanced Three.js and React architectural city-building and simulation application.
The application architecture is structured into decoupled core subsystems:
1. **Core 3D Engine & Rendering (`src/core/engine/`)**:
   - `Engine.ts`: High-performance WebGL renderer lifecycle, uncapped animation loop, rolling EMA FPS telemetry, scene graph management, static mesh matrix update freezing, spatial LOD invocation.
   - `LightingSystem.ts`: PBR lighting with diurnal cycle, pure DirectionalLight (sun/moon) + HemisphereLight, star dome following camera (0.9 * camera.far, sizeAttenuation: false, depthTest: false), shared emissive intensity fade without `needsUpdate`, no dynamic PointLights/SpotLights.
   - `CameraController.ts`: Smooth perspective 3D orbit, drone, and first-person cameras, plus Top-Down 2D Orthographic masterplan projection with global horizontal clipping plane at 1.2m above active floor.
   - `FirstPersonController.ts`: Physics-informed walking, predictive step-up (0.05m–0.42m height damp), eye light exposure adaptation (`isUnderRoof` damp factor ~1.22), safe floor teleportation with 150ms screen fade, surface material footstep audio, smooth head bobbing.
   - `RaycastManager.ts`: Ancestor hierarchy visibility filtering (`isObjectHierarchyVisible`) to ensure hidden objects cannot be hovered, selected, or placed.
2. **Materials & Shaders (`src/materials/`)**:
   - `MaterialLibrary.ts`: Centralized PBR material cache with shared `kacaDekat` (opacity 0.32) and `kacaJauh` (opacity 0.88, roughness 0.1), shared emissive materials for night lighting without shader re-compilation.
   - `ProceduralTextureGen.ts`: High-fidelity procedural normal, roughness, and AO map generation and botanical foliage canvases with alpha transparency.
3. **World, Landscape & Hydrology (`src/world/`, `src/tools/`)**:
   - `MalioboroPreset.ts`: Parametrically generated North-South urban corridor with zero polygon overlaps between buildings and roads.
   - `LandscapeManager.ts`: Tree foliage LOD (culling micro-branches at distance, hiding distant props > 35m during indoor focus), event-driven microclimate thermal comfort integration with parcel grass tinting.
   - `Terrain.ts` & `TerrainTool.ts`: Heightmap displacement, procedural river trench carving down to Y = -2.0m, river stone/sand slope texture blending, animated water surface at Y = -0.30m.
4. **Buildings, Interiors & CAD Studio (`src/buildings/`, `src/zones/`)**:
   - `BuildingManager.ts`: `updateSpatialLOD` (throttled 120ms / 1.5m, footprint edge distance, 3 zones with dual hysteresis: 24m/27m and 62m/68m, room focus for host building Zone 0), automatic entrance walkway paving paths connecting front terrace to road sidewalk, arcade canopy merging for adjacent rukos (<1.5m).
   - `CustomBuildingMeshBuilder.ts`: Proportional facade module subdivision (`n = max(1, floor(length / 3.0))`), proportional window/column distribution.
   - `CustomBuildingCreatorModal.tsx`: Universal Creation Studio with 3 distinct creation modes, 512x112 anti-collision dimension label canvas, elevated yellow sun ball, terracotta/steel roof tint.
   - `FirstPersonFurnitureCatalog.ts`: Rounded composite furniture models (~600 tris), slots (`floor`, `tabletop`, `wall`), chair magnet to desk (<1.3m, 0.45m seat offset, Alt to bypass), parent-child translation and deletion commands.
   - `InteriorInteractiveSystem.ts`: Two-way swing doors (dot product to door normal, swinging away from player ~100°, opening at 2.2m, closing at 3.2m).
   - `ThermalComfortEngine.ts`: Event-driven spatial index calculation (+0.35°C/floor, -1.5°C tree, -1.8°C river).
5. **UI / UX Layer (`src/ui/`, `src/app/`)**:
   - Single unified theme: Light Frosted Glass (`rgba(255, 255, 255, 0.92)`, blur 24px, saturate 180%, border `#E2E8F0`, soft shadow, label `#0F172A`, labelSecondary `#475569`, fillControl `#F1F5F9`, accent `#007AFF`). Dark and System theme options hidden in Settings.
   - `TopHeader.tsx`: Centered fixed floating bar (`top: 16px; left: 50%; transform: translateX(-50%)`), responsive overflow into "Lainnya" popup on narrow viewports, properly styled "Cerah" and circular buttons.
   - `SettingsModal.tsx`: High-contrast graphics quality segmented control (inactive text font-weight 600, active pill accent `#007AFF` with white text).
   - `FirstPersonHUD.tsx`: Unified architectural photo mode bar (lenses 24mm, 35mm, 50mm, 85mm, PNG capture, Exit).
   - `WorldHubModal.tsx`: Auto-flipping 3-dots action menu with boundary clamping.

---

## Feature Inventory
Every feature from ORIGINAL_REQUEST.md appears here with its assigned milestone:
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | T1.1 Night Lighting FPS | Eliminate dynamic PointLights/SpotLights, shared emissive cache without needsUpdate, smooth evening/morning fade, bloom on High/Ultra | M1 | ORIGINAL_REQUEST T1.1 |
| 2 | T1.2 Star Dome Fix | Star dome follows camera per frame, radius 0.9 * camera.far, sizeAttenuation: false, depthTest: false, fog: false, night fade | M1 | ORIGINAL_REQUEST T1.2 |
| 3 | T1.3 Malioboro Parametric Layout | Parametric corridor generation (road/lot width, setback) with zero building-to-building and building-to-road polygon overlaps (0.1m tolerance) | M1 | ORIGINAL_REQUEST T1.3 |
| 4 | T1.4 Single Light Frosted Glass UI | Clean literal dark backgrounds (66 occurrences), enforce Light Frosted Glass tokens, fix prefers-reduced-transparency bug, hide Dark/System theme options | M1 | ORIGINAL_REQUEST T1.4 |
| 5 | T1.5 TopHeader Fixed Center | `position: fixed`, `top: 16px`, `left: 50%`, `transform: translateX(-50%)`, responsive overflow to "Lainnya" menu on narrow viewports, z-index above docks | M1 | ORIGINAL_REQUEST T1.5 |
| 6 | T1.6 Cerah & Circular Buttons | "Cerah" and 2 circular buttons styled with `fillControl` background, `label` text, `currentColor` icon, true circular shape | M1 | ORIGINAL_REQUEST T1.6 |
| 7 | T1.7 Graphics Preset Text Visibility | Segmented control inactive text `var(--label)` with `fontWeight: 600`, active pill `var(--accent)` with white text | M1 | ORIGINAL_REQUEST T1.7 |
| 8 | T1.8 Photo Mode Unified Bar | Single unified glass bottom bar containing 4 lenses (24, 35, 50, 85mm), PNG capture button, and Exit button | M1 | ORIGINAL_REQUEST T1.8 |
| 9 | T1.9 WorldHub Popover Auto-Flip | 3-dots action menu auto-flips upwards when bottom space < 160px with modal boundary clamping | M1 | ORIGINAL_REQUEST T1.9 |
| 10 | T2.1 updateSpatialLOD Function | Throttled LOD updates (120ms / 1.5m displacement), distance calculated to nearest footprint/bbox edge via `PolygonMath` | M2 | ORIGINAL_REQUEST T2.1 |
| 11 | T2.2 3 Zones with Dual Hysteresis | Zone 0 (<24m, exit >27m), Zone 1 (27-65m, exit >68m, return <62m), Zone 2 (>65m), shared `kacaDekat` / `kacaJauh` glass materials, tree foliage LOD | M2 | ORIGINAL_REQUEST T2.2 |
| 12 | T2.3 Indoor Room Focus | Host building clamped to Zone 0, hide all other buildings' interiors & placed furniture + distant landscape props > 35m | M2 | ORIGINAL_REQUEST T2.3 |
| 13 | T2.4 Raycaster Visibility Filtering | Three.js raycasting ancestor visibility filter (`isObjectHierarchyVisible`) blocking hover/delete/sit/placement on hidden objects | M2 | ORIGINAL_REQUEST T2.4 |
| 14 | T2.5 Static Mesh Matrix Freezing | Static building and tree meshes set `matrixAutoUpdate = false` and `updateMatrixWorld(true)`, unfrozen on transform/edit | M2 | ORIGINAL_REQUEST T2.5 |
| 15 | T2.6 Dev Mode LOD Telemetry Overlay | Developer mode overlay tracking and displaying object counts per LOD zone (Zone 0, Zone 1, Zone 2) | M2 | ORIGINAL_REQUEST T2.6 |
| 16 | T3.1 Dynamic Eye Light Adaptation | `isUnderRoof` detection with upward raycast (6m), smooth exposure damping (lambda ~3, factor ~1.22 on diurnal exposure) | M3 | ORIGINAL_REQUEST T3.1 |
| 17 | T3.2 Smooth Auto Step-Up | Predictive step-up for 0.05m–0.42m height deltas (damp lambda ~12), headroom check (>= 1.7m), vertical wall (>0.42m) collision block | M3 | ORIGINAL_REQUEST T3.2 |
| 18 | T3.3 Two-Way Swing Doors | Proximity detection (2.2m open, 3.2m close), dot product to door normal to swing away from player ~100° | M3 | ORIGINAL_REQUEST T3.3 |
| 19 | T3.4 Dual Floor Navigation | Physical stair traversal + instant floor teleportation hotkeys ([PageUp]/[PageDown] & HUD floor buttons) with safe landing & 150ms screen fade | M3 | ORIGINAL_REQUEST T3.4 |
| 20 | T3.5 Footstep Audio by Material | Downward surface raycast detecting 6 materials (grass, asphalt, paving/concrete, wood, ceramic/marble, dirt), procedural Web Audio API footsteps every 1.8m | M3 | ORIGINAL_REQUEST T3.5 |
| 21 | T3.6 Smooth Head Bobbing | Vertical head bobbing (~0.015m amplitude), stops in ~0.15s when idle or aiming furniture, toggle in Settings, respects `reduceMotion` | M3 | ORIGINAL_REQUEST T3.6 |
| 22 | T4.1 Surface Furniture Data Model | Slots: `'floor'`, `'tabletop'`, `'wall'`, optional `parentId`, schema migration for legacy saves to `'floor'`, catalog slot metadata | M4 | ORIGINAL_REQUEST T4.1 |
| 23 | T4.2 Tabletop & Wall Placement Logic | Local grid snap on parent tabletop surface without overflowing edge, wall alignment (0.8m–2.2m height) on vertical normals, slot ghost hint | M4 | ORIGINAL_REQUEST T4.2 |
| 24 | T4.3 Rounded 3D Furniture Models | Cylinders, capsules, and beveled cushion geometries for sofas, chairs, tables (~600 tris budget, cached geometries) | M4 | ORIGINAL_REQUEST T4.3 |
| 25 | T4.4 Chair Magnet & Parent-Child Rel | Auto-rotate chair to face desk center when < 1.3m, snap 0.45m seat offset (Alt to bypass), move/delete table propagates to children with atomic undo/redo | M4 | ORIGINAL_REQUEST T4.4 |
| 26 | T5.1 Automatic Entrance Walkway | Stone paving path (1.2m wide) from building front door to sidewalk when 1m–18m from road, boundary fence gate opening, counted in KDH | M5 | ORIGINAL_REQUEST T5.1 |
| 27 | T5.2 Shophouse Arcade Canopy Merge | Adjacent rukos (<1.5m) merge ground terrace canopy into continuous arcade with joint column, no KDB/KLB change | M5 | ORIGINAL_REQUEST T5.2 |
| 28 | T5.3 Proportional Facade Modules | Wall module count `n = max(1, floor(length / 3.0))`, proportional window and column distribution, integrated shape validator | M5 | ORIGINAL_REQUEST T5.3 |
| 29 | T5.4 CAD Studio 3D Dimension & Roof | 512x112 anti-collision dimension label canvas with DPR scaling, elevated yellow sun ball, terracotta/steel default roof tint | M5 | ORIGINAL_REQUEST T5.4 |
| 30 | T5.5 Event-Driven Ecology Simulation | Spatial index calculation (+0.35°C/floor, -1.5°C tree, -1.8°C river), parcel grass tinting based on microclimate temperature | M5 | ORIGINAL_REQUEST T5.5 |
| 31 | T5.6 2D Architectural Floor Plan | Top-down orthographic camera, horizontal clipping plane at 1.2m above active floor, floor selector for multi-story buildings, sharp wall cross-sections | M5 | ORIGINAL_REQUEST T5.6 |
| 32 | T6.1 Full Test Suite & Build Verification | 0 `tsc --noEmit` errors, 100% `vitest` pass, clean `npm run build`, new test suites for all implemented features | M6 | ORIGINAL_REQUEST T6.1 |
| 33 | T6.2 Measured FPS Telemetry Protocol | Real FPS/draw calls/triangles measurements on 300 buildings load test and Malioboro (day/night, orbit, first-person indoor/outdoor) | M6 | ORIGINAL_REQUEST T6.2 |
| 34 | T6.3 Browser Visual Inspection & Screenshots | Browser inspection on 1920x1080 and 1366x768 with screenshot evidence saved to `docs/v4/` | M6 | ORIGINAL_REQUEST T6.3 |
| 35 | Final V4 Report | Comprehensive report in `docs/V4_REPORT.md` with task status table, before/after metrics, files changed, and decisions | M6 | ORIGINAL_REQUEST §10 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Tahap 1: Perbaikan 9 Bug Kritis | Features 1–9 (T1.1–T1.9) | none | DONE |
| M2 | Tahap 2: Render Jarak Bertingkat (3 Zona LOD) | Features 10–15 (T2.1–T2.6) | M1 | DONE |
| M3 | Tahap 3: Enam Logika Mode Pejalan Kaki | Features 16–21 (T3.1–T3.6) | M2 | DONE |
| M4 | Tahap 4: Perabot Berpermukaan & Magnet Kursi | Features 22–25 (T4.1–T4.4) | M3 | PLANNED |
| M5 | Tahap 5: Adaptasi Kota, Fasad, Ekologi, Denah 2D | Features 26–31 (T5.1–T5.6) | M4 | PLANNED |
| M6 | Tahap 6: Verifikasi, Telemetri FPS & Laporan Akhir | Features 32–35 (T6.1–T6.3, V4_REPORT.md) | M1, M2, M3, M4, M5 | PLANNED |

---

## Interface Contracts

### BuildingManager ↔ FirstPersonController (LOD & Indoor Focus)
- `buildingManager.updateSpatialLOD(cameraPosition: THREE.Vector3, isFirstPerson: boolean, currentIndoorBuildingId: string | null)`:
  - Throttled every 120ms or camera displacement > 1.5m.
  - Clamps `currentIndoorBuildingId` to Zone 0, hides all other buildings' `InteriorDetails` and `DynamicFurnitureGroup`, and hides distant landscape props > 35m.
- `firstPersonController.getInsideBuildingId(): string | null`:
  - Returns the building ID the avatar is currently inside, or `null`.

### LightingSystem ↔ Engine (Diurnal & Emissive Cache)
- `lightingSystem.update(hour: number, camera: THREE.Camera)`:
  - Updates sun/moon direction and hemisphere light.
  - Updates `starPoints.position.copy(camera.position)` per frame.
  - Evaluates diurnal emissive factor: rises smoothly 17:30–18:30, falls 05:00–06:00.
  - Updates shared emissive intensity without setting `material.needsUpdate = true`.

### ProceduralAudio ↔ FirstPersonController (Footstep Audio)
- `proceduralAudio.playFootstep(surfaceType: 'grass' | 'asphalt' | 'paving' | 'wood' | 'ceramic' | 'dirt')`:
  - Synthesizes filtered procedural noise bursts via Web Audio API.
  - Bounded to maximum 4 concurrent voices.
  - Respects master sound settings and mute status.

---

## Code Layout
- `src/core/engine/`:
  - `LightingSystem.ts` (Owned by M1)
  - `Engine.ts` (Owned by M1, M2, M5)
  - `FirstPersonController.ts` (Owned by M2, M3, M4)
  - `RaycastManager.ts` (Owned by M2)
  - `PostProcessingManager.ts` (Owned by M1)
- `src/materials/`:
  - `MaterialLibrary.ts` (Owned by M1, M2)
- `src/world/`:
  - `MalioboroPreset.ts` (Owned by M1)
  - `LandscapeManager.ts` (Owned by M1, M2, M5)
  - `ThermalComfortEngine.ts` (Owned by M5)
- `src/roads/`:
  - `RoadPropPlacer.ts` (Owned by M1)
- `src/buildings/`:
  - `BuildingManager.ts` (Owned by M2, M5)
  - `InteriorInteractiveSystem.ts` (Owned by M1, M3)
  - `InteriorMeshBuilder.ts` (Owned by M3)
  - `FirstPersonFurnitureCatalog.ts` (Owned by M4)
  - `CustomBuildingMeshBuilder.ts` (Owned by M5)
- `src/audio/`:
  - `ProceduralAudio.ts` (Owned by M3)
- `src/ui/components/`:
  - `TopHeader.tsx` (Owned by M1, M5)
  - `SettingsModal.tsx` (Owned by M1, M2, M3)
  - `FirstPersonHUD.tsx` (Owned by M1, M3)
  - `WorldHubModal.tsx` (Owned by M1)
  - `SegmentedControl.tsx` (Owned by M1)
  - `CustomBuildingCreatorModal.tsx` (Owned by M5)
  - `InspectorPanel.tsx`, `SideUtilityDock.tsx`, `BottomToolbar.tsx`, `Minimap.tsx` (Owned by M1)
- `src/app/index.css` (Owned by M1)
- `docs/`:
  - `docs/audit/warna_gelap.txt` (Owned by M1)
  - `docs/v4/` (Screenshots, Owned by M6)
  - `docs/V4_REPORT.md` (Final report, Owned by M6)

