import { BuildingInstance } from '../buildings/PrefabTypes';
import { RoadManager } from '../roads/RoadManager';
import type { LandscapeManager } from '../world/LandscapeManager';

export interface AdvancedBuildingCodeViolation {
  code: 'HEIGHT_TO_ROAD_WIDTH' | 'EMERGENCY_STAIRS_REQUIRED' | 'RAMP_SLOPE_EXCEEDED' | 'GSS_RIVER_SETBACK';
  title: string;
  message: string;
  measuredValue: number;
  allowableValue: number;
  source: string;
}

export interface AdvancedBuildingCodeConfig {
  heightToRoadWidthRatio: number; // default 1.5 (Permen PUPR / RDTR)
  maxRampSlopePercent: number;    // default 8% (1:12, Permen PUPR 14/2017)
  emergencyStairsFloorThreshold: number; // default 4 floors (Permen PU 26/2008)
  minRiverSetbackM: number;       // default 10.0m (Permen PUPR 28/2015)
}

export class AdvancedBuildingCodeRegistry {
  private static instance: AdvancedBuildingCodeRegistry;

  public config: AdvancedBuildingCodeConfig = {
    heightToRoadWidthRatio: 1.5,
    maxRampSlopePercent: 8.0,
    emergencyStairsFloorThreshold: 4,
    minRiverSetbackM: 10.0
  };

  public sources = {
    heightToRoadWidth: 'Permen PUPR / RDTR (Pencegahan Efek Urban Canyon)',
    rampSlope: 'Permen PUPR No. 14/PRT/M/2017 (Aksesibilitas Bangunan Disabilitas)',
    emergencyStairs: 'Permen PU No. 26/PRT/M/2008 (Persyaratan Teknis Sistem Proteksi Kebakaran)',
    riverSetback: 'Permen PUPR No. 28/PRT/M/2015 (Garis Sempadan Sungai Bertanggul Perkotaan)'
  };

  public static getInstance(): AdvancedBuildingCodeRegistry {
    if (!this.instance) {
      this.instance = new AdvancedBuildingCodeRegistry();
    }
    return this.instance;
  }

  /**
   * Evaluates advanced building regulations against adjacent road width, safety requirements, and river setbacks.
   */
  public evaluateBuilding(
    bld: BuildingInstance,
    roadManager: RoadManager,
    landscapeManager?: LandscapeManager
  ): AdvancedBuildingCodeViolation[] {
    const violations: AdvancedBuildingCodeViolation[] = [];

    const totalHeight = bld.floorCount * (bld.floorHeight || 3.2) + 2.5;

    // 1. Height to Road Width Ratio Check (H <= k * W)
    // Find nearest road edge width
    let nearestRoadWidth = 6.0; // default local road width
    let minDist = Infinity;

    for (const edge of roadManager.graph.edges.values()) {
      const p1 = roadManager.graph.nodes.get(edge.startNodeId)?.position;
      const p2 = roadManager.graph.nodes.get(edge.endNodeId)?.position;
      if (p1 && p2) {
        const midX = (p1.x + p2.x) / 2;
        const midZ = (p1.z + p2.z) / 2;
        const d = Math.hypot(bld.position.x - midX, bld.position.z - midZ);
        if (d < minDist) {
          minDist = d;
          nearestRoadWidth = edge.customProfile?.width || 8.0;
        }
      }
    }

    const maxAllowableHeight = nearestRoadWidth * this.config.heightToRoadWidthRatio;
    if (totalHeight > maxAllowableHeight + 0.1) {
      violations.push({
        code: 'HEIGHT_TO_ROAD_WIDTH',
        title: 'Tinggi Bangunan Melampaui Batas Lebar Jalan',
        message: `Tinggi bangunan (${totalHeight.toFixed(1)} m) melebihi ${this.config.heightToRoadWidthRatio}x lebar jalan (${maxAllowableHeight.toFixed(1)} m). Berpotensi memicu efek urban canyon yang memerangkap panas dan mengaburkan cahaya alami jalan.`,
        measuredValue: Math.round(totalHeight * 10) / 10,
        allowableValue: Math.round(maxAllowableHeight * 10) / 10,
        source: this.sources.heightToRoadWidth
      });
    }

    // 2. Emergency Staircase Requirement for Tall Buildings (>= 4 floors)
    if (bld.floorCount >= this.config.emergencyStairsFloorThreshold) {
      violations.push({
        code: 'EMERGENCY_STAIRS_REQUIRED',
        title: 'Wajib Dilengkapi Tangga Darurat Kebakaran',
        message: `Bangunan bertingkat ${bld.floorCount} lantai wajib memiliki akses tangga darurat terlindung tahan api minimal 2 jam dengan pintu keluar langsung ke ruang terbuka.`,
        measuredValue: bld.floorCount,
        allowableValue: this.config.emergencyStairsFloorThreshold - 1,
        source: this.sources.emergencyStairs
      });
    }

    // 3. Garis Sempadan Sungai (GSS) Check (Permen PUPR No. 28/PRT/M/2015)
    if (landscapeManager) {
      let minDistanceToRiver = Infinity;
      for (const item of landscapeManager.items.values()) {
        if (item.type === 'river_segment') {
          const rW = item.width || 12;
          const rL = item.length || 24;
          const bW = bld.width;
          const bL = bld.length;

          const dx = Math.max(0, Math.abs(bld.position.x - item.position.x) - (rW / 2 + bW / 2));
          const dz = Math.max(0, Math.abs(bld.position.z - item.position.z) - (rL / 2 + bL / 2));
          const edgeDist = Math.hypot(dx, dz);

          if (edgeDist < minDistanceToRiver) {
            minDistanceToRiver = edgeDist;
          }
        }
      }

      if (minDistanceToRiver < this.config.minRiverSetbackM) {
        violations.push({
          code: 'GSS_RIVER_SETBACK',
          title: 'Pelanggaran Garis Sempadan Sungai (GSS)',
          message: `Jarak bangunan ke tepian alur sungai (${minDistanceToRiver.toFixed(1)} m) melanggar batas aman sempadan minimum ${this.config.minRiverSetbackM.toFixed(1)} m (Permen PUPR 28/2015). Berisiko luapan banjir tanggul dan abrasi tebing.`,
          measuredValue: Math.round(minDistanceToRiver * 10) / 10,
          allowableValue: this.config.minRiverSetbackM,
          source: this.sources.riverSetback
        });
      }
    }

    return violations;
  }

