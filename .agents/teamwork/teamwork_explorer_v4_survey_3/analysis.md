# Arscity v4.0 Architecture & Codebase Survey: Tahap 2 & Tahap 3

**Author**: `teamwork_explorer_v4_survey_3` (Explorer Archetype)  
**Date**: 2026-11-02  
**Target Milestone**: Tahap 2 (3-Zone LOD Rendering T2.1–T2.6) & Tahap 3 (First-Person 6 Logics T3.1–T3.6)  
**Target Requirements Reference**: `c:\Projects\Arscity\.agents\teamwork\ORIGINAL_REQUEST.md` (Sections 5 & 6)

---

## 1. Executive Summary

This investigation provides an empirical, code-level architectural survey of **Tahap 2 (Render Jarak Bertingkat / 3 Zona LOD)** and **Tahap 3 (Enam Logika Mode Pejalan Kaki / First-Person)** in Arscity v4.0.

### Key Discoveries:
1. **LOD Architecture (Tahap 2)**:
   - The current engine uses legacy V6 `updateLOD` (`src/buildings/BuildingManager.ts:600`) executed every 6 frames in `Engine.ts:892` using spherical center-to-center distance (`bld.position.distanceToSquared(cameraPosition)`), with hardcoded cutoffs at 80m and 250m.
   - There is currently **no** `updateSpatialLOD` method, no distance-to-edge calculation for polygon footprints/OBB, no dual-boundary hysteresis (24m/27m and 62m/68m), no glass material reference swapping between `kacaDekat` and `kacaJauh`, no tree foliage LOD culling in `LandscapeManager`, and no matrix freezing (`matrixAutoUpdate` is currently `true` on all scene meshes).
   - Raycasting does not check hierarchy visibility, meaning culled interior furniture in distant buildings remains interactable.
2. **First-Person Experience (Tahap 3)**:
   - `FirstPersonController.ts` already tracks indoor state (`insideBuildingId`), upward roof raycasts (`isUnderRoof`), stair traversal, and seat interactions, but lacks:
     - **Eye light adaptation**: Tone mapping exposure is static (fixed at 1.0 in `Engine.ts:164`). There is no damp transition between outdoor (1.05) and indoor (~1.28).
     - **Auto step-up**: Ground height currently hard-snaps or requires jump; there is no predictive damp elevation (lambda ~12) for 0.05m–0.42m steps, nor headroom verification.
     - **Two-way door swing**: Doors open in a single fixed direction (`door.currentRatio * door.swingAngle`) without dot product evaluation against the player direction, closing at 2.8m instead of 3.2m.
     - **Safe floor teleport**: `traverseFloor` / `goToFloor` only mutates `position.y` without finding a clear landing point or playing a 150ms screen fade.
     - **Footstep audio**: There is no footstep sound generator in `ProceduralAudio.ts` and no surface material detection under player feet.
     - **Head bobbing**: No camera head bobbing exists; camera position strictly matches `smoothedCameraY`.

---

## 2. Tahap 2: 3-Zone LOD Rendering Survey (T2.1 - T2.6)

### T2.1: `updateSpatialLOD` Throttling & Footprint Edge Distance

#### Existing Code Analysis:
- In `src/buildings/BuildingManager.ts:600-705`, `updateLOD` evaluates distance via:
  ```typescript
  // BuildingManager.ts:623
  const distSq = bld.position.distanceToSquared(cameraPosition);
  ```
- In `src/core/engine/Engine.ts:891-904`:
  ```typescript
  // Lapis 1: Smart Hierarchical LOD (executed every 6 frames)
  this.lodFrameCount++;
  if (this.lodFrameCount % 6 === 0) {
    this.buildingManager.updateLOD(...);
  }
  ```
- **Flaws Identified**:
  1. **Center vs Edge**: A 40m-long skyscraper has its center 20m from its perimeter. If a player is 3m from the exterior wall, `bld.position.distanceTo(camera)` evaluates to 23m+. For a large mall or apartment, center distance exceeds 30m even when the player is inside the lobby.
  2. **Frame-based vs Time/Displacement Throttle**: Frame-modulo (`% 6`) produces variable execution frequency at different monitor refresh rates (e.g., 144Hz = every 41.6ms; 30Hz = every 200ms).

