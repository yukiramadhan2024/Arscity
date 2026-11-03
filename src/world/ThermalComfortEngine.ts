import * as THREE from 'three';
import { BuildingManager } from '../buildings/BuildingManager';
import { LandscapeManager } from './LandscapeManager';
import { RiverManager } from './RiverManager';
import { LotManager } from '../zones/LotManager';

/**
 * T5.5: Konstanta simulasi kenyamanan termal & mikroklimat tropis.
 * Dicatat dalam VALIDASI.md sebagai model sederhana untuk belajar (Aturan G8).
 */
export interface ThermalComfortConstants {
  baselineTempC: number;           // Suhu dasar khatulistiwa (default 28.0 °C)
  tempIncreasePerFloor: number;    // Pengaruh bangunan: naik 0.35 °C per lantai
  coolingPerTree: number;          // Pengaruh pohon peneduh: turun 1.5 °C
  coolingPerRiver: number;         // Pengaruh koridor sungai: turun 1.8 °C
  buildingInfluenceRadius: number; // Radius pengaruh massa bangunan (25 m)
  treeInfluenceRadius: number;     // Radius naungan pohon (18 m)
  riverInfluenceRadius: number;    // Radius sejuk sungai (35 m)
}

export const DEFAULT_THERMAL_CONSTANTS: ThermalComfortConstants = {
  baselineTempC: 28.0,
  tempIncreasePerFloor: 0.35, // Model sederhana untuk belajar (Aturan G8)
  coolingPerTree: 1.5,        // Model sederhana untuk belajar (Aturan G8)
  coolingPerRiver: 1.8,       // Model sederhana untuk belajar (Aturan G8)
  buildingInfluenceRadius: 25.0,
  treeInfluenceRadius: 18.0,
  riverInfluenceRadius: 35.0,
};

interface SpatialBuildingEntry {
  id: string;
  x: number;
  z: number;
  floors: number;
}

interface SpatialTreeEntry {
  id: string;
  x: number;
  z: number;
}

interface SpatialRiverEntry {
  id: string;
  x: number;
  z: number;
}

/**
 * ThermalComfortEngine: Event-driven microclimate ecology engine.
 * Computes microclimate temperatures only when objects are added, removed, or moved
 * using a 2D spatial hash grid. Evaluates lot grass tinting based on temperature.
 */
export class ThermalComfortEngine {
  public constants: ThermalComfortConstants;
  private buildingManager?: BuildingManager;
  private landscapeManager?: LandscapeManager;
  private riverManager?: RiverManager;
  private lotManager?: LotManager;

  // 2D Spatial Hash Grid (cell size 32m)
  private readonly cellSize = 32;
  private buildingGrid: Map<string, SpatialBuildingEntry[]> = new Map();
  private treeGrid: Map<string, SpatialTreeEntry[]> = new Map();
  private riverGrid: Map<string, SpatialRiverEntry[]> = new Map();

  public lastRecalculateDurationMs: number = 0;
  public totalRecalculateCount: number = 0;

  constructor(
    buildingManager?: BuildingManager,
    landscapeManager?: LandscapeManager,
    riverManager?: RiverManager,
    lotManager?: LotManager,
    constants: Partial<ThermalComfortConstants> = {}
  ) {
    this.buildingManager = buildingManager;
    this.landscapeManager = landscapeManager;
    this.riverManager = riverManager;
    this.lotManager = lotManager;
    this.constants = { ...DEFAULT_THERMAL_CONSTANTS, ...constants };
  }

  public setDependencies(
    buildingManager?: BuildingManager,
    landscapeManager?: LandscapeManager,
    riverManager?: RiverManager,
    lotManager?: LotManager
  ): void {
    if (buildingManager) this.buildingManager = buildingManager;
    if (landscapeManager) this.landscapeManager = landscapeManager;
    if (riverManager) this.riverManager = riverManager;
    if (lotManager) this.lotManager = lotManager;
    this.recalculate();
  }

  public updateConstants(newConstants: Partial<ThermalComfortConstants>): void {
    this.constants = { ...this.constants, ...newConstants };
    this.recalculate();
  }

