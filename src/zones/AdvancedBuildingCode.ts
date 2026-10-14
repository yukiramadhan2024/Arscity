import { BuildingInstance } from '../buildings/PrefabTypes';
import { RoadManager } from '../roads/RoadManager';

export interface AdvancedBuildingCodeViolation {
  code: 'HEIGHT_TO_ROAD_WIDTH' | 'EMERGENCY_STAIRS_REQUIRED' | 'RAMP_SLOPE_EXCEEDED';
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
}

export class AdvancedBuildingCodeRegistry {
  private static instance: AdvancedBuildingCodeRegistry;

  public config: AdvancedBuildingCodeConfig = {
    heightToRoadWidthRatio: 1.5,
    maxRampSlopePercent: 8.0,
    emergencyStairsFloorThreshold: 4
  };

  public sources = {
    heightToRoadWidth: 'Permen PUPR / RDTR (Pencegahan Efek Urban Canyon)',
    rampSlope: 'Permen PUPR No. 14/PRT/M/2017 (Aksesibilitas Bangunan Disabilitas)',
    emergencyStairs: 'Permen PU No. 26/PRT/M/2008 (Persyaratan Teknis Sistem Proteksi Kebakaran)'
  };

  public static getInstance(): AdvancedBuildingCodeRegistry {
    if (!this.instance) {
      this.instance = new AdvancedBuildingCodeRegistry();
    }
    return this.instance;
  }

  /**
   * Evaluates advanced building regulations against adjacent road width and safety requirements.
   */
  public evaluateBuilding(bld: BuildingInstance, roadManager: RoadManager): AdvancedBuildingCodeViolation[] {
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

    return violations;
  }
}

export const advancedBuildingCodeRegistry = AdvancedBuildingCodeRegistry.getInstance();