#### Architecture Specification for T2.1:
1. **Method Signature**:
   ```typescript
   public updateSpatialLOD(
     cameraPosition: THREE.Vector3,
     isFirstPerson: boolean,
     currentIndoorBuildingId: string | null
   ): void
   ```
2. **Throttling Mechanism**:
   Store `lastLODTime: number` and `lastLODCamPos: THREE.Vector3`.
   Execute only when:
   `performance.now() - this.lastLODTime >= 120 || cameraPosition.distanceTo(this.lastLODCamPos) > 1.5`.
3. **Footprint Edge Distance Algorithm**:
   - `BuildingManager.getBuildingWorldFootprint(bld)` (`BuildingManager.ts:467-491`) returns `Vec2D[]` world polygon vertices.
   - Point `cam2D = { x: cameraPosition.x, y: cameraPosition.z }`.
   - If `PolygonMath.isPointInPolygon(cam2D, footprint)` is true, distance = 0.
   - Otherwise, iterate over all edges `(footprint[i], footprint[(i + 1) % N])` and compute minimum `PolygonMath.distancePointToSegment(cam2D, p1, p2)` (`PolygonMath.ts:112-129`).
   - If footprint is unavailable, fallback to oriented bounding box (OBB) via `PolygonMath.getOrientedBoxVertices`.

---

### T2.2: 3-Tier Distance Zones with Dual Hysteresis & Glass Materials

#### Zone Definitions & Hysteresis State:
Each building instance must maintain a persistent LOD zone state: `currentZone: 0 | 1 | 2` (defaults to 0 or 2 upon spawn).

| Zone | Boundary In | Boundary Out | Visibility Target |
|---|---|---|---|
| **Zone 0 (Near)** | `< 24.0 m` | `> 27.0 m` | `InteriorDetails`: `true`<br>`DynamicFurnitureGroup`: `true`<br>Window frames (`DetailPropsGroup`): `true`<br>Glass: `kacaDekat` (opacity 0.32)<br>Trees: Full foliage + fallen petals + shrubs |
| **Zone 1 (Mid)** | `24.0 m - 65.0 m`<br>(enters Z1 from Z2 at `< 62.0 m`) | `> 68.0 m` (to Z2)<br>`< 24.0 m` (to Z0) | `InteriorDetails`: `false`<br>`DynamicFurnitureGroup`: `false`<br>`ExteriorShell`: `true`<br>`DetailPropsGroup`: `true`<br>Glass: `kacaJauh` (opacity 0.88, roughness 0.1)<br>Trees: Trunk + main canopy, hide micro-branches / petals |
| **Zone 2 (Far)** | `> 65.0 m`<br>(enters Z2 from Z1 at `> 68.0 m`) | `< 62.0 m` (returns to Z1) | `InteriorDetails`: `false`<br>`DynamicFurnitureGroup`: `false`<br>`DetailPropsGroup`: `false`<br>`LOD2MassingGroup`: `false` or visible only beyond 250m<br>`ExteriorShell`: `true`<br>Trees: Simplified silhouette / trunk only |

#### Hysteresis State Transition Logic:
```typescript
function computeNewZone(currentZone: 0 | 1 | 2, dist: number): 0 | 1 | 2 {
  if (currentZone === 0) {
    if (dist > 27.0) {
      return dist > 68.0 ? 2 : 1;
    }
    return 0;
  } else if (currentZone === 1) {
    if (dist < 24.0) return 0;
    if (dist > 68.0) return 2;
    return 1;
  } else { // currentZone === 2
    if (dist < 24.0) return 0;
    if (dist < 62.0) return 1;
    return 2;
  }
}
```

#### Shared Glass Materials:
- Currently, windows are rendered with `glass`, `glass_lit`, or `glass_dark` created per building in `FacadeMeshBuilder.ts:181-195` and `MaterialLibrary.ts:892-932`.
- In `MaterialLibrary.ts`, define two shared singleton materials:
  - `kacaDekat`: `MeshPhysicalMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.32, roughness: 0.04, transmission: 0.65, ior: 1.52, reflectivity: 0.9 })`
  - `kacaJauh`: `MeshPhysicalMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.88, roughness: 0.10, transmission: 0.10, ior: 1.52, reflectivity: 0.95 })`
