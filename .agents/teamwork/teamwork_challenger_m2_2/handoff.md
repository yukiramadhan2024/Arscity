# Empirical Challenge Report & Handoff - Tahap 2: Raycast Filtering (T2.4) & Matrix Freezing (T2.5)

**Agent**: `teamwork_challenger_m2_2`  
**Role**: EMPIRICAL CHALLENGER (critic, specialist)  
**Target Milestone**: Tahap 2: Render Jarak Bertingkat (3 Zona LOD) - Tasks T2.4 & T2.5  
**Worker Under Review**: `teamwork_worker_tahap2_1`  
**Verdict**: **`APPROVE`**  
**Overall Risk Assessment**: **LOW**  

---

## Challenge Summary

The worker's implementation of **Raycast Hierarchy Filtering (T2.4)** and **Static Mesh Matrix Freezing (T2.5)** was subjected to rigorous, adversarial empirical testing in `tests/adversarial_raycast_matrix.test.ts` (13 tests across 4 key attack vectors). 

1. **Raycast Hierarchy Filtering (T2.4)**: Confirmed that `isObjectHierarchyVisible` effectively prevents raycast hits on meshes that are marked `visible = true` locally but have a hidden ancestor (`visible = false`) up to 5 levels deep in the scene graph. Both the raw RaycastManager path and the spatial-hash-grid query path properly filter culled candidates. In FirstPersonController, hidden furniture and interior seats cannot be hovered, targeted for deletion/movement, or queried for interaction.
2. **Static Mesh Matrix Freezing (T2.5)**: Confirmed that static meshes created by `PrefabMeshBuilder`, `CustomBuildingMeshBuilder`, `RoadGeometryBuilder`, `IntersectionBuilder`, `LandscapeManager`, and placed furniture attached via `BuildingManager.attachFurniture` have `matrixAutoUpdate === false`. Crucially, their world matrices are valid, finite, non-identity, and correctly positioned at the world coordinates of the entity.
3. **Dynamic Object Exemption (T2.5)**: Confirmed that animated objects (swing door pivots, door leaves, sliding glass door leaves, and ceiling fan blades) have `userData.isAnimated === true` and retain `matrixAutoUpdate === true`. In simulated scene update loops, static meshes remain completely frozen when their local transform is mutated, whereas animated objects auto-update their local and world matrices dynamically without manual intervention.
4. **Edit and Movement Transformation Synchronization (T2.5)**: Confirmed that moving buildings via `BuildingManager.updateBuilding`, shifting landscape items via `LandscapeManager.updateItemPosition`, or repositioning furniture via `BuildingManager.attachFurniture` immediately recalculates and refreshes world transformation matrices while keeping static meshes frozen.

---

## 1. Observation

### Implementation Observations
1. **Hierarchy Visibility Filter**:
   - `src/core/engine/RaycastManager.ts`, lines 9–16:
     ```ts
     export function isObjectHierarchyVisible(obj: THREE.Object3D | null): boolean {
       let curr: THREE.Object3D | null = obj;
       while (curr) {
         if (!curr.visible) return false;
         curr = curr.parent;
       }
       return true;
     }
     ```
   - Applied in `RaycastManager.raycastObjects` (lines 167 & 173) and in `FirstPersonController` (lines 798–806, 1383, 1412, 1427, 1454).

2. **Static Mesh Freezing**:
   - `src/buildings/PrefabMeshBuilder.ts`, lines 444–455:
     ```ts
     public static freezeStaticBuildingMeshes(group: THREE.Group): void {
       group.traverse((child) => {
         if ((child as THREE.Mesh).isMesh) {
           if (!child.userData?.isAnimated && !child.userData?.isDynamic) {
             child.matrixAutoUpdate = false;
             child.updateMatrix();
           }
         }
       });
       group.updateMatrix();
       group.updateMatrixWorld(true);
     }
     ```
   - Applied in `CustomBuildingMeshBuilder.ts` (line 182), `RoadGeometryBuilder.ts` (lines 905–915), `IntersectionBuilder.ts` (lines 127–129), `LandscapeManager.ts` (lines 106–115), and `BuildingManager.attachFurniture` (lines 291–299).

3. **Dynamic Exemption Tagging**:
   - `src/buildings/InteriorMeshBuilder.ts`, lines 320, 326, 366, 373, 381, 478, 483:
     Animated door pivots, swing leaves, sliding leaves, and fan blades are explicitly annotated with `userData = { isAnimated: true }`. Consequently, `freezeStaticBuildingMeshes` skips them, leaving `matrixAutoUpdate === true`.

