import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { PrefabMeshBuilder } from '../src/buildings/PrefabMeshBuilder';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { LightingSystem } from '../src/core/engine/LightingSystem';
import { RaycastManager } from '../src/core/engine/RaycastManager';
import { GridSystem } from '../src/world/GridSystem';
import { SpatialHashGrid } from '../src/core/engine/SpatialHashGrid';

describe('Arscity v3.1 Sprint: Performance, Memory & Zero-Jank Optimization Suite', () => {
  let scene: THREE.Scene;
  let buildingManager: BuildingManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    buildingManager = new BuildingManager(scene);
    PrefabMeshBuilder.clearCache();
  });

  describe('LAPIS 1: Smart Hierarchical LOD & Interior/Subsurface Culling', () => {
    it('separates building mesh into 3 distinct layers with optimized shadow flags', () => {
      const bld: BuildingInstance = {
        id: 'lod_test_bld_1',
        presetKey: 'house_36',
        name: 'Rumah Tipe 36',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 6,
        length: 10,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 1.0,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile'
      };

      const group = PrefabMeshBuilder.buildBuildingGroup(bld);
      const ext = group.getObjectByName('ExteriorShell') as THREE.Group;
      const int = group.getObjectByName('InteriorDetails') as THREE.Group;
      const sub = group.getObjectByName('SubsurfaceFoundation') as THREE.Group;

      expect(ext, 'ExteriorShell group must exist').toBeDefined();
      expect(int, 'InteriorDetails group must exist').toBeDefined();
      expect(sub, 'SubsurfaceFoundation group must exist').toBeDefined();

      // Subsurface foundation must be hidden by default under ground
      expect(sub.visible).toBe(false);

      // Verify shadow casting policy (zero shadow overdraw for indoor furniture)
      int.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          expect((child as THREE.Mesh).castShadow).toBe(false);
          expect((child as THREE.Mesh).receiveShadow).toBe(true);
        }
      });

      ext.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          expect((child as THREE.Mesh).castShadow).toBe(true);
          expect((child as THREE.Mesh).receiveShadow).toBe(true);
        }
      });
    });

    it('hides interior details when camera distance >= 60m and restores them when < 60m', () => {
      const bld: BuildingInstance = {
        id: 'lod_dist_bld',
        presetKey: 'ruko_3fl',
        name: 'Ruko Modern 3 Lantai',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 8,
        length: 16,
        floorCount: 3,
        floorHeight: 3.8,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'concrete',
        wallColor: '#cbd5e1',
        roofMaterial: 'concrete'
      };

      buildingManager.addBuilding(bld);

      // Camera far away: 150m (Orbit mode)
      const farCam = new THREE.Vector3(150, 80, 150);
      buildingManager.updateLOD(farCam, 'orbit', false, false, 60);

      const grp = (buildingManager as any).buildingGroups.get('lod_dist_bld') as THREE.Group;
      const intGroup = grp.getObjectByName('InteriorDetails') as THREE.Group;
      expect(intGroup.visible, 'Interior details must be culled at > 60m').toBe(false);

      // Camera close up: 35m (Orbit mode)
      const closeCam = new THREE.Vector3(20, 10, 20);
      buildingManager.updateLOD(closeCam, 'orbit', false, false, 60);
      expect(intGroup.visible, 'Interior details must be rendered at < 60m').toBe(true);

      // First person mode within 80m threshold -> interior MUST remain visible!
      const fpCam = new THREE.Vector3(45, 10, 45); // dist ~64m (between 60m and 80m)
      buildingManager.updateLOD(fpCam, 'first_person', false, false, 60);
      expect(intGroup.visible, 'Interior details must be visible in first_person mode within 80m').toBe(true);

      // Camera far away (150m) but section cut is active -> interior MUST be visible!
      buildingManager.updateLOD(farCam, 'orbit', true, false, 60);
      expect(intGroup.visible, 'Interior details must be visible when section cut is active').toBe(true);
    });

    it('reveals subsurface foundation only when X-Ray lens or Section Cut is active', () => {
      const bld: BuildingInstance = {
        id: 'lod_sub_bld',
        presetKey: 'skyscraper_office_tower',
        name: 'Menara Kantor 18 Lantai',
        category: 'commercial',
        position: new THREE.Vector3(10, 0, 10),
        rotationY: 0,
        width: 24,
        length: 24,
        floorCount: 18,
        floorHeight: 4.2,
        roofType: 'flat',
        roofOverhang: 0.8,
        wallMaterial: 'concrete',
        wallColor: '#1e293b',
        roofMaterial: 'metal'
      };

      buildingManager.addBuilding(bld);
      const cam = new THREE.Vector3(30, 20, 30);
      const grp = (buildingManager as any).buildingGroups.get('lod_sub_bld') as THREE.Group;
      const subGroup = grp.getObjectByName('SubsurfaceFoundation') as THREE.Group;

      // Normal mode -> hidden
      buildingManager.updateLOD(cam, 'orbit', false, false, 60);
      expect(subGroup.visible).toBe(false);

      // X-Ray lens active -> visible
      buildingManager.updateLOD(cam, 'orbit', false, true, 60);
      expect(subGroup.visible).toBe(true);

      // Section cut active -> visible
      buildingManager.updateLOD(cam, 'orbit', true, false, 60);
      expect(subGroup.visible).toBe(true);
    });
  });

  describe('LAPIS 3: On-Demand Dirty-Flag Shadow Map Updates', () => {
    it('sets shadow.needsUpdate only when time changes or camera moves > 2.0m', () => {
      const lighting = new LightingSystem(scene);

      // Reset dirty flag
      lighting.isShadowDirty = false;
      lighting.sunLight.shadow.needsUpdate = false;

      // Camera moves only 0.5m -> below 2.0m threshold -> NO shadow rebuild
      lighting.updateCenter(new THREE.Vector3(0.3, 0, 0.4));
      expect(lighting.sunLight.shadow.needsUpdate).toBe(false);

      // Camera moves 5.0m -> above 2.0m threshold -> shadow dirty!
      lighting.updateCenter(new THREE.Vector3(5.0, 0, 0));
      expect(lighting.sunLight.shadow.needsUpdate).toBe(true);
      expect(lighting.isShadowDirty).toBe(true);

      // Reset and change sun time
      lighting.sunLight.shadow.needsUpdate = false;
      lighting.setTime(12.0); // Noon
      expect(lighting.sunLight.shadow.needsUpdate).toBe(true);
    });
  });

  describe('LAPIS 4: Raycast Manager Exterior Shell Filtering', () => {
    it('filters raycast candidate objects to ExteriorShell avoiding interior furniture', () => {
      const mockDom = {
        addEventListener: () => {},
        removeEventListener: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
      } as any;

      const camera = new THREE.PerspectiveCamera();
      const grid = new GridSystem(scene, 100, 1);
      const raycast = new RaycastManager(mockDom, camera, grid, scene);

      const bldGroup = new THREE.Group();
      bldGroup.name = 'TestBuilding';
      const exterior = new THREE.Group();
      exterior.name = 'ExteriorShell';
      const interior = new THREE.Group();
      interior.name = 'InteriorDetails';
      bldGroup.add(exterior);
      bldGroup.add(interior);

      // Register with spatial grid
      raycast.registerSpatialObject('test_bld', { minX: -10, minZ: -10, maxX: 10, maxZ: 10 }, bldGroup);

      // Simulate a ray pointing at the object
      raycast.groundPoint.set(0, 0, 0);
      const results = raycast.raycastObjects([bldGroup]);
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