- Window glass meshes are tagged with `userData.isWindowGlass = true`.
- When switching zones, swap reference `mesh.material = (zone === 0 ? kacaDekat : kacaJauh)`. **Never clone materials.**

#### Tree Foliage LOD:
- In `LandscapeManager.ts`, tree groups contain:
  - Trunk mesh: `itemGroup.children.find(c => c.name.includes('Trunk'))`
  - Canopy clusters: `itemGroup.children.filter(c => c.name.includes('Canopy'))`
  - Micro-details (petals, shrubs): `itemGroup.children.filter(c => c.name.includes('Petal') || c.name.includes('Detail'))`
- In `LandscapeManager.updateSpatialLOD(cameraPosition)`:
  - Zone 0: All children visible.
  - Zone 1: Hide petal carpets and micro-shrubs (`petalMesh.visible = false`). Main canopy and trunk visible.
  - Zone 2: Canopy and trunk visible, all accessories hidden.

---

### T2.3: Room Focus Inside Buildings (`currentIndoorBuildingId`)

#### Existing Code Analysis:
- `FirstPersonController.ts:1143` updates `this.insideBuildingId = bld.id` when player enters a building, and `this.insideBuildingId = null` (`FirstPersonController.ts:1213`) when exiting.
- In `InteriorInteractiveSystem.ts:71`, `activeIndoorBuildingId` tracks the current building.

#### Architecture Specification for T2.3:
When `currentIndoorBuildingId !== null`:
1. **Host Building (`bld.id === currentIndoorBuildingId`)**:
   - Force `currentZone = 0` regardless of camera distance or footprint calculations.
   - Force `grp.userData.interiorDetails.visible = true` and `grp.userData.dynamicFurnitureGroup.visible = true`.
2. **All Other Buildings (`bld.id !== currentIndoorBuildingId`)**:
   - Force `interiorDetails.visible = false`.
   - Force `dynamicFurnitureGroup.visible = false`.
3. **Landscape Elements**:
   - Find host building position `hostPos = hostBuilding.position`.
   - For all landscape items: compute `distToHost = item.position.distanceTo(hostPos)`.
   - If item is a small prop (`type.startsWith('street_')`, `'flora_'`, `'biopore'`, `'well'`, `'shrub'`) and `distToHost > 35.0`:
     - Set `group.visible = false`.
4. **On Exit (`currentIndoorBuildingId === null`)**:
   - Restore all building and landscape visibilities via standard distance evaluation on the next 120ms cycle.

---

### T2.4: Raycaster Hierarchy Filtering

#### Existing Code Analysis:
- In `RaycastManager.ts:124-158`, `raycastObjects(objects)` calls `this.raycaster.intersectObjects(objects, true)`.
- In `FirstPersonController.ts:1370`, `this.centerRaycaster.intersectObjects(bldGroup.children, true)` is called for furniture hover.
- In `FirstPersonController.ts:1438`, `this.centerRaycaster.intersectObjects(bldGroup.children, true)` is called for floor placement.
- Three.js raycasting does **not** evaluate ancestor visibility for nested children: if an intermediate parent group (`InteriorDetails`) has `visible = false`, a child mesh whose local `visible` property is `true` may still be traversed or hit depending on hierarchy queries.

#### Architecture Specification for T2.4:
Implement a global visibility filter predicate:
```typescript
export function isObjectHierarchyVisible(obj: THREE.Object3D | null): boolean {
  let curr = obj;
  while (curr) {
    if (!curr.visible) return false;
    curr = curr.parent;
  }
  return true;
}
```
Apply this filter:
1. In `RaycastManager.raycastObjects`: Filter returned intersections with `intersects.filter(hit => isObjectHierarchyVisible(hit.object))`.
2. In `FirstPersonController.updateCenterRaycast`:
   - Furniture hover loop: `if (!isObjectHierarchyVisible(hit.object)) continue;`
   - Floor placement: ignore hits where `!isObjectHierarchyVisible(floorHit.object)`.
   - Seat interaction: seats in hidden buildings are excluded from `getNearestSeat`.

---

### T2.5: Matrix Freezing for Static Meshes