4. **Empirical Test Suite Execution**:
   - Command: `npx vitest run tests/adversarial_raycast_matrix.test.ts`
   - Result: **13 passed (100%) in 1.24s**
   - Command: `npx tsc --noEmit`
   - Result: **0 errors**
   - Command: `npx vitest run`
   - Result: **64 test files passed, 508 tests passed (100%) in 65.94s**
   - Command: `npm run build`
   - Result: **Built successfully in 8.62s**

---

## 2. Challenges & Stress Test Results

### Challenge 1: Ancestor Hierarchy Visibility Bypasses [LOW RISK - PASS]
- **Assumption Challenged**: Three.js raycasting traverses children without checking parent visibility. If a parent group (such as `InteriorDetails` or `DynamicFurnitureGroup`) is hidden by LOD Zone 1/2 or room focus, can an interaction raycast still hit a child mesh whose local `.visible` flag is `true`?
- **Attack Scenario**:
  - Constructed a 5-level nested hierarchy: Root -> District -> BuildingGroup -> InteriorGroup -> LeafMesh.
  - Toggled visibility on intermediate nodes (L2, L0, L3, LeafMesh) and tested `isObjectHierarchyVisible`.
  - Executed raycasting via `RaycastManager` with spatial grid disabled (testing raw array traversal) and spatial grid enabled (testing bounding box candidate filtering).
  - Executed FirstPersonController center reticle hover and nearby seat detection inside an active building.
- **Result**: **PASS**. 
  - `RaycastManager.raycastObjects` strictly returned 0 hits when targets were inside hidden groups.
  - In `FirstPersonController`, when `DynamicFurnitureGroup.visible = false`, `controller.nearbySeat` was `null`, `controller.hoveredFurniture` was `null`, and action prompts (`[G] Geser`, `[X] Hapus`) were suppressed.

### Challenge 2: Static Matrix Freezing Invalidation [LOW RISK - PASS]
- **Assumption Challenged**: Setting `matrixAutoUpdate = false` on static meshes could result in uninitialized, identity, or stale matrices that misplace geometry or fail bounding volume checks.
- **Attack Scenario**:
  - Placed buildings, custom buildings, road segments, intersections, landscape trees, and furniture at non-origin, rotated coordinates (e.g. `(45, 0, -60)`, `(-30, 0, 80)`, `(10, 0, 70)`, `(75, 0, 25)`).
  - Inspected all elements of `mesh.matrixWorld` for finite numbers, absence of NaN/Infinity, and verified that world coordinates match the transformed location.
- **Result**: **PASS**.
  - All static meshes have `matrixAutoUpdate === false`.
  - World matrices contain valid transform basis vectors and reflect exact world positions.

### Challenge 3: Animated Objects Freezing in Animation Loops [LOW RISK - PASS]
- **Assumption Challenged**: Mesh freezing passes could inadvertently freeze animated doors or ceiling fan blades, preventing them from rotating or swinging in animation loops without manual `updateMatrix()` calls.
- **Attack Scenario**:
  - Created a composite test group with a static wall mesh (`matrixAutoUpdate = false`) and an animated door leaf mesh (`matrixAutoUpdate = true`).
  - Mutated local transforms (`wallMesh.position.set(100, 50, 20)` and `doorMesh.rotation.y = Math.PI * 0.5`).
  - Dispatched standard Three.js render frame update `scene.updateMatrixWorld()`.
  - Monitored matrix snapshots.
- **Result**: **PASS**.
  - `wallMesh.matrix` remained 100% frozen (did not auto-update).
  - `doorMesh.matrix` and `doorMesh.matrixWorld` auto-updated dynamically and matched the 90-degree rotation.
  - Verified that swing doors, sliding doors, and ceiling fan blades retain `matrixAutoUpdate === true`.

### Challenge 4: Object Edit & Transformation Desynchronization [LOW RISK - PASS]
- **Assumption Challenged**: When an object is edited or moved (e.g. moving a building, shifting a landscape tree, or dragging furniture), static meshes with `matrixAutoUpdate === false` could remain stranded at their old world coordinates.
- **Attack Scenario**:
  - Relocated a building from `(10, 0, 10)` to `(120, 0, -80)` via `BuildingManager.updateBuilding`.
  - Moved a tree from `(15, 0, 15)` to `(85, 0, 95)` via `LandscapeManager.updateItemPosition`.
  - Repositioned a placed sofa from `[2, 0, 3]` to `[4, 0, -2]` via `BuildingManager.attachFurniture`.
  - Traversed child static meshes and verified their world positions.
- **Result**: **PASS**.
  - In all cases, static meshes remained frozen (`matrixAutoUpdate === false`), while their `matrixWorld` was immediately updated to reflect the new coordinates. Detaching furniture cleanly removed it without residual references.

---

## 3. Stress Test Results Matrix

| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| Deep hierarchy traversal (5 levels, parent hidden) | `isObjectHierarchyVisible === false` | Returned `false` | **PASS** |
| RaycastManager raw target traversal (parent hidden) | Culled mesh excluded from raycast intersections | Filtered out, 0 hits on hidden target | **PASS** |
| RaycastManager spatial hash candidate (parent hidden) | Spatial query candidate filtered by hierarchy check | Filtered out, 0 hits | **PASS** |
| FPC reticle hover on culled furniture | `hoveredFurniture === null`, no action prompt | `hoveredFurniture === null`, prompt hidden | **PASS** |
| FPC nearby seat query on culled furniture group | `nearbySeat === null` | `nearbySeat === null` | **PASS** |
| PrefabMeshBuilder static meshes | `matrixAutoUpdate === false`, valid `matrixWorld` | Verified on all exterior, roof, prop meshes | **PASS** |
| CustomBuildingMeshBuilder static meshes | `matrixAutoUpdate === false`, valid `matrixWorld` | Verified on walls, slabs, roof | **PASS** |
| RoadGeometryBuilder & IntersectionBuilder | `matrixAutoUpdate === false`, valid `matrixWorld` | Verified on asphalt, curbs, markings, labels | **PASS** |
| LandscapeManager static tree/prop meshes | `matrixAutoUpdate === false`, valid `matrixWorld` | Verified on trunk and canopy clusters | **PASS** |
| Placed furniture attached via BuildingManager | `matrixAutoUpdate === false`, valid `matrixWorld` | Verified on sofa meshes and child parts | **PASS** |
| Animated doors & fan blades auto-update property | `matrixAutoUpdate === true`, `isAnimated: true` | Retained `true` on doors and fan blades | **PASS** |
| Dynamic render loop matrix propagation | Dynamic meshes update, static meshes stay frozen | Door rotated in matrixWorld; wall frozen | **PASS** |
| Rebuilding moved building (`updateBuilding`) | World matrices update to new world coordinates | Meshes updated to `(120, 0, -80)` and refrozen | **PASS** |
| Moving landscape item (`updateItemPosition`) | World matrices update to new coordinates | Meshes updated to `(85, 0, 95)` | **PASS** |
| Repositioning placed furniture (`attachFurniture`) | World matrices update to new coordinates | Sofa updated to new coordinates | **PASS** |

---

## 4. Caveats & Architectural Notes

1. **Camera Matrix Synchronization in Headless Unit Tests**:
   - In a running browser, `renderer.render(scene, camera)` automatically updates `camera.matrixWorld` each animation frame. In isolated unit tests where `renderer.render` is not running, calling `controller.update(dt)` calculates reticle raycasts using `camera.matrixWorld`. Tests asserting `hoveredFurniture` must ensure `camera.updateMatrixWorld(true)` has been called prior to reticle intersection evaluation.
2. **Proximity Seat Height Evaluation Threshold**:
   - In `InteriorInteractiveSystem.getNearestSeat(playerPos)`, the vertical tolerance is `dY = Math.abs(playerPos.y - seat.worldPosition.y) <= 1.2m`. When `BuildingManager.attachFurniture` registers a seat at floor level (`worldPosition.y = bldPos.y + plinthHeight`), standing eye height (`floorY + 1.65m`) has `dY = 1.65m > 1.2m`. Note that players interact with seats via reticle raycast (`[F] Duduk` appears on reticle hover regardless of vertical height threshold). For proximity prompt detection, seats should register cushion elevation (~0.45m above floor) or `dY` threshold should be 1.8m (matching door checks `dY < 2.2m`). This is an ergonomic calibration detail for Tahap 3 (T3.4), not a blocker for T2.4/T2.5.

---

## 5. Conclusion & Verdict

**Verdict**: **`APPROVE`**

Tasks **T2.4** (Raycaster hierarchy visibility filtering) and **T2.5** (Static mesh matrix update freezing with dynamic exemption and edit synchronization) are verified to be fully implemented, architecturally robust, and free of regressions. The implementation satisfies all criteria of `ORIGINAL_REQUEST.md`, respects the G6 Data Integrity Rule, compiles with 0 TypeScript errors, and passes 100% of the 508 tests in the project suite.

Tahap 2 LOD milestone is completely verified and ready for gate signoff.

---

## 6. Verification Method

To independently reproduce and verify these findings:

```bash
# 1. Run the dedicated adversarial empirical challenge test suite (13 tests)
npx vitest run tests/adversarial_raycast_matrix.test.ts

# 2. Verify strict TypeScript compliance (0 errors)
npx tsc --noEmit

# 3. Verify complete project regression test suite (64 files, 508 tests)
npx vitest run

# 4. Verify clean production compilation
npm run build
```
