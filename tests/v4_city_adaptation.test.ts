import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { RoadManager } from '../src/roads/RoadManager';
import { LotManager } from '../src/zones/LotManager';
import { BuildingInstance } from '../src/buildings/PrefabTypes';

describe('Tahap 5: Adaptasi Kota, Fasad, Ekologi, Denah 2D', () => {
  let scene: THREE.Scene;
  let buildingManager: BuildingManager;
  let roadManager: RoadManager;
  let lotManager: LotManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    buildingManager = new BuildingManager(scene);
    roadManager = new RoadManager(scene);
    lotManager = new LotManager(scene, buildingManager);

    buildingManager.setDependencies(roadManager, lotManager);
    lotManager.setDependencies(roadManager);

    // Create a local road along X-axis at Z = 0
    // Width = 9m (asphalt half-width = 4.5m), sidewalk = 1.5m -> corridor half-width = 6.0m
    const edge = roadManager.addRoad(
      new THREE.Vector3(-50, 0, 0),
      new THREE.Vector3(50, 0, 0),
      'local'
    );
    expect(edge).toBeDefined();
  });

  describe('T5.1: Jalan Masuk Otomatis (Automatic Entrance Walkway)', () => {
    it('generates a 1.2m stone paving walkway when building is between 1m and 18m from road sidewalk', () => {
      // Building at (0, 0, 15) with length 10m -> front door at z = 15 - 5 = 10 (facing -Z towards road) or rotated
      // Building facing road at Z=0: rotationY = Math.PI, so front is pointing towards -Z
      // With rotationY = Math.PI:
      // doorWorldZ = 15 + cos(PI) * 5 = 15 - 5 = 10m
      // Road sidewalk edge is at z = 6.0m
      // Distance from door (z=10) to sidewalk (z=6) is 4.0m (within 1m-18m)
      const bld: BuildingInstance = {
        id: 'bld_walkway_1',
        presetKey: 'ruko_3fl',
        name: 'Ruko Jalan Utama',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 15),
        rotationY: Math.PI,
        width: 6,
        length: 10,
        floorCount: 3,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'metal',
      };

      buildingManager.addBuilding(bld);

      const walkway = buildingManager.walkwaysGroup.getObjectByName('Walkway_bld_walkway_1') as THREE.Mesh;
      expect(walkway).toBeDefined();
      expect(walkway).toBeInstanceOf(THREE.Mesh);

      // Check width ~1.2m and length ~4m
      const geom = walkway.geometry as THREE.BoxGeometry;
      expect(geom.parameters.width).toBeCloseTo(1.2, 1);
      expect(geom.parameters.depth).toBeCloseTo(4.0, 1);

      // Check building userData metrics
      expect(bld.userData?.walkwayArea).toBeCloseTo(4.0 * 1.2, 1);
      expect(bld.userData?.walkwayPath).toBeDefined();
      expect(bld.userData?.walkwayPath.width).toBe(1.2);
    });

    it('does NOT generate a walkway if building is too far (> 18m) or too close (< 1m)', () => {
      // 1. Far building: position at (0, 0, 40), rotation PI -> door at z = 35 -> dist to sidewalk (z=6) = 29m (> 18m)
      const farBld: BuildingInstance = {
        id: 'bld_far',
        presetKey: 'house_36',
        name: 'Rumah Jauh',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 40),
        rotationY: Math.PI,
        width: 6,
        length: 10,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile',
      };
      buildingManager.addBuilding(farBld);
      expect(buildingManager.walkwaysGroup.getObjectByName('Walkway_bld_far')).toBeUndefined();

      // 2. Too close building: position at (0, 0, 11.5), rotation PI -> door at z = 6.5 -> dist to sidewalk (z=6) = 0.5m (< 1m)
      const closeBld: BuildingInstance = {
        id: 'bld_close',
        presetKey: 'house_36',
        name: 'Rumah Terlalu Dekat',
        category: 'residential',
        position: new THREE.Vector3(20, 0, 11.5),
        rotationY: Math.PI,
        width: 6,
        length: 10,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile',
      };
      buildingManager.addBuilding(closeBld);
      expect(buildingManager.walkwaysGroup.getObjectByName('Walkway_bld_close')).toBeUndefined();
    });

    it('skips walkway generation and logs note if obstructed by another building', () => {
      // Main building at (0, 0, 20), door at z = 15, sidewalk at z = 6 (path spans z = 15 to 6)
      const mainBld: BuildingInstance = {
        id: 'bld_main',
        presetKey: 'ruko_3fl',
        name: 'Ruko Terhalang',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 20),
        rotationY: Math.PI,
        width: 6,
        length: 10,
        floorCount: 3,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'metal',
      };

      // Obstacle building right in front at (0, 0, 10.5)
      const obstacleBld: BuildingInstance = {
        id: 'bld_obstacle',
        presetKey: 'house_36',
        name: 'Gedung Penghalang',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 10.5),
        rotationY: Math.PI,
        width: 6,
        length: 6,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile',
      };

      buildingManager.addBuilding(obstacleBld);
      buildingManager.addBuilding(mainBld);

      // Walkway should be blocked
      const walkway = buildingManager.walkwaysGroup.getObjectByName('Walkway_bld_main');
      expect(walkway).toBeUndefined();
      expect(mainBld.userData?.walkwayObstacle).toContain('Terhalang');
    });

    it('opens gate gap in lot boundary and counts walkway area in KDH paved metrics', () => {
      // Create a residential lot at (0, 0, 14), width 12, length 16
      const lot = lotManager.createLot(new THREE.Vector3(0, 0, 14), 12, 16, 'residential');

      // Place building inside the lot
      const bld: BuildingInstance = {
        id: 'bld_in_lot',
        presetKey: 'house_36',
        name: 'Rumah di Kavling',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 14),
        rotationY: Math.PI,
        width: 6,
        length: 8,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile',
      };
      buildingManager.addBuilding(bld);
      lotManager.evaluateAllLots();

      // Check walkway exists
      const walkway = buildingManager.walkwaysGroup.getObjectByName('Walkway_bld_in_lot');
      expect(walkway).toBeDefined();

      // Check gate opening is set on lot
      expect(lot.userData?.gateOpening).toBeDefined();
      expect(lot.userData?.gateOpening.width).toBe(1.4);

      // Check KDH calculation includes walkway area as paved area
      expect(lot.metrics.walkwayAreaM2).toBeGreaterThan(0);
      expect(lot.metrics.pavedAreaM2).toBeGreaterThanOrEqual(lot.metrics.walkwayAreaM2!);
    });

    it('regenerates walkway deterministically on building move and removes on delete', () => {
      const bld: BuildingInstance = {
        id: 'bld_move_test',
        presetKey: 'ruko_3fl',
        name: 'Ruko Bergerak',
        category: 'commercial',
        position: new THREE.Vector3(10, 0, 15),
        rotationY: Math.PI,
        width: 6,
        length: 10,
        floorCount: 2,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'metal',
      };
      buildingManager.addBuilding(bld);
      expect(buildingManager.walkwaysGroup.getObjectByName('Walkway_bld_move_test')).toBeDefined();

      // Move building further away (to z = 20)
      bld.position.set(10, 0, 20);
      buildingManager.updateBuilding(bld);

      const movedWalkway = buildingManager.walkwaysGroup.getObjectByName('Walkway_bld_move_test') as THREE.Mesh;
      expect(movedWalkway).toBeDefined();
      const geom = movedWalkway.geometry as THREE.BoxGeometry;
      expect(geom.parameters.depth).toBeCloseTo(9.0, 1); // 20 - 5 = 15; 15 - 6 = 9m

      // Delete building
      buildingManager.removeBuilding(bld.id);
      expect(buildingManager.walkwaysGroup.getObjectByName('Walkway_bld_move_test')).toBeUndefined();
    });
  });
});