#### Existing Code Analysis:
- `matrixAutoUpdate` is currently `true` on all scene meshes across the entire codebase. Every single frame, Three.js walks the scene tree recalculating local matrices for hundreds of static building walls, slabs, windows, and landscape meshes.

#### Architecture Specification for T2.5:
1. **Freezing Rule**:
   - In `PrefabMeshBuilder.instantiateFromTemplates` and `CustomBuildingMeshBuilder.buildCustomBuilding`:
     ```typescript
     mesh.matrixAutoUpdate = false;
     mesh.updateMatrix();
     mesh.updateMatrixWorld(true);
     ```
   - In `LandscapeManager.buildMeshForItem` and `AestheticLandscapeBuilder.buildMesh`:
     ```typescript
     mesh.matrixAutoUpdate = false;
     mesh.updateMatrix();
     mesh.updateMatrixWorld(true);
     ```
2. **Exclusion (Dynamic / Animated Meshes MUST NOT be frozen)**:
   - Door leaf pivots (`doorPivot` and `leftLeafMesh` in `InteriorMeshBuilder.ts:320-340`).
   - Ceiling fan blades (`fanGroup` in `InteriorInteractiveSystem.ts:341`).
   - River water animated mesh (`RiverManager.ts`).
   - Temporary placement preview ghosts (`BuildingTool.ts`, `FirstPersonController.ts`).
3. **Unfreezing / Re-updating on Transform / Edit**:
   - In `BuildingManager.updateBuilding`, `attachFurniture`, `detachFurniture`: Unfreeze / call `updateMatrix()` and `updateMatrixWorld(true)`.
   - In `LandscapeManager.updateItemPosition`: Update group matrix and call `updateMatrixWorld(true)`.

---

### T2.6: Developer Tool Overlay for LOD Zones

#### Existing Code Analysis:
- In `SettingsModal.tsx:579-670`, a "PENGEMBANG & DIAGNOSTIK" section exists with `showFps` and `LoadTestModal`.
- In `useUIStore.ts`, state currently tracks `showFps`.

#### Architecture Specification for T2.6:
1. In `useUIStore.ts`:
   - Add `showLODOverlay: boolean` and `setShowLODOverlay: (val: boolean) => void`.
   - Add `lodZoneCounts: { zone0: number; zone1: number; zone2: number; totalBuildings: number }`.
2. In `BuildingManager.updateSpatialLOD`:
   - Count buildings in Zone 0, Zone 1, and Zone 2 during each LOD update pass.
   - If developer overlay is enabled, push stats to `useUIStore`.
3. In `TopHeader.tsx` or `SettingsModal.tsx`:
   - Render a frosted telemetry capsule when developer mode is active:
     `LOD: Z0: 4 | Z1: 18 | Z2: 82 (Total: 104)`.

---

## 3. Tahap 3: First-Person 6 Logics Survey (T3.1 - T3.6)

### T3.1: Eye Light Adaptation (Adaptasi Cahaya Mata)

#### Existing Code Analysis:
- In `src/core/engine/Engine.ts:164`:
  ```typescript
  this.renderer.toneMappingExposure = 1.0;
  ```
- Exposure is never modified dynamically. There is no diurnal modulation or indoor roof adaptation.
- In `FirstPersonController.ts:892-899`, `isUnderRoof` is evaluated via upward raycast:
  ```typescript
  // FirstPersonController.ts:1270-1282
  private checkIfUnderRoof(pos: THREE.Vector3): boolean {
    if (this.insideBuildingId) return true;
    if (!this.buildingManager || this.buildingManager.masterGroup.children.length === 0) return false;
    this.upRaycaster.set(pos, this._scratchUpDir);
    const hits = this.upRaycaster.intersectObjects(this.buildingManager.masterGroup.children, true);
    return hits.some((h) => !this.isPlacedFurnitureObject(h.object));
  }
  ```
  Note: `upRaycaster.far` is currently set to `30.0` (`FirstPersonController.ts:195`), whereas T3.1 specifies checking within 6m.

#### Architecture Specification for T3.1:
1. **Single Exposure Owner**:
   - `FirstPersonController` (or `Engine.ts`) owns `renderer.toneMappingExposure`.
