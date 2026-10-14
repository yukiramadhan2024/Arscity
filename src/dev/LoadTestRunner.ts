import * as THREE from 'three';
import type { Engine } from '../core/engine/Engine';
import { PREFAB_CATALOG, BuildingInstance } from '../buildings/PrefabTypes';
import { RoadType } from '../roads/RoadTypes';

export interface BenchmarkMetrics {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  buildingCount: number;
  roadKm: number;
}

export class LoadTestRunner {
  private static benchmarkBuildingIds: string[] = [];
  private static benchmarkRoadEdgeIds: string[] = [];
  public static isBenchmarkActive: boolean = false;

  /**
   * Generates a high-density urban benchmark:
   * - Exactly 300 architectural buildings (diverse presets: houses, shophouses, towers, civic)
   * - Exactly 3.0 km of roads with trees and streetlights
   */
  public static generateBenchmarkCity(engine: Engine): BenchmarkMetrics {
    this.clearBenchmarkCity(engine);

    // 1. Generate 3.0 km of Road Grid
    // 6 horizontal roads of length 300m (-150 to +150) = 1,800 m
    // 4 vertical roads of length 300m (-150 to +150) = 1,200 m
    // Total = 3,000 m = 3.0 km
    const hZs = [-125, -75, -25, 25, 75, 125]; // 6 streets
    for (let i = 0; i < hZs.length; i++) {
      const z = hZs[i];
      const roadType: RoadType = i % 2 === 0 ? 'collector' : 'local';
      const edge = engine.roadManager.addRoad(
        new THREE.Vector3(-150, 0, z),
        new THREE.Vector3(150, 0, z),
        roadType
      );
      if (edge) this.benchmarkRoadEdgeIds.push(edge.id);
    }

    const vXs = [-75, -25, 25, 75]; // 4 avenues
    for (let i = 0; i < vXs.length; i++) {
      const x = vXs[i];
      const roadType: RoadType = i % 2 === 0 ? 'arterial' : 'collector';
      const edge = engine.roadManager.addRoad(
        new THREE.Vector3(x, 0, -150),
        new THREE.Vector3(x, 0, 150),
        roadType
      );
      if (edge) this.benchmarkRoadEdgeIds.push(edge.id);
    }

    // 2. Generate 300 Buildings
    const presetKeys = Object.keys(PREFAB_CATALOG);
    let buildingCount = 0;
    const targetBuildingCount = 300;

    // Distribute buildings inside blocks between roads
    // Block x ranges: [-140, -85], [-65, -35], [-15, 15], [35, 65], [85, 140]
    // Block z ranges: [-115, -85], [-65, -35], [-15, 15], [35, 65], [85, 115]
    const blockXSpans: [number, number][] = [
      [-135, -90],
      [-65, -35],
      [-15, 15],
      [35, 65],
      [90, 135]
    ];
    const blockZSpans: [number, number][] = [
      [-115, -85],
      [-65, -35],
      [-15, 15],
      [35, 65],
      [85, 115]
    ];

    for (const [bx0, bx1] of blockXSpans) {
      for (const [bz0, bz1] of blockZSpans) {
        if (buildingCount >= targetBuildingCount) break;

        // Place a small sub-grid of 12 buildings per block
        const cols = 3;
        const rows = 4;
        const dx = (bx1 - bx0) / cols;
        const dz = (bz1 - bz0) / rows;

        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            if (buildingCount >= targetBuildingCount) break;

            const posX = bx0 + (c + 0.5) * dx;
            const posZ = bz0 + (r + 0.5) * dz;

            const presetKey = presetKeys[buildingCount % presetKeys.length];
            const preset = PREFAB_CATALOG[presetKey];
            const rot = ((c + r) % 4) * (Math.PI / 2);

            const bId = `bench_bld_${buildingCount + 1}`;
            const instance: BuildingInstance = {
              id: bId,
              presetKey: preset.key,
              name: `${preset.name} #${buildingCount + 1}`,
              category: preset.category,
              position: new THREE.Vector3(posX, 0, posZ),
              rotationY: rot,
              width: preset.defaultWidth,
              length: preset.defaultLength,
              floorCount: preset.defaultFloorCount,
              floorHeight: preset.floorHeight,
              roofType: preset.defaultRoofType,
              roofOverhang: preset.defaultRoofOverhang,
              wallMaterial: preset.defaultWallMaterial,
              wallColor: preset.defaultWallColor,
              roofMaterial: preset.defaultRoofMaterial
            };

            engine.buildingManager.addBuilding(instance);
            this.benchmarkBuildingIds.push(bId);
            buildingCount++;
          }
        }
      }
    }

    this.isBenchmarkActive = true;
    return this.getMetrics(engine);
  }

  /**
   * Cleanly disposes and clears all benchmark assets
   */
  public static clearBenchmarkCity(engine: Engine): void {
    for (const bId of this.benchmarkBuildingIds) {
      engine.buildingManager.removeBuilding(bId);
    }
    this.benchmarkBuildingIds = [];

    for (const rId of this.benchmarkRoadEdgeIds) {
      engine.roadManager.removeRoad(rId);
    }
    this.benchmarkRoadEdgeIds = [];

    this.isBenchmarkActive = false;
  }

  /**
   * Fetches real-time performance telemetry directly from WebGL renderer
   */
  public static getMetrics(engine: Engine): BenchmarkMetrics {
    const stats = engine.getPerformanceStats();
    return {
      fps: stats.fps,
      drawCalls: stats.drawCalls,
      triangles: stats.triangles,
      geometries: stats.geometries,
      textures: stats.textures,
      programs: stats.programs,
      buildingCount: engine.buildingManager.buildings.size,
      roadKm: parseFloat(engine.roadManager.graph.getTotalLengthKm().toFixed(2))
    };
  }
}