  private getCellKey(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx}_${cz}`;
  }

  private getNeighborKeys(x: number, z: number, radius: number): string[] {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCz = Math.floor((z - radius) / this.cellSize);
    const maxCz = Math.floor((z + radius) / this.cellSize);

    const keys: string[] = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        keys.push(`${cx}_${cz}`);
      }
    }
    return keys;
  }

  /**
   * Rebuilds the 2D spatial hash grid from all current buildings, trees, and river segments.
   */
  public rebuildSpatialIndex(): void {
    this.buildingGrid.clear();
    this.treeGrid.clear();
    this.riverGrid.clear();

    // 1. Index buildings
    if (this.buildingManager) {
      for (const bld of this.buildingManager.buildings.values()) {
        const entry: SpatialBuildingEntry = {
          id: bld.id,
          x: bld.position.x,
          z: bld.position.z,
          floors: Math.max(1, bld.floorCount || 1),
        };
        const key = this.getCellKey(entry.x, entry.z);
        let list = this.buildingGrid.get(key);
        if (!list) {
          list = [];
          this.buildingGrid.set(key, list);
        }
        list.push(entry);
      }
    }

    // 2. Index trees (shade trees, fruit trees, tropical trees)
    if (this.landscapeManager) {
      for (const item of this.landscapeManager.items.values()) {
        const isTree =
          item.type === 'tree' ||
          item.type === 'shade_tree' ||
          item.type.startsWith('tree_');

        if (isTree) {
          const entry: SpatialTreeEntry = {
            id: item.id,
            x: item.position.x,
            z: item.position.z,
          };
          const key = this.getCellKey(entry.x, entry.z);
          let list = this.treeGrid.get(key);
          if (!list) {
            list = [];
            this.treeGrid.set(key, list);
          }
          list.push(entry);
        }
      }
    }

    // 3. Index river channel curve points (sampled every ~10m along bezier)
    if (this.riverManager) {
      for (const seg of this.riverManager.segments.values()) {
        if (!seg.controlPoints || seg.controlPoints.length === 0) continue;
        const sampleCount = Math.max(2, Math.ceil((seg.length || 20) / 10));
        for (let i = 0; i <= sampleCount; i++) {
          const pt = this.riverManager.sampleBezier(seg.controlPoints, i / sampleCount);
          const entry: SpatialRiverEntry = {
            id: seg.id,
            x: pt.x,
            z: pt.z,
          };
          const key = this.getCellKey(entry.x, entry.z);
          let list = this.riverGrid.get(key);
          if (!list) {
            list = [];
            this.riverGrid.set(key, list);
          }
          list.push(entry);
        }
      }
    }
  }

  /**
   * Evaluates the microclimate temperature at coordinate (x, z) in Celsius.
   * Uses spatial hash lookup:
   * - Building effect: +0.35 °C per floor (linear falloff within 25m)
   * - Tree effect: -1.5 °C per tree (linear falloff within 18m)
   * - River effect: -1.8 °C per river segment point (linear falloff within 35m)
   */
  public evaluateTemperatureAt(x: number, z: number): number {
    let temp = this.constants.baselineTempC;

    // 1. Building warming effect
    const bldKeys = this.getNeighborKeys(x, z, this.constants.buildingInfluenceRadius);
    for (const key of bldKeys) {
      const entries = this.buildingGrid.get(key);
      if (!entries) continue;
      for (const bld of entries) {
        const dist = Math.hypot(bld.x - x, bld.z - z);
        if (dist <= this.constants.buildingInfluenceRadius) {
          const falloff = 1.0 - dist / this.constants.buildingInfluenceRadius;
          temp += bld.floors * this.constants.tempIncreasePerFloor * falloff;
        }
      }
    }

    // 2. Shade tree cooling effect
    const treeKeys = this.getNeighborKeys(x, z, this.constants.treeInfluenceRadius);
    for (const key of treeKeys) {
      const entries = this.treeGrid.get(key);
      if (!entries) continue;
      for (const tree of entries) {
        const dist = Math.hypot(tree.x - x, tree.z - z);
        if (dist <= this.constants.treeInfluenceRadius) {
          const falloff = 1.0 - dist / this.constants.treeInfluenceRadius;
          temp -= this.constants.coolingPerTree * falloff;
        }
      }
    }

    // 3. River cooling effect
    const riverKeys = this.getNeighborKeys(x, z, this.constants.riverInfluenceRadius);
    let nearestRiverDist = Infinity;
    for (const key of riverKeys) {
      const entries = this.riverGrid.get(key);
      if (!entries) continue;
      for (const pt of entries) {
        const dist = Math.hypot(pt.x - x, pt.z - z);
        if (dist < nearestRiverDist) {
          nearestRiverDist = dist;
        }
      }
    }
    if (nearestRiverDist <= this.constants.riverInfluenceRadius) {
      const falloff = 1.0 - nearestRiverDist / this.constants.riverInfluenceRadius;
      temp -= this.constants.coolingPerRiver * falloff;
    }

    // Format to 2 decimal places
    return parseFloat(temp.toFixed(2));
  }

  /**
   * Recalculates microclimate temperature event-driven across the city
   * and updates parcel grass tinting:
   * - Sejuk (<= 27.5 °C): Segar hijau (#22c55e)
   * - Sedang (27.5 °C - 29.0 °C): Hijau standar (#65a30d)
   * - Gersang (> 29.0 °C): Agak kekuningan gersang (#d97706)
   */
  public recalculate(): void {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

    this.rebuildSpatialIndex();

    if (this.lotManager) {
      for (const lot of this.lotManager.lots.values()) {
        const temp = this.evaluateTemperatureAt(lot.position.x, lot.position.z);
        if (!lot.userData) lot.userData = {};
        lot.userData.microclimateTempC = temp;

        // Rona rumput kavling
        let grassColor: number;
        if (temp <= 27.5) {
          grassColor = 0x22c55e; // Hijau segar sejuk
        } else if (temp <= 29.0) {
          grassColor = 0x65a30d; // Hijau sedang alami
        } else {
          grassColor = 0xd97706; // Agak kekuningan gersang
        }

        lot.userData.grassColorHexInt = grassColor;
        this.lotManager.rebuildLotMesh(lot);
      }
    }

    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.lastRecalculateDurationMs = t1 - t0;
    this.totalRecalculateCount++;
  }
}
