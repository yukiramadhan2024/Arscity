import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ThermalVentilationAnalyzer } from '../src/analysis/ThermalVentilationAnalyzer';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { LandscapeManager } from '../src/world/LandscapeManager';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { RunoffSimulator } from '../src/simulation/RunoffSimulator';
import { LotParcel } from '../src/zones/ZoneTypes';
import { CostEstimator } from '../src/simulation/CostEstimator';

describe('FASE 3: Tropical Thermal Simulation, Flood Water, & Structural Shake', () => {
  it('correctly calculates thermal comfort, indoor temperature, and monthly AC electricity cost', () => {
    const scene = new THREE.Scene();
    const bldMgr = new BuildingManager(scene);
    const landMgr = new LandscapeManager(scene);
    const analyzer = new ThermalVentilationAnalyzer(bldMgr, landMgr, scene);

    // 1. Joglo with wide overhang and shade tree nearby
    const coolBuilding: BuildingInstance = {
      id: 'cool_joglo',
      presetKey: 'joglo',
      name: 'Rumah Joglo Tropis',
      position: new THREE.Vector3(10, 0, 10),
      rotationY: 0,
      width: 10,
      length: 12,
      floorCount: 1,
      roofOverhang: 1.6,
      category: 'residential',
      floorHeight: 3.5,
      roofType: 'joglo',
      wallMaterial: 'wood',
      wallColor: '#8b5a2b',
      roofMaterial: 'clay_tile'
    };
    bldMgr.buildings.set(coolBuilding.id, coolBuilding);

    // Add shade tree within 10m
    landMgr.createItem('shade_tree', new THREE.Vector3(15, 0, 12), { radius: 3 });

    const coolReport = analyzer.analyzeBuilding('cool_joglo');
    expect(coolReport).not.toBeNull();
    expect(coolReport?.hasCrossVentilation).toBe(true);
    expect(coolReport?.hasShadeTreesNearby).toBe(true);
    expect(coolReport?.overhangMeters).toBe(1.6);
    // Should be significantly cooler than 32.5°C
    expect(coolReport?.indoorEstimatedTempC).toBeLessThanOrEqual(27.0);
    expect(coolReport?.monthlyAcCostIdr).toBe(0); // Natural passive cooling!

    // 2. Unventilated building with zero overhang and no trees
    const hotBuilding: BuildingInstance = {
      id: 'hot_box',
      presetKey: 'custom',
      name: 'Ruko Panas Kaca',
      position: new THREE.Vector3(100, 0, 100),
      rotationY: 0,
      width: 6,
      length: 16,
      floorCount: 3,
      roofOverhang: 0.2, // Very low overhang
      category: 'commercial',
      floorHeight: 3.2,
      roofType: 'flat',
      wallMaterial: 'concrete',
      wallColor: '#f0f0f0',
      roofMaterial: 'concrete'
    };
    bldMgr.buildings.set(hotBuilding.id, hotBuilding);

    const hotReport = analyzer.analyzeBuilding('hot_box');
    expect(hotReport).not.toBeNull();
    expect(hotReport?.hasCrossVentilation).toBe(false);
    expect(hotReport?.hasShadeTreesNearby).toBe(false);
    expect(hotReport?.indoorEstimatedTempC).toBeGreaterThan(30.0);
    expect(hotReport?.monthlyAcCostIdr).toBeGreaterThan(0); // High AC bill!

    analyzer.dispose();
    bldMgr.dispose();
    landMgr.dispose();
  });

  it('evaluates lot flooding and proves the mitigation power of KDH and absorption wells', () => {
    const scene = new THREE.Scene();
    const landMgr = new LandscapeManager(scene);
    const runoffSim = RunoffSimulator.getInstance();

    // Lot A: 0% KDH, 100% hard paved, no wells (Severe flood risk)
    const floodedLot: LotParcel = {
      id: 'lot_flooded',
      name: 'Kavling Padat Tanpa Resapan',
      zone: 'commercial',
      position: new THREE.Vector3(0, 0, 0),
      width: 10,
      length: 20, // 200 m²
      areaM2: 200,
      containedBuildingIds: ['bld_1'],
      metrics: {
        groundFootprintM2: 160,
        totalFloorAreaM2: 480,
        greenAreaM2: 0,
        pavedAreaM2: 40,
        kdbPercent: 80,
        klbRatio: 2.4,
        kdhPercent: 0, // 0% Green
        gsbFrontActualM: 1.0,
        gsbSideActualM: 0.5,
        gsbRearActualM: 0.5,
        gsbDistanceM: 1.0,
        maxFloors: 3
      },
      violations: []
    };

    const floodReportA = runoffSim.evaluateLotFlooding(floodedLot, landMgr, 60.0);
    expect(floodReportA.riskLevel).toBe('flooded');
    expect(floodReportA.floodDepthCm).toBeGreaterThanOrEqual(10.0);
    expect(floodReportA.mitigationKdhMet).toBe(false);

    // Lot B: 30% KDH + 1 Sumur Resapan + 2 Biopori (Resilient Lot)
    const safeLot: LotParcel = {
      id: 'lot_safe',
      name: 'Kavling Tangguh Banjir',
      zone: 'residential',
      position: new THREE.Vector3(50, 0, 50),
      width: 10,
      length: 20, // 200 m²
      areaM2: 200,
      containedBuildingIds: ['bld_2'],
      metrics: {
        groundFootprintM2: 100,
        totalFloorAreaM2: 100,
        greenAreaM2: 60, // 30% KDH
        pavedAreaM2: 40,
        kdbPercent: 50,
        klbRatio: 0.5,
        kdhPercent: 30, // Healthy KDH
        gsbFrontActualM: 4.0,
        gsbSideActualM: 1.5,
        gsbRearActualM: 2.0,
        gsbDistanceM: 4.0,
        maxFloors: 1
      },
      violations: []
    };

    landMgr.createItem('well', new THREE.Vector3(52, 0, 52), { radius: 0.8 });
    landMgr.createItem('biopore', new THREE.Vector3(55, 0, 50), { radius: 0.3 });
    landMgr.createItem('biopore', new THREE.Vector3(55, 0, 55), { radius: 0.3 });

    const floodReportB = runoffSim.evaluateLotFlooding(safeLot, landMgr, 60.0);
    expect(floodReportB.riskLevel).toBe('safe');
    expect(floodReportB.floodDepthCm).toBeLessThan(3.0);
    expect(floodReportB.mitigationKdhMet).toBe(true);

    landMgr.dispose();
  });

  it('CostEstimator calculates both capital RAB and monthly AC electricity operational cost', () => {
    const costEst = CostEstimator.getInstance();
    const testBld: BuildingInstance = {
      id: 'house_test',
      presetKey: 'house_54',
      name: 'Rumah 54 Tropis',
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      width: 6,
      length: 9,
      floorCount: 1,
      roofOverhang: 1.2,
      category: 'residential',
      floorHeight: 3.2,
      roofType: 'hip',
      wallMaterial: 'plaster',
      wallColor: '#ffffff',
      roofMaterial: 'clay_tile'
    };

    const est = costEst.estimateBuildingCost(testBld);
    expect(est.totalCost).toBeGreaterThan(0);
    expect(est.formattedTotal).toContain('Rp');
    expect(est.monthlyAcCostIdr).toBeDefined();
    expect(est.formattedMonthlyAcCost).toBeDefined();
  });
});
