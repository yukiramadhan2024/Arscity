import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';
import { LandscapeManager } from '../src/world/LandscapeManager';
import { PolygonMath, Vec2D } from '../src/core/math/PolygonMath';
import { isObjectHierarchyVisible, RaycastManager } from '../src/core/engine/RaycastManager';
import { GridSystem } from '../src/world/GridSystem';
import type { PlacedFurnitureData } from '../src/core/commands/CityCommands';

describe('Adversarial Stress Test: Tahap 2 Spatial LOD (T2.1 - T2.6)', () => {
  let scene: THREE.Scene;
  let buildingManager: BuildingManager;
  let landscapeManager: LandscapeManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    buildingManager = new BuildingManager(scene);
    landscapeManager = new LandscapeManager(scene);
  });

  afterEach(() => {
    buildingManager.dispose();
    landscapeManager.dispose();
  });

  // =========================================================================
  // 1. Extreme Camera Distance Oscillations inside Hysteresis Bands
  // =========================================================================
  describe('Adversarial Challenge 1: Hysteresis Deadband Stability & Zero Fluttering', () => {
    let bld: BuildingInstance;

    beforeEach(() => {
      // 10m x 10m building centered at (0, 0, 0).
      // Footprint boundary is at X = ±5, Z = ±5.
      bld = {
        id: 'bld_jitter_test',
        presetKey: 'ruko_3fl',
        name: 'Ruko Jitter Test',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 10,
        length: 10,
        floorCount: 3,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'concrete',
        wallColor: '#cbd5e1',
        roofMaterial: 'concrete',
      };
      buildingManager.addBuilding(bld);
    });

    it('remains rock-solid in Zone 0 during 500 violent oscillations within the 24m-27m deadband', () => {
      // Step 1: Initialize in Zone 0 (edge distance = 15m)
      // Camera at X = 5 + 15 = 20m.
      buildingManager.updateSpatialLOD(new THREE.Vector3(20, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_jitter_test')).toBe(0);

      let toggleCount = 0;
      let lastZone = 0;

      // 500 oscillations strictly inside [24.01m, 26.99m]
      // Distance to edge = X - 5. So camera X = 5 + dist.
      for (let i = 0; i < 500; i++) {
        // High-frequency jitter alternating between low and high ends of the deadband
        const dist = i % 2 === 0 ? 24.05 + (i % 10) * 0.05 : 26.95 - (i % 10) * 0.05;
        const camX = 5 + dist;
        buildingManager.updateSpatialLOD(new THREE.Vector3(camX, 2, 0), false, null, true);

        const currentZone = buildingManager.buildingZones.get('bld_jitter_test')!;
        if (currentZone !== lastZone) {
          toggleCount++;
          lastZone = currentZone;
        }

        // Must strictly remain Zone 0!
        expect(currentZone).toBe(0);
      }

      expect(toggleCount, 'Zero state toggles inside Zone 0 hysteresis deadband').toBe(0);
    });

    it('remains rock-solid in Zone 1 during 500 violent oscillations within the 24m-27m deadband', () => {
      // Step 1: Initialize in Zone 1 (edge distance = 35m)
      // Camera at X = 5 + 35 = 40m.
      buildingManager.updateSpatialLOD(new THREE.Vector3(40, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_jitter_test')).toBe(1);

      let toggleCount = 0;
      let lastZone = 1;

      // 500 oscillations strictly inside [24.05m, 26.95m]
      for (let i = 0; i < 500; i++) {
        const dist = i % 2 === 0 ? 24.1 + (i % 7) * 0.1 : 26.9 - (i % 7) * 0.1;
        const camX = 5 + dist;
        buildingManager.updateSpatialLOD(new THREE.Vector3(camX, 2, 0), false, null, true);

        const currentZone = buildingManager.buildingZones.get('bld_jitter_test')!;
        if (currentZone !== lastZone) {
          toggleCount++;
          lastZone = currentZone;
        }

        // Must strictly remain Zone 1!
        expect(currentZone).toBe(1);
      }

      expect(toggleCount, 'Zero state toggles inside Zone 1 lower hysteresis deadband').toBe(0);
    });

    it('remains rock-solid in Zone 1 during 500 violent oscillations within the 62m-68m upper deadband', () => {
      // Initialize in Zone 1 (edge distance = 45m)
      buildingManager.updateSpatialLOD(new THREE.Vector3(50, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_jitter_test')).toBe(1);

      let toggleCount = 0;
      let lastZone = 1;

      // 500 oscillations strictly inside [62.05m, 67.95m]
      for (let i = 0; i < 500; i++) {
        const dist = i % 2 === 0 ? 62.15 + (i % 15) * 0.2 : 67.85 - (i % 15) * 0.2;
        const camX = 5 + dist;
        buildingManager.updateSpatialLOD(new THREE.Vector3(camX, 2, 0), false, null, true);

        const currentZone = buildingManager.buildingZones.get('bld_jitter_test')!;
        if (currentZone !== lastZone) {
          toggleCount++;
          lastZone = currentZone;
        }

        // Must strictly remain Zone 1!
        expect(currentZone).toBe(1);
      }

      expect(toggleCount, 'Zero state toggles inside Zone 1 upper hysteresis deadband').toBe(0);
    });

    it('remains rock-solid in Zone 2 during 500 violent oscillations within the 62m-68m upper deadband', () => {
      // Initialize in Zone 2 (edge distance = 80m)
      buildingManager.updateSpatialLOD(new THREE.Vector3(85, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_jitter_test')).toBe(2);

      let toggleCount = 0;
      let lastZone = 2;

      // 500 oscillations strictly inside [62.1m, 67.9m]
      for (let i = 0; i < 500; i++) {
        const dist = i % 2 === 0 ? 67.85 - (i % 12) * 0.3 : 62.15 + (i % 12) * 0.3;
        const camX = 5 + dist;
        buildingManager.updateSpatialLOD(new THREE.Vector3(camX, 2, 0), false, null, true);

        const currentZone = buildingManager.buildingZones.get('bld_jitter_test')!;
        if (currentZone !== lastZone) {
          toggleCount++;
          lastZone = currentZone;
        }

        // Must strictly remain Zone 2!
        expect(currentZone).toBe(2);
      }

      expect(toggleCount, 'Zero state toggles inside Zone 2 upper hysteresis deadband').toBe(0);
    });

    it('handles instant teleportation across both bands (0 <-> 2) cleanly', () => {
      // Teleport from Zone 0 to 90m -> immediately Zone 2
      buildingManager.updateSpatialLOD(new THREE.Vector3(15, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_jitter_test')).toBe(0);

      buildingManager.updateSpatialLOD(new THREE.Vector3(95, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_jitter_test')).toBe(2);

      // Teleport from Zone 2 to 10m -> immediately Zone 0
      buildingManager.updateSpatialLOD(new THREE.Vector3(15, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_jitter_test')).toBe(0);
    });

    it('throttles micro-displacements <= 1.5m unless forced or 120ms elapsed', () => {
      // First forced call executes
      const firstRan = buildingManager.updateSpatialLOD(new THREE.Vector3(20, 2, 0), false, null, true);
      expect(firstRan).toBe(true);

      // Rapid micro-movements (< 1.5m displacement) without forceUpdate are throttled
      let throttledCount = 0;
      for (let i = 0; i < 50; i++) {
        // Micro movement of ~0.02m
        const cam = new THREE.Vector3(20 + i * 0.02, 2, 0);
        const ran = buildingManager.updateSpatialLOD(cam, false, null, false);
        if (!ran) throttledCount++;
      }
      expect(throttledCount).toBeGreaterThan(45);

      // Large displacement (> 1.5m) executes immediately
      const bigJump = new THREE.Vector3(25, 2, 0); // 3m+ jump
      const bigJumpRan = buildingManager.updateSpatialLOD(bigJump, false, null, false);
      expect(bigJumpRan).toBe(true);
    });
  });

  // =========================================================================
  // 2. Large Irregular Footprint Polygon Distance Calculation
  // =========================================================================
  describe('Adversarial Challenge 2: Large Irregular & Concave Footprint Distance Calculation', () => {
    let irregularBld: BuildingInstance;

    beforeEach(() => {
      // Create a massive 80m x 80m U-shaped shophouse/mall complex centered at (0, 0, 0).
      // Concave central courtyard opens toward +Z.
      // Vertices of U-shape:
      // (-40, -40) -> (40, -40) -> (40, 40) -> (15, 40) -> (15, -10) -> (-15, -10) -> (-15, 40) -> (-40, 40)
      const uShapeVertices: THREE.Vector2[] = [
        new THREE.Vector2(-40, -40),
        new THREE.Vector2(40, -40),
        new THREE.Vector2(40, 40),
        new THREE.Vector2(15, 40),
        new THREE.Vector2(15, -10),
        new THREE.Vector2(-15, -10),
        new THREE.Vector2(-15, 40),
        new THREE.Vector2(-40, 40),
      ];

      irregularBld = {
        id: 'bld_irregular_u',
        presetKey: 'custom_mall_u',
        name: 'Mall U Tropis',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 80,
        length: 80,
        floorCount: 2,
        floorHeight: 4.0,
        roofType: 'flat',
        roofOverhang: 1.0,
        wallMaterial: 'concrete',
        wallColor: '#94a3b8',
        roofMaterial: 'concrete',
        isCustom: true,
        footprintPolygon: uShapeVertices,
      };

      buildingManager.addBuilding(irregularBld);
    });

    it('calculates exact segment distance in concave courtyard where centroid is far away', () => {
      // The courtyard cutout is bounded by:
      // X = -15 (left inner wall), X = +15 (right inner wall), Z = -10 (back inner wall).
      // Center of bounding box is (0, 0, 0).
      // Centroid is also near (0, -18).

      // Position camera in the concave courtyard at (0, 2, -7).
      // Distance to back inner wall (Z = -10) is |-7 - (-10)| = 3.0m!
      // Notice: Distance to center (0, 0, 0) is 7.0m.
      // Distance to centroid (0, -18) is 11.0m.
      const courtyardCam = new THREE.Vector3(0, 2, -7);
      const d = BuildingManager.getDistanceToBuildingFootprint(irregularBld, courtyardCam);
      expect(d).toBeCloseTo(3.0, 3);

      // Camera at (13, 2, 10):
      // Right inner wall is at X = 15, for Z from -10 to 40.
      // Perpendicular distance to X = 15 is |13 - 15| = 2.0m!
      // Bounding box center distance would be sqrt(13^2 + 10^2) = 16.4m!
      const sideWallCam = new THREE.Vector3(13, 2, 10);
      const dSide = BuildingManager.getDistanceToBuildingFootprint(irregularBld, sideWallCam);
      expect(dSide).toBeCloseTo(2.0, 3);

      // Verify spatial LOD zone assignment: at 2m edge distance, building MUST be Zone 0
      buildingManager.updateSpatialLOD(sideWallCam, false, null, true);
      expect(buildingManager.buildingZones.get('bld_irregular_u')).toBe(0);
    });

    it('calculates exact corner Euclidean distance when camera is near an exterior corner', () => {
      // Exterior corner at (40, 40).
      // Place camera at (43, 2, 44).
      // dx = 43 - 40 = 3m, dz = 44 - 40 = 4m.
      // Exact Euclidean distance to nearest corner = sqrt(3^2 + 4^2) = 5.0m.
      // Bounding box center distance would be sqrt(43^2 + 44^2) = 61.52m (which would falsely put it in Zone 1!).
      const cornerCam = new THREE.Vector3(43, 2, 44);
      const dCorner = BuildingManager.getDistanceToBuildingFootprint(irregularBld, cornerCam);
      expect(dCorner).toBeCloseTo(5.0, 3);

      // Spatial LOD: 5.0m is well within Zone 0 (< 24m)
      buildingManager.updateSpatialLOD(cornerCam, false, null, true);
      expect(buildingManager.buildingZones.get('bld_irregular_u')).toBe(0);
    });

    it('returns distance = 0 when camera is physically inside one of the wings', () => {
      // Right wing is X: [15, 40], Z: [-40, 40].
      // Position at (25, 2, 0) is well inside the right wing.
      const insideCam = new THREE.Vector3(25, 2, 0);
      const dInside = BuildingManager.getDistanceToBuildingFootprint(irregularBld, insideCam);
      expect(dInside).toBe(0);

      buildingManager.updateSpatialLOD(insideCam, false, null, true);
      expect(buildingManager.buildingZones.get('bld_irregular_u')).toBe(0);
    });

    it('accurately computes edge distance when irregular building is rotated 90 degrees', () => {
      // Rotate building 90 degrees (Math.PI / 2)
      buildingManager.clearAll();

      const rotatedBld: BuildingInstance = {
        ...irregularBld,
        id: 'bld_rotated_u',
        rotationY: Math.PI / 2,
        position: new THREE.Vector3(100, 0, 100),
      };
      buildingManager.addBuilding(rotatedBld);

      // In local coordinates:
      // Cutout back wall is at local Z = -10, with X in [-15, 15].
      // Rotated 90 degrees around Y (cos=0, sin=1):
      // x' = -v.y, y' = v.x
      // For local cutout point (v.x = 0, v.y = -7):
      // x' = -(-7) = 7, y' = 0.
      // In world coords: X = 100 + 7 = 107, Z = 100 + 0 = 100.
      // Distance from (0, -7) to the back wall segment at v.y = -10 is exactly |-7 - (-10)| = 3.0m!
      const testCam = new THREE.Vector3(107, 2, 100);
      const d = BuildingManager.getDistanceToBuildingFootprint(rotatedBld, testCam);
      expect(d).toBeCloseTo(3.0, 2);
    });
  });

  // =========================================================================
  // 3. Rapid Enter / Exit Indoor Building Switching
  // =========================================================================
  describe('Adversarial Challenge 3: Rapid Indoor Switching, Zero Memory Leaks & Visibility Integrity', () => {
    let hostBld: BuildingInstance;
    let neighborBld: BuildingInstance;
    let distantBld: BuildingInstance;

    beforeEach(() => {
      hostBld = {
        id: 'bld_host',
        presetKey: 'house_36',
        name: 'Gedung Utama',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
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

      neighborBld = {
        id: 'bld_neighbor',
        presetKey: 'ruko_3fl',
        name: 'Gedung Tetangga Dekat',
        category: 'commercial',
        position: new THREE.Vector3(12, 0, 0), // 12m away (within Zone 0)
        rotationY: 0,
        width: 8,
        length: 12,
        floorCount: 3,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'concrete',
        wallColor: '#cbd5e1',
        roofMaterial: 'concrete',
      };

      distantBld = {
        id: 'bld_distant',
        presetKey: 'ruko_3fl',
        name: 'Gedung Jauh',
        category: 'commercial',
        position: new THREE.Vector3(50, 0, 0), // 50m away (Zone 1)
        rotationY: 0,
        width: 10,
        length: 10,
        floorCount: 2,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'concrete',
        wallColor: '#cbd5e1',
        roofMaterial: 'concrete',
      };

      buildingManager.addBuilding(hostBld);
      buildingManager.addBuilding(neighborBld);
      buildingManager.addBuilding(distantBld);

      // Attach placed furniture to host and neighbor
      buildingManager.attachFurniture('bld_host', {
        id: 'fur_host_sofa',
        type: 'sofa_3seater',
        name: 'Sofa Host',
        position: [1, 0, 1],
        rotationY: 0,
        floorIndex: 1,
      });

      buildingManager.attachFurniture('bld_neighbor', {
        id: 'fur_neighbor_chair',
        type: 'dining_chair',
        name: 'Kursi Tetangga',
        position: [2, 0, 2],
        rotationY: 0,
        floorIndex: 1,
      });

      // Add small and large landscape items
      landscapeManager.addItem({
        id: 'prop_near_host',
        type: 'shrub',
        position: new THREE.Vector3(5, 0, 0), // 5m from host
      });

      landscapeManager.addItem({
        id: 'prop_far_host',
        type: 'well',
        position: new THREE.Vector3(45, 0, 0), // 45m from host (> 35m)
      });
    });

    it('survives 150 rapid enter/exit transitions with perfect state restoration and zero geometry/material leakage', () => {
      const hostGrp = buildingManager.getBuildingGroup('bld_host')!;
      const neighborGrp = buildingManager.getBuildingGroup('bld_neighbor')!;
      const distantGrp = buildingManager.getBuildingGroup('bld_distant')!;

      const hostInterior = hostGrp.getObjectByName('InteriorDetails')!;
      const hostFur = hostGrp.getObjectByName('DynamicFurnitureGroup')!;
      const neighborInterior = neighborGrp.getObjectByName('InteriorDetails')!;
      const neighborFur = neighborGrp.getObjectByName('DynamicFurnitureGroup')!;

      const nearProp = landscapeManager.getItemGroup('prop_near_host')!;
      const farProp = landscapeManager.getItemGroup('prop_far_host')!;

      const initialGlassDekat = MaterialLibrary.getInstance().kacaDekat;
      const initialGlassJauh = MaterialLibrary.getInstance().kacaJauh;

      // 150 rapid switching cycles
      for (let cycle = 0; cycle < 150; cycle++) {
        // State A: Inside host building
        buildingManager.updateSpatialLOD(new THREE.Vector3(0, 1.6, 0), true, 'bld_host', true);
        landscapeManager.updateSpatialLOD(new THREE.Vector3(0, 1.6, 0), 'bld_host', new THREE.Vector3(0, 0, 0));

        expect(buildingManager.buildingZones.get('bld_host')).toBe(0);
        expect(hostInterior.visible, `Cycle ${cycle}: host interior must be visible`).toBe(true);
        expect(hostFur.visible, `Cycle ${cycle}: host furniture must be visible`).toBe(true);
        expect(neighborInterior.visible, `Cycle ${cycle}: neighbor interior must be culled`).toBe(false);
        expect(neighborFur.visible, `Cycle ${cycle}: neighbor furniture must be culled`).toBe(false);
        expect(nearProp.visible, `Cycle ${cycle}: near prop <= 35m must be visible`).toBe(true);
        expect(farProp.visible, `Cycle ${cycle}: far prop > 35m must be culled`).toBe(false);

        // State B: Switch directly to inside neighbor building
        buildingManager.updateSpatialLOD(new THREE.Vector3(12, 1.6, 0), true, 'bld_neighbor', true);
        landscapeManager.updateSpatialLOD(new THREE.Vector3(12, 1.6, 0), 'bld_neighbor', new THREE.Vector3(12, 0, 0));

        expect(buildingManager.buildingZones.get('bld_neighbor')).toBe(0);
        expect(neighborInterior.visible, `Cycle ${cycle}: neighbor interior must be visible`).toBe(true);
        expect(neighborFur.visible, `Cycle ${cycle}: neighbor furniture must be visible`).toBe(true);
        expect(hostInterior.visible, `Cycle ${cycle}: host interior must be culled`).toBe(false);
        expect(hostFur.visible, `Cycle ${cycle}: host furniture must be culled`).toBe(false);

        // State C: Exit to outdoor (camera between host and neighbor at X=6)
        buildingManager.updateSpatialLOD(new THREE.Vector3(6, 2, 0), false, null, true);
        landscapeManager.updateSpatialLOD(new THREE.Vector3(6, 2, 0), null, null);

        // Both host and neighbor are close (< 24m) -> both restored to Zone 0
        expect(hostInterior.visible, `Cycle ${cycle}: host interior restored on exit`).toBe(true);
        expect(hostFur.visible, `Cycle ${cycle}: host furniture restored on exit`).toBe(true);
        expect(neighborInterior.visible, `Cycle ${cycle}: neighbor interior restored on exit`).toBe(true);
        expect(neighborFur.visible, `Cycle ${cycle}: neighbor furniture restored on exit`).toBe(true);
        expect(nearProp.visible, `Cycle ${cycle}: near prop visible outside`).toBe(true);
        expect(farProp.visible, `Cycle ${cycle}: far prop restored outside`).toBe(true);
      }

      // Verify zero material leaks: glass materials still point to singletons
      const glassMeshes = hostGrp.userData.windowGlassMeshes as THREE.Mesh[];
      expect(glassMeshes[0].material).toBe(initialGlassDekat);
      expect(MaterialLibrary.getInstance().kacaDekat).toBe(initialGlassDekat);
      expect(MaterialLibrary.getInstance().kacaJauh).toBe(initialGlassJauh);
    });
  });

  // =========================================================================
  // 4. Rule G6 Data Integrity Under Extreme Stress
  // =========================================================================
  describe('Adversarial Challenge 4: Rule G6 Data Integrity Under Relentless Culling Cycles', () => {
    let testBld: BuildingInstance;

    beforeEach(() => {
      testBld = {
        id: 'bld_g6_stress',
        presetKey: 'house_36',
        name: 'Rumah G6 Integrity',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0.25,
        width: 10,
        length: 14,
        floorCount: 2,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 0.6,
        wallMaterial: 'brick',
        wallColor: '#ea580c',
        roofMaterial: 'clay_tile',
      };

      buildingManager.addBuilding(testBld);

      // Attach 4 varied furniture items
      buildingManager.attachFurniture('bld_g6_stress', {
        id: 'fur_sofa_1',
        type: 'sofa_3seater',
        name: 'Sofa Tamu',
        position: [2, 0, 2],
        rotationY: 0,
        floorIndex: 1,
      });

      buildingManager.attachFurniture('bld_g6_stress', {
        id: 'fur_table_1',
        type: 'dining_table',
        name: 'Meja Makan',
        position: [-2, 0, 1],
        rotationY: 1.57,
        floorIndex: 1,
      });

      buildingManager.attachFurniture('bld_g6_stress', {
        id: 'fur_chair_1',
        type: 'dining_chair',
        name: 'Kursi 1',
        position: [-2, 0, 2],
        rotationY: 0,
        floorIndex: 1,
      });

      buildingManager.attachFurniture('bld_g6_stress', {
        id: 'fur_bed_1',
        type: 'bed_double',
        name: 'Tempat Tidur',
        position: [0, 0, -3],
        rotationY: 3.14,
        floorIndex: 2,
      });
    });

    it('guarantees 100% data immutability across 300 random camera transitions', () => {
      const bld = buildingManager.getBuilding('bld_g6_stress')!;
      expect(bld.userData?.placedFurniture.length).toBe(4);

      // Snapshot the pristine furniture data
      const pristineFurnitureSnapshot: PlacedFurnitureData[] = JSON.parse(
        JSON.stringify(bld.userData?.placedFurniture)
      );

      // Snapshot building parameters
      const pristineWidth = bld.width;
      const pristineLength = bld.length;
      const pristineFloors = bld.floorCount;
      const pristinePosition = bld.position.clone();
      const pristineRotation = bld.rotationY;

      // 300 random transitions traversing Zone 0, Zone 1, Zone 2, indoor host, indoor other
      for (let i = 0; i < 300; i++) {
        const randDist = Math.random() * 200; // 0m to 200m
        const isIndoors = Math.random() > 0.5;
        const indoorHost = isIndoors ? (Math.random() > 0.5 ? 'bld_g6_stress' : 'other_bld') : null;

        buildingManager.updateSpatialLOD(
          new THREE.Vector3(randDist, 2, 0),
          isIndoors,
          indoorHost,
          true
        );

        // Verification after EVERY single transition:
        const currentFurniture = bld.userData?.placedFurniture;
        expect(currentFurniture.length).toBe(4);

        for (let j = 0; j < 4; j++) {
          expect(currentFurniture[j].id).toBe(pristineFurnitureSnapshot[j].id);
          expect(currentFurniture[j].type).toBe(pristineFurnitureSnapshot[j].type);
          expect(currentFurniture[j].name).toBe(pristineFurnitureSnapshot[j].name);
          expect(currentFurniture[j].position).toEqual(pristineFurnitureSnapshot[j].position);
          expect(currentFurniture[j].rotationY).toBe(pristineFurnitureSnapshot[j].rotationY);
          expect(currentFurniture[j].floorIndex).toBe(pristineFurnitureSnapshot[j].floorIndex);
        }

        expect(bld.width).toBe(pristineWidth);
        expect(bld.length).toBe(pristineLength);
        expect(bld.floorCount).toBe(pristineFloors);
        expect(bld.position.x).toBe(pristinePosition.x);
        expect(bld.position.z).toBe(pristinePosition.z);
        expect(bld.rotationY).toBe(pristineRotation);
      }
    });

    it('allows attaching and detaching furniture while in Zone 2 with immediate data and mesh consistency', () => {
      // Step 1: Push building into Zone 2 (distance = 120m)
      buildingManager.updateSpatialLOD(new THREE.Vector3(120, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_g6_stress')).toBe(2);

      const bldGroup = buildingManager.getBuildingGroup('bld_g6_stress')!;
      const dynamicFur = bldGroup.getObjectByName('DynamicFurnitureGroup')!;
      expect(dynamicFur.visible, 'Furniture group culled in Zone 2').toBe(false);

      // Step 2: Attach a new wardrobe while in Zone 2
      buildingManager.attachFurniture('bld_g6_stress', {
        id: 'fur_wardrobe_zone2',
        type: 'wardrobe_2door',
        name: 'Lemari Baju',
        position: [3, 0, -2],
        rotationY: 0,
        floorIndex: 1,
      });

      const bld = buildingManager.getBuilding('bld_g6_stress')!;
      expect(bld.userData?.placedFurniture.length, 'Data updated in Zone 2').toBe(5);

      // Step 3: Move camera to Zone 0
      buildingManager.updateSpatialLOD(new THREE.Vector3(10, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_g6_stress')).toBe(0);
      expect(dynamicFur.visible, 'Furniture group visible in Zone 0').toBe(true);

      const wardrobeMesh = dynamicFur.children.find((c) => c.userData?.furnitureId === 'fur_wardrobe_zone2');
      expect(wardrobeMesh).toBeDefined();

      // Step 4: Detach furniture while in Zone 0
      expect(buildingManager.detachFurniture('bld_g6_stress', 'fur_wardrobe_zone2')).toBe(true);
      expect(bld.userData?.placedFurniture.length).toBe(4);
    });
  });

  // =========================================================================
  // 5. Raycaster Visibility Filtering for Deep Hierarchy Culled Objects
  // =========================================================================
  describe('Adversarial Challenge 5: Raycaster Deep Hierarchy Visibility Filtering', () => {
    it('blocks raycasting on deeply nested objects when any parent in the chain has visible = false', () => {
      const root = new THREE.Group();
      const level1 = new THREE.Group();
      const level2 = new THREE.Group();
      const level3 = new THREE.Group();
      const targetMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());

      root.add(level1);
      level1.add(level2);
      level2.add(level3);
      level3.add(targetMesh);

      // All visible
      expect(isObjectHierarchyVisible(targetMesh)).toBe(true);

      // Hide root
      root.visible = false;
      expect(isObjectHierarchyVisible(targetMesh)).toBe(false);
      root.visible = true;

      // Hide level1
      level1.visible = false;
      expect(isObjectHierarchyVisible(targetMesh)).toBe(false);
      level1.visible = true;

      // Hide level2
      level2.visible = false;
      expect(isObjectHierarchyVisible(targetMesh)).toBe(false);
      level2.visible = true;

      // Hide level3
      level3.visible = false;
      expect(isObjectHierarchyVisible(targetMesh)).toBe(false);
      level3.visible = true;

      // Hide targetMesh directly
      targetMesh.visible = false;
      expect(isObjectHierarchyVisible(targetMesh)).toBe(false);
    });

    it('safely handles null objects without throwing', () => {
      expect(isObjectHierarchyVisible(null)).toBe(true);
    });
  });
});