  /**
   * Evaluates microclimate cooling & flood risk reduction bonus for maintaining GSS and riparian trees.
   */
  public checkRiverBufferBenefits(
    bld: BuildingInstance,
    landscapeManager?: LandscapeManager
  ): { isSafeGss: boolean; hasShadeTrees: boolean; microclimateBonusC: number; floodRiskBonusPercent: number } {
    if (!landscapeManager) {
      return { isSafeGss: true, hasShadeTrees: false, microclimateBonusC: 0, floodRiskBonusPercent: 0 };
    }

    let minDistanceToRiver = Infinity;
    let nearestRiverPos: { x: number; z: number } | null = null;

    for (const item of landscapeManager.items.values()) {
      if (item.type === 'river_segment') {
        const rW = item.width || 12;
        const rL = item.length || 24;
        const dx = Math.max(0, Math.abs(bld.position.x - item.position.x) - (rW / 2 + bld.width / 2));
        const dz = Math.max(0, Math.abs(bld.position.z - item.position.z) - (rL / 2 + bld.length / 2));
        const dist = Math.hypot(dx, dz);
        if (dist < minDistanceToRiver) {
          minDistanceToRiver = dist;
          nearestRiverPos = { x: item.position.x, z: item.position.z };
        }
      }
    }

    const isNearRiverCorridor = minDistanceToRiver < 50.0;
    const isSafeGss = minDistanceToRiver >= this.config.minRiverSetbackM;

    if (!isNearRiverCorridor || !isSafeGss || !nearestRiverPos) {
      return { isSafeGss, hasShadeTrees: false, microclimateBonusC: 0, floodRiskBonusPercent: 0 };
    }

    // Check for trees planted along the river corridor near this building
    let hasShadeTrees = false;
    for (const item of landscapeManager.items.values()) {
      if (item.type === 'shade_tree') {
        const distToBld = Math.hypot(item.position.x - bld.position.x, item.position.z - bld.position.z);
        const distToRiver = Math.hypot(item.position.x - nearestRiverPos.x, item.position.z - nearestRiverPos.z);
        if (distToBld <= 25.0 && distToRiver <= 25.0) {
          hasShadeTrees = true;
          break;
        }
      }
    }

    if (hasShadeTrees) {
      return {
        isSafeGss: true,
        hasShadeTrees: true,
        microclimateBonusC: -2.0, // Cooling bonus
        floodRiskBonusPercent: 25   // Flood risk reduction
      };
    }

    return { isSafeGss: true, hasShadeTrees: false, microclimateBonusC: 0, floodRiskBonusPercent: 0 };
  }
}

export const advancedBuildingCodeRegistry = AdvancedBuildingCodeRegistry.getInstance();
