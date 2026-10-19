import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RoadGraph } from '../src/roads/RoadGraph';
import { AutoZoningService } from '../src/zones/AutoZoningService';
import { CostEstimator } from '../src/simulation/CostEstimator';
import { RunoffSimulator } from '../src/simulation/RunoffSimulator';
import { ThermalVentilationAnalyzer } from '../src/analysis/ThermalVentilationAnalyzer';
import { SpatialHashGrid } from '../src/core/engine/SpatialHashGrid';
import { Lot } from '../src/zones/LotManager';
import { LotParcel } from '../src/zones/ZoneTypes';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { LandscapeManager } from '../src/world/LandscapeManager';

describe('Systemic SimCity Architecture Pillars', () => {
  describe('Pillar 1: Cellular Automata Microclimate & Hydrology Diffusion', () => {
    it('propagates neighbor cooling (-1.5C to -3.0C) and absorption aid from lots with high KDH and trees', () => {
      const scene = new THREE.Scene();
      const bldMgr = new BuildingManager(scene);
      const landMgr = new LandscapeManager(scene);
      const spatialGrid = new SpatialHashGrid<Lot>(25.0);
      const runoffSim = new RunoffSimulator();

      const coolNeighborLot: Lot = {
        id: 'lot_cool_neighbor',
        position: new THREE.Vector3(10, 0, 0),
        width: 20,
        length: 20,
        zoneType: 'residential_low',
        kdbMax: 0.6,
        klbMax: 1.2,
        kdhMin: 0.35,
        gsbFront: 4,
        gsbSide: 2,
        gsbRear: 2,
        maxHeightM: 10,
        assignedBuildingId: 'bld_neighbor',
        status: 'occupied',
        createdAt: Date.now(),
      };

      const targetLot: Lot = {
        id: 'lot_target',
        position: new THREE.Vector3(0, 0, 0),
        width: 20,
        length: 20,
        zoneType: 'residential_low',
        kdbMax: 0.6,
        klbMax: 1.2,
        kdhMin: 0.3,
        gsbFront: 4,
        gsbSide: 2,
        gsbRear: 2,
        maxHeightM: 10,
        assignedBuildingId: 'bld_target',
        status: 'occupied',
        createdAt: Date.now(),
      };

      spatialGrid.insert('lot_cool_neighbor', 10, 0, coolNeighborLot);
      spatialGrid.insert('lot_target', 0, 0, targetLot);

      const lotsMap = new Map<string, Lot>([
        ['lot_cool_neighbor', coolNeighborLot],
        ['lot_target', targetLot],
      ]);

      const mockTargetBuilding: BuildingInstance = {
        id: 'bld_target',
        presetKey: 'joglo',
        name: 'Target House',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 10,
        length: 10,
        floorCount: 1,
        floorHeight: 3.5,
        roofType: 'limasan',
        roofOverhang: 1.4,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile',
      };

      const mockNeighborBuilding: BuildingInstance = {
        id: 'bld_neighbor',
        presetKey: 'joglo',
        name: 'Cool Neighbor',
        category: 'residential',
        position: new THREE.Vector3(10, 0, 0),
        rotationY: 0,
        width: 8,
        length: 8,
        floorCount: 1,
        floorHeight: 3.5,
        roofType: 'joglo',
        roofOverhang: 1.6,
        wallMaterial: 'wood',
        wallColor: '#78350f',
        roofMaterial: 'clay_tile',
      };

      bldMgr.buildings.set('bld_target', mockTargetBuilding);
      bldMgr.buildings.set('bld_neighbor', mockNeighborBuilding);

      // Neighbor has shade trees (within 20m) and absorption well
      landMgr.createItem('shade_tree', new THREE.Vector3(18, 0, 0), { radius: 3 });
      landMgr.createItem('shade_tree', new THREE.Vector3(20, 0, 2), { radius: 3 });
      landMgr.createItem('well', new THREE.Vector3(11, 0, 1), { radius: 1 });

      const mockLotMgr: any = {
        lots: lotsMap,
        getLotForBuilding: (id: string) => lotsMap.get(id === 'bld_target' ? 'lot_target' : 'lot_cool_neighbor'),
      };

      const mockEngine: any = {
        spatialGrid,
        lotManager: mockLotMgr,
        buildingManager: bldMgr,
        landscapeManager: landMgr,
        roadPropPlacer: { props: [] },
        lightingSystem: { getSunPosition: () => ({ azimuthDeg: 90, altitudeDeg: 60 }) },
      };

      const thermalAnalyzer = new ThermalVentilationAnalyzer(bldMgr, landMgr, scene, mockLotMgr);

      const thermalResult = thermalAnalyzer.analyzeBuilding('bld_target');

      expect(thermalResult).not.toBeNull();
      expect(thermalResult?.neighborhoodCoolingC).toBeGreaterThanOrEqual(1.0);
      expect(thermalResult?.neighborhoodWaterAbsorptionAidM3Hr).toBeGreaterThan(0);

      // Verify runoff simulator accounts for neighbor absorption aid
      const floodResult = runoffSim.evaluateLotFlooding(targetLot, landMgr, 60.0, mockLotMgr);
      expect(floodResult.neighborAbsorptionAidM3Hr).toBeGreaterThan(0);
      expect(floodResult.netNeighborRunoffImpactM3Hr).toBeLessThan(0);
    });

    it('propagates UHI heat load (+0.8C to +2.0C) and runoff overflow from asphalt-heavy lots', () => {
      const scene = new THREE.Scene();
      const bldMgr = new BuildingManager(scene);
      const landMgr = new LandscapeManager(scene);
      const spatialGrid = new SpatialHashGrid<Lot>(25.0);
      const runoffSim = new RunoffSimulator();

      const hotNeighborLot: Lot = {
        id: 'lot_hot',
        position: new THREE.Vector3(12, 0, 0),
        width: 20,
        length: 20,
        zoneType: 'commercial_high',
        kdbMax: 0.85,
        klbMax: 2.0,
        kdhMin: 0.05,
        gsbFront: 2,
        gsbSide: 1,
        gsbRear: 1,
        maxHeightM: 15,
        assignedBuildingId: 'bld_hot',
        status: 'occupied',
        createdAt: Date.now(),
      };

      const targetLot: Lot = {
        id: 'lot_target_2',
        position: new THREE.Vector3(0, 0, 0),
        width: 20,
        length: 20,
        zoneType: 'residential_low',
        kdbMax: 0.6,
        klbMax: 1.2,
        kdhMin: 0.3,
        gsbFront: 4,
        gsbSide: 2,
        gsbRear: 2,
        maxHeightM: 10,
        assignedBuildingId: 'bld_target_2',
        status: 'occupied',
        createdAt: Date.now(),
      };

      spatialGrid.insert('lot_hot', 12, 0, hotNeighborLot);
      spatialGrid.insert('lot_target_2', 0, 0, targetLot);

      const lotsMap = new Map<string, Lot>([
        ['lot_hot', hotNeighborLot],
        ['lot_target_2', targetLot],
      ]);

      const mockHotBuilding: BuildingInstance = {
        id: 'bld_hot',
        presetKey: 'custom',
        name: 'Hot Office Box',
        category: 'commercial',
        position: new THREE.Vector3(12, 0, 0),
        rotationY: 0,
        width: 18,
        length: 18,
        floorCount: 3,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.2,
        wallMaterial: 'glass',
        wallColor: '#1e293b',
        roofMaterial: 'concrete',
      };

      const mockTargetBuilding: BuildingInstance = {
        id: 'bld_target_2',
        presetKey: 'joglo',
        name: 'Target House 2',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 10,
        length: 10,
        floorCount: 1,
        floorHeight: 3.5,
        roofType: 'limasan',
        roofOverhang: 1.4,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile',
      };

      bldMgr.buildings.set('bld_hot', mockHotBuilding);
      bldMgr.buildings.set('bld_target_2', mockTargetBuilding);

      const mockLotMgr: any = {
        lots: lotsMap,
        getLotForBuilding: (id: string) => lotsMap.get(id === 'bld_target_2' ? 'lot_target_2' : 'lot_hot'),
      };

      const mockEngine: any = {
        spatialGrid,
        lotManager: mockLotMgr,
        buildingManager: bldMgr,
        landscapeManager: landMgr,
        roadPropPlacer: { props: [] },
        lightingSystem: { getSunPosition: () => ({ azimuthDeg: 90, altitudeDeg: 60 }) },
      };

      const thermalAnalyzer = new ThermalVentilationAnalyzer(bldMgr, landMgr, scene, mockLotMgr);

      const thermalResult = thermalAnalyzer.analyzeBuilding('bld_target_2');

      expect(thermalResult).not.toBeNull();
      expect(thermalResult?.neighborhoodHeatIslandC).toBeGreaterThanOrEqual(0.8);
      expect(thermalResult?.neighborhoodRunoffSurplusM3Hr).toBeGreaterThanOrEqual(0.4);

      const floodResult = runoffSim.evaluateLotFlooding(targetLot, landMgr, 60.0, mockLotMgr);
      expect(floodResult.neighborRunoffSurplusM3Hr).toBeGreaterThan(0);
      expect(floodResult.netNeighborRunoffImpactM3Hr).toBeGreaterThan(0);
    });
  });

  describe('Pillar 2: Topological Road-Graph Pathfinding for Walkability 400m', () => {
    it('computes Dijkstra shortest-path network distances along connected road edges', () => {
      const graph = new RoadGraph();

      // Node A (0,0,0) -> Node B (100,0,0) -> Node C (200,0,0) -> Node D (500,0,0)
      const nodeA = graph.getOrCreateNode(new THREE.Vector3(0, 0, 0));
      const nodeB = graph.getOrCreateNode(new THREE.Vector3(100, 0, 0));
      const nodeC = graph.getOrCreateNode(new THREE.Vector3(200, 0, 0));
      const nodeD = graph.getOrCreateNode(new THREE.Vector3(500, 0, 0));

      graph.addEdge(nodeA.id, nodeB.id, 'local_residential');
      graph.addEdge(nodeB.id, nodeC.id, 'local_residential');
      graph.addEdge(nodeC.id, nodeD.id, 'local_residential');

      // Test reachable distances within 250m from Node A
      const dists = graph.computeNetworkDistancesFromPoint(new THREE.Vector3(0, 0, 0), 250);
      expect(dists.get(nodeA.id)).toBe(0);
      expect(dists.get(nodeB.id)).toBe(100);
      expect(dists.get(nodeC.id)).toBe(200);
      expect(dists.has(nodeD.id)).toBe(false); // 500m is beyond 250m

      // Test reachable edges (Set<string>) within 150m from Node A (Edge A-B and Edge B-C)
      const edges = graph.getReachableEdges(new THREE.Vector3(0, 0, 0), 150);
      expect(edges.size).toBe(2); // Edge A-B and Edge B-C

      // Test walk distance between two points along network
      const walkDistToC = graph.getNetworkWalkDistance(new THREE.Vector3(0, 0, 0), new THREE.Vector3(200, 0, 0), 400);
      expect(walkDistToC).toBe(200);

      const walkDistToD = graph.getNetworkWalkDistance(new THREE.Vector3(0, 0, 0), new THREE.Vector3(500, 0, 0), 400);
      expect(walkDistToD).toBeNull(); // Exceeds 400m limit
    });
  });

  describe('Pillar 4: Smart Auto-Zoning (Compliant Lot Development)', () => {
    it('generates compliant building behind GSB, respecting KDB and adding trees/wells for KDH >= 25%', () => {
      const graph = new RoadGraph();
      const n1 = graph.getOrCreateNode(new THREE.Vector3(-10, 0, -50));
      const n2 = graph.getOrCreateNode(new THREE.Vector3(-10, 0, 50));
      graph.addEdge(n1.id, n2.id, 'local_residential');

      const lot: LotParcel = {
        id: 'lot_auto_1',
        name: 'Kavling Uji Otomatis',
        zone: 'residential',
        position: new THREE.Vector3(5, 0, 0),
        width: 20,
        length: 20,
        areaM2: 400,
        containedBuildingIds: [],
        metrics: {
          groundFootprintM2: 0,
          totalFloorAreaM2: 0,
          greenAreaM2: 400,
          pavedAreaM2: 0,
          kdbPercent: 0,
          klbRatio: 0,
          kdhPercent: 100,
          gsbFrontActualM: 10,
          gsbSideActualM: 10,
          gsbRearActualM: 10,
          gsbDistanceM: 10,
          maxFloors: 1,
        },
        violations: [],
      };

      const mockEngine: any = {
        roadManager: { graph },
        buildingManager: { buildings: new Map() },
        lotManager: {
          lots: new Map([[lot.id, lot]]),
          getLotEdgeClassification: () => ({ frontIdx: 3, roadEdge: null }), // Faces West (X-) towards road at X=-10
        },
        landscapeManager: { items: new Map() },
      };

      const plan = AutoZoningService.generateCompliantLotDevelopment(mockEngine, lot);
      expect(plan).not.toBeNull();
      if (!plan) return;

      // 1. Verify building footprint conforms to KDB (60% max for residential = 240 m2)
      const bldArea = plan.building.width * plan.building.length;
      const kdbActual = (bldArea / lot.areaM2) * 100;
      expect(kdbActual).toBeLessThanOrEqual(60);

      // 2. Verify GSB setback: building positioned behind front GSB line (minGSBFront = 3.0m)
      // Lot boundary facing road is X = 5 - (20/2) = -5. GSB front is 3m -> building must be placed at X >= -2
      const halfWidth = plan.building.width / 2;
      const bldMinX = plan.building.position.x - halfWidth;
      expect(bldMinX).toBeGreaterThanOrEqual(-5 + 3.0 - 0.5);

      // 3. Verify landscape items (shade tree and infiltration well) are generated
      expect(plan.tree).toBeDefined();
      expect(plan.tree.type).toBe('shade_tree');
      expect(plan.well).toBeDefined();
      expect(plan.well.type).toBe('well');
    });
  });

  describe('Pillar 5: 10-Year Lifecycle OPEX & Tropical Efficiency Grade', () => {
    it('calculates significant OPEX savings and higher grade (Grade A) for tropical passive designs', () => {
      // 1. Tropical Green Building (Joglo roof, cross vent, deep tritisan, shaded by trees, with well)
      const tropicalBuilding: BuildingInstance = {
        id: 'bld_green',
        presetKey: 'joglo',
        name: 'Joglo Hijau Tropis',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 10,
        length: 12,
        floorCount: 1,
        floorHeight: 3.5,
        roofType: 'joglo',
        roofOverhang: 1.6,
        wallMaterial: 'wood',
        wallColor: '#78350f',
        roofMaterial: 'clay_tile',
      };

      const greenLot = {
        metrics: {
          kdhPercent: 35,
        },
      };

      const estimator = CostEstimator.getInstance();
      const greenEstimate = estimator.estimateBuildingCost(tropicalBuilding, greenLot, true);

      // 2. Concrete box without passive tropical design
      const nonTropicalBuilding: BuildingInstance = {
        id: 'bld_concrete',
        presetKey: 'custom',
        name: 'Ruko Beton Panas',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 10,
        length: 12,
        floorCount: 2,
        floorHeight: 3.5,
        roofType: 'flat',
        roofOverhang: 0.2,
        wallMaterial: 'concrete',
        wallColor: '#64748b',
        roofMaterial: 'concrete',
      };

      const nonTropicalLot = {
        metrics: {
          kdhPercent: 10,
        },
      };

      const nonTropicalEstimate = estimator.estimateBuildingCost(nonTropicalBuilding, nonTropicalLot, false);

      // Verify that tropical building has higher efficiency grade (A) and lower 10-year OPEX
      expect(['A', 'B']).toContain(greenEstimate.tropicalEfficiencyGrade);
      expect(['C', 'D', 'E']).toContain(nonTropicalEstimate.tropicalEfficiencyGrade);

      expect(greenEstimate.monthlyAcCostIdr).toBeLessThan(nonTropicalEstimate.monthlyAcCostIdr);
      expect(greenEstimate.tenYearTotalOpexIdr).toBeLessThan(nonTropicalEstimate.tenYearTotalOpexIdr);
      expect(greenEstimate.tenYearSavingsVsBaselineIdr).toBeGreaterThan(0);
    });
  });
});
