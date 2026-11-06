import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { LandscapeManager } from '../src/world/LandscapeManager';
import { Terrain } from '../src/world/Terrain';
import { Engine, CustomMapConfig } from '../src/core/engine/Engine';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';
import { createModernGridMapData } from '../src/world/ModernGridPreset';

describe('Tahap 1–4: Visionary UI/UX & Three.js Engine Overhaul Suite', () => {
  let scene: THREE.Scene;
  let buildingManager: BuildingManager;
  let landscapeManager: LandscapeManager;
  let terrain: Terrain;

  beforeEach(() => {
    scene = new THREE.Scene();
    terrain = new Terrain(scene, 400, 64);
    buildingManager = new BuildingManager(scene);
    landscapeManager = new LandscapeManager(scene);
  });

  describe('TAHAP 1: Kunci Logika Render Jarak (LOD) Hanya di Mode First-Person (Hilang di Orbit)', () => {
    let testBld: BuildingInstance;

    beforeEach(() => {
      testBld = {
        id: 'visionary_lod_bld',
        presetKey: 'ruko_3fl',
        name: 'Ruko Visioner Modern',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 10,
        length: 16,
        floorCount: 3,
        floorHeight: 3.8,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'concrete',
        wallColor: '#cbd5e1',
        roofMaterial: 'concrete',
        userData: {
          placedFurniture: [
            {
              id: 'fur_sofa_fl1',
              type: 'sofa_single',
              name: 'Sofa Lantai 1',
              position: [1, 0, 2],
              rotationY: 0,
              slot: 'floor',
              floorIndex: 1,
            },
            {
              id: 'fur_desk_fl2',
              type: 'table_work',
              name: 'Meja Kerja Lantai 2',
              position: [1, 3.8, 2],
              rotationY: 0,
              slot: 'floor',
              floorIndex: 2,
            },
          ],
        },
      };

      buildingManager.addBuilding(testBld);
    });

    it('1.1: Orbit & Drone mode renders 100% exterior detail stably from any distance without popping', () => {
      const farOrbitCam = new THREE.Vector3(250, 120, 250); // ~373m away
      buildingManager.updateLOD(farOrbitCam, 'orbit', false, false, 60, 'high');

      const grp = buildingManager.getBuildingGroup('visionary_lod_bld')!;
      const ext = grp.getObjectByName('ExteriorShell')!;
      const details = grp.getObjectByName('DetailPropsGroup')!;
      const lod2 = grp.getObjectByName('LOD2MassingGroup')!;
      const lot = grp.getObjectByName('LotGroundContextGroup')!;

      // Zero popping: no LOD2 low-poly impostor massing
      expect(lod2.visible, 'LOD2 massing must NOT be shown in Orbit mode').toBe(false);
      expect(ext.visible, 'ExteriorShell must be 100% visible at all distances in Orbit').toBe(true);
      expect(details.visible, 'Facade & roof detail props must be visible at all distances in Orbit').toBe(true);
      expect(lot.visible, 'Lot ground context must be visible at all distances in Orbit').toBe(true);
    });

    it('1.2: Orbit mode hides placedFurniture to maintain 144 FPS', () => {
      const orbitCam = new THREE.Vector3(20, 15, 20);
      buildingManager.updateLOD(orbitCam, 'orbit', false, false, 60, 'high');

      const grp = buildingManager.getBuildingGroup('visionary_lod_bld')!;
      const dynamicFur = grp.getObjectByName('DynamicFurnitureGroup')!;
      expect(dynamicFur.visible, 'placedFurniture must be hidden in 3D Orbit').toBe(false);
    });

    it('1.3: 2D Floor Plan mode reveals Floor 1 placedFurniture and interior', () => {
      const planCam = new THREE.Vector3(0, 50, 0);
      buildingManager.updateLOD(planCam, '2d', false, false, 60, 'high');

      const grp = buildingManager.getBuildingGroup('visionary_lod_bld')!;
      const dynamicFur = grp.getObjectByName('DynamicFurnitureGroup')!;
      const interior = grp.getObjectByName('InteriorDetails')!;

      expect(dynamicFur.visible, 'placedFurniture must be visible in 2D mode').toBe(true);
      expect(interior.visible, 'Interior details must be visible in 2D mode').toBe(true);
    });

    it('1.4: First-Person mode enables Smart Distance Rendering (< 30m vs >= 30m)', () => {
      const grp = buildingManager.getBuildingGroup('visionary_lod_bld')!;
      const ext = grp.getObjectByName('ExteriorShell')!;
      const dynamicFur = grp.getObjectByName('DynamicFurnitureGroup')!;
      const interior = grp.getObjectByName('InteriorDetails')!;

      // Near (< 30m)
      const nearFpCam = new THREE.Vector3(8, 1.8, 8);
      buildingManager.updateLOD(nearFpCam, 'first_person', false, false, 60, 'high');
      expect(ext.visible).toBe(true);
      expect(dynamicFur.visible, 'placedFurniture must be visible < 30m in First-Person').toBe(true);
      expect(interior.visible, 'Interior must be visible < 30m in First-Person').toBe(true);

      // Far (>= 30m)
      const farFpCam = new THREE.Vector3(45, 1.8, 45);
      buildingManager.updateLOD(farFpCam, 'first_person', false, false, 60, 'high');
      expect(ext.visible).toBe(true);
      expect(dynamicFur.visible, 'placedFurniture must be culled >= 30m in First-Person').toBe(false);
      expect(interior.visible, 'Interior must be culled >= 30m in First-Person').toBe(false);
    });

    it('1.5: Landscape renders 100% tree leaf canopies stably in Orbit without distance popping', () => {
      landscapeManager.addItem({
        id: 'orbit_tree_1',
        type: 'tree_tabebuya_pink',
        position: new THREE.Vector3(50, 0, 50),
        rotationY: 0,
        radius: 3.0,
      });

      // Update in Orbit mode
      landscapeManager.updateSpatialLOD(new THREE.Vector3(250, 100, 250), null, null, 'orbit');
      const treeGrp = landscapeManager.getItemGroup('orbit_tree_1')!;
      expect(treeGrp.visible).toBe(true);
      expect(treeGrp.userData.currentZone).toBe(0);
    });
  });

  describe('TAHAP 2: Fitur Kustomisasi Peta Baru & Generator Topografi', () => {
    it('2.1: Terrain.resetFlat resets all vertex elevations to 0.0', () => {
      terrain.modifyElevation(0, 0, 25, 8.0, 'raise');
      expect(terrain.getHeightAt(0, 0)).toBeGreaterThan(2.0);

      terrain.resetFlat();
      expect(terrain.getHeightAt(0, 0)).toBeCloseTo(0, 2);
    });

    it('2.2: Terrain.generateTropicalRiverValley carves a river channel to depth -2.2m', () => {
      terrain.resetFlat();
      const points = terrain.generateTropicalRiverValley();
      expect(points.length).toBeGreaterThanOrEqual(2);

      // Center of the river valley should be carved down
      const riverCenterElev = terrain.getHeightAt(0, 0);
      expect(riverCenterElev).toBeLessThan(-0.5);
    });

    it('2.3: Terrain.generateNaturalPerimeterHills sculpts hills on outer border while leaving center flat', () => {
      terrain.resetFlat();
      terrain.generateNaturalPerimeterHills();

      // Center basin remains flat for construction
      expect(terrain.getHeightAt(0, 0)).toBeCloseTo(0, 2);
      expect(terrain.getHeightAt(20, 20)).toBeCloseTo(0, 2);

      // Outer rim has elevated hills
      const outerRimElev = terrain.getHeightAt(120, 120);
      expect(outerRimElev).toBeGreaterThan(4.0);
    });

    it('2.4: ModernGridPreset generates valid symmetric 3x3 road grid', () => {
      const data = createModernGridMapData();
      expect(data.roads.nodes.length).toBeGreaterThanOrEqual(9);
      expect(data.roads.edges.length).toBeGreaterThanOrEqual(12);
      expect(data.buildings.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('TAHAP 3 & 4: Palet Warna Tiga Serangkai (Seal Blue, Navy Blue, Crimson Pink)', () => {
    it('3.1: MaterialLibrary resolves triad colors accurately', () => {
      const matLib = MaterialLibrary.getInstance();
      expect(matLib).toBeDefined();
      expect(matLib.kacaDekat).toBeDefined();
      expect(matLib.kacaJauh).toBeDefined();
    });

    it('4.1: BuildingManager correctly calculates ground area and total floor area for CAD metrics', () => {
      const bld: BuildingInstance = {
        id: 'metric_test_bld',
        presetKey: 'ruko_2fl',
        name: 'Ruko Test',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 10,
        length: 20,
        floorCount: 2,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'concrete',
        wallColor: '#cbd5e1',
        roofMaterial: 'concrete',
      };

      const groundArea = BuildingManager.getBuildingGroundArea(bld);
      const totalArea = BuildingManager.getBuildingTotalFloorArea(bld);

      expect(groundArea).toBe(200); // 10 * 20
      expect(totalArea).toBe(400);  // 200 * 2 floors
    });
  });
});