2. **Parameters & Target Calculation**:
   - Diurnal base outdoor exposure: `baseExposure = 1.05`.
   - Indoor factor: `indoorFactor = 1.22` (results in target exposure `1.05 * 1.22 ≈ 1.28`).
   - If `cameraMode === 'first_person'`:
     `targetExposure = this.isUnderRoof ? 1.28 : 1.05`.
   - If `cameraMode === 'orbit' || cameraMode === '2d'`:
     `targetExposure = 1.05`.
3. **Smooth Transition**:
   ```typescript
   this.currentExposure = THREE.MathUtils.damp(
     this.currentExposure,
     targetExposure,
     3.0, // lambda ~3 gives ~1 second smooth adaptation
     dt
   );
   this.renderer.toneMappingExposure = this.currentExposure;
   ```
4. **Debounced Upward Raycast**:
   - Set `upRaycaster.far = 6.0`.
   - Accumulate debounce time: `roofCheckAccumulatorMs += dt * 1000`.
   - Only execute upward raycast when `roofCheckAccumulatorMs >= 150`.

---

### T3.2: Auto Step-Up Navigation (Naik Langkah Otomatis)

#### Existing Code Analysis:
- In `FirstPersonController.ts:833-853`, movement is evaluated using `testWallCollision(dx, dz)`.
- In `FirstPersonController.ts:856-885`, `calculateGroundHeight` evaluates target ground Y, and line 883 executes:
  ```typescript
  if (this.position.y <= targetY) {
    this.position.y = targetY;
    this.velocityY = 0;
  }
  ```
  This causes an instant vertical snap when stepping onto curbs or plinths.
- In `testWallCollision(dx, dz)` (`FirstPersonController.ts:1070-1071`), rays are cast at waist (`y - 0.75`) and chest (`y - 0.35`). A low wall (e.g. 0.6m high) is below waist level and may fail to block horizontal movement!

#### Architecture Specification for T3.2:
1. **Predictive Surface Probe**:
   When moving forward with horizontal velocity `(dx, dz)`:
   - Probe point ahead: `probePos = (position.x + dx, position.z + dz)`.
   - Target ground elevation: `targetGroundY = calculateGroundHeight(probePos.x, probePos.y)`.
   - Current ground elevation: `currentGroundY = calculateGroundHeight(position.x, position.z)`.
   - Step differential: `stepDelta = targetGroundY - currentGroundY`.
2. **Step-Up Condition (0.05m to 0.42m)**:
   If `stepDelta >= 0.05 && stepDelta <= 0.42`:
   - **Headroom check**: Verify clearance above `targetGroundY` is at least 1.7m (`ceilingY - targetGroundY >= 1.7`).
   - **Furniture check**: Verify target surface is not a furniture bounding box (`!isPlacedFurnitureObject`).
   - **Wall check**: Vertical surfaces higher than 0.42m must block! Cast a horizontal ray at height `currentGroundY + 0.48m` in direction `(dx, dz)`. If a vertical wall face is hit within player radius, block motion (`canMove = false`).
   - **Damped Elevation**:
     ```typescript
     this.position.y = THREE.MathUtils.damp(
       this.position.y,
       targetGroundY + this.eyeHeight,
       12.0, // lambda ~12 for smooth, snappy step-up
       dt
     );
     ```
3. **Obstacle Condition (> 0.42m)**:
   - If `stepDelta > 0.42m`, it is considered a wall or high barrier. Prevent forward motion (`canMove = false`).

---

### T3.3: Two-Way Swing Doors (Pintu Ayun Dua Arah)

#### Existing Code Analysis:
- In `src/buildings/InteriorInteractiveSystem.ts:274-279`:
  ```typescript
  if (dY < 2.2) {
    if (dHorizontal < 2.2) {
      door.targetRatio = 1.0;
    } else if (dHorizontal > 2.8) {
      door.targetRatio = 0.0;
    }
  }
  ```
  Closing threshold is 2.8m (prompt specifies 3.2m).
- In `InteriorInteractiveSystem.ts:303`:
  ```typescript
  const angle = door.currentRatio * door.swingAngle;
  door.leftLeafMesh.rotation.y = angle;
  ```
  The door always swings in one fixed direction (+90°). If approached from the opposite side, the door swings directly into the player's face!
