import * as THREE from 'three';
import { Engine } from '../core/engine/Engine';
import { RoadManager } from '../roads/RoadManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { LandscapeManager } from '../world/LandscapeManager';
import { LotManager } from '../zones/LotManager';
import { BuildingCatalogRegistry } from '../buildings/BuildingCatalogRegistry';

export interface PublicFacilityCoverage {
  buildingId: string;
  name: string;
  position: THREE.Vector3;
  type: 'school' | 'mosque' | 'puskesmas' | 'retail';
  coverageRadiusM: number;
}

export interface CityUrbanScore {
  walkabilityPercent: number;        // Percentage of residences within 400m of essential facilities via road network
  greenSpaceRatioPercent: number;    // RTH Kota % (Target 30% per UU No. 26/2007)
  isGreenSpaceTargetMet: boolean;
  surfaceHeatIslandIndex: number;    // Surface heat index (°C relative delta)
  roadConnectivityRatio: number;     // Ratio of connected junctions vs cul-de-sacs
  overallSustainabilityScore: number; // 0 to 100
  aestheticScoreBonus?: number;       // Bonus up to +15 poin for placemaking elements
  facilities: PublicFacilityCoverage[];
  isolatedBuildingIds: string[];    // Buildings with no road access within 50m
  isolatedLotIds: string[];         // Lots with no road access within 50m
  reachableEdgeIds: string[];        // Edges within 400m walk network of public facilities
}

