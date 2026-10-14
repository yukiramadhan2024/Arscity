import * as THREE from 'three';
import { Engine } from '../core/engine/Engine';
import { RoadManager } from '../roads/RoadManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { LandscapeManager } from '../world/LandscapeManager';
import { LotManager } from '../zones/LotManager';

export interface PublicFacilityCoverage {
  buildingId: string;
  name: string;
  position: THREE.Vector3;
  type: 'school' | 'mosque' | 'puskesmas' | 'retail';
  coverageRadiusM: number;
}

export interface CityUrbanScore {
  walkabilityPercent: number;        // Percentage of residences within 400m of essential facilities
  greenSpaceRatioPercent: number;    // RTH Kota % (Target 30% per UU No. 26/2007)
  isGreenSpaceTargetMet: boolean;
  surfaceHeatIslandIndex: number;    // Surface heat index (°C relative delta)
  roadConnectivityRatio: number;     // Ratio of connected junctions vs cul-de-sacs
  overallSustainabilityScore: number; // 0 to 100
  facilities: PublicFacilityCoverage[];
}

export interface CityScoreSettings {
  walkabilityRadiusM: number;       // default 400 m
  targetGreenSpacePercent: number;  // default 30 % (UU 26/2007)
}

export class CityScoreAnalyzer {
  private static instance: CityScoreAnalyzer;

  public settings: CityScoreSettings = {
    walkabilityRadiusM: 400.0,
    targetGreenSpacePercent: 30.0
  };

  public static getInstance(): CityScoreAnalyzer {
    if (!this.instance) {
      this.instance = new CityScoreAnalyzer();
    }
    return this.instance;
  }

  /**
   * Evaluates overall city metrics: 400m walkability, RTH (green space ratio), UHI heat index, and connectivity.
   */
  public evaluateCity(
    buildingManager: BuildingManager,
    roadManager: RoadManager,
    landscapeManager: LandscapeManager,
    _lotManager: LotManager
  ): CityUrbanScore {
    // 1. Identify public facilities
    const facilities: PublicFacilityCoverage[] = [];
    const residentialPositions: THREE.Vector3[] = [];

    for (const bld of buildingManager.buildings.values()) {
      if (bld.presetKey === 'school') {
        facilities.push({ buildingId: bld.id, name: bld.name, position: bld.position, type: 'school', coverageRadiusM: this.settings.walkabilityRadiusM });
      } else if (bld.presetKey === 'mosque') {
        facilities.push({ buildingId: bld.id, name: bld.name, position: bld.position, type: 'mosque', coverageRadiusM: this.settings.walkabilityRadiusM });
      } else if (bld.presetKey === 'puskesmas') {
        facilities.push({ buildingId: bld.id, name: bld.name, position: bld.position, type: 'puskesmas', coverageRadiusM: this.settings.walkabilityRadiusM });
      } else if (bld.presetKey === 'minimarket' || bld.presetKey === 'ruko_3fl') {
        facilities.push({ buildingId: bld.id, name: bld.name, position: bld.position, type: 'retail', coverageRadiusM: this.settings.walkabilityRadiusM });
      } else {
        residentialPositions.push(bld.position);
      }
    }

    // Calculate Walkability %
    let coveredResidences = 0;
    for (const resPos of residentialPositions) {
      const isNearFacility = facilities.some(f => {
        const dist = new THREE.Vector2(resPos.x - f.position.x, resPos.z - f.position.z).length();
        return dist <= this.settings.walkabilityRadiusM;
      });
      if (isNearFacility) coveredResidences++;
    }

    const walkabilityPercent = residentialPositions.length > 0
      ? Math.round((coveredResidences / residentialPositions.length) * 100)
      : (facilities.length > 0 ? 100 : 0);

    // 2. Calculate Green Space Ratio (RTH Kota)
    let totalBuiltFootprintM2 = 0;
    for (const bld of buildingManager.buildings.values()) {
      totalBuiltFootprintM2 += (bld.width * bld.length);
    }

    let roadAreaM2 = 0;
    for (const edge of roadManager.graph.edges.values()) {
      const w = edge.customProfile?.width || 8.0;
      roadAreaM2 += (edge.length || 0) * w;
    }

    let greenAreaM2 = 0;
    for (const item of landscapeManager.items.values()) {
      if (item.type === 'grass_garden') {
        greenAreaM2 += (item.width || 4) * (item.length || 4);
      } else if (item.type === 'shade_tree') {
        const r = item.radius || 2.5;
        greenAreaM2 += Math.PI * r * r;
      }
    }

    const totalDevelopedAreaM2 = Math.max(1000, totalBuiltFootprintM2 + roadAreaM2 + greenAreaM2);
    const greenSpaceRatioPercent = Math.min(100, Math.round((greenAreaM2 / totalDevelopedAreaM2) * 100));
    const isGreenSpaceTargetMet = greenSpaceRatioPercent >= this.settings.targetGreenSpacePercent;

    // 3. Surface Urban Heat Island (UHI) Index (°C delta)
    // Dark asphalt & roofs trap heat; tree canopy & grass provide cooling
    const heatLoad = (totalBuiltFootprintM2 * 0.85 + roadAreaM2 * 1.1) / totalDevelopedAreaM2;
    const coolLoad = (greenAreaM2 * 1.5) / totalDevelopedAreaM2;
    const surfaceHeatIslandIndex = Math.round((heatLoad * 4.0 - coolLoad * 3.5 + 28.5) * 10) / 10;

    // 4. Road Connectivity Ratio
    let junctions = 0;
    let deadEnds = 0;
    for (const node of roadManager.graph.nodes.values()) {
      if (node.connectedEdgeIds.length >= 3) junctions++;
      else if (node.connectedEdgeIds.length === 1) deadEnds++;
    }
    const roadConnectivityRatio = (deadEnds + junctions) > 0
      ? Math.round((junctions / Math.max(1, deadEnds + junctions)) * 100) / 100
      : 1.0;

    // 5. Overall Sustainability Score
    let score = Math.round(
      (walkabilityPercent * 0.35) +
      (Math.min(100, (greenSpaceRatioPercent / this.settings.targetGreenSpacePercent) * 100) * 0.40) +
      (Math.min(100, roadConnectivityRatio * 100) * 0.25)
    );
    score = Math.max(10, Math.min(100, score));

    return {
      walkabilityPercent,
      greenSpaceRatioPercent,
      isGreenSpaceTargetMet,
      surfaceHeatIslandIndex,
      roadConnectivityRatio,
      overallSustainabilityScore: score,
      facilities
    };
  }
}

export const cityScoreAnalyzer = CityScoreAnalyzer.getInstance();