- In `InteriorMeshBuilder.ts:356`: `swingAngle: Math.PI * 0.5` (~90°), whereas T3.3 specifies ~100° (`1.745 rad`).

#### Architecture Specification for T3.3:
1. **Proximity Thresholds**:
   - Open threshold: `< 2.2m`.
   - Close threshold: `> 3.2m`.
2. **Two-Way Direction Calculation**:
   - In `InteractiveDoor` interface, add `swingDirection: 1 | -1`.
   - Door normal vector in world space:
     ```typescript
     const doorNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(door.group.quaternion);
     ```
   - Vector from door to player:
     ```typescript
     const playerToDoor = new THREE.Vector3().subVectors(playerPos, door.worldPosition);
     const dot = playerToDoor.dot(doorNormal);
     ```
   - When triggering door open (`door.targetRatio === 1.0` and `door.currentRatio < 0.05`):
     - If `dot >= 0`: Player is on positive normal side. Swing AWAY from player: `door.swingDirection = -1`.
     - If `dot < 0`: Player is on negative normal side. Swing AWAY from player: `door.swingDirection = 1`.
3. **Swing Geometry & Timing**:
   - `maxSwingAngle = 100 * (Math.PI / 180) ≈ 1.745 rad`.
   - `angle = door.currentRatio * maxSwingAngle * door.swingDirection`.
   - Easing damp lambda: `~9.0` (yields ~0.35s opening time).
4. **Collision Exclusion**:
   - In `FirstPersonController.testWallCollision`, door leaf meshes are already ignored via `hit.object.userData?.isDoor` and name filters (`FirstPersonController.ts:1090-1094`), ensuring the player never gets stuck in the doorway.

---

### T3.4: Dual Floor Navigation (Physical Stairs & Instant Teleportation)

#### Existing Code Analysis:
- `traverseFloor` (`FirstPersonController.ts:1859-1895`) and `goToFloor` (`FirstPersonController.ts:1897-1922`):
  - Only updates `this.targetFloor` and recalculates `position.y = baseY + (targetFloor - 1) * flH + eyeHeight`.
  - Does **not** adjust `(x, z)` position. If the player is standing where upper floors have a wall or void, they end up trapped.
  - Does **not** include a 150ms screen fade.
  - Does **not** trigger `updateSpatialLOD` or microclimate card updates.
- In `FirstPersonHUD.tsx:1604-1644`, the HUD only provides `<ChevronUp>` and `<ChevronDown>` buttons, missing direct number buttons (Lt. 1, Lt. 2, Lt. 3).

#### Architecture Specification for T3.4:
1. **Safe Landing Point Selection**:
   - On the target floor:
     - Check if current `(x, z)` position is valid on target floor (inside floor polygon, >= 0.4m from all walls, not colliding with furniture).
     - If current `(x, z)` is occupied or invalid: teleport to the stair landing point (`bld.userData.stairZones[targetFloor - 1].landingPoint` or default safe core offset).
2. **150ms Visual Screen Fade**:
   - In `FirstPersonHUD.tsx`, provide a full-screen transition overlay (`opacity: isTeleporting ? 1 : 0`, `transition: opacity 150ms ease`).
3. **HUD Quick Floor Selector Buttons**:
   - Render pills: `[Lt. 1] [Lt. 2] ... [Lt. N]` in `FirstPersonHUD.tsx` bottom bar.
   - Active floor highlighted with token accent.
   - Keyboard hotkeys `PageUp` and `PageDown` preserved.
4. **Post-Teleport Refresh**:
   - Immediately execute `this.checkIfUnderRoof(this.position)`.
   - Call `engine.buildingManager.updateSpatialLOD(...)`.
   - Emit updated state to update microclimate card.

---

### T3.5: Surface Material Footstep Audio

#### Existing Code Analysis:
- `ProceduralAudio.ts` contains sound effects for UI clicks, building placement, demolition, and rain ambience, but **zero** footstep methods.
- `FirstPersonController.ts` has no footstep distance accumulation or surface raycast.

