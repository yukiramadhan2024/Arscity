import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { CustomBuildingMeshBuilder } from '../src/buildings/CustomBuildingMeshBuilder';
import { createTextSprite, createSunCelestialArc } from '../src/ui/components/CustomBuildingCreatorModal';
import { RoadManager } from '../src/roads/RoadManager';
import { LotManager } from '../src/zones/LotManager';
import { LandscapeManager } from '../src/world/LandscapeManager';
import { RiverManager } from '../src/world/RiverManager';
import { ThermalComfortEngine, DEFAULT_THERMAL_CONSTANTS } from '../src/world/ThermalComfortEngine';
import { SectionCutManager } from '../src/analysis/SectionCutManager';
import { FloorPlanAnnotationOverlay } from '../src/analysis/FloorPlanAnnotationOverlay';
import { CameraController } from '../src/core/engine/CameraController';
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

  describe('T5.2: Arkade Ruko (Shophouse Arcade Canopy Merge)', () => {
    it('merges ground terrace canopy into unified arcade corridor with joint column when two rukos are < 1.5m apart', () => {
      // Ruko A: 6m wide at (0, 0, 15), facing Math.PI
      const rukoA: BuildingInstance = {
        id: 'ruko_a',
        presetKey: 'ruko_3fl',
        name: 'Ruko A',
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

      // Ruko B: 6m wide at (6.8, 0, 15). Gap between sides is 6.8 - 6.0 = 0.8m (< 1.5m)
      const rukoB: BuildingInstance = {
        id: 'ruko_b',
        presetKey: 'ruko_3fl',
        name: 'Ruko B',
        category: 'commercial',
        position: new THREE.Vector3(6.8, 0, 15),
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

      buildingManager.addBuilding(rukoA);
      buildingManager.addBuilding(rukoB);

      const bridge = buildingManager.arcadeMasterGroup.getObjectByName('ArcadeBridge_ruko_a_ruko_b') as THREE.Group;
      expect(bridge).toBeDefined();

      // Check canopy slab and joint column exist in bridge
      const slab = bridge.getObjectByName('ArcadeCanopySlab') as THREE.Mesh;
      const column = bridge.getObjectByName('ArcadeJointColumn') as THREE.Mesh;
      expect(slab).toBeDefined();
      expect(column).toBeDefined();

      // Check gap width
      expect(bridge.userData.sideGap).toBeCloseTo(0.8, 1);
    });

    it('does NOT create arcade bridge if gap between rukos exceeds 1.5m', () => {
      const rukoA: BuildingInstance = {
        id: 'ruko_far_a',
        presetKey: 'ruko_3fl',
        name: 'Ruko Jauh A',
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

      // Ruko B: 6m wide at (8.5, 0, 15). Gap between sides is 8.5 - 6.0 = 2.5m (> 1.5m)
      const rukoB: BuildingInstance = {
        id: 'ruko_far_b',
        presetKey: 'ruko_3fl',
        name: 'Ruko Jauh B',
        category: 'commercial',
        position: new THREE.Vector3(8.5, 0, 15),
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

      buildingManager.addBuilding(rukoA);
      buildingManager.addBuilding(rukoB);

      const bridge = buildingManager.arcadeMasterGroup.getObjectByName('ArcadeBridge_ruko_far_a_ruko_far_b');
      expect(bridge).toBeUndefined();
    });

    it('regenerates dynamically when one ruko moves', () => {
      const rukoA: BuildingInstance = {
        id: 'ruko_dyn_a',
        presetKey: 'ruko_3fl',
        name: 'Ruko Dyn A',
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

      const rukoB: BuildingInstance = {
        id: 'ruko_dyn_b',
        presetKey: 'ruko_3fl',
        name: 'Ruko Dyn B',
        category: 'commercial',
        position: new THREE.Vector3(6.6, 0, 15), // gap 0.6m
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

      buildingManager.addBuilding(rukoA);
      buildingManager.addBuilding(rukoB);
      expect(buildingManager.arcadeMasterGroup.getObjectByName('ArcadeBridge_ruko_dyn_a_ruko_dyn_b')).toBeDefined();

      // Move Ruko B to 10m away (gap = 4.0m > 1.5m)
      rukoB.position.set(10, 0, 15);
      buildingManager.updateBuilding(rukoB);
      expect(buildingManager.arcadeMasterGroup.getObjectByName('ArcadeBridge_ruko_dyn_a_ruko_dyn_b')).toBeUndefined();

      // Move Ruko B back to 6.8m (gap = 0.8m <= 1.5m)
      rukoB.position.set(6.8, 0, 15);
      buildingManager.updateBuilding(rukoB);
      expect(buildingManager.arcadeMasterGroup.getObjectByName('ArcadeBridge_ruko_dyn_a_ruko_dyn_b')).toBeDefined();
    });

    it('sets warning if arcade crosses boundary between two different lots', () => {
      // Lot 1 at (-3.5, 0, 15), Lot 2 at (3.5, 0, 15)
      const lot1 = lotManager.createLot(new THREE.Vector3(-3.5, 0, 15), 7, 16, 'commercial');
      const lot2 = lotManager.createLot(new THREE.Vector3(3.5, 0, 15), 7, 16, 'commercial');

      const rukoA: BuildingInstance = {
        id: 'ruko_warn_a',
        presetKey: 'ruko_3fl',
        name: 'Ruko Kavling 1',
        category: 'commercial',
        position: new THREE.Vector3(-3.5, 0, 15),
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

      // Ruko B at (3.1, 0, 15) in Lot 2.
      // Gap between sides: 3.1 - (-3.5) = 6.6m -> sideGap = 6.6 - 6.0 = 0.6m (< 1.5m)
      const rukoB: BuildingInstance = {
        id: 'ruko_warn_b',
        presetKey: 'ruko_3fl',
        name: 'Ruko Kavling 2',
        category: 'commercial',
        position: new THREE.Vector3(3.1, 0, 15),
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

      buildingManager.addBuilding(rukoA);
      buildingManager.addBuilding(rukoB);
      lotManager.evaluateAllLots();

      expect(rukoA.userData?.arcadeWarning).toContain('melintasi batas kavling');
      expect(rukoB.userData?.arcadeWarning).toContain('melintasi batas kavling');

      // KDB and KLB must not change from the canopy
      expect(lot1.metrics.groundFootprintM2).toBe(rukoA.width * rukoA.length);
      expect(lot2.metrics.groundFootprintM2).toBe(rukoB.width * rukoB.length);
    });
  });

  describe('T5.3: Fasad Proporsional (CustomBuildingMeshBuilder.ts)', () => {
    it('calculates proportional facade module count: 6m (2 mod), 9m (3 mod), 12m (4 mod), and 2m (1 mod)', () => {
      // 1. Length 6m -> n = max(1, floor(6 / 3)) = 2 modules, width = 3.0m
      const mod6 = CustomBuildingMeshBuilder.calculateFacadeModules(6.0);
      expect(mod6.n).toBe(2);
      expect(mod6.moduleWidth).toBeCloseTo(3.0, 2);
      expect(mod6.moduleCenters.length).toBe(2);
      expect(mod6.moduleCenters[0]).toBeCloseTo(1.5, 2);
      expect(mod6.moduleCenters[1]).toBeCloseTo(4.5, 2);

      // 2. Length 9m -> n = max(1, floor(9 / 3)) = 3 modules, width = 3.0m
      const mod9 = CustomBuildingMeshBuilder.calculateFacadeModules(9.0);
      expect(mod9.n).toBe(3);
      expect(mod9.moduleWidth).toBeCloseTo(3.0, 2);
      expect(mod9.moduleCenters.length).toBe(3);
      expect(mod9.moduleCenters[0]).toBeCloseTo(1.5, 2);
      expect(mod9.moduleCenters[1]).toBeCloseTo(4.5, 2);
      expect(mod9.moduleCenters[2]).toBeCloseTo(7.5, 2);

      // 3. Length 12m -> n = max(1, floor(12 / 3)) = 4 modules, width = 3.0m
      const mod12 = CustomBuildingMeshBuilder.calculateFacadeModules(12.0);
      expect(mod12.n).toBe(4);
      expect(mod12.moduleWidth).toBeCloseTo(3.0, 2);
      expect(mod12.moduleCenters.length).toBe(4);
      expect(mod12.moduleCenters[0]).toBeCloseTo(1.5, 2);
      expect(mod12.moduleCenters[1]).toBeCloseTo(4.5, 2);
      expect(mod12.moduleCenters[2]).toBeCloseTo(7.5, 2);
      expect(mod12.moduleCenters[3]).toBeCloseTo(10.5, 2);

      // 4. Length 2m -> n = max(1, floor(2 / 3)) = 1 module, width = 2.0m
      const mod2 = CustomBuildingMeshBuilder.calculateFacadeModules(2.0);
      expect(mod2.n).toBe(1);
      expect(mod2.moduleWidth).toBeCloseTo(2.0, 2);
      expect(mod2.moduleCenters.length).toBe(1);
      expect(mod2.moduleCenters[0]).toBeCloseTo(1.0, 2);
    });

    it('generates non-stretched windows in each module and passes layout validation', () => {
      const p1 = new THREE.Vector2(0, 0);
      const p2 = new THREE.Vector2(12, 0); // 12m wall -> 4 modules

      const openings = CustomBuildingMeshBuilder.generateOpeningsForWindowStyle(
        'modern_ribbon',
        p1,
        p2,
        3.5,
        false
      );

      // 4 modules -> 4 windows
      expect(openings.length).toBe(4);

      // Windows are not stretched (each window is <= 2.0m, not stretching to 12m)
      for (const op of openings) {
        expect(op.width).toBeLessThanOrEqual(2.0);
        expect(op.width).toBeGreaterThanOrEqual(1.0);
      }

      // Validates zero overlaps and sufficient corner clearance
      const validation = CustomBuildingMeshBuilder.validateOpeningLayout(openings, 12.0);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('validates shape logic for compact 2m wall with safe single opening', () => {
      const p1 = new THREE.Vector2(0, 0);
      const p2 = new THREE.Vector2(2, 0); // 2m wall -> 1 module

      const openings = CustomBuildingMeshBuilder.generateOpeningsForWindowStyle(
        'colonial_arch',
        p1,
        p2,
        3.2,
        false
      );

      expect(openings.length).toBe(1);
      expect(openings[0].width).toBeLessThanOrEqual(1.7);

      const validation = CustomBuildingMeshBuilder.validateOpeningLayout(openings, 2.0);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('T5.4: Studio CAD (CustomBuildingCreatorModal.tsx)', () => {
    it('creates dimension text sprites using 512 x 112 pixel canvas with anti-collision settings', () => {
      const sprite = createTextSprite('+11,96 m (Puncak Atap)');
      expect(sprite).toBeDefined();
      expect(sprite).toBeInstanceOf(THREE.Sprite);

      // Check anti-collision material properties
      const mat = sprite.material as THREE.SpriteMaterial;
      expect(mat.transparent).toBe(true);
      expect(mat.depthTest).toBe(true);
      expect(mat.depthWrite).toBe(false);

      // Check texture canvas dimensions (512 x 112 scaled by DPR)
      const canvas = (mat.map as THREE.CanvasTexture).image as HTMLCanvasElement;
      expect(canvas.width % 512).toBe(0);
      expect(canvas.height % 112).toBe(0);
      expect(canvas.width / canvas.height).toBeCloseTo(512 / 112, 1);

      // Scale ratio
      expect(sprite.scale.x / sprite.scale.y).toBeCloseTo(512 / 112, 1);
    });

    it('elevates the yellow sun ball to highest roof point + 1.5m at all sun hours', () => {
      const highestRoofPoint = 13.5; // e.g. 3-floor building with steep roof
      const hours: ('08:00' | '12:00' | '16:00')[] = ['08:00', '12:00', '16:00'];

      for (const hr of hours) {
        const arcGroup = createSunCelestialArc(15.0, 16.0, hr, highestRoofPoint);
        const sunBall = arcGroup.getObjectByName('SunBallMesh') as THREE.Mesh;
        expect(sunBall).toBeDefined();

        // The sun ball must be strictly at or above highestRoofPoint + 1.5m (15.0m)
        expect(sunBall.position.y).toBeGreaterThanOrEqual(highestRoofPoint + 1.5 - 1e-4);
      }
    });
  });

  describe('T5.5: Ekologi dan Mikroklimat Event-Driven (ThermalComfortEngine)', () => {
    let landscapeManager: LandscapeManager;
    let riverManager: RiverManager;
    let thermalEngine: ThermalComfortEngine;

    beforeEach(() => {
      landscapeManager = new LandscapeManager(scene);
      riverManager = new RiverManager(scene);
      thermalEngine = new ThermalComfortEngine(
        buildingManager,
        landscapeManager,
        riverManager,
        lotManager
      );
    });

    it('evaluates baseline equatorial temperature (28.0 °C) in an empty environment', () => {
      thermalEngine.recalculate();
      const temp = thermalEngine.evaluateTemperatureAt(0, 0);
      expect(temp).toBe(28.0);
    });

    it('increases temperature by +0.35 °C per floor for buildings within 25m radius with linear falloff', () => {
      const bld: BuildingInstance = {
        id: 'thermal_bld_1',
        presetKey: 'office_4fl',
        name: 'Gedung Kantor 4 Lantai',
        category: 'commercial',
        position: new THREE.Vector3(10, 0, 10),
        rotationY: 0,
        width: 10,
        length: 10,
        floorCount: 4,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'metal',
      };
      buildingManager.addBuilding(bld);
      thermalEngine.recalculate();

      // At building center (10, 10): 28.0 + (4 * 0.35) = 29.40 °C
      const centerTemp = thermalEngine.evaluateTemperatureAt(10, 10);
      expect(centerTemp).toBe(29.4);

      // At half radius (12.5m away from 10, 10 -> e.g. at 22.5, 10): falloff = 0.5 -> 28.0 + 1.4 * 0.5 = 28.70 °C
      const midTemp = thermalEngine.evaluateTemperatureAt(22.5, 10);
      expect(midTemp).toBe(28.7);

      // Outside radius (>= 25m away -> e.g. at 40, 10): 28.0 °C
      const farTemp = thermalEngine.evaluateTemperatureAt(40, 10);
      expect(farTemp).toBe(28.0);
    });

    it('cools temperature by -1.5 °C for shade trees within 18m radius', () => {
      // Add a 4-floor building at (0, 0) -> temp = 29.4 °C
      buildingManager.addBuilding({
        id: 'thermal_bld_heat',
        presetKey: 'office_4fl',
        name: 'Gedung Panas',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 8,
        length: 8,
        floorCount: 4,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'metal',
      });

      // Add a shade tree at (0, 0)
      landscapeManager.addItem({
        id: 'tree_shade_1',
        type: 'shade_tree',
        position: new THREE.Vector3(0, 0, 0),
        radius: 3,
      });

      thermalEngine.recalculate();
      // At (0, 0): 28.0 + 1.4 - 1.5 = 27.90 °C
      const tempWithTree = thermalEngine.evaluateTemperatureAt(0, 0);
      expect(tempWithTree).toBe(27.9);
    });

    it('cools temperature along river corridors by -1.8 °C within 35m', () => {
      // Add a straight river segment along Z-axis from (50, 0, -50) to (50, 0, 50)
      riverManager.addRiverSegment(
        new THREE.Vector3(50, 0, -50),
        new THREE.Vector3(50, 0, 50),
        'urban_river'
      );

      thermalEngine.recalculate();

      // Right on river point (50, 0, 0): 28.0 - 1.8 = 26.20 °C
      const riverTemp = thermalEngine.evaluateTemperatureAt(50, 0);
      expect(riverTemp).toBe(26.2);

      // 35m away at (85, 0): falloff 0 -> 28.0 °C
      const edgeTemp = thermalEngine.evaluateTemperatureAt(85, 0);
      expect(edgeTemp).toBe(28.0);
    });

    it('updates lot grass tinting according to microclimate temperature', () => {
      // Create a lot at (100, 0, 100)
      const lot = lotManager.createLot(new THREE.Vector3(100, 0, 100), 15, 20, 'residential');
      expect(lot).toBeDefined();

      // Case 1: Empty lot -> baseline 28.0 °C -> Sedang (27.5 °C - 29.0 °C) -> #65a30d (0x65a30d)
      thermalEngine.recalculate();
      expect(lot!.userData?.microclimateTempC).toBe(28.0);
      expect(lot!.userData?.grassColorHexInt).toBe(0x65a30d);

      // Case 2: Add 4-floor commercial building -> temp = 29.4 °C -> Gersang (> 29.0 °C) -> #d97706 (0xd97706)
      buildingManager.addBuilding({
        id: 'bld_hot_lot',
        presetKey: 'office_4fl',
        name: 'Gedung Panas Kavling',
        category: 'commercial',
        position: new THREE.Vector3(100, 0, 100),
        rotationY: 0,
        width: 10,
        length: 12,
        floorCount: 4,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'metal',
      });
      thermalEngine.recalculate();
      expect(lot!.userData?.microclimateTempC).toBe(29.4);
      expect(lot!.userData?.grassColorHexInt).toBe(0xd97706);

      // Case 3: Add 2 shade trees nearby -> temp = 29.4 - 3.0 = 26.4 °C -> Sejuk (<= 27.5 °C) -> #22c55e (0x22c55e)
      landscapeManager.addItem({
        id: 'cool_tree_1',
        type: 'tree',
        position: new THREE.Vector3(100, 0, 100),
        radius: 3,
      });
      landscapeManager.addItem({
        id: 'cool_tree_2',
        type: 'tree_tabebuya_pink',
        position: new THREE.Vector3(100, 0, 100),
        radius: 3,
      });
      thermalEngine.recalculate();
      expect(lot!.userData?.microclimateTempC).toBe(26.4);
      expect(lot!.userData?.grassColorHexInt).toBe(0x22c55e);
    });

    it('benchmarks recalculation with 300 buildings to complete under 15ms', () => {
      // Mock 300 buildings across a 300m x 300m city
      for (let i = 0; i < 300; i++) {
        const gx = (i % 20) * 15 - 150;
        const gz = Math.floor(i / 20) * 20 - 150;
        buildingManager.addBuilding({
          id: `bench_bld_${i}`,
          presetKey: 'bench_preset',
          name: `Bangunan ${i}`,
          category: 'residential',
          position: new THREE.Vector3(gx, 0, gz),
          rotationY: 0,
          width: 8,
          length: 10,
          floorCount: (i % 4) + 1,
          floorHeight: 3.2,
          roofType: 'gable',
          roofOverhang: 0.5,
          wallMaterial: 'plaster',
          wallColor: '#ffffff',
          roofMaterial: 'clay_tile',
        });
      }

      const t0 = performance.now();
      thermalEngine.recalculate();
      const elapsed = performance.now() - t0;

      // Must complete in under 15ms
      expect(elapsed).toBeLessThan(15);
      expect(thermalEngine.lastRecalculateDurationMs).toBeLessThan(15);
    });
  });

  describe('T5.6: Mode Denah 2D (Potongan Horizontal / Blueprint)', () => {
    let renderer: THREE.WebGLRenderer;
    let sectionCutManager: SectionCutManager;
    let annotationOverlay: FloorPlanAnnotationOverlay;
    let cameraController: CameraController;
    let container: HTMLDivElement;

    beforeEach(() => {
      // Mock minimal DOM element for CameraController
      container = {
        clientWidth: 1920,
        clientHeight: 1080,
        addEventListener: () => {},
        removeEventListener: () => {},
        requestPointerLock: () => {}
      } as any;

      // Mock renderer with clippingPlanes
      renderer = {
        clippingPlanes: [],
        localClippingEnabled: false,
      } as unknown as THREE.WebGLRenderer;

      sectionCutManager = new SectionCutManager(renderer, scene);
      annotationOverlay = new FloorPlanAnnotationOverlay(scene, buildingManager);
      cameraController = new CameraController(container);
    });

    it('sets horizontal clipping plane to 1.2m on ground floor (Lt. 1) and enables orthographic top-down camera', () => {
      // Enter 2D mode: set orthographic top-down and horizontal floor plan cut at 1.2m
      cameraController.setOrthographicMode(true, 'plan');
      sectionCutManager.setCutMode('floor_plan');
      sectionCutManager.setCutHeight(1.2);
      annotationOverlay.setActiveFloor(0);
      annotationOverlay.setVisible(true, 1.2);

      expect(cameraController.isOrthographic).toBe(true);
      expect(renderer.clippingPlanes).toHaveLength(1);

      const clipPlane = renderer.clippingPlanes[0];
      // Normal pointing down (0, -1, 0)
      expect(clipPlane.normal.x).toBe(0);
      expect(clipPlane.normal.y).toBe(-1);
      expect(clipPlane.normal.z).toBe(0);
      // Constant is 1.2m
      expect(clipPlane.constant).toBe(1.2);
    });

    it('updates horizontal clipping height cleanly via floor selector (Lt. 1 = 1.2m, Lt. 2 = 4.4m, Lt. 3 = 7.6m)', () => {
      sectionCutManager.setCutMode('floor_plan');

      // Lt. 1: index 0 -> 0 * 3.2 + 1.2 = 1.2m
      sectionCutManager.setCutHeight(0 * 3.2 + 1.2);
      expect(renderer.clippingPlanes[0].constant).toBeCloseTo(1.2, 2);

      // Lt. 2: index 1 -> 1 * 3.2 + 1.2 = 4.4m
      sectionCutManager.setCutHeight(1 * 3.2 + 1.2);
      expect(renderer.clippingPlanes[0].constant).toBeCloseTo(4.4, 2);

      // Lt. 3: index 2 -> 2 * 3.2 + 1.2 = 7.6m
      sectionCutManager.setCutHeight(2 * 3.2 + 1.2);
      expect(renderer.clippingPlanes[0].constant).toBeCloseTo(7.6, 2);
    });

    it('renders thick wall section cut outlines and room badges in FloorPlanAnnotationOverlay', () => {
      // Add a 2-story building with rooms
      buildingManager.addBuilding({
        id: 'bld_denah_test',
        presetKey: 'house_2fl',
        name: 'Rumah Tingkat Denah',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 8,
        length: 12,
        floorCount: 2,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile',
      });

      annotationOverlay.setActiveFloor(0);
      annotationOverlay.setVisible(true, 1.2);

      // The overlay group must contain meshes for the building
      expect(annotationOverlay.isActive).toBe(true);
      const bldGroup = scene.getObjectByName('FloorPlanAnnotationOverlayGroup');
      expect(bldGroup).toBeDefined();
      expect(bldGroup!.children.length).toBeGreaterThan(0);

      // Verify that thick wall section cut meshes exist (color 0x0F172A)
      let foundDarkWallMesh = false;
      bldGroup!.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const mat = mesh.material as THREE.MeshBasicMaterial;
          if (mat && mat.color && mat.color.getHex() === 0x0f172a) {
            foundDarkWallMesh = true;
          }
        }
      });
      expect(foundDarkWallMesh).toBe(true);
    });

    it('restores previous orbit vantage and clears clipping planes when exiting 2D mode', () => {
      // Set initial orbit vantage
      cameraController.setOrbitView(new THREE.Vector3(10, 0, 10), 65, 1.25, 0.85, true);

      // Enter 2D mode
      cameraController.setOrthographicMode(true, 'plan');
      sectionCutManager.setCutMode('floor_plan');
      annotationOverlay.setVisible(true);

      expect(cameraController.isOrthographic).toBe(true);
      expect(renderer.clippingPlanes).toHaveLength(1);

      // Exit 2D mode
      cameraController.setOrthographicMode(false);
      sectionCutManager.setCutMode('none');
      annotationOverlay.setVisible(false);

      expect(cameraController.isOrthographic).toBe(false);
      // Orbit polar, azimuth, distance must be restored to prior state
      expect(cameraController.polar).toBeCloseTo(0.85, 2);
      expect(cameraController.azimuth).toBeCloseTo(1.25, 2);
      expect(cameraController.distance).toBeCloseTo(65, 2);
      // Clipping planes array cleared
      expect(renderer.clippingPlanes).toHaveLength(0);
      expect(annotationOverlay.isActive).toBe(false);
    });
  });
});
