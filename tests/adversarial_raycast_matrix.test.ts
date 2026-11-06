import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { isObjectHierarchyVisible, RaycastManager } from '../src/core/engine/RaycastManager';
import { FirstPersonController } from '../src/core/engine/FirstPersonController';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { PrefabMeshBuilder } from '../src/buildings/PrefabMeshBuilder';
import { CustomBuildingMeshBuilder } from '../src/buildings/CustomBuildingMeshBuilder';
import { CustomBuilding } from '../src/buildings/CustomBuildingModel';
import { InteriorMeshBuilder } from '../src/buildings/InteriorMeshBuilder';
import { InteriorLayout } from '../src/buildings/InteriorTypes';
import { LandscapeManager } from '../src/world/LandscapeManager';
import { RoadGraph } from '../src/roads/RoadGraph';
import { RoadGeometryBuilder } from '../src/roads/RoadGeometryBuilder';
import { IntersectionBuilder } from '../src/roads/IntersectionBuilder';
import { GridSystem } from '../src/world/GridSystem';
import { InteriorInteractiveSystem } from '../src/buildings/InteriorInteractiveSystem';

describe('Adversarial Empirical Challenge: Raycast Filtering (T2.4) & Matrix Freezing (T2.5)', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    InteriorInteractiveSystem.getInstance().clearAll();
  });

  // =========================================================================
  // CHALLENGE 1: Raycast Hierarchy Visibility Filtering
  // =========================================================================
  describe('Challenge 1: Raycast Hierarchy Visibility Filtering (T2.4)', () => {
    it('isObjectHierarchyVisible traverses multi-level nested parent hierarchies accurately', () => {
      // Create a 5-level hierarchy:
      // Level 0 (Root) -> Level 1 (District) -> Level 2 (BuildingGroup) -> Level 3 (InteriorGroup) -> Level 4 (Mesh)
      const root = new THREE.Group();
      root.name = 'Level0_Root';

      const l1 = new THREE.Group();
      l1.name = 'Level1_District';
      root.add(l1);

      const l2 = new THREE.Group();
      l2.name = 'Level2_BuildingGroup';
      l1.add(l2);

      const l3 = new THREE.Group();
      l3.name = 'Level3_InteriorGroup';
      l2.add(l3);

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      mesh.name = 'Level4_Mesh';
      l3.add(mesh);

      // 1. All nodes visible -> must be true
      expect(isObjectHierarchyVisible(mesh)).toBe(true);

      // 2. Hide intermediate parent (Level 2 BuildingGroup) while mesh and l3 remain visible === true
      l2.visible = false;
      expect(mesh.visible).toBe(true);
      expect(l3.visible).toBe(true);
      expect(isObjectHierarchyVisible(mesh), 'Mesh must NOT be visible when ancestor L2 is hidden').toBe(false);

      // 3. Restore l2, but hide root L0
      l2.visible = true;
      root.visible = false;
      expect(isObjectHierarchyVisible(mesh), 'Mesh must NOT be visible when root L0 is hidden').toBe(false);

      // 4. Restore root, hide direct parent l3
      root.visible = true;
      l3.visible = false;
      expect(isObjectHierarchyVisible(mesh), 'Mesh must NOT be visible when direct parent L3 is hidden').toBe(false);

      // 5. Restore l3, hide mesh itself
      l3.visible = true;
      mesh.visible = false;
      expect(isObjectHierarchyVisible(mesh), 'Mesh must NOT be visible when mesh itself is hidden').toBe(false);

      // 6. Restore mesh
      mesh.visible = true;
      expect(isObjectHierarchyVisible(mesh), 'Mesh must be visible when all ancestors are visible').toBe(true);

      // 7. Detached single node (parent is null)
      const detached = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      expect(isObjectHierarchyVisible(detached)).toBe(true);
      detached.visible = false;
      expect(isObjectHierarchyVisible(detached)).toBe(false);
    });

    it('RaycastManager filters out raycast hits when parent group has visible = false (without spatial grid)', () => {
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);

      const mockDom = {
        addEventListener: () => {},
        removeEventListener: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      } as unknown as HTMLElement;
      const grid = new GridSystem(scene);
      const raycastMgr = new RaycastManager(mockDom, camera, grid, scene);

      // Two overlapping targets at the same position (0, 0, 0)
      const groupA = new THREE.Group();
      groupA.name = 'GroupA_CulledInterior';
      const meshA = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
      meshA.name = 'MeshA_HiddenTarget';
      meshA.position.set(0, 0, 0);
      groupA.add(meshA);

      const groupB = new THREE.Group();
      groupB.name = 'GroupB_VisibleExterior';
      const meshB = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
      meshB.name = 'MeshB_VisibleTarget';
      meshB.position.set(0, 0, 0);
      groupB.add(meshB);

      scene.add(groupA);
      scene.add(groupB);

      // Point mouse at center of screen (400, 300) -> NDC (0, 0)
      raycastMgr.updateMousePosition(400, 300);

      // Both groups visible -> returns hits on both meshA and meshB (front + back faces)
      const hitsAll = raycastMgr.raycastObjects([groupA, groupB]);
      expect(hitsAll.length).toBeGreaterThanOrEqual(2);
      expect(hitsAll.some((h) => h.object === meshA)).toBe(true);
      expect(hitsAll.some((h) => h.object === meshB)).toBe(true);

      // Now hide Group A (simulate LOD Zone 1 culling interior/furniture)
      groupA.visible = false;
      expect(meshA.visible, 'Child mesh visible property is still true in Three.js').toBe(true);

      // Raycast again: Group A must be strictly excluded!
      const hitsFiltered = raycastMgr.raycastObjects([groupA, groupB]);
      expect(hitsFiltered.length).toBeGreaterThan(0);
      expect(hitsFiltered.every((h) => h.object === meshB), 'Must only hit visible Group B').toBe(true);
      expect(hitsFiltered.some((h) => h.object === meshA), 'Mesh inside hidden group must NEVER be hit').toBe(false);

      // Hide both groups
      groupB.visible = false;
      const hitsNone = raycastMgr.raycastObjects([groupA, groupB]);
      expect(hitsNone.length, 'Must return 0 hits when all targets are inside hidden groups').toBe(0);

      raycastMgr.dispose();
      scene.remove(groupA);
      scene.remove(groupB);
    });

    it('RaycastManager filters out raycast hits when candidate is in spatial hash grid with hidden parent', () => {
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);

      const mockDom = {
        addEventListener: () => {},
        removeEventListener: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      } as unknown as HTMLElement;
      const grid = new GridSystem(scene);
      const raycastMgr = new RaycastManager(mockDom, camera, grid, scene);

      const buildingGroup = new THREE.Group();
      buildingGroup.name = 'Building_Spatial_01';

      const interiorGroup = new THREE.Group();
      interiorGroup.name = 'InteriorDetails';
      const sofaMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
      sofaMesh.name = 'SofaMesh';
      interiorGroup.add(sofaMesh);
      buildingGroup.add(interiorGroup);

      scene.add(buildingGroup);

      // Register building into spatial grid
      raycastMgr.registerSpatialObject(
        'bld_spatial_01',
        { minX: -2, minZ: -2, maxX: 2, maxZ: 2 },
        buildingGroup
      );
      expect(raycastMgr.spatialGrid.getItemCount()).toBe(1);

      raycastMgr.updateMousePosition(400, 300);

      // 1. When visible, raycast reaches sofa
      const hitsVisible = raycastMgr.raycastObjects([buildingGroup]);
      expect(hitsVisible.length).toBeGreaterThan(0);
      expect(hitsVisible[0].object).toBe(sofaMesh);

      // 2. Hide interior group (Zone 1/2 culling)
      interiorGroup.visible = false;
      const hitsCulled = raycastMgr.raycastObjects([buildingGroup]);
      expect(hitsCulled.length, 'Spatial grid query must filter out objects whose parent is hidden').toBe(0);

      raycastMgr.dispose();
      scene.remove(buildingGroup);
    });

    it('FirstPersonController ignores hidden seats and does not hover/interact with culled furniture', () => {
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.set(0, 1.65, 0);
      camera.lookAt(0, 1.65, 5);

      const mockDom = {
        addEventListener: () => {},
        removeEventListener: () => {},
        requestPointerLock: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      } as unknown as HTMLElement;

      const buildingMgr = new BuildingManager(scene);
      const testBld: BuildingInstance = {
        id: 'bld_fpc_challenge',
        presetKey: 'house_36',
        name: 'Rumah Uji',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 10,
        length: 10,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 0.5,
        wallMaterial: 'brick',
        wallColor: '#ea580c',
        roofMaterial: 'clay_tile',
      };
      buildingMgr.addBuilding(testBld);

      // Attach sofa 3-seater (valid seat in catalog)
      buildingMgr.attachFurniture('bld_fpc_challenge', {
        id: 'fur_sofa_test',
        type: 'sofa_3seater',
        name: 'Sofa 3 Dudukan',
        position: [0, 0, 2],
        rotationY: 0,
        floorIndex: 1,
      });

      // Ergonomic seat cushion height adjustment (within 1.2m of eye height 2.0)
      const regSeat = InteriorInteractiveSystem.getInstance().seats.get('seat_fur_sofa_test');
      if (regSeat) {
        regSeat.worldPosition.set(0, 1.0, 2);
      }

      const bldGroup = buildingMgr.getBuildingGroup('bld_fpc_challenge')!;
      const dynamicFur = bldGroup.getObjectByName('DynamicFurnitureGroup')!;
      expect(dynamicFur).toBeDefined();

      const controller = new FirstPersonController(camera, mockDom);
      (controller as any).buildingManager = buildingMgr;
      controller.enter(new THREE.Vector3(0, 1.2, 1.0));
      controller.insideBuildingId = 'bld_fpc_challenge';
      controller.pitch = -0.9; // Aim down at sofa at Z=2.0 (distance 1.0m < 1.4m radius)

      // 1. DynamicFurnitureGroup visible -> nearbySeat and reticle hover detected
      controller.update(0.016);
      camera.updateMatrixWorld(true);
      (controller as any).updateCenterRaycast();
      expect(controller.nearbySeat, 'Nearby seat must be detected when visible').not.toBeNull();
      expect(controller.hoveredFurniture, 'Hovered furniture must be detected when visible').not.toBeNull();
      expect(controller.reticleActionLabel).toContain('Sofa 3 Dudukan');

      // 2. Simulate Zone 1/2 or indoor focus culling DynamicFurnitureGroup (visible = false)
      dynamicFur.visible = false;
      controller.update(0.016);
      camera.updateMatrixWorld(true);
      (controller as any).updateCenterRaycast();

      // Must strictly be filtered out
      expect(controller.nearbySeat, 'Nearby seat MUST be null when DynamicFurnitureGroup is hidden').toBeNull();
      expect(controller.hoveredFurniture, 'Hovered furniture MUST be null when DynamicFurnitureGroup is hidden').toBeNull();
      expect(controller.reticleActionLabel, 'Reticle action label MUST NOT target hidden furniture').not.toContain('Sofa 3 Dudukan');
      expect(controller.reticleActionLabel).not.toContain('[G] Geser');

      // 3. Restore visibility
      dynamicFur.visible = true;
      controller.update(0.016);
      expect(controller.nearbySeat).not.toBeNull();
      expect(controller.hoveredFurniture).not.toBeNull();

      controller.exit();
    });
  });

  // =========================================================================
  // CHALLENGE 2: Matrix Freezing for Static Meshes
  // =========================================================================
  describe('Challenge 2: Matrix Freezing for Static Meshes (T2.5)', () => {
    it('verifies that PrefabMeshBuilder freezes static meshes and produces valid world matrices', () => {
      const bldInstance: BuildingInstance = {
        id: 'bld_matrix_freeze_prefab',
        presetKey: 'house_36',
        name: 'Rumah Matrix Static',
        category: 'residential',
        position: new THREE.Vector3(45, 0, -60),
        rotationY: Math.PI * 0.5,
        width: 10,
        length: 12,
        floorCount: 2,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 0.5,
        wallMaterial: 'brick',
        wallColor: '#ea580c',
        roofMaterial: 'clay_tile',
      };

      const group = PrefabMeshBuilder.buildBuildingGroup(bldInstance);
      scene.add(group);
      group.updateMatrixWorld(true);

      let staticCount = 0;
      let animatedCount = 0;

      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.userData?.isAnimated || mesh.userData?.isDynamic) {
            animatedCount++;
            expect(mesh.matrixAutoUpdate, 'Animated mesh must have matrixAutoUpdate === true').toBe(true);
          } else {
            staticCount++;
            expect(mesh.matrixAutoUpdate, 'Static mesh must have matrixAutoUpdate === false').toBe(false);

            // World matrix validation
            const mat = mesh.matrixWorld;
            for (let i = 0; i < 16; i++) {
              expect(Number.isFinite(mat.elements[i]), `Matrix element ${i} must be finite`).toBe(true);
              expect(Number.isNaN(mat.elements[i]), `Matrix element ${i} must not be NaN`).toBe(false);
            }

            // Verify world position reflects building placement bounding region around (45, -60)
            const worldPos = new THREE.Vector3();
            mesh.getWorldPosition(worldPos);
            expect(worldPos.x, 'Mesh world X must reflect building area near 45m').toBeGreaterThan(30);
            expect(worldPos.x, 'Mesh world X must reflect building area near 45m').toBeLessThan(60);
            expect(worldPos.z, 'Mesh world Z must reflect building area near -60m').toBeGreaterThan(-75);
            expect(worldPos.z, 'Mesh world Z must reflect building area near -60m').toBeLessThan(-45);
          }
        }
      });

      expect(staticCount, 'Must contain multiple frozen static meshes').toBeGreaterThan(5);
      scene.remove(group);
    });

    it('verifies that CustomBuildingMeshBuilder freezes static meshes and computes valid matrices', () => {
      const customModel: CustomBuilding = {
        id: 'bld_matrix_freeze_custom',
        name: 'Studio Custom Matrix',
        position: new THREE.Vector3(-30, 0, 80),
        rotationY: 0,
        massingShape: 'box',
        plinthHeight: 0.35,
        wallMaterial: 'plaster',
        wallColor: '#F8FAFC',
        floors: [
          {
            floorIndex: 0,
            height: 3.5,
            footprint: [
              new THREE.Vector2(-6, -6),
              new THREE.Vector2(6, -6),
              new THREE.Vector2(6, 6),
              new THREE.Vector2(-6, 6),
            ],
            walls: [],
          },
        ],
        roof: {
          type: 'flat',
          material: 'concrete',
          overhang: 0.4,
          pitchAngle: 0,
        },
      };

      const group = CustomBuildingMeshBuilder.buildCustomBuilding(customModel);
      scene.add(group);
      group.updateMatrixWorld(true);

      let staticCount = 0;
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (!mesh.userData?.isAnimated && !mesh.userData?.isDynamic) {
            staticCount++;
            expect(mesh.matrixAutoUpdate, 'Custom building static mesh must have matrixAutoUpdate === false').toBe(false);

            const worldPos = new THREE.Vector3();
            mesh.getWorldPosition(worldPos);
            expect(worldPos.x).toBeGreaterThan(-45);
            expect(worldPos.x).toBeLessThan(-15);
            expect(worldPos.z).toBeGreaterThan(65);
            expect(worldPos.z).toBeLessThan(95);
          }
        }
      });

      expect(staticCount).toBeGreaterThan(0);
      scene.remove(group);
    });

    it('verifies that RoadGeometryBuilder and IntersectionBuilder freeze static road meshes', () => {
      const graph = new RoadGraph();
      const n1 = graph.getOrCreateNode(new THREE.Vector3(10, 0, 10));
      const n2 = graph.getOrCreateNode(new THREE.Vector3(10, 0, 70));
      const n3 = graph.getOrCreateNode(new THREE.Vector3(60, 0, 70));
      const edge1 = graph.addEdge(n1.id, n2.id, 'arterial')!;
      const edge2 = graph.addEdge(n2.id, n3.id, 'arterial')!;

      // 1. Road edge geometry
      const roadGroup = RoadGeometryBuilder.buildRoadMeshGroup(edge1, graph);
      scene.add(roadGroup);

      let roadMeshCount = 0;
      roadGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          roadMeshCount++;
          expect(child.matrixAutoUpdate, 'Road mesh must have matrixAutoUpdate === false').toBe(false);
          expect(Number.isFinite(child.matrixWorld.elements[0])).toBe(true);
        }
      });
      expect(roadMeshCount).toBeGreaterThan(0);

      // 2. Road intersection geometry
      const interMesh = IntersectionBuilder.buildIntersectionMesh(n2, graph);
      expect(interMesh).not.toBeNull();
      if (interMesh) {
        expect(interMesh.matrixAutoUpdate, 'Intersection mesh must have matrixAutoUpdate === false').toBe(false);
        expect(Number.isFinite(interMesh.matrixWorld.elements[0])).toBe(true);
      }

      scene.remove(roadGroup);
    });

    it('verifies that LandscapeManager freezes static landscape items', () => {
      const landscapeManager = new LandscapeManager(scene);
      landscapeManager.addItem({
        id: 'tree_static_verify',
        type: 'tree_tabebuya_pink',
        position: new THREE.Vector3(75, 0, 25),
      });

      const treeGroup = landscapeManager.getItemGroup('tree_static_verify')!;
      expect(treeGroup).toBeDefined();

      let treeMeshCount = 0;
      treeGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          treeMeshCount++;
          expect(child.matrixAutoUpdate, 'Landscape mesh must have matrixAutoUpdate === false').toBe(false);

          const worldPos = new THREE.Vector3();
          child.getWorldPosition(worldPos);
          expect(worldPos.x).toBeGreaterThan(65);
          expect(worldPos.x).toBeLessThan(85);
          expect(worldPos.z).toBeGreaterThan(15);
          expect(worldPos.z).toBeLessThan(35);
        }
      });
      expect(treeMeshCount).toBeGreaterThan(0);
      landscapeManager.dispose();
    });
  });

  // =========================================================================
  // CHALLENGE 3: Dynamic Exemption for Animated Objects
  // =========================================================================
  describe('Challenge 3: Dynamic Exemption for Animated Objects (T2.5)', () => {
    it('verifies that swing door leaves, sliding door panels, and fan blades retain matrixAutoUpdate = true', () => {
      const layout: InteriorLayout = {
        floorIndex: 1,
        walls: [
          {
            id: 'w_swing',
            start: new THREE.Vector2(0, 0),
            end: new THREE.Vector2(5, 0),
            thickness: 0.15,
            height: 3.2,
            doorOpening: { width: 1.0, height: 2.2, positionRatio: 0.5 },
          },
          {
            id: 'w_slide',
            start: new THREE.Vector2(0, 5),
            end: new THREE.Vector2(5, 5),
            thickness: 0.15,
            height: 3.2,
            doorOpening: { width: 1.8, height: 2.2, positionRatio: 0.5 },
          },
        ],
        rooms: [
          {
            id: 'room_living',
            name: 'Ruang Tamu',
            type: 'living_room',
            floorIndex: 1,
            boundary: [
              new THREE.Vector2(0, 0),
              new THREE.Vector2(5, 0),
              new THREE.Vector2(5, 5),
              new THREE.Vector2(0, 5),
            ],
            areaM2: 25,
            ceilingHeight: 3.2,
            labelPosition: new THREE.Vector2(2.5, 2.5),
            isCompliant: true,
          },
        ],
      };

      // Residential layout creates swing door + ceiling fan
      const floorRes = InteriorMeshBuilder.buildFloorInterior(
        layout,
        0.35,
        3.2,
        'bld_animated_suite',
        'residential',
        new THREE.Vector3(0, 0, 0)
      );

      // 1. Swing Door Leaf
      const doorPivot = floorRes.getObjectByName('DoorPivot')!;
      expect(doorPivot, 'DoorPivot must exist in floor interior').toBeDefined();
      expect(doorPivot.userData?.isAnimated).toBe(true);

      const doorLeaf = floorRes.getObjectByName('DoorLeafMesh') as THREE.Mesh;
      expect(doorLeaf, 'DoorLeafMesh must exist in floor interior').toBeDefined();
      expect(doorLeaf.userData?.isAnimated).toBe(true);
      expect(doorLeaf.matrixAutoUpdate, 'DoorLeafMesh must retain matrixAutoUpdate === true').toBe(true);

      // 2. Ceiling Fan Blades
      const fanBladesGroup = floorRes.getObjectByName('CeilingFanBlades')!;
      expect(fanBladesGroup, 'CeilingFanBlades must exist').toBeDefined();
      expect(fanBladesGroup.userData?.isAnimated).toBe(true);

      const fanBlade0 = floorRes.getObjectByName('FanBlade_0') as THREE.Mesh;
      expect(fanBlade0, 'FanBlade_0 must exist').toBeDefined();
      expect(fanBlade0.userData?.isAnimated).toBe(true);
      expect(fanBlade0.matrixAutoUpdate, 'FanBlade must retain matrixAutoUpdate === true').toBe(true);

      // Commercial layout creates sliding glass door panels
      const floorComm = InteriorMeshBuilder.buildFloorInterior(
        layout,
        0.35,
        3.2,
        'bld_sliding_suite',
        'commercial',
        new THREE.Vector3(0, 0, 0)
      );

      // 3. Sliding Glass Door Panels
      const slideDoorGroup = floorComm.getObjectByName('SlideDoorGroup')!;
      expect(slideDoorGroup, 'SlideDoorGroup must exist in commercial interior').toBeDefined();
      expect(slideDoorGroup.userData?.isAnimated).toBe(true);

      const slideLeft = floorComm.getObjectByName('SlideDoorLeft') as THREE.Mesh;
      const slideRight = floorComm.getObjectByName('SlideDoorRight') as THREE.Mesh;
      expect(slideLeft).toBeDefined();
      expect(slideRight).toBeDefined();
      expect(slideLeft.userData?.isAnimated).toBe(true);
      expect(slideRight.userData?.isAnimated).toBe(true);
      expect(slideLeft.matrixAutoUpdate, 'SlideDoorLeft must retain matrixAutoUpdate === true').toBe(true);
      expect(slideRight.matrixAutoUpdate, 'SlideDoorRight must retain matrixAutoUpdate === true').toBe(true);
    });

    it('empirically proves that animated objects update their matrices dynamically in scene loops while static meshes stay frozen', () => {
      // Create a test group with 1 static mesh and 1 animated door leaf
      const testGroup = new THREE.Group();
      scene.add(testGroup);

      // Static wall mesh
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 0.2), new THREE.MeshBasicMaterial());
      wallMesh.name = 'StaticWallMesh';
      wallMesh.position.set(0, 1.5, 0);
      wallMesh.matrixAutoUpdate = false;
      wallMesh.updateMatrix();
      testGroup.add(wallMesh);

      // Animated door leaf mesh
      const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.04), new THREE.MeshBasicMaterial());
      doorMesh.name = 'AnimatedDoorMesh';
      doorMesh.userData = { isAnimated: true };
      doorMesh.position.set(2, 1.05, 0);
      doorMesh.matrixAutoUpdate = true;
      testGroup.add(doorMesh);

      // Initial matrix world update
      scene.updateMatrixWorld(true);

      // Snapshot initial matrix values
      const initialWallMat = wallMesh.matrix.elements.slice();
      const initialDoorMat = doorMesh.matrix.elements.slice();

      // Mutate local transforms of BOTH meshes
      wallMesh.position.set(100, 50, 20); // Static mesh moved
      doorMesh.rotation.y = Math.PI * 0.5; // Animated door rotated 90 degrees

      // Simulate a render loop frame calling scene.updateMatrixWorld()
      scene.updateMatrixWorld();

      // STATIC MESH CHECK:
      // Because matrixAutoUpdate === false, wallMesh.matrix MUST remain identical to initial snapshot!
      expect(
        wallMesh.matrix.elements,
        'Static mesh matrix must NOT auto-update even if position is modified'
      ).toEqual(initialWallMat);

      // DYNAMIC OBJECT CHECK:
      // Because matrixAutoUpdate === true, doorMesh.matrix MUST have updated to include rotation!
      expect(
        doorMesh.matrix.elements,
        'Animated door mesh matrix MUST auto-update when rotated'
      ).not.toEqual(initialDoorMat);

      // Confirm door rotation in world matrix:
      // Y rotation of 90 deg -> element 0 is cos(pi/2) ~ 0, element 8 is sin(pi/2) ~ 1
      expect(doorMesh.matrix.elements[0]).toBeCloseTo(0, 4);
      expect(doorMesh.matrix.elements[2]).toBeCloseTo(-1, 4);

      scene.remove(testGroup);
    });
  });

  // =========================================================================
  // CHALLENGE 4: Edit and Movement Matrix Synchronization
  // =========================================================================
  describe('Challenge 4: Edit and Movement Matrix Synchronization (T2.5)', () => {
    it('BuildingManager.updateBuilding properly updates and refreezes world matrices of building meshes', () => {
      const buildingMgr = new BuildingManager(scene);

      const bld: BuildingInstance = {
        id: 'bld_edit_test',
        presetKey: 'house_36',
        name: 'Rumah Edit Test',
        category: 'residential',
        position: new THREE.Vector3(10, 0, 10),
        rotationY: 0,
        width: 10,
        length: 10,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 0.5,
        wallMaterial: 'brick',
        wallColor: '#ea580c',
        roofMaterial: 'clay_tile',
      };

      buildingMgr.addBuilding(bld);
      const groupBefore = buildingMgr.getBuildingGroup('bld_edit_test')!;
      expect(groupBefore).toBeDefined();

      const extBefore = groupBefore.getObjectByName('ExteriorShell')!;
      let worldPosBefore = new THREE.Vector3();
      extBefore.children[0]?.getWorldPosition(worldPosBefore);
      expect(worldPosBefore.x).toBeGreaterThan(0);
      expect(worldPosBefore.x).toBeLessThan(20);
      expect(worldPosBefore.z).toBeGreaterThan(0);
      expect(worldPosBefore.z).toBeLessThan(20);

      // Now move the building to a new position (120, 0, -80)
      const updatedBld: BuildingInstance = {
        ...bld,
        position: new THREE.Vector3(120, 0, -80),
      };
      buildingMgr.updateBuilding(updatedBld);

      const groupAfter = buildingMgr.getBuildingGroup('bld_edit_test')!;
      expect(groupAfter).toBeDefined();

      // Check that all static meshes are frozen AND world coordinates reflect the new position
      let staticCount = 0;
      groupAfter.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (!mesh.userData?.isAnimated && !mesh.userData?.isDynamic) {
            staticCount++;
            expect(mesh.matrixAutoUpdate, 'Rebuilt static mesh must be frozen').toBe(false);

            const pos = new THREE.Vector3();
            mesh.getWorldPosition(pos);
            expect(pos.x, 'Mesh world X must reflect updated position near 120m').toBeGreaterThan(105);
            expect(pos.x, 'Mesh world X must reflect updated position near 120m').toBeLessThan(135);
            expect(pos.z, 'Mesh world Z must reflect updated position near -80m').toBeGreaterThan(-95);
            expect(pos.z, 'Mesh world Z must reflect updated position near -80m').toBeLessThan(-65);
          }
        }
      });
      expect(staticCount).toBeGreaterThan(0);
    });

    it('LandscapeManager.updateItemPosition updates world matrix transforms for static landscape items', () => {
      const landscapeManager = new LandscapeManager(scene);
      landscapeManager.addItem({
        id: 'tree_move_test',
        type: 'tree_tabebuya_pink',
        position: new THREE.Vector3(15, 0, 15),
      });

      const group = landscapeManager.getItemGroup('tree_move_test')!;
      expect(group).toBeDefined();

      let initPos = new THREE.Vector3();
      group.getWorldPosition(initPos);
      expect(initPos.x).toBeCloseTo(15, 1);
      expect(initPos.z).toBeCloseTo(15, 1);

      // Move landscape item to (85, 0, 95)
      landscapeManager.updateItemPosition('tree_move_test', new THREE.Vector3(85, 0, 95));

      let movedPos = new THREE.Vector3();
      group.getWorldPosition(movedPos);
      expect(movedPos.x, 'Item group world X must update to 85').toBeCloseTo(85, 1);
      expect(movedPos.z, 'Item group world Z must update to 95').toBeCloseTo(95, 1);

      // Check child static meshes still have matrixAutoUpdate === false and valid world transforms
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          expect(child.matrixAutoUpdate).toBe(false);
          const childPos = new THREE.Vector3();
          child.getWorldPosition(childPos);
          expect(childPos.x).toBeGreaterThan(75);
          expect(childPos.x).toBeLessThan(95);
          expect(childPos.z).toBeGreaterThan(85);
          expect(childPos.z).toBeLessThan(105);
        }
      });

      landscapeManager.dispose();
    });

    it('BuildingManager.attachFurniture updates and freezes placed furniture while synchronizing world transforms', () => {
      const buildingMgr = new BuildingManager(scene);
      const bld: BuildingInstance = {
        id: 'bld_furniture_sync',
        presetKey: 'house_36',
        name: 'Rumah Furnitur Sync',
        category: 'residential',
        position: new THREE.Vector3(40, 0, 10),
        rotationY: 0,
        width: 10,
        length: 10,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 0.5,
        wallMaterial: 'brick',
        wallColor: '#ea580c',
        roofMaterial: 'clay_tile',
      };
      buildingMgr.addBuilding(bld);
      const bldGroup = buildingMgr.getBuildingGroup('bld_furniture_sync')!;
      // Normalise scale in case placement spring has non-uniform scale
      bldGroup.scale.set(1, 1, 1);
      bldGroup.updateMatrixWorld(true);

      // 1. Attach sofa at local [2, 0, 3]
      buildingMgr.attachFurniture('bld_furniture_sync', {
        id: 'fur_sync_sofa',
        type: 'sofa_3seater',
        name: 'Sofa 3 Dudukan',
        position: [2, 0, 3],
        rotationY: 0,
        floorIndex: 1,
      });

      const dynamicFur = bldGroup.getObjectByName('DynamicFurnitureGroup')!;
      const sofaGroup = dynamicFur.children.find((c) => c.userData?.furnitureId === 'fur_sync_sofa')!;
      expect(sofaGroup).toBeDefined();

      // Check static freezing of furniture mesh
      sofaGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          expect(child.matrixAutoUpdate, 'Furniture mesh must have matrixAutoUpdate === false').toBe(false);
        }
      });

      // World position must be: building.x(40) + local.x(2) = 42, building.z(10) + local.z(3) = 13
      const sofaWorldPos = new THREE.Vector3();
      sofaGroup.getWorldPosition(sofaWorldPos);
      expect(sofaWorldPos.x).toBeCloseTo(42, 1);
      expect(sofaWorldPos.z).toBeCloseTo(13, 1);

      // 2. Move sofa to new position [4, 0, -2] (e.g. user dragged / moved furniture)
      buildingMgr.attachFurniture('bld_furniture_sync', {
        id: 'fur_sync_sofa',
        type: 'sofa_3seater',
        name: 'Sofa 3 Dudukan',
        position: [4, 0, -2],
        rotationY: 0,
        floorIndex: 1,
      });

      const movedSofaGroup = dynamicFur.children.find((c) => c.userData?.furnitureId === 'fur_sync_sofa')!;
      expect(movedSofaGroup).toBeDefined();

      const movedWorldPos = new THREE.Vector3();
      movedSofaGroup.getWorldPosition(movedWorldPos);
      expect(movedWorldPos.x, 'Moved sofa world X must be 44').toBeCloseTo(44, 1);
      expect(movedWorldPos.z, 'Moved sofa world Z must be 8').toBeCloseTo(8, 1);

      // 3. Detach furniture and verify clean removal
      expect(buildingMgr.detachFurniture('bld_furniture_sync', 'fur_sync_sofa')).toBe(true);
      expect(dynamicFur.children.find((c) => c.userData?.furnitureId === 'fur_sync_sofa')).toBeUndefined();
    });
  });
});
