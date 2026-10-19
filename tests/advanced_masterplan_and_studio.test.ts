import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { RoadManager } from '../src/roads/RoadManager';
import { LandscapeManager } from '../src/world/LandscapeManager';
import { LotManager } from '../src/zones/LotManager';
import { AdvancedBuildingCodeRegistry } from '../src/zones/AdvancedBuildingCode';
import { RunoffSimulator } from '../src/simulation/RunoffSimulator';
import { Terrain } from '../src/world/Terrain';
import { AcousticAnalyzer } from '../src/analysis/AcousticAnalyzer';
import { SolarAnalyzer } from '../src/analysis/SolarAnalyzer';
import { CostEstimator } from '../src/simulation/CostEstimator';
import { ScenarioComparator } from '../src/analysis/ScenarioComparator';
import { ScreenshotExporter } from '../src/io/ScreenshotExporter';
import { SimulationWorkerBridge } from '../src/simulation/SimulationWorkerBridge';
import { BuildingInstance } from '../src/buildings/PrefabTypes';

function addBuilding(
  mgr: BuildingManager,
  props: Partial<BuildingInstance> & { id: string; presetKey: string; name: string }
): BuildingInstance {
  const bld: BuildingInstance = {
    id: props.id,
    presetKey: props.presetKey,
    name: props.name,
    category: props.category || 'residential',
    position: props.position || new THREE.Vector3(0, 0, 0),
    rotationY: props.rotationY || 0,
    width: props.width || 8,
    length: props.length || 10,
    floorCount: props.floorCount || 1,
    floorHeight: props.floorHeight || 3.5,
    roofType: props.roofType || 'gable',
    roofOverhang: props.roofOverhang || 1.0,
    wallMaterial: props.wallMaterial || 'brick',
    wallColor: props.wallColor || '#ffffff',
    roofMaterial: props.roofMaterial || 'clay_tile',
    hasRooftopSolar: props.hasRooftopSolar,
    hasSecondarySkin: props.hasSecondarySkin
  };
  mgr.buildings.set(bld.id, bld);
  return bld;
}

function addRoad(
  mgr: RoadManager,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  type: 'artery_20m' | 'collector_12m' | 'local_7m' | 'alley_4m'
): void {
  const nodeA = mgr.graph.getOrCreateNode(p1);
  const nodeB = mgr.graph.getOrCreateNode(p2);
  mgr.graph.addEdge(nodeA.id, nodeB.id, type);
}

