import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';
import { LandscapeManager } from '../src/world/LandscapeManager';

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

  describe('T2.2: Three Zones with Dual Hysteresis & Shared Glass Materials', () => {
    it('switches between Zone 0, Zone 1, and Zone 2 with dual hysteresis stability', () => {
      const bldGroup = buildingManager.getBuildingGroup('bld_lod_test')!;
      const interior = bldGroup.getObjectByName('InteriorDetails')!;
      const dynamicFur = bldGroup.getObjectByName('DynamicFurnitureGroup')!;
      const details = bldGroup.getObjectByName('DetailPropsGroup')!;

      // 1. Start at distance = 15m (< 24m) -> Zone 0
      // Edge is at X=5, so position at X=20 gives edge distance = 15m.
      buildingManager.updateSpatialLOD(new THREE.Vector3(20, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_lod_test')).toBe(0);
      expect(interior.visible, 'Interior visible in Zone 0').toBe(true);
      expect(dynamicFur.visible, 'Furniture visible in Zone 0').toBe(true);
      expect(details.visible, 'Detail props visible in Zone 0').toBe(true);

      // Check glass material reference
      const glassMeshes = bldGroup.userData.windowGlassMeshes as THREE.Mesh[];
      expect(glassMeshes.length).toBeGreaterThan(0);
      expect(glassMeshes[0].material).toBe(MaterialLibrary.getInstance().kacaDekat);
      expect((glassMeshes[0].material as THREE.MeshPhysicalMaterial).opacity).toBeCloseTo(0.32, 2);

      // 2. Move to distance = 25m (between 24m and 27m). Hysteresis ensures it STAYS in Zone 0!
      // X = 5 + 25 = 30m.
      buildingManager.updateSpatialLOD(new THREE.Vector3(30, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_lod_test'), 'Hysteresis keeps Z0 at 25m').toBe(0);
      expect(interior.visible).toBe(true);

      // Move to distance = 26m. Still in Zone 0 (< 27m exit threshold).
      buildingManager.updateSpatialLOD(new THREE.Vector3(31, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_lod_test'), 'Hysteresis keeps Z0 at 26m').toBe(0);

      // 3. Move to distance = 28m (> 27m exit threshold). Now exits to Zone 1!
      // X = 5 + 28 = 33m.
      buildingManager.updateSpatialLOD(new THREE.Vector3(33, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_lod_test')).toBe(1);
      expect(interior.visible, 'Interior culled in Zone 1').toBe(false);
      expect(dynamicFur.visible, 'Furniture culled in Zone 1').toBe(false);
      expect(details.visible, 'Exterior details remain visible in Zone 1').toBe(true);

      // Glass material swaps to kacaJauh (opacity 0.88, roughness 0.1)
      expect(glassMeshes[0].material).toBe(MaterialLibrary.getInstance().kacaJauh);
      expect((glassMeshes[0].material as THREE.MeshPhysicalMaterial).opacity).toBeCloseTo(0.88, 2);

      // 4. Move back into the 24m-27m boundary zone at distance = 25m.
      // Because it entered from Zone 1, hysteresis ensures it STAYS in Zone 1 (doesn't enter Z0 until < 24m)!
      buildingManager.updateSpatialLOD(new THREE.Vector3(30, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_lod_test'), 'Hysteresis keeps Z1 at 25m').toBe(1);
      expect(interior.visible, 'Interior stays culled at 25m coming from Z1').toBe(false);

      // 5. Move to distance = 22m (< 24m enter threshold). Now enters Zone 0!
      buildingManager.updateSpatialLOD(new THREE.Vector3(27, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_lod_test')).toBe(0);
      expect(interior.visible).toBe(true);
      expect(glassMeshes[0].material).toBe(MaterialLibrary.getInstance().kacaDekat);

      // 6. Test upper hysteresis boundary (Zone 1 <-> Zone 2):
      // Move to distance = 50m -> Zone 1
      buildingManager.updateSpatialLOD(new THREE.Vector3(55, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_lod_test')).toBe(1);

      // Move to distance = 66m (between 62m and 68m). Hysteresis ensures it STAYS in Zone 1 (< 68m)!
      buildingManager.updateSpatialLOD(new THREE.Vector3(71, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_lod_test'), 'Hysteresis keeps Z1 at 66m').toBe(1);

      // Move to distance = 70m (> 68m enter threshold for Zone 2). Enters Zone 2!
      buildingManager.updateSpatialLOD(new THREE.Vector3(75, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_lod_test')).toBe(2);
      expect(details.visible, 'Detail props culled in Zone 2').toBe(false);
      expect(interior.visible).toBe(false);

      // Move back to distance = 65m (between 62m and 68m). Hysteresis ensures it STAYS in Zone 2 (> 62m)!
      buildingManager.updateSpatialLOD(new THREE.Vector3(70, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_lod_test'), 'Hysteresis keeps Z2 at 65m').toBe(2);

      // Move back to distance = 55m (< 62m return threshold). Returns to Zone 1!
      buildingManager.updateSpatialLOD(new THREE.Vector3(60, 2, 0), false, null, true);
      expect(buildingManager.buildingZones.get('bld_lod_test')).toBe(1);
      expect(details.visible, 'Detail props restored in Zone 1').toBe(true);
    });

    it('culls tree petals in Zone 1/2 while preserving trunk and canopy clusters', () => {
      const landscapeManager = new LandscapeManager(scene);

      const treeItem = {
        id: 'tree_lod_test',
        type: 'tree_tabebuya_pink' as const,
        position: new THREE.Vector3(0, 0, 0),
        radius: 3.0,
      };
      landscapeManager.addItem(treeItem);
      const treeGroup = landscapeManager.getItemGroup('tree_lod_test')!;
      expect(treeGroup).toBeDefined();

      const petalMesh = treeGroup.getObjectByName('PetalMesh')!;
      expect(petalMesh).toBeDefined();

      // 1. Camera close (15m < 24m) -> Zone 0: petals visible
      landscapeManager.updateSpatialLOD(new THREE.Vector3(15, 2, 0));
      expect(treeGroup.userData.currentZone).toBe(0);
      expect(petalMesh.visible, 'Petal carpet visible in Zone 0').toBe(true);

      // 2. Camera mid distance (35m) -> Zone 1: petals culled
      landscapeManager.updateSpatialLOD(new THREE.Vector3(35, 2, 0));
      expect(treeGroup.userData.currentZone).toBe(1);
      expect(petalMesh.visible, 'Petal carpet culled in Zone 1').toBe(false);

      // 3. Camera far distance (80m) -> Zone 2: petals culled
      landscapeManager.updateSpatialLOD(new THREE.Vector3(80, 2, 0));
      expect(treeGroup.userData.currentZone).toBe(2);
      expect(petalMesh.visible, 'Petal carpet culled in Zone 2').toBe(false);

      // 4. Return to close distance (15m) -> Zone 0: petals restored
      landscapeManager.updateSpatialLOD(new THREE.Vector3(15, 2, 0));
      expect(treeGroup.userData.currentZone).toBe(0);
      expect(petalMesh.visible, 'Petal carpet restored in Zone 0').toBe(true);

      landscapeManager.dispose();
    });
  });
});