#### Architecture Specification for T3.5:
1. **Surface Type Detection**:
   In `FirstPersonController.ts`:
   - Cast ray downward from feet: `downRaycaster.set(position, (0, -1, 0))`.
   - Inspect hit mesh:
     - Terrain mesh with grass material / garden patch -> `'grass'`
     - Road asphalt mesh -> `'asphalt'`
     - Sidewalk / paving block / concrete plinth -> `'paving'`
     - Wooden floor / parquet / teak -> `'wood'`
     - Tile / marble / glazed ceramic -> `'ceramic'`
     - Unpaved dirt / soil -> `'dirt'`
2. **Stride Interval Tracking**:
   - Track `distanceTraveled`:
     ```typescript
     const moveDist = Math.hypot(dx, dz);
     if (this.isGrounded && !this.isSeated) {
       this.footstepDistanceAccumulator += moveDist;
       if (this.footstepDistanceAccumulator >= 1.8) {
         this.footstepDistanceAccumulator = 0;
         proceduralAudio.playFootstep(currentSurfaceType);
       }
     }
     ```
3. **Procedural Sound Profiles in `ProceduralAudio.ts`**:
   - Limit to max 4 concurrent voices.
   - **Grass**: Bandpass noise (800Hz - 1400Hz, Q=1.2), soft exponential gain drop (0.08s).
   - **Asphalt**: Lowpass thud (220Hz) + short burst of pink noise (0.06s).
   - **Paving/Concrete**: Resonant bandpass tap (450Hz, Q=3.0) + sharp transient (0.05s).
   - **Wood**: Warm hollow dual-frequency tone (180Hz + 320Hz, Q=4.0) with subtle decay (0.09s).
   - **Ceramic/Marble**: High-pitched crisp click (1800Hz - 2600Hz, Q=6.0) (0.04s).
   - **Dirt**: Low-frequency dull thud (120Hz - 160Hz) with rapid falloff (0.07s).
4. **AudioContext Protocol**:
   - Automatically resume `AudioContext` on first pointer down / key press.
   - Respect mute toggle (`proceduralAudio.enabled`) and volume slider.

---

### T3.6: Smooth Head Bobbing (Goyangan Kamera Halus)

#### Existing Code Analysis:
- In `FirstPersonController.ts:912-919`:
  ```typescript
  this.camera.position.set(this.position.x, this.smoothedCameraY, this.position.z);
  ```
  Camera position has no head bobbing displacement.

#### Architecture Specification for T3.6:
1. **Bobbing Phase & Amplitude**:
   - Stride frequency proportional to speed: `strideSpeed = Math.hypot(currentVelocityX, currentVelocityZ)`.
   - If `isMoving && isGrounded && !isSeated && !isAimingFurniture`:
     - Accumulate bob phase: `bobCycle += strideSpeed * dt * 3.8`.
     - Target vertical bob offset: `targetBobY = Math.sin(bobCycle) * 0.015`.
   - If player stops, is airborne, seated, or aiming at furniture:
     - `targetBobY = 0`.
2. **Smooth Decay / Settling (0.15s)**:
   ```typescript
   this.currentBobY = THREE.MathUtils.damp(this.currentBobY, targetBobY, 14.0, dt);
   ```
   (Lambda ~14 smoothly settles offset to 0 within ~0.15 seconds).
3. **Settings & Accessibility**:
   - Setting: `cameraBobbing: boolean` (default: `true`) in `useUIStore`.
   - When `useUIStore.getState().reduceMotion === true` or `cameraBobbing === false`:
     Force `targetBobY = 0` immediately.
   - Add toggle in `SettingsModal.tsx`: "Goyangan kamera".

---

## 4. Codebase Survey Gap Matrix