describe('Advanced Masterplan & Architecture Studio Suite Upgrade (6 Sectors)', () => {
  let scene: THREE.Scene;
  let terrain: Terrain;
  let buildingManager: BuildingManager;
  let roadManager: RoadManager;
  let landscapeManager: LandscapeManager;
  let lotManager: LotManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    terrain = new Terrain(scene, 128);
    buildingManager = new BuildingManager(scene);
    roadManager = new RoadManager(scene);
    landscapeManager = new LandscapeManager(scene);
    lotManager = new LotManager(scene, buildingManager, roadManager, landscapeManager);
  });

  // -------------------------------------------------------------------
  // SECTOR 1: Blue-Green Infrastructure, GSS & Runoff
  // -------------------------------------------------------------------
  describe('Sector 1: Blue-Green Infrastructure & River Setback (GSS)', () => {
    it('detects Garis Sempadan Sungai (GSS) violation when building is within 10m of river segment', () => {
      // Place river segment at x=0, z=0 (width 12m, length 30m)
      landscapeManager.createItem('river_segment', new THREE.Vector3(0, 0, 0), { width: 12, length: 30 });

      // Building placed at x=4 (inside 10m river setback buffer: edge is at x=6, bld edge at 4-2=2, dist < 10)
      const bldViolation = addBuilding(buildingManager, {
        id: 'bld_near_river',
        presetKey: 'joglo',
        name: 'Rumah Tepi Sungai',
        category: 'residential',
        position: new THREE.Vector3(4, 0, 0),
        width: 6,
        length: 8
      });

      const advancedCode = AdvancedBuildingCodeRegistry.getInstance();
      const violations = advancedCode.evaluateBuilding(bldViolation, roadManager, landscapeManager);
      const gssViol = violations.find((v) => v.code === 'GSS_RIVER_SETBACK');

      expect(gssViol).toBeDefined();
      expect(gssViol?.title).toContain('Garis Sempadan Sungai');
      expect(gssViol?.source).toContain('Permen PUPR No. 28/PRT/M/2015');
    });

    it('awards riparian cooling bonus and mitigates flood when setback and retention pond exist', () => {
      // Place river segment far away (x=0, z=0)
      landscapeManager.createItem('river_segment', new THREE.Vector3(0, 0, 0), { width: 12, length: 30 });

      // Place building safely 20m away (setback >= 10m)
      const bldSafe = addBuilding(buildingManager, {
        id: 'bld_safe_river',
        presetKey: 'joglo',
        name: 'Villa Sempadan Hijau',
        category: 'residential',
        position: new THREE.Vector3(20, 0, 0),
        width: 6,
        length: 8
      });

      // Place shade tree near river setback
      landscapeManager.createItem('shade_tree', new THREE.Vector3(15, 0, 0));

      const advancedCode = AdvancedBuildingCodeRegistry.getInstance();
      const benefit = advancedCode.checkRiverBufferBenefits(bldSafe, landscapeManager);
      expect(benefit.isSafeGss).toBe(true);
      expect(benefit.hasShadeTrees).toBe(true);
      expect(benefit.microclimateBonusC).toBe(-2.0);

      // Add retention pond (25 m3/hr capacity) and bioswale (4 m3/hr)
      landscapeManager.createItem('retention_pond', new THREE.Vector3(10, 0, 10));
      landscapeManager.createItem('bioswale_channel', new THREE.Vector3(5, 0, 10), { width: 3, length: 15 });

      const runoffSim = new RunoffSimulator();
      const report = runoffSim.evaluateCityRunoff(terrain, roadManager, buildingManager, landscapeManager, lotManager);

      // Verify that retention pond and bioswale increased absorption capacity
      expect(report.mitigatedRunoffM3PerHr).toBeGreaterThanOrEqual(29.0);
    });
  });

  // -------------------------------------------------------------------
  // SECTOR 2: City Acoustics & Tropical Cross-Ventilation Dilemma
  // -------------------------------------------------------------------
  describe('Sector 2: Acoustic Simulation & Tropical Opening Dilemma (SNI 03-6386)', () => {
    it('attenuates sound based on distance, GSB front setback, and vegetative tree buffer', () => {
      // Build a 20m arterial road
      addRoad(roadManager, new THREE.Vector3(-50, 0, 0), new THREE.Vector3(50, 0, 0), 'artery_20m');

      // Building 1: Close to road, no trees, no secondary skin
      const bldNoisy = addBuilding(buildingManager, {
        id: 'bld_noisy',
        presetKey: 'kost_eksklusif',
        name: 'Kost Pinggir Arteri',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 4),
        width: 10,
        length: 12,
        floorCount: 3,
        floorHeight: 3.2,
        hasSecondarySkin: false
      });

      // Building 2: Farther from road, with trees and secondary skin
      const bldCalm = addBuilding(buildingManager, {
        id: 'bld_calm',
        presetKey: 'modern_tropical',
        name: 'Rumah Tropis Asri',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 35),
        width: 10,
        length: 12,
        floorCount: 2,
        floorHeight: 3.5,
        hasSecondarySkin: true
      });

      // Add 2 buffer shade trees between road and bldCalm
      landscapeManager.createItem('shade_tree', new THREE.Vector3(-2, 0, 20));
      landscapeManager.createItem('shade_tree', new THREE.Vector3(2, 0, 20));

      const acoustic = AcousticAnalyzer.getInstance();
      const repNoisy = acoustic.evaluateBuilding(bldNoisy, roadManager, landscapeManager, buildingManager);
      const repCalm = acoustic.evaluateBuilding(bldCalm, roadManager, landscapeManager, buildingManager);

      expect(repNoisy.receivedNoiseDba).toBeGreaterThan(repCalm.receivedNoiseDba);
      expect(repCalm.indoorNoiseDba).toBeLessThanOrEqual(55.0);
      expect(repCalm.treeBufferDba).toBeGreaterThan(0);
      expect(repCalm.status).toBe('calm');
    });
  });

  // -------------------------------------------------------------------
  // SECTOR 3: Daylight Autonomy & Rooftop Solar PV
  // -------------------------------------------------------------------
  describe('Sector 3: Daylight Autonomy & Rooftop Solar PV', () => {
    it('evaluates daylight autonomy according to SNI 03-2396-2001', () => {
      // Shallow building (depth 6m) -> high natural daylight
      const shallowBld: BuildingInstance = {
        id: 'bld_shallow',
        presetKey: 'pavilion',
        name: 'Paviliun Kaca Terang',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 6,
        length: 10,
        floorCount: 1,
        floorHeight: 3.6,
        roofType: 'gable',
        roofOverhang: 1.2,
        wallMaterial: 'glass',
        wallColor: '#ffffff',
        roofMaterial: 'metal_deck'
      };

      const daylightShallow = SolarAnalyzer.evaluateDaylightAutonomy(shallowBld);
      expect(daylightShallow.daylightAutonomyScore).toBeGreaterThanOrEqual(75);
      expect(daylightShallow.status).toBe('optimal');

      // Massive deep building (width 40m, depth 40m) without lightwell -> dark core
      const massiveBld: BuildingInstance = {
        id: 'bld_massive',
        presetKey: 'warehouse',
        name: 'Gudang Masif Gelap',
        category: 'commercial',
        position: new THREE.Vector3(50, 0, 0),
        rotationY: 0,
        width: 40,
        length: 40,
        floorCount: 1,
        floorHeight: 3.0,
        roofType: 'flat',
        roofOverhang: 0.2,
        wallMaterial: 'concrete',
        wallColor: '#ffffff',
        roofMaterial: 'concrete'
      };

      const daylightMassive = SolarAnalyzer.evaluateDaylightAutonomy(massiveBld);
      expect(daylightMassive.status).toBe('insufficient');
      expect(daylightMassive.recommendations.some((r) => r.includes('inner courtyard') || r.includes('lightwell'))).toBe(true);
    });

    it('estimates rooftop solar PV generation and directly deducts savings from 10-year OPEX', () => {
      const bldWithSolar = addBuilding(buildingManager, {
        id: 'bld_solar_roof',
        presetKey: 'mall_grand_atrium',
        name: 'Mall Surya Mandiri',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 0),
        width: 30,
        length: 40, // 1200 m2
        floorCount: 3,
        floorHeight: 4.0,
        hasRooftopSolar: true
      });

      const solarEst = SolarAnalyzer.estimateRooftopSolar(bldWithSolar);
      expect(solarEst.installedCapacityKwp).toBeGreaterThan(50);
      expect(solarEst.annualGenerationKwh).toBeGreaterThan(50000);
      expect(solarEst.tenYearSavingsIdr).toBeGreaterThan(0);

      const costEstimator = CostEstimator.getInstance();
      const estimate = costEstimator.estimateBuildingCost(bldWithSolar);

      expect(estimate.hasRooftopSolar).toBe(true);
      expect(estimate.solarTenYearSavingsIdr).toBe(solarEst.tenYearSavingsIdr);
      expect(estimate.tenYearTotalOpexIdr).toBeLessThan(estimate.tenYearBaselineOpexIdr);
    });
  });

  // -------------------------------------------------------------------
  // SECTOR 4: A/B Masterplan Design Comparator
  // -------------------------------------------------------------------
  describe('Sector 4: A/B Scenario Comparator', () => {
    it('captures Baseline Scenario A and computes scientific performance deltas', () => {
      const comparator = ScenarioComparator.getInstance();
      comparator.clearBaseline();
      expect(comparator.hasBaseline()).toBe(false);

      // Create mock engine container
      const mockEngine: any = {
        buildingManager,
        roadManager,
        landscapeManager,
        lotManager,
        terrain,
        ventilationAnalyzer: {
          analyzeBuilding: () => ({ indoorEstimatedTempC: 32.0 })
        }
      };

      // Add baseline building
      addBuilding(buildingManager, {
        id: 'bld_base',
        presetKey: 'joglo',
        name: 'Rumah Awal',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        width: 10,
        length: 10
      });

      const snapA = comparator.captureSnapshot(mockEngine, 'Skenario A (Baseline Awal)');
      comparator.setBaseline(snapA);
      expect(comparator.hasBaseline()).toBe(true);

      // Scenario B: Add 3 shade trees and a retention pond to improve performance
      landscapeManager.createItem('shade_tree', new THREE.Vector3(10, 0, 0));
      landscapeManager.createItem('shade_tree', new THREE.Vector3(15, 0, 0));
      landscapeManager.createItem('shade_tree', new THREE.Vector3(20, 0, 0));
      landscapeManager.createItem('retention_pond', new THREE.Vector3(25, 0, 0));

      const comparison = comparator.compareWithCurrent(mockEngine);
      expect(comparison).toBeDefined();
      expect(comparison?.baseline.name).toBe('Skenario A (Baseline Awal)');
      expect(comparison?.deltas.runoff.isImproved).toBe(true);
      expect(comparison?.overallImprovementScore).toBeGreaterThanOrEqual(0);
    });
  });

  // -------------------------------------------------------------------
  // SECTOR 5: Architecture Studio Presentation Sheet (A3 Canvas)
  // -------------------------------------------------------------------
  describe('Sector 5: A3 Architecture Studio Presentation Sheet Generator', () => {
    it('composes a 2400x1697 px A3 technical presentation sheet with studio kop gambar', () => {
      // Mock engine for screenshot exporter
      const mockEngine: any = {
        scene,
        renderer: {
          domElement: { width: 1920, height: 1080 },
          render: () => {}
        },
        cameraController: {
          activeCamera: new THREE.PerspectiveCamera()
        },
        buildingManager,
        roadManager,
        landscapeManager,
        lotManager
      };

      const canvas = ScreenshotExporter.generateA3PresentationSheet(mockEngine, 'PENGEMBANGAN MALIOBORO HERITAGE');
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(2400);
      expect(canvas.height).toBe(1697);
    });
  });

  // -------------------------------------------------------------------
  // SECTOR 6: Multi-Thread Simulation Worker Fallback
  // -------------------------------------------------------------------
  describe('Sector 6: Simulation Worker Bridge & Fallback', () => {
    it('provides synchronous simulation fallback for Vitest and low building counts', async () => {
      const bridge = SimulationWorkerBridge.getInstance();

      // For 1 building, shouldRunAsync must be false (threshold is 50)
      expect(bridge.shouldRunAsync(1)).toBe(false);

      const result = await bridge.evaluateAcoustics(
        buildingManager,
        roadManager,
        landscapeManager,
        lotManager
      );

      expect(result).toBeDefined();
      expect(result.report).toBeDefined();
      expect(result.wasOffThread).toBe(false); // Seamless sync fallback
      expect(typeof result.report.averageNoiseDba).toBe('number');
    });
  });
});
