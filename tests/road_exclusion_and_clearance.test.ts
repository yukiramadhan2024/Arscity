import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RoadManager } from '../src/roads/RoadManager';
import { LandscapeManager, LandscapeItem } from '../src/world/LandscapeManager';
import { LotManager } from '../src/zones/LotManager';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { createMalioboroMapData } from '../src/world/MalioboroPreset';

describe('Road Exclusion & Auto-Clearance Logic System', () => {
  it('TAHAP 1: getNearestRoadSample and isPointOnRoadAsphalt detect asphalt vs sidewalk vs outer zone accurately', () => {
    const scene = new THREE.Scene();
    const roadManager = new RoadManager(scene);

    // Create a straight arterial road along Z-axis (width: 26m, sidewalk: 5.5m)
    // Asphalt half-width: 13m. Corridor half-width: 18.5m.
    const edge = roadManager.addRoad(
      new THREE.Vector3(0, 0, -100),
      new THREE.Vector3(0, 0, 100),
      'arterial'
    );
    expect(edge).toBeDefined();

    // 1. Centerline query (0, 0)
    const sampleCenter = roadManager.getNearestRoadSample(new THREE.Vector2(0, 0));
    expect(sampleCenter).toBeDefined();
    expect(sampleCenter?.distance).toBeCloseTo(0, 2);
    expect(sampleCenter?.asphaltHalfWidth).toBe(13);
    expect(sampleCenter?.corridorHalfWidth).toBe(18.5);

    // 2. Point on asphalt (x = 8m, z = 10m -> distance 8m < 13m + 0.6m)
    expect(roadManager.isPointOnRoadAsphalt(8, 10, 0.6)).toBe(true);

    // 3. Point near asphalt boundary inside safety margin (x = 13.4m -> distance 13.4m < 13m + 0.6m)
    expect(roadManager.isPointOnRoadAsphalt(13.4, 0, 0.6)).toBe(true);

    // 4. Point on sidewalk (x = 16m -> distance 16m > 13.6m)
    expect(roadManager.isPointOnRoadAsphalt(16, 0, 0.6)).toBe(false);

    // 5. Point far outside corridor (x = 30m)
    expect(roadManager.isPointOnRoadAsphalt(30, 0, 0.6)).toBe(false);
  });

  it('TAHAP 1: isFootprintOverlappingRoad detects polygon intersections with road corridor', () => {
    const scene = new THREE.Scene();
    const roadManager = new RoadManager(scene);

    // Arterial road along Z: corridorHalfWidth = 18.5m
    roadManager.addRoad(
      new THREE.Vector3(0, 0, -100),
      new THREE.Vector3(0, 0, 100),
      'arterial'
    );

    // Footprint A: centered at (0, 0), size 10x10 -> inside road
    const footprintOnRoad = [
      new THREE.Vector2(-5, -5),
      new THREE.Vector2(5, -5),
      new THREE.Vector2(5, 5),
      new THREE.Vector2(-5, 5)
    ];
    expect(roadManager.isFootprintOverlappingRoad(footprintOnRoad, 0.5)).toBe(true);

    // Footprint B: centered at (30, 0), size 10x10 -> corners at x = 25m > 18.5m + 0.5m
    const footprintFar = [
      new THREE.Vector2(25, -5),
      new THREE.Vector2(35, -5),
      new THREE.Vector2(35, 5),
      new THREE.Vector2(25, 5)
    ];
    expect(roadManager.isFootprintOverlappingRoad(footprintFar, 0.5)).toBe(false);

    // Footprint C: centered at (20, 0), size 10x10 -> corners at x = 15m < 19m
    const footprintOverlappingCorridor = [
      new THREE.Vector2(15, -5),
      new THREE.Vector2(25, -5),
      new THREE.Vector2(25, 5),
      new THREE.Vector2(15, 5)
    ];
    expect(roadManager.isFootprintOverlappingRoad(footprintOverlappingCorridor, 0.5)).toBe(true);
  });

  it('TAHAP 2: MalioboroPreset has exactly 0 objects (trees, lights, benches, lots, buildings) on road asphalt', () => {
    const data = createMalioboroMapData();
    const scene = new THREE.Scene();
    const roadManager = new RoadManager(scene);

    // Populate road graph from preset
    for (const node of data.roads.nodes) {
      roadManager.graph.nodes.set(node.id, {
        id: node.id,
        position: new THREE.Vector3(node.x, node.y, node.z),
        connectedEdgeIds: []
      });
    }
    for (const edge of data.roads.edges) {
      const sNode = roadManager.graph.nodes.get(edge.startNodeId);
      const eNode = roadManager.graph.nodes.get(edge.endNodeId);
      if (sNode && eNode) {
        roadManager.addRoad(sNode.position, eNode.position, edge.type);
      }
    }

    // 1. Audit all landscape items: must have 0 items on road asphalt
    const landscapeOnAsphalt: any[] = [];
    for (const item of data.landscape || []) {
      const px = Array.isArray(item.position) ? item.position[0] : (item.position as any).x;
      const pz = Array.isArray(item.position) ? item.position[2] : (item.position as any).z;
      if (roadManager.isPointOnRoadAsphalt(px, pz, 0)) {
        landscapeOnAsphalt.push({ id: item.id, px, pz });
      }
    }
    expect(landscapeOnAsphalt).toHaveLength(0);

    // 2. Audit all buildings: center and footprint corners must NOT be on road asphalt
    const buildingsOnAsphalt: string[] = [];
    for (const bld of data.buildings) {
      const bx = Array.isArray(bld.position) ? bld.position[0] : (bld.position as any).x;
      const bz = Array.isArray(bld.position) ? bld.position[2] : (bld.position as any).z;
      if (roadManager.isPointOnRoadAsphalt(bx, bz, 0)) {
        buildingsOnAsphalt.push(bld.id);
      }
    }
    expect(buildingsOnAsphalt).toHaveLength(0);

    // 3. Audit all lots: center must NOT be on road asphalt
    const lotsOnAsphalt: string[] = [];
    for (const lot of data.lots) {
      const lx = Array.isArray(lot.position) ? lot.position[0] : (lot.position as any).x;
      const lz = Array.isArray(lot.position) ? lot.position[2] : (lot.position as any).z;
      if (roadManager.isPointOnRoadAsphalt(lx, lz, 0)) {
        lotsOnAsphalt.push(lot.id);
      }
    }
    expect(lotsOnAsphalt).toHaveLength(0);
  });

  it('TAHAP 3: enforceRoadClearance automatically relocates landscape trees to sidewalk when road is widened', () => {
    const scene = new THREE.Scene();
    const roadManager = new RoadManager(scene);
    const landscapeManager = new LandscapeManager(scene);
    const buildingManager = new BuildingManager(scene);
    const lotManager = new LotManager(scene, buildingManager);
    roadManager.setDependencies(landscapeManager, lotManager, buildingManager);

    // 1. Start with a local street (width: 8m, asphaltHalfWidth: 4m, sidewalk: 2m)
    const road = roadManager.addRoad(
      new THREE.Vector3(0, 0, -60),
      new THREE.Vector3(0, 0, 60),
      'local'
    );
    expect(road).toBeDefined();

    // 2. Place a tree at (x = 5.5m, z = 0m), which is safely on sidewalk for local road (5.5 > 4.0)
    const treeItem: LandscapeItem = {
      id: 'test_tree_1',
      type: 'tree_tabebuya_pink',
      position: new THREE.Vector3(5.5, 0, 0),
      radius: 3.0
    };
    landscapeManager.addItem(treeItem);
    expect(roadManager.isPointOnRoadAsphalt(5.5, 0, 0.6)).toBe(false);

    // 3. Upgrade / widen road to arterial (width: 26m, asphaltHalfWidth: 13m, sidewalk: 5.5m)
    road!.type = 'arterial';
    roadManager.rebuildEdgeMesh(road!.id);

    // Now (5.5, 0) is right in the middle of vehicular asphalt!
    expect(roadManager.isPointOnRoadAsphalt(5.5, 0, 0.6)).toBe(true);

    // 4. Run enforceRoadClearance()
    roadManager.enforceRoadClearance(landscapeManager, lotManager, buildingManager);

    // 5. Verify the tree was shifted outside asphalt onto sidewalk along normal vector (+X)
    const updatedTree = landscapeManager.items.get('test_tree_1');
    expect(updatedTree).toBeDefined();
    expect(updatedTree!.position.x).toBeGreaterThanOrEqual(13.0); // Outside asphalt half-width
    expect(roadManager.isPointOnRoadAsphalt(updatedTree!.position.x, updatedTree!.position.z, 0.6)).toBe(false);
  });

  it('TAHAP 3: enforceRoadClearance evicts items placed in intersection centers', () => {
    const scene = new THREE.Scene();
    const roadManager = new RoadManager(scene);
    const landscapeManager = new LandscapeManager(scene);
    const buildingManager = new BuildingManager(scene);
    const lotManager = new LotManager(scene, buildingManager);
    roadManager.setDependencies(landscapeManager, lotManager, buildingManager);

    // Create an intersection of North-South and East-West roads at (0, 0, 0)
    const r1 = roadManager.addRoad(new THREE.Vector3(0, 0, -50), new THREE.Vector3(0, 0, 50), 'collector');
    const r2 = roadManager.addRoad(new THREE.Vector3(-50, 0, 0), new THREE.Vector3(50, 0, 0), 'collector');
    expect(r1).toBeDefined();
    expect(r2).toBeDefined();

    // Place an illegal bench in the exact center of intersection (0, 0, 0)
    const benchItem: LandscapeItem = {
      id: 'bench_in_intersection',
      type: 'street_malioboro_bollards',
      position: new THREE.Vector3(0, 0, 0)
    };
    landscapeManager.addItem(benchItem);

    // Run enforceRoadClearance
    roadManager.enforceRoadClearance(landscapeManager, lotManager, buildingManager);

    // Should be evicted/disposed cleanly
    const found = landscapeManager.items.get('bench_in_intersection');
    expect(found).toBeUndefined();
  });
});
