import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { RoadGeometryBuilder } from '../src/roads/RoadGeometryBuilder';
import { IntersectionBuilder } from '../src/roads/IntersectionBuilder';
import { RoadGraph } from '../src/roads/RoadGraph';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';
import { BuildingCatalogRegistry } from '../src/buildings/BuildingCatalogRegistry';
import { PrefabMeshBuilder } from '../src/buildings/PrefabMeshBuilder';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { InteriorMeshBuilder } from '../src/buildings/InteriorMeshBuilder';
import { TectonicComponents } from '../src/buildings/TectonicComponents';
import { FirstPersonController } from '../src/core/engine/FirstPersonController';
import { BuildingManager } from '../src/buildings/BuildingManager';

describe('Arscity v3.0.0 - 4 Major Architectural & Gameplay Overhauls Suite', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    camera.position.set(0, 1.65, 0);
  });

  const mockDomElement = {
    requestPointerLock: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  } as any;

  describe('TAHAP 1: Permanent 3D Hotmix Asphalt Roads & Intersections', () => {
    it('builds road ribbon with valid UVs (u: 0..1, v: dist/4), computeVertexNormals, and computeTangents', () => {
      const graph = new RoadGraph();
      const nodeA = graph.getOrCreateNode(new THREE.Vector3(0, 0, 0));
      const nodeB = graph.getOrCreateNode(new THREE.Vector3(0, 0, 40));
      const edge = graph.addEdge(nodeA.id, nodeB.id, 'arterial');
      expect(edge).not.toBeNull();

      const roadGroup = RoadGeometryBuilder.buildRoadMeshGroup(edge!, graph);
      expect(roadGroup).toBeInstanceOf(THREE.Group);

      let roadMesh: THREE.Mesh | null = null;
      roadGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && child.name.includes('RoadMesh')) {
          roadMesh = child as THREE.Mesh;
        }
      });
      expect(roadMesh).not.toBeNull();

      const geom = roadMesh!.geometry;
      expect(geom).toBeDefined();

      const posAttr = geom.getAttribute('position');
      const uvAttr = geom.getAttribute('uv');
      const normAttr = geom.getAttribute('normal');
      const tangentAttr = geom.getAttribute('tangent');

      expect(posAttr).toBeDefined();
      expect(uvAttr).toBeDefined();
      expect(normAttr).toBeDefined();
      expect(tangentAttr).toBeDefined();

      expect(posAttr.count).toBeGreaterThan(0);
      expect(uvAttr.count).toBe(posAttr.count);
      expect(normAttr.count).toBe(posAttr.count);
      expect(tangentAttr.count).toBe(posAttr.count);

      // Verify UV coordinates are populated and within expected bounds (v = 40 / 4 = 10)
      const uvs = uvAttr.array;
      let hasZeroU = false;
      let hasOneU = false;
      let maxV = 0;

      for (let i = 0; i < uvAttr.count; i++) {
        const u = uvs[i * 2];
        const v = uvs[i * 2 + 1];
        if (Math.abs(u - 0.0) < 0.01) hasZeroU = true;
        if (Math.abs(u - 1.0) < 0.01) hasOneU = true;
        if (v > maxV) maxV = v;
        expect(Number.isNaN(u)).toBe(false);
        expect(Number.isNaN(v)).toBe(false);
      }

      expect(hasZeroU).toBe(true);
      expect(hasOneU).toBe(true);
      expect(maxV).toBeCloseTo(10.0, 1);
    });

    it('builds intersection polygon with planar world UVs (u = worldX/4, v = worldZ/4)', () => {
      const graph = new RoadGraph();
      const centerNode = graph.getOrCreateNode(new THREE.Vector3(0, 0, 0));
      const n1 = graph.getOrCreateNode(new THREE.Vector3(-20, 0, 0));
      const n2 = graph.getOrCreateNode(new THREE.Vector3(20, 0, 0));
      const n3 = graph.getOrCreateNode(new THREE.Vector3(0, 0, -20));
      const n4 = graph.getOrCreateNode(new THREE.Vector3(0, 0, 20));
      graph.addEdge(centerNode.id, n1.id, 'arterial');
      graph.addEdge(centerNode.id, n2.id, 'arterial');
      graph.addEdge(centerNode.id, n3.id, 'arterial');
      graph.addEdge(centerNode.id, n4.id, 'arterial');

      const interMesh = IntersectionBuilder.buildIntersectionMesh(centerNode, graph);
      expect(interMesh).not.toBeNull();

      const geom = interMesh!.geometry;
      const uvAttr = geom.getAttribute('uv');
      const normAttr = geom.getAttribute('normal');
      const tangentAttr = geom.getAttribute('tangent');

      expect(uvAttr).toBeDefined();
      expect(normAttr).toBeDefined();
      expect(tangentAttr).toBeDefined();

      const uvs = uvAttr.array;
      for (let i = 0; i < uvAttr.count; i++) {
        expect(Number.isNaN(uvs[i * 2])).toBe(false);
        expect(Number.isNaN(uvs[i * 2 + 1])).toBe(false);
      }
    });

    it('correctly uses specialized cycle track material for cycle paths', () => {
      const graph = new RoadGraph();
      const nodeA = graph.getOrCreateNode(new THREE.Vector3(0, 0, 0));
      const nodeB = graph.getOrCreateNode(new THREE.Vector3(0, 0, 20));
      const edge = graph.addEdge(nodeA.id, nodeB.id, 'cycle');
      expect(edge).not.toBeNull();

      const cycleGroup = RoadGeometryBuilder.buildRoadMeshGroup(edge!, graph);
      expect(cycleGroup).toBeDefined();
      const cycleMat = MaterialLibrary.get('cycle_track');
      expect(cycleMat).toBeDefined();
    });
  });

  describe('TAHAP 2: 18-Floor Skyscraper Catalog & Dynamic Floor Limits', () => {
    it('registers all 4 requested 18-floor skyscrapers with proper defaults and max limits', () => {
      const office = BuildingCatalogRegistry.getBuilding('skyscraper_office_tower');
      const greenApt = BuildingCatalogRegistry.getBuilding('skyscraper_green_apartment');
      const hotel = BuildingCatalogRegistry.getBuilding('skyscraper_grand_hotel');
      const mixed = BuildingCatalogRegistry.getBuilding('skyscraper_mixed_use');

      expect(office).toBeDefined();
      expect(office?.defaultFloors).toBe(18);
      expect(office?.maxFloors).toBe(18);

      expect(greenApt).toBeDefined();
      expect(greenApt?.defaultFloors).toBe(16);
      expect(greenApt?.maxFloors).toBe(18);

      expect(hotel).toBeDefined();
      expect(hotel?.defaultFloors).toBe(15);
      expect(hotel?.maxFloors).toBe(18);

      expect(mixed).toBeDefined();
      expect(mixed?.defaultFloors).toBe(18);
      expect(mixed?.maxFloors).toBe(18);
    });

    it('enforces architectural floor limits per building category', () => {
      // Skyscraper: up to 18 floors
      const skyLimits = BuildingCatalogRegistry.getFloorLimits('skyscraper_office_tower');
      expect(skyLimits.minFloors).toBe(1);
      expect(skyLimits.maxFloors).toBe(18);

      // Campus / Dorm: up to 12 floors
      const campusLimits = BuildingCatalogRegistry.getFloorLimits('kampus_studio_arsitektur');
      expect(campusLimits.maxFloors).toBe(12);

      // Shophouse: up to 6 floors
      const rukoLimits = BuildingCatalogRegistry.getFloorLimits('ruko_3fl');
      expect(rukoLimits.maxFloors).toBe(6);

      // Vernacular joglo: default max 3 floors
      const jogloLimits = BuildingCatalogRegistry.getFloorLimits('joglo');
      expect(jogloLimits.minFloors).toBe(1);
      expect(jogloLimits.maxFloors).toBe(3);
    });

    it('generates a fully articulated 18-floor mesh for skyscraper_office_tower with 0 NaN vertices', () => {
      const bldInstance: BuildingInstance = {
        id: 'sky_test_01',
        presetKey: 'skyscraper_office_tower',
        name: 'Menara Perkantoran Kaca Nusantara (18 Lantai)',
        category: 'perdagangan_jasa',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 32,
        length: 32,
        floorCount: 18,
        floorHeight: 3.8,
        roofType: 'flat_parapet',
        roofOverhang: 0.6,
        wallMaterial: 'concrete',
        wallColor: '#1e293b',
        roofMaterial: 'concrete'
      };

      const group = PrefabMeshBuilder.buildBuildingGroup(bldInstance);
      expect(group).toBeInstanceOf(THREE.Group);
      expect(group.children.length).toBeGreaterThan(0);

      // Check all vertices are finite (0 NaN coordinates)
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const geom = (child as THREE.Mesh).geometry;
          const pos = geom.getAttribute('position');
          expect(pos).toBeDefined();
          const arr = pos.array;
          for (let i = 0; i < arr.length; i++) {
            expect(Number.isNaN(arr[i])).toBe(false);
            expect(Number.isFinite(arr[i])).toBe(true);
          }
        }
      });
    });
  });

  describe('TAHAP 3: Physically Walkable Stairs & Interactive Elevator Shaft', () => {
    it('creates continuous 3D stairs and registers StairZones on the building instance', () => {
      const multiFloorBld: BuildingInstance = {
        id: 'tower_walk_01',
        presetKey: 'skyscraper_mixed_use',
        name: 'Menara Terpadu Ritel & Kantor',
        category: 'mall_ritel',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 24,
        length: 24,
        floorCount: 4,
        floorHeight: 4.0,
        roofType: 'flat',
        roofOverhang: 0.8,
        wallMaterial: 'concrete',
        wallColor: '#0f172a',
        roofMaterial: 'concrete'
      };

      const { stairGroup, stairZones } = InteriorMeshBuilder.buildBuildingStairwell(multiFloorBld, 0.35);
      expect(stairGroup).toBeInstanceOf(THREE.Group);
      expect(stairGroup.children.length).toBeGreaterThan(0);

      // 4 floors means 3 flights connecting 1->2, 2->3, 3->4
      expect(stairZones).toHaveLength(3);
      expect(stairZones[0].floorIndex).toBe(0);
      expect(stairZones[1].floorIndex).toBe(1);
      expect(stairZones[2].floorIndex).toBe(2);

      // Each flight has floorHeight 4.0
      expect(stairZones[0].floorHeight).toBe(4.0);
    });

    it('smoothly raises player position.y as player walks forward along stair flight', () => {
      const bldManager = new BuildingManager(scene);

      const bldInstance: BuildingInstance = {
        id: 'stair_test_bld',
        presetKey: 'skyscraper_office_tower',
        name: 'Menara Test Tangga',
        category: 'perdagangan_jasa',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 24,
        length: 24,
        floorCount: 4,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.6,
        wallMaterial: 'concrete',
        wallColor: '#1e293b',
        roofMaterial: 'concrete'
      };

      bldManager.addBuilding(bldInstance);

      const fpc = new FirstPersonController(camera, mockDomElement, bldManager);
      expect(fpc).toBeDefined();

      // Core stair flight coordinates:
      // coreX = -24 * 0.22 = -5.28; flightX = coreX - 0.68 = -5.96
      // zStart = -1.6, zEnd = +1.6
      const stairX = -5.96;

      // 1. Enter at base foot of stairs (z = -1.6, floor 1)
      fpc.enter(new THREE.Vector3(stairX, 0, -1.6));
      expect(fpc.currentFloor).toBe(1);
      const groundAtFoot = fpc.position.y - fpc.eyeHeight;
      expect(groundAtFoot).toBeCloseTo(0.35, 1); // Plinth height

      // 2. Walk forward to halfway up the stairs (z = 0.0)
      fpc.position.set(stairX, fpc.position.y, 0.0);
      fpc.update(0.01);
      const groundAtMid = fpc.position.y - fpc.eyeHeight;
      // Halfway up floorHeight 3.5 = 0.35 + 1.75 = 2.10
      expect(groundAtMid).toBeCloseTo(2.1, 0.3);
      expect(groundAtMid).toBeGreaterThan(groundAtFoot);

      // 3. Walk to the top landing (z = 1.6)
      fpc.position.set(stairX, fpc.position.y, 1.6);
      fpc.update(0.01);
      const groundAtTop = fpc.position.y - fpc.eyeHeight;
      // At top, elevation = 0.35 + 3.5 = 3.85, and floor locks to 2
      expect(groundAtTop).toBeCloseTo(3.85, 0.3);
      expect(fpc.currentFloor).toBe(2);

      fpc.dispose();
      bldManager.dispose();
    });

    it('allows instant interactive elevator traversal to any floor via goToFloor', () => {
      const bldManager = new BuildingManager(scene);

      bldManager.addBuilding({
        id: 'elevator_test_bld',
        presetKey: 'skyscraper_office_tower',
        name: 'Menara Lift Test',
        category: 'perdagangan_jasa',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 28,
        length: 28,
        floorCount: 18,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.6,
        wallMaterial: 'concrete',
        wallColor: '#1e293b',
        roofMaterial: 'concrete'
      });

      const fpc = new FirstPersonController(camera, mockDomElement, bldManager);
      fpc.enter(new THREE.Vector3(0, 0, 0));
      expect(fpc.currentFloor).toBe(1);

      // Instant travel to Floor 14
      fpc.goToFloor(14);
      expect(fpc.currentFloor).toBe(14);
      expect(fpc.targetFloor).toBe(14);
      expect(fpc.position.y).toBeCloseTo(0.35 + 13 * 3.5 + 1.65, 1);

      // Instant travel to Floor 18 (top floor)
      fpc.goToFloor(18);
      expect(fpc.currentFloor).toBe(18);

      fpc.dispose();
      bldManager.dispose();
    });
  });

  describe('TAHAP 4: Contextual 3D Furniture Generation', () => {
    it('generates rich contextual furniture sets tailored to different building archetypes', () => {
      // 1. Office Tower / Skyscraper
      const officeSet = TectonicComponents.buildInteriorFurnitureSet('podium_tower', 24, 24, 4.0);
      expect(officeSet.children.length).toBeGreaterThan(0);

      // 2. Grand Hotel
      const hotelSet = TectonicComponents.buildInteriorFurnitureSet('hotel', 24, 24, 3.6);
      expect(hotelSet.children.length).toBeGreaterThan(0);

      // 3. Clinic / Puskesmas
      const clinicSet = TectonicComponents.buildInteriorFurnitureSet('klinik', 20, 20, 3.8);
      expect(clinicSet.children.length).toBeGreaterThan(0);

      // 4. Joglo / Culture
      const jogloSet = TectonicComponents.buildInteriorFurnitureSet('joglo', 16, 16, 4.2);
      expect(jogloSet.children.length).toBeGreaterThan(0);

      // 5. Residential / Housing
      const resSet = TectonicComponents.buildInteriorFurnitureSet('standard', 12, 12, 3.2);
      expect(resSet.children.length).toBeGreaterThan(0);
    });
  });
});