| Req ID | Target File | Current Implementation Status | Exact Missing Elements / Gaps |
|---|---|---|---|
| **T2.1** | `src/buildings/BuildingManager.ts`<br>`src/core/engine/Engine.ts` | Legacy `updateLOD()` runs every 6 frames using center `distanceToSquared`. | `updateSpatialLOD` method missing.<br>120ms or >1.5m displacement throttling missing.<br>Distance to footprint edge via `PolygonMath` missing. |
| **T2.2** | `src/buildings/BuildingManager.ts`<br>`src/materials/MaterialLibrary.ts`<br>`src/world/LandscapeManager.ts` | Fixed 80m/250m thresholds with single material. | 3 zones (<24m, 27m–65m, >65m) with dual hysteresis (24/27m & 62/68m) missing.<br>`kacaDekat` & `kacaJauh` shared materials missing.<br>Foliage LOD culling in `LandscapeManager` missing. |
| **T2.3** | `src/buildings/BuildingManager.ts`<br>`src/core/engine/FirstPersonController.ts` | Generic LOD culls regardless of indoor state. | Host building zone 0 locking missing.<br>Culling of other buildings' `InteriorDetails` & `placedFurniture` missing.<br>Culling of landscape props >35m from host building missing. |
| **T2.4** | `src/core/engine/RaycastManager.ts`<br>`src/core/engine/FirstPersonController.ts` | Raycaster tests only direct `visible` without walking parent tree. | `isObjectHierarchyVisible` check missing in `raycastObjects` and `updateCenterRaycast`. Hidden objects can still be targeted. |
| **T2.5** | `src/buildings/PrefabMeshBuilder.ts`<br>`src/buildings/CustomBuildingMeshBuilder.ts`<br>`src/world/LandscapeManager.ts` | `matrixAutoUpdate = true` on every single mesh in the scene. | `matrixAutoUpdate = false` with `updateMatrixWorld(true)` missing on static buildings and landscape meshes. |
| **T2.6** | `src/ui/components/SettingsModal.tsx`<br>`src/ui/components/TopHeader.tsx`<br>`src/ui/state/useUIStore.ts` | Only FPS display exists in developer mode. | Object count per LOD zone telemetry and UI display missing. |
| **T3.1** | `src/core/engine/FirstPersonController.ts`<br>`src/core/engine/Engine.ts` | `toneMappingExposure` is fixed at 1.0. | Dynamic exposure damp (lambda ~3) between 1.05 and 1.28 missing.<br>Raycast distance clamp (6m) missing. |
| **T3.2** | `src/core/engine/FirstPersonController.ts` | Snaps immediately to ground Y; waist ray at 0.9m misses 0.6m walls. | 0.05m–0.42m step-up damp (lambda ~12) missing.<br>1.7m headroom check missing.<br>0.42m+ wall collision block missing. |
| **T3.3** | `src/buildings/InteriorInteractiveSystem.ts` | Fixed single-direction swing (+90°); closes at 2.8m. | Dot product against door normal missing.<br>Swing away from player (~100°) missing.<br>3.2m closing threshold missing. |
| **T3.4** | `src/core/engine/FirstPersonController.ts`<br>`src/ui/components/FirstPersonHUD.tsx` | `traverseFloor` only changes `position.y`. HUD only has up/down chevrons. | Safe target landing point search missing.<br>150ms screen fade missing.<br>Direct floor number buttons missing in HUD. |
| **T3.5** | `src/audio/ProceduralAudio.ts`<br>`src/core/engine/FirstPersonController.ts` | No footstep audio methods exist. | Footstep generator for 6 surface materials missing.<br>1.8m stride accumulator missing.<br>4-voice limit missing. |
| **T3.6** | `src/core/engine/FirstPersonController.ts`<br>`src/ui/state/useUIStore.ts`<br>`src/ui/components/SettingsModal.tsx` | No head bobbing exists. | ~0.015m vertical bobbing with ~0.15s damp settling missing.<br>`cameraBobbing` toggle in settings missing.<br>Automatic disable on `reduceMotion` missing. |

---

## 5. Architectural Recommendations for Implementation Agents

1. **Clean Separation of Concerns**:
   - Keep LOD state evaluation in `BuildingManager` and `LandscapeManager` without touching mesh generation logic.
   - Keep material instances (`kacaDekat`, `kacaJauh`) as static singletons in `MaterialLibrary`.
   - Centralize tone mapping exposure in `FirstPersonController.syncExposureAdaptation()`.
2. **Performance Safety**:
   - Footprint edge distance checks should use bounding box quick-rejection (`AABB`) before running edge-by-edge segment distance checks.
   - Raycasting for footsteps and step-up must exclude furniture and decorative items to prevent false positives.
3. **Preserve Compatibility**:
   - Keep the existing `updateLOD` method signature as a compatibility wrapper that forwards to `updateSpatialLOD` so existing test suites (`tests/v6_lod_and_performance.test.ts`) continue to pass without regression.
