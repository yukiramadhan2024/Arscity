import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  FIRST_PERSON_FURNITURE_CATALOG,
  FirstPersonFurnitureBuilder,
  FurnitureCatalogItem
} from '../src/buildings/FirstPersonFurnitureCatalog';
import { CitySerializer, CitySaveData } from '../src/io/CitySerializer';
import { PlacedFurnitureData, MoveFurnitureCommand, RemoveFurnitureCommand } from '../src/core/commands/CityCommands';

describe('Tahap 4 (T4.1 - T4.4): Perabot Berpermukaan dan Magnet Kursi', () => {
  // =========================================================================
  // T4.1: MODEL DATA & MIGRASI SKEMA
  // =========================================================================
  describe('T4.1: Model data (Slots, ParentId & Legacy Migration)', () => {
    it('1. Catalog items specify allowedSlots per furniture type', () => {
      const tabletopItems = FIRST_PERSON_FURNITURE_CATALOG.filter((f) =>
        f.allowedSlots?.includes('tabletop')
      );
      expect(tabletopItems.length).toBeGreaterThanOrEqual(4);
      expect(tabletopItems.some((f) => f.id === 'monitor_pc')).toBe(true);
      expect(tabletopItems.some((f) => f.id === 'coffee_machine')).toBe(true);
      expect(tabletopItems.some((f) => f.id === 'table_lamp')).toBe(true);
      expect(tabletopItems.some((f) => f.id === 'small_pot')).toBe(true);

      const wallItems = FIRST_PERSON_FURNITURE_CATALOG.filter((f) =>
        f.allowedSlots?.includes('wall')
      );
      expect(wallItems.length).toBeGreaterThanOrEqual(3);
      expect(wallItems.some((f) => f.id === 'painting_art')).toBe(true);
      expect(wallItems.some((f) => f.id === 'wall_sconce')).toBe(true);
      expect(wallItems.some((f) => f.id === 'wall_signage')).toBe(true);

      const floorItems = FIRST_PERSON_FURNITURE_CATALOG.filter((f) =>
        f.allowedSlots?.includes('floor')
      );
      expect(floorItems.length).toBeGreaterThanOrEqual(10);
      expect(floorItems.some((f) => f.id === 'sofa_l')).toBe(true);
      expect(floorItems.some((f) => f.id === 'desk_office')).toBe(true);
    });

    it('2. Desks, tables, and counters specify top surface metadata', () => {
      const surfaceDesks = FIRST_PERSON_FURNITURE_CATALOG.filter((f) => f.hasTopSurface);
      expect(surfaceDesks.length).toBeGreaterThanOrEqual(4);

      const desk = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === 'desk_office');
      expect(desk).toBeDefined();
      expect(desk?.hasTopSurface).toBe(true);
      expect(desk?.topSurfaceHeight).toBeCloseTo(0.74, 2);
      expect(desk?.topSurfaceBounds).toBeDefined();
      expect(desk?.topSurfaceBounds?.width).toBeGreaterThan(1.0);
      expect(desk?.topSurfaceBounds?.depth).toBeGreaterThan(0.5);

      const dining = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === 'dining_set');
      expect(dining?.hasTopSurface).toBe(true);
      expect(dining?.topSurfaceHeight).toBeCloseTo(0.75, 2);

      const bar = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === 'bar_counter');
      expect(bar?.hasTopSurface).toBe(true);
      expect(bar?.topSurfaceHeight).toBeCloseTo(0.90, 2);
    });

    it('3. Migrates legacy city save files without slot to "floor" and upgrades schema version to 2.1.0', () => {
      const legacySave = {
        version: '2.0.0',
        cityTitle: 'Kota Lawas',
        timestamp: 1700000000000,
        environment: { timeOfDay: 12, dayOfYear: 100 },
        roads: { nodes: [], edges: [] },
        buildings: [
          {
            id: 'bld_legacy_1',
            presetKey: 'house_36',
            name: 'Rumah Warisan',
            position: [0, 0, 0],
            rotationY: 0,
            placedFurniture: [
              {
                id: 'fur_1',
                type: 'sofa_l',
                name: 'Sofa Lawas',
                position: [1, 0, 1],
                rotationY: 0,
                floorIndex: 1
                // No slot or parentId property
              },
              {
                id: 'fur_2',
                type: 'desk_office',
                name: 'Meja Lawas',
                position: [2, 0, 2],
                rotationY: 0,
                floorIndex: 1
              }
            ]
          }
        ],
        lots: []
      };

      const migrated = CitySerializer.migrateCityData(legacySave);
      expect(migrated.version).toBe('2.1.0');

      const bld = migrated.buildings[0];
      expect(bld.placedFurniture).toBeDefined();
      expect(bld.placedFurniture).toHaveLength(2);
      expect(bld.placedFurniture![0].slot).toBe('floor');
      expect(bld.placedFurniture![1].slot).toBe('floor');
      expect(bld.placedFurniture![0].parentId).toBeUndefined();
    });

    it('4. Preserves existing slot and parentId when migrating or serializing', () => {
      const modernSave = {
        version: '2.1.0',
        cityTitle: 'Kota Modern',
        timestamp: 1700000000000,
        environment: { timeOfDay: 12, dayOfYear: 100 },
        roads: { nodes: [], edges: [] },
        buildings: [
          {
            id: 'bld_mod_1',
            presetKey: 'office_tower',
            name: 'Menara Kantor',
            position: [0, 0, 0],
            rotationY: 0,
            placedFurniture: [
              {
                id: 'fur_desk',
                type: 'desk_office',
                name: 'Meja Kerja',
                position: [0, 0, 0],
                rotationY: 0,
                floorIndex: 1,
                slot: 'floor'
              },
              {
                id: 'fur_monitor',
                type: 'monitor_pc',
                name: 'Monitor PC',
                position: [0, 0.74, 0],
                rotationY: 0,
                floorIndex: 1,
                slot: 'tabletop',
                parentId: 'fur_desk'
              },
              {
                id: 'fur_art',
                type: 'painting_art',
                name: 'Lukisan Dinding',
                position: [0, 1.5, -4],
                rotationY: 0,
                floorIndex: 1,
                slot: 'wall'
              }
            ]
          }
        ],
        lots: []
      };

      const migrated = CitySerializer.migrateCityData(modernSave);
      expect(migrated.version).toBe('2.1.0');
      const furList = migrated.buildings[0].placedFurniture;
      expect(furList).toBeDefined();
      expect(furList![0].slot).toBe('floor');
      expect(furList![1].slot).toBe('tabletop');
      expect(furList![1].parentId).toBe('fur_desk');
      expect(furList![2].slot).toBe('wall');
    });
  });

  // =========================================================================
  // T4.2: TABLETOP & WALL PLACEMENT LOGIC
  // =========================================================================
  describe('T4.2: Tabletop & Wall Placement Logic', () => {
    let camera: THREE.PerspectiveCamera;
    let mockDomElement: any;
    let controller: any;
    let mockBuildingManager: any;
    let bldGroup: THREE.Group;
    let bldData: any;

    beforeEach(async () => {
      const { FirstPersonController } = await import('../src/core/engine/FirstPersonController');
      camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
      camera.position.set(0, 1.65, 0);
      camera.lookAt(0, 1.65, 5);

      mockDomElement = {
        requestPointerLock: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };
      bldGroup = new THREE.Group();
      bldGroup.name = 'BuildingGroup_bld_1';

      // 1. Horizontal floor mesh
      const floorGeo = new THREE.PlaneGeometry(10, 10);
      floorGeo.rotateX(-Math.PI / 2);
      const floorMesh = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial());
      floorMesh.name = 'FloorMesh';
      bldGroup.add(floorMesh);

      // 2. Vertical wall mesh facing South (normal: 0, 0, 1)
      const wallGeo = new THREE.PlaneGeometry(10, 3.2);
      const wallMesh = new THREE.Mesh(wallGeo, new THREE.MeshBasicMaterial());
      wallMesh.name = 'WallMesh_North';
      wallMesh.position.set(0, 1.6, 4.8);
      wallMesh.rotation.y = Math.PI; // normal faces -Z towards center
      bldGroup.add(wallMesh);

      // 3. Desk furniture group with top surface at Y = 0.74m
      const deskGroup = new THREE.Group();
      deskGroup.name = 'Furniture_desk_1';
      deskGroup.userData = { furnitureId: 'fur_desk_1', type: 'desk_office', isFurniture: true };
      const deskTopGeo = new THREE.BoxGeometry(1.6, 0.05, 0.8);
      const deskTopMesh = new THREE.Mesh(deskTopGeo, new THREE.MeshBasicMaterial());
      deskTopMesh.position.set(0, 0.74, 0);
      deskTopMesh.userData = { furnitureId: 'fur_desk_1', type: 'desk_office', isFurniture: true };
      deskGroup.add(deskTopMesh);
      deskGroup.position.set(0, 0, 2.0);
      bldGroup.add(deskGroup);

      bldData = {
        id: 'bld_1',
        name: 'Gedung Uji',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 10,
        length: 10,
        floorHeight: 3.2,
        plinthHeight: 0.35,
        userData: {
          placedFurniture: [
            {
              id: 'fur_desk_1',
              type: 'desk_office',
              name: 'Meja Kantor',
              position: [0, 0, 2.0],
              rotationY: 0,
              floorIndex: 1,
              slot: 'floor'
            }
          ]
        }
      };

      mockBuildingManager = {
        buildings: new Map([['bld_1', bldData]]),
        buildingGroups: new Map([['bld_1', bldGroup]]),
        getBuildingGroup: (id: string) => (id === 'bld_1' ? bldGroup : null),
        masterGroup: new THREE.Group()
      };
      mockBuildingManager.masterGroup.add(bldGroup);
      bldGroup.updateMatrixWorld(true);

      controller = new FirstPersonController(camera, mockDomElement, mockBuildingManager);
      controller.isActive = true;
      controller.insideBuildingId = 'bld_1';
      controller.activeDockTab = 'furniture';
    });

    it('1. Tabletop item snaps to parent desk surface and sets pending slot & parentId', () => {
      controller.selectedFurnitureId = 'monitor_pc'; // allowedSlots: ['tabletop']
      // Point ray at desk top surface at an angle from front of desk (Z = 1.0, Y = 1.6m looking towards Z = 2.0, Y = 0.74)
      camera.position.set(0, 1.6, 1.0);
      camera.lookAt(0, 0.74, 2.0);
      camera.updateMatrixWorld(true);

      controller['updateCenterRaycast']();

      expect(controller.isPlacementValid).toBe(true);
      expect(controller.pendingFurnitureSlot).toBe('tabletop');
      expect(controller.pendingParentId).toBe('fur_desk_1');
      expect(controller.reticleActionLabel).toContain('Taruh');
      expect(controller.reticleActionLabel).toContain('di atas meja');

      // Clamped within topSurfaceBounds and snapped to 0.05m grid
      expect(controller.currentPlacementTarget.y).toBeCloseTo(0.74 + 0.35, 2);
    });

    it('2. Tabletop item shows invalid slot hint when aimed at floor', () => {
      controller.selectedFurnitureId = 'coffee_machine'; // allowedSlots: ['tabletop']
      // Point ray at floor away from desk (at Z = -2.0)
      camera.position.set(0, 1.65, 0);
      camera.lookAt(0, 0, -2.0);
      camera.updateMatrixWorld(true);

      controller['updateCenterRaycast']();

      expect(controller.isPlacementValid).toBe(false);
      expect(controller.pendingFurnitureSlot).toBe('tabletop');
      expect(controller.pendingParentId).toBeUndefined();
      expect(controller.reticleActionLabel).toBe('Membutuhkan permukaan meja (tabletop)');
    });

    it('3. Wall item attaches flush to vertical wall within valid height (0.8m - 2.2m)', () => {
      controller.selectedFurnitureId = 'painting_art'; // allowedSlots: ['wall']
      // Point ray horizontally at north wall (Z = 4.8, Y = 1.5m)
      camera.position.set(0, 1.5, 2.0);
      camera.lookAt(0, 1.5, 4.8);
      camera.updateMatrixWorld(true);

      controller['updateCenterRaycast']();

      expect(controller.isPlacementValid).toBe(true);
      expect(controller.pendingFurnitureSlot).toBe('wall');
      expect(controller.reticleActionLabel).toContain('Pasang');
      expect(controller.reticleActionLabel).toContain('pada dinding');
      // Target should be flush against wall with small normal offset
      expect(controller.currentPlacementTarget.z).toBeCloseTo(4.78, 1);
    });

    it('4. Wall item shows invalid hint when aimed at floor or outside valid height range', () => {
      controller.selectedFurnitureId = 'wall_sconce'; // allowedSlots: ['wall']
      // Point ray at floor
      camera.position.set(0, 1.65, 0);
      camera.lookAt(0, 0, -2.0);
      camera.updateMatrixWorld(true);

      controller['updateCenterRaycast']();

      expect(controller.isPlacementValid).toBe(false);
      expect(controller.pendingFurnitureSlot).toBe('wall');
      expect(controller.reticleActionLabel).toBe('Membutuhkan dinding vertikal (wall) (0,8 m - 2,2 m)');
    });

    it('5. Floor item shows invalid hint when aimed at vertical wall', () => {
      controller.selectedFurnitureId = 'sofa_l'; // allowedSlots: ['floor']
      // Point ray directly at wall
      camera.position.set(0, 1.5, 2.0);
      camera.lookAt(0, 1.5, 4.8);
      camera.updateMatrixWorld(true);

      controller['updateCenterRaycast']();

      expect(controller.isPlacementValid).toBe(false);
      expect(controller.reticleActionLabel).toBe('Membutuhkan lantai (floor)');
    });
  });

  // =========================================================================
  // T4.3: MODEL 3D MEMBULAT & GEOMETRY CACHE
  // =========================================================================
  describe('T4.3: Model 3D Membulat & Geometry Cache', () => {
    function computeGroupTriangleCount(group: THREE.Group): number {
      let triangles = 0;
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) {
            const geo = mesh.geometry;
            triangles += geo.index
              ? geo.index.count / 3
              : (geo.attributes.position ? geo.attributes.position.count / 3 : 0);
          }
        }
      });
      return triangles;
    }

    it('1. Furniture models use rounded geometries (CapsuleGeometry & CylinderGeometry)', () => {
      const sofa = FirstPersonFurnitureBuilder.buildFurniture('sofa_l');
      let hasCapsuleOrCylinder = false;
      sofa.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const geo = (child as THREE.Mesh).geometry;
          if (geo.type === 'CapsuleGeometry' || geo.type === 'CylinderGeometry') {
            hasCapsuleOrCylinder = true;
          }
        }
      });
      expect(hasCapsuleOrCylinder).toBe(true);

      const diningChair = FirstPersonFurnitureBuilder.buildFurniture('chair_dining');
      let diningHasRounded = false;
      diningChair.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const geo = (child as THREE.Mesh).geometry;
          if (geo.type === 'CapsuleGeometry' || geo.type === 'CylinderGeometry') {
            diningHasRounded = true;
          }
        }
      });
      expect(diningHasRounded).toBe(true);
    });

    it('2. Furniture models adhere to the ~600 triangle budget per item', () => {
      const testTypes = [
        'sofa_l',
        'sofa_3seater',
        'bed_king',
        'dining_set',
        'desk_office',
        'chair_dining',
        'chair_office',
        'monitor_pc',
        'coffee_machine',
        'table_lamp',
        'small_pot',
        'painting_art',
        'wall_sconce',
        'wall_signage'
      ];

      for (const type of testTypes) {
        const item = FirstPersonFurnitureBuilder.buildFurniture(type);
        const tris = computeGroupTriangleCount(item);
        // Budget is around 600 triangles per item
        expect(tris).toBeLessThanOrEqual(650);
        expect(tris).toBeGreaterThan(10);
      }
    });

    it('3. Geometries are cached and shared across multiple furniture instances', () => {
      FirstPersonFurnitureBuilder.clearGeometryCache();
      const sofa1 = FirstPersonFurnitureBuilder.buildFurniture('sofa_l');
      const cacheSizeAfterFirst = FirstPersonFurnitureBuilder.getGeometryCacheSize();
      expect(cacheSizeAfterFirst).toBeGreaterThan(0);

      const sofa2 = FirstPersonFurnitureBuilder.buildFurniture('sofa_l');
      const cacheSizeAfterSecond = FirstPersonFurnitureBuilder.getGeometryCacheSize();
      // Cache size should remain identical because geometries are shared
      expect(cacheSizeAfterSecond).toBe(cacheSizeAfterFirst);

      // Verify that mesh geometries are strictly identical reference
      const mesh1 = sofa1.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh;
      const mesh2 = sofa2.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh;
      expect(mesh1.geometry).toBe(mesh2.geometry);
    });
  });
});