export interface CityScoreSettings {
  walkabilityRadiusM: number;       // default 400 m (Permen PU 03/2014)
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
   * Evaluates overall city metrics: 400m walkability via road network, RTH (green space ratio),
   * UHI heat index, and connectivity.
   */
  public evaluateCity(
    buildingManager: BuildingManager,
    roadManager: RoadManager,
    landscapeManager: LandscapeManager,
    lotManager?: LotManager
  ): CityUrbanScore {
    // 1. Identify public facilities
    const facilities: PublicFacilityCoverage[] = [];
    const residentialBuildings: { id: string; position: THREE.Vector3 }[] = [];
    const isolatedBuildingIds: string[] = [];
    const isolatedLotIds: string[] = [];
    const reachableEdgeSet = new Set<string>();

    for (const bld of buildingManager.buildings.values()) {
      if (bld.presetKey === 'school') {
        facilities.push({ buildingId: bld.id, name: bld.name, position: bld.position, type: 'school', coverageRadiusM: this.settings.walkabilityRadiusM });
      } else if (bld.presetKey === 'mosque') {
        facilities.push({ buildingId: bld.id, name: bld.name, position: bld.position, type: 'mosque', coverageRadiusM: this.settings.walkabilityRadiusM });
      } else if (bld.presetKey === 'puskesmas' || bld.presetKey === 'apotek_klinik_24jam') {
        facilities.push({ buildingId: bld.id, name: bld.name, position: bld.position, type: 'puskesmas', coverageRadiusM: this.settings.walkabilityRadiusM });
      } else if (
        bld.presetKey === 'minimarket' ||
        bld.presetKey === 'ruko_3fl' ||
        bld.presetKey === 'community_hall' ||
        (bld.presetKey && BuildingCatalogRegistry.isPublicAmenity(bld.presetKey))
      ) {
        facilities.push({ buildingId: bld.id, name: bld.name, position: bld.position, type: 'retail', coverageRadiusM: this.settings.walkabilityRadiusM });
      } else {
        residentialBuildings.push({ id: bld.id, position: bld.position });
      }
    }

    // Collect road edges reachable within 400m from each facility along network
    if (typeof roadManager.graph?.getReachableEdges === 'function') {
      for (const fac of facilities) {
        const edges = roadManager.graph.getReachableEdges(fac.position, this.settings.walkabilityRadiusM);
        for (const eId of edges) reachableEdgeSet.add(eId);
      }
    }

    // Check road connectivity and walkability for residential buildings
    let coveredResidences = 0;
    for (const res of residentialBuildings) {
      if (typeof roadManager.graph?.findNearestNode === 'function') {
        const nearestNode = roadManager.graph.findNearestNode(res.position, 50.0);
        if (!nearestNode) {
          isolatedBuildingIds.push(res.id);
          continue;
        }
      }

      // Check walkability to any facility along connected road network
      let isCovered = false;
      for (const fac of facilities) {
        if (typeof roadManager.graph?.getNetworkWalkDistance === 'function') {
          const walkDist = roadManager.graph.getNetworkWalkDistance(fac.position, res.position, this.settings.walkabilityRadiusM);
          if (walkDist !== null && walkDist <= this.settings.walkabilityRadiusM) {
            isCovered = true;
            break;
          }
        } else {
          // Fallback to Euclidean distance if graph pathfinding methods are not mocked
          const dist = new THREE.Vector2(res.position.x - fac.position.x, res.position.z - fac.position.z).length();
          if (dist <= this.settings.walkabilityRadiusM) {
            isCovered = true;
            break;
          }
        }
      }

      if (isCovered) {
        coveredResidences++;
      }
    }

    // Check isolated lots
    if (lotManager) {
      for (const lot of lotManager.lots.values()) {
        if (typeof roadManager.graph?.findNearestNode === 'function') {
          const nearest = roadManager.graph.findNearestNode(lot.position, 50.0);
          if (!nearest) {
            isolatedLotIds.push(lot.id);
          }
        }
      }
    }

    const walkabilityPercent = residentialBuildings.length > 0
      ? Math.round((coveredResidences / residentialBuildings.length) * 100)
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
    let aestheticScoreBonus = 0;
    for (const item of landscapeManager.items.values()) {
      if (item.type === 'grass_garden' || item.type === 'bioswale_channel' || item.type === 'river_segment') {
        greenAreaM2 += (item.width || 4) * (item.length || 4);
      } else if (item.type === 'shade_tree' || item.type.startsWith('tree_') || item.type.startsWith('flora_')) {
        const r = item.radius || 3.0;
        greenAreaM2 += Math.PI * r * r;
      } else if (item.type === 'retention_pond' || item.type === 'fountain_reflecting_pool' || item.type === 'waterfront_wood_deck' || item.type === 'pavilion_garden_gazebo') {
        greenAreaM2 += (item.width || 6) * (item.length || 6) * 0.5;
      }

      // Placemaking & Visual Quality bonus (Statues, Tugu, Amphitheater, Malioboro bollards/benches, Pergolas, etc.)
      if (
        item.type === 'monument_tugu_jogja' ||
        item.type === 'sculpture_kinetic_steel' ||
        item.type === 'sculpture_candi_stone' ||
        item.type === 'sculpture_wayang_corten' ||
        item.type === 'fountain_reflecting_pool' ||
        item.type === 'monument_clock_tower' ||
        item.type === 'plaza_mini_amphitheater' ||
        item.type === 'street_malioboro_bollards' ||
        item.type === 'street_timber_pergola' ||
        item.type === 'gate_candi_bentar' ||
        item.type === 'bridge_green_pedestrian' ||
        item.type === 'street_festoon_lights' ||
        item.type === 'waterfront_wood_deck'
      ) {
        aestheticScoreBonus += 2.5;
      }
    }
    aestheticScoreBonus = Math.min(15, Math.round(aestheticScoreBonus));

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
      (Math.min(100, roadConnectivityRatio * 100) * 0.25) +
      aestheticScoreBonus
    );
    score = Math.max(10, Math.min(100, score));

    return {
      walkabilityPercent,
      greenSpaceRatioPercent,
      isGreenSpaceTargetMet,
      surfaceHeatIslandIndex,
      roadConnectivityRatio,
      overallSustainabilityScore: score,
      aestheticScoreBonus,
      facilities,
      isolatedBuildingIds,
      isolatedLotIds,
      reachableEdgeIds: Array.from(reachableEdgeSet)
    };
  }
}

export const cityScoreAnalyzer = CityScoreAnalyzer.getInstance();
