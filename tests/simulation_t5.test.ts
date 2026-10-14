import { describe, it, expect } from 'vitest';
import { runoffSimulator } from '../src/simulation/RunoffSimulator';
import { structuralChecker } from '../src/simulation/StructuralChecker';
import { costEstimator } from '../src/simulation/CostEstimator';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import * as THREE from 'three';

describe('T5.2: Rain Runoff & Hydrological Simulation', () => {
  it('calculates weighted runoff coefficient and peak discharge via Rational Method', () => {
    // Mock minimal managers
    const mockTerrain = { getHeightAt: () => 0 } as any;
    const mockRoadManager = {
      graph: {
        edges: new Map([
          ['e1', { length: 100, customProfile: { width: 8.0 } }]
        ]),
        nodes: new Map()
      }
    } as any;
    const mockBuildingManager = {
      buildings: new Map([
        ['b1', { width: 10, length: 10, floorCount: 1, position: new THREE.Vector3() }]
      ])
    } as any;
    const mockLandscapeManager = {
      items: new Map([
        ['l1', { type: 'grass_garden', width: 10, length: 10, position: new THREE.Vector3() }],
        ['w1', { type: 'well', position: new THREE.Vector3() }],
        ['w2', { type: 'well', position: new THREE.Vector3() }],
        ['p1', { type: 'biopore', position: new THREE.Vector3() }]
      ])
    } as any;
    const mockLotManager = {} as any;

    const report = runoffSimulator.evaluateCityRunoff(
      mockTerrain,
      mockRoadManager,
      mockBuildingManager,
      mockLandscapeManager,
      mockLotManager
    );

    expect(report.weightedRunoffCoeff).toBeGreaterThan(0);
    expect(report.weightedRunoffCoeff).toBeLessThan(1);
    expect(report.peakDischargeM3PerSec).toBeGreaterThan(0);
    expect(report.wellCount).toBe(2);
    expect(report.bioporeCount).toBe(1);
    expect(report.mitigatedRunoffM3PerHr).toBe(2 * 2.5 + 1 * 0.2); // 5.2 m³/hr
    expect(report.netDischargeM3PerSec).toBeLessThanOrEqual(report.peakDischargeM3PerSec);
  });
});

describe('T5.3: Structural & Seismic Resilience (Gempa Yogyakarta 2006)', () => {
  it('penalizes buildings with excessive beam spans (> 6.0 m) without column support', () => {
    const regularHouse: BuildingInstance = {
      id: 'reg_1',
      name: 'Rumah Standar',
      presetKey: 'house_36',
      category: 'residential',
      position: new THREE.Vector3(),
      rotationY: 0,
      width: 6,
      length: 6,
      floorCount: 1,
      floorHeight: 3.2,
      roofType: 'hip',
      roofOverhang: 1.2,
      wallMaterial: 'plaster',
      wallColor: '#ffffff',
      roofMaterial: 'clay_tile'
    };

    const regularReport = structuralChecker.evaluateBuilding(regularHouse);
    expect(regularReport.score).toBe(100);
    expect(regularReport.rating).toBe('Sangat Tangguh');

    const wideSpanBuilding: BuildingInstance = {
      ...regularHouse,
      width: 12,
      length: 14 // 14m span exceeds 6m limit
    };

    const wideReport = structuralChecker.evaluateBuilding(wideSpanBuilding);
    expect(wideReport.score).toBeLessThan(100);
    expect(wideReport.issues.some(i => i.type === 'excessive_span')).toBe(true);
    expect(wideReport.whyExplanation).toContain('Gempa Yogyakarta');
  });

  it('detects elongated plan asymmetry and soft story vulnerability', () => {
    const elongatedBuilding: BuildingInstance = {
      id: 'long_1',
      name: 'Gedung Pipih',
      presetKey: 'custom',
      category: 'residential',
      position: new THREE.Vector3(),
      rotationY: 0,
      width: 4,
      length: 20, // 20:4 = 5:1 ratio (> 3:1 limit)
      floorCount: 1,
      floorHeight: 3.2,
      roofType: 'flat',
      roofOverhang: 1.0,
      wallMaterial: 'concrete',
      wallColor: '#ffffff',
      roofMaterial: 'concrete'
    };

    const report = structuralChecker.evaluateBuilding(elongatedBuilding);
    expect(report.issues.some(i => i.type === 'irregular_plan')).toBe(true);

    const rukoBuilding: BuildingInstance = {
      ...elongatedBuilding,
      presetKey: 'ruko_3fl',
      width: 5,
      length: 12,
      floorCount: 3
    };
    const rukoReport = structuralChecker.evaluateBuilding(rukoBuilding);
    expect(rukoReport.hasSoftStory).toBe(true);
    expect(rukoReport.issues.some(i => i.type === 'soft_story')).toBe(true);
  });
});

describe('T5.4: Cost Estimation & RAB Sederhana', () => {
  it('estimates detailed cost breakdown per element and total in Rupiah', () => {
    const house36: BuildingInstance = {
      id: 'cost_bld_1',
      name: 'Rumah 36',
      presetKey: 'house_36',
      category: 'residential',
      position: new THREE.Vector3(),
      rotationY: 0,
      width: 6,
      length: 6,
      floorCount: 1,
      floorHeight: 3.2,
      roofType: 'hip',
      roofOverhang: 1.2,
      wallMaterial: 'plaster',
      wallColor: '#ffffff',
      roofMaterial: 'clay_tile'
    };

    const cost = costEstimator.estimateBuildingCost(house36);
    expect(cost.totalCost).toBeGreaterThan(0);
    expect(cost.structureCost).toBe(36 * costEstimator.unitRates.structurePerM2);
    expect(cost.formattedTotal).toContain('Rp');
  });

  it('calculates citywide capital expenditure', () => {
    const mockBM = {
      buildings: new Map([
        ['b1', { width: 10, length: 10, floorCount: 2, position: new THREE.Vector3() }]
      ])
    } as any;
    const mockRM = {
      graph: {
        edges: new Map([
          ['e1', { length: 50 }]
        ])
      }
    } as any;
    const mockLM = {
      items: new Map([
        ['l1', { type: 'paving_block', width: 4, length: 4 }]
      ])
    } as any;

    const cityBudget = costEstimator.estimateCityBudget(mockBM, mockRM, mockLM);
    expect(cityBudget.totalCityCost).toBeGreaterThan(0);
    expect(cityBudget.roadsCost).toBe(50 * costEstimator.unitRates.roadPerMeter);
    expect(cityBudget.formattedTotalCityCost).toContain('Rp');
  });
});
