import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';

describe('Tahap 2: Render Jarak Bertingkat (3-Zone Spatial LOD) - T2.1 Verification', () => {
  let scene: THREE.Scene;
  let buildingManager: BuildingManager;
  let testBld: BuildingInstance;

  beforeEach(() => {
    scene = new THREE.Scene();
    buildingManager = new BuildingManager(scene);

    // 10m x 20m building centered at (0, 0, 0).
    // Bounds in 2D footprint: X: [-5, 5], Z: [-10, 10].
    testBld = {
      id: 'bld_lod_test',
      presetKey: 'ruko_3fl',
      name: 'Ruko Modern 3L',
      category: 'commercial',
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      width: 10,
      length: 20,
      floorCount: 3,
      floorHeight: 3.5,
      roofType: 'flat',
      roofOverhang: 0.5,
      wallMaterial: 'concrete',
      wallColor: '#cbd5e1',
      roofMaterial: 'concrete',
    };
    buildingManager.addBuilding(testBld);
  });

  describe('T2.1: updateSpatialLOD Throttling & Footprint Edge Distance', () => {
    it('calculates distance to nearest footprint edge, returning 0 when camera is inside footprint', () => {
      // 1. Camera inside footprint: (0, 2, 0)
      const insideCam = new THREE.Vector3(0, 2, 0);
      const dInside = BuildingManager.getDistanceToBuildingFootprint(testBld, insideCam);
      expect(dInside).toBe(0);

      // 2. Camera near edge: (15, 2, 0) -> edge is at X=5, so perpendicular distance to edge is 10m.
      // Notice center distance would be 15m! Edge distance must be exactly 10m.
      const nearCam = new THREE.Vector3(15, 2, 0);
      const dEdgeX = BuildingManager.getDistanceToBuildingFootprint(testBld, nearCam);
      expect(Math.abs(dEdgeX - 10)).toBeLessThan(0.001);

      // 3. Camera along Z: (0, 2, 35) -> edge is at Z=10, so perpendicular distance is 25m.
      // Center distance is 35m.
      const zCam = new THREE.Vector3(0, 2, 35);
      const dEdgeZ = BuildingManager.getDistanceToBuildingFootprint(testBld, zCam);
      expect(Math.abs(dEdgeZ - 25)).toBeLessThan(0.001);

      // 4. Camera diagonal: (11, 2, 18) -> closest corner is (5, 10).
      // Vector from corner (5, 10) to (11, 18) is dx=6, dz=8. Distance is sqrt(36 + 64) = 10m.
      const diagCam = new THREE.Vector3(11, 2, 18);
      const dDiag = BuildingManager.getDistanceToBuildingFootprint(testBld, diagCam);
      expect(Math.abs(dDiag - 10)).toBeLessThan(0.001);
    });

    it('throttles LOD updates: skips when elapsed time < 120ms AND displacement <= 1.5m', () => {
      const cam = new THREE.Vector3(10, 2, 10);
      // First call executes
      const firstRan = buildingManager.updateSpatialLOD(cam, false, null, true);
      expect(firstRan).toBe(true);

      // Second call immediately with negligible movement (< 1.5m and < 120ms) is throttled
      const tinyMoveCam = new THREE.Vector3(10.2, 2, 10.3);
      const secondRan = buildingManager.updateSpatialLOD(tinyMoveCam, false, null, false);
      expect(secondRan).toBe(false);

      // Large displacement (> 1.5m) triggers immediate update even before 120ms
      const bigMoveCam = new THREE.Vector3(12.5, 2, 10); // moved 2.3m
      const bigMoveRan = buildingManager.updateSpatialLOD(bigMoveCam, false, null, false);
      expect(bigMoveRan).toBe(true);
    });

    it('preserves updateLOD as a backward-compatible forwarding adapter', () => {
      const cam = new THREE.Vector3(30, 20, 30);
      expect(() => {
        buildingManager.updateLOD(cam, 'orbit', false, false, 60, 'high');
      }).not.toThrow();

      const grp = buildingManager.getBuildingGroup('bld_lod_test')!;
      expect(grp).toBeDefined();
      expect(grp.visible).toBe(true);
    });
  });
});
