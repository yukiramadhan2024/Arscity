import * as THREE from 'three';
import { BuildingInstance } from '../buildings/PrefabTypes';
import { BuildingManager } from '../buildings/BuildingManager';
import { RoadManager } from '../roads/RoadManager';
import { LandscapeManager } from '../world/LandscapeManager';
import { LotManager } from '../zones/LotManager';
import { BuildingCatalogRegistry } from '../buildings/BuildingCatalogRegistry';
import { InteriorInteractiveSystem } from '../buildings/InteriorInteractiveSystem';

export interface BuildingAcousticReport {
  buildingId: string;
  receivedNoiseDba: number;
  indoorNoiseDba: number;
  status: 'calm' | 'moderate' | 'noisy';
  statusLabel: string;
  statusColor: string; // #34C759, #FF9500, #FF3B30
  primaryNoiseSource: string;
  roadNoiseContributionDba: number;
  activityNoiseContributionDba: number;
  gsbAttenuationDba: number;
  treeBufferDba: number;
  facadeDampingDba: number;
  hasVentilationNoiseDilemma: boolean;
  recommendations: string[];
  isSniCompliant: boolean; // SNI 03-6386-2000: Max 55 dBA for residential/educational
}

export interface CityAcousticReport {
  averageNoiseDba: number;
  calmBuildingCount: number;
  moderateBuildingCount: number;
  noisyBuildingCount: number;
  compliancePercentage: number;
  buildingReports: Map<string, BuildingAcousticReport>;
  avgNoiseDba: number;
  calmCount: number;
  moderateCount: number;
  noisyCount: number;
  maxNoiseDba: number;
  maxNoiseBuildingName: string;
  mitigationAdvice: string;
}

/**
 * AcousticAnalyzer - Urban Sound Propagation & Tropical Opening Dilemma Simulation.
 * Implements Indonesian National Standard SNI 03-6386-2000.
 */
export class AcousticAnalyzer {
  private static instance: AcousticAnalyzer;

  // Road Base Noise Levels (SNI 03-6386-2000 & Traffic Acoustics)
  public roadNoiseEmission = {
    alley4m: 48.0,      // Gang 4m (Kecepatan rendah, lalu lintas minim)
    localRoad7m: 58.0,  // Jalan Lokal 7m (Kendaraan lingkungan, motor)
    collector12m: 68.0, // Jalan Kolektor 12m (Angkutan umum, mobil, truk ringan)
    arterial20m: 76.0   // Jalan Arteri 20m (Lalu lintas cepat, bus, truk berat)
  };

  // Activity Noise Emission Levels from busy commercial hubs
  public commercialActivityNoise: Record<string, number> = {
    resto_mie_gacoan: 72.0,
    mall_grand_atrium: 70.0,
    pasar_rakyat_modern: 71.0,
    stasiun_komuter_heritage: 74.0,
    burger_drivethru: 68.0,
    supermarket_lifestyle: 67.0,
    cafe_roastery: 65.0,
    coffeelounge_2fl: 64.0
  };

  public static getInstance(): AcousticAnalyzer {
    if (!this.instance) {
      this.instance = new AcousticAnalyzer();
    }
    return this.instance;
  }

  /**
   * Logarithmic decibel addition: L_total = 10 * log10( sum( 10^(L_i / 10) ) )
   */
  public addDecibels(levels: number[]): number {
    if (levels.length === 0) return 40.0;
    const sumPower = levels.reduce((acc, l) => acc + Math.pow(10, l / 10), 0);
    return Math.round(10 * Math.log10(sumPower) * 10) / 10;
  }

  /**
   * Evaluates comprehensive acoustics for an individual building based on
   * adjacent road traffic, commercial activity, distance, GSB, and tree buffers.
   */
  public evaluateBuilding(
    bld: BuildingInstance,
    roadManager: RoadManager,
    landscapeManager: LandscapeManager,
    buildingManager: BuildingManager,
    lotManager?: LotManager
  ): BuildingAcousticReport {
    // 1. Calculate road traffic noise contribution
    let maxRoadNoise = 42.0; // Ambient background
    let nearestRoadType = 'Lingkungan';
    let minDistanceToRoad = Infinity;

    for (const edge of roadManager.graph.edges.values()) {
      const p1 = roadManager.graph.nodes.get(edge.startNodeId)?.position;
      const p2 = roadManager.graph.nodes.get(edge.endNodeId)?.position;
      if (p1 && p2) {
        // Line segment distance from building position
        const midX = (p1.x + p2.x) / 2;
        const midZ = (p1.z + p2.z) / 2;
        const dist = Math.hypot(bld.position.x - midX, bld.position.z - midZ);

        const roadWidth = edge.customProfile?.width || 8.0;
        let baseEmission = this.roadNoiseEmission.localRoad7m;
        let label = 'Jalan Lokal';

        if (roadWidth <= 5.0) {
          baseEmission = this.roadNoiseEmission.alley4m;
          label = 'Gang 4m';
        } else if (roadWidth >= 16.0) {
          baseEmission = this.roadNoiseEmission.arterial20m;
          label = 'Jalan Arteri 20m';
        } else if (roadWidth >= 10.0) {
          baseEmission = this.roadNoiseEmission.collector12m;
          label = 'Jalan Kolektor 12m';
        }

        // Distance attenuation for line source: L = L0 - 10 * log10(d / d0)
        const d0 = roadWidth / 2 + 1.0;
        const effectiveDist = Math.max(d0, dist);
        const attenuation = 10 * Math.log10(effectiveDist / d0);
        const received = Math.max(40.0, baseEmission - attenuation);

        if (received > maxRoadNoise) {
          maxRoadNoise = received;
          nearestRoadType = label;
          minDistanceToRoad = dist;
        }
      }
    }

    // 2. Commercial Activity Noise Contribution
    const activityNoiseLevels: number[] = [];
    let dominantActivitySource = '';
    let maxActivityDba = 0;

    for (const otherBld of buildingManager.buildings.values()) {
      if (otherBld.id === bld.id) continue;
      const emission = otherBld.presetKey ? this.commercialActivityNoise[otherBld.presetKey] : undefined;
      if (emission) {
        const dist = Math.hypot(bld.position.x - otherBld.position.x, bld.position.z - otherBld.position.z);
        // Point source distance attenuation: L = L0 - 20 * log10(d / d0)
        const d0 = 3.0;
        const effectiveDist = Math.max(d0, dist);
        const attenuation = 20 * Math.log10(effectiveDist / d0);
        const received = Math.max(35.0, emission - attenuation);

        if (received > 45.0) {
          activityNoiseLevels.push(received);
          if (received > maxActivityDba) {
            maxActivityDba = received;
            dominantActivitySource = otherBld.name;
          }
        }
      }
    }

    const activityNoiseContributionDba = activityNoiseLevels.length > 0
      ? this.addDecibels(activityNoiseLevels)
      : 38.0;

    // 3. Front GSB Setback Attenuation
    let gsbDistanceM = 3.0;
    const lot = lotManager?.getLotForBuilding(bld.id);
    if (lot && lot.metrics) {
      gsbDistanceM = lot.metrics.gsbFrontActualM || lot.metrics.gsbDistanceM || 3.0;
    }

    let gsbAttenuationDba = 0.0;
    if (gsbDistanceM >= 12.0) {
      gsbAttenuationDba = 8.0;
    } else if (gsbDistanceM >= 8.0) {
      gsbAttenuationDba = 5.5;
    } else if (gsbDistanceM >= 4.5) {
      gsbAttenuationDba = 3.0;
    }

    // 4. Shade Tree / Vegetation Acoustic Buffering
    let treeBufferDba = 0.0;
    let nearbyTreeCount = 0;
    let denseAcousticBufferDba = 0.0;
    for (const item of landscapeManager.items.values()) {
      const dist = Math.hypot(item.position.x - bld.position.x, item.position.z - bld.position.z);
      if (item.type === 'flora_yellow_bamboo' || item.type === 'tree_banyan_kurung') {
        if (dist <= 22.0) {
          denseAcousticBufferDba = Math.max(denseAcousticBufferDba, 5.0);
        }
      }
      if (item.type === 'shade_tree' || item.type.startsWith('tree_')) {
        if (dist <= 18.0) {
          nearbyTreeCount++;
        }
      }
    }
    treeBufferDba = Math.max(denseAcousticBufferDba, Math.min(6.5, nearbyTreeCount * 2.2));

    // Total received outdoor noise at building facade
    const totalRawOutdoorDba = this.addDecibels([maxRoadNoise, activityNoiseContributionDba]);
    const receivedNoiseDba = Math.max(
      38.0,
      Math.round((totalRawOutdoorDba - gsbAttenuationDba - treeBufferDba) * 10) / 10
    );

    // 5. Facade Sound Transmission & Tropical Opening Dilemma
    const catalogItem = bld.presetKey ? BuildingCatalogRegistry.getBuilding(bld.presetKey) : undefined;
    const hasCrossVent = catalogItem ? catalogItem.hasCrossVentilation : false;
    const isCommercial = bld.category === 'commercial';

    // Solid wall vs open window:
    // Natural cross-ventilation requires 20-30% open aperture, reducing acoustic transmission loss
    let facadeDampingDba = 18.0; // Standard closed window / masonry wall transmission loss
    let hasVentilationNoiseDilemma = false;

    if (hasCrossVent) {
      if (receivedNoiseDba > 62.0) {
        // High traffic noise leaks through cross-vent openings
        facadeDampingDba = 8.0;
        hasVentilationNoiseDilemma = true;
      } else {
        facadeDampingDba = 12.0;
      }
    }

    // Dynamic door state: physical open doors allow noise to infiltrate inside
    const doorOpenRatio = InteriorInteractiveSystem.getInstance().getBuildingDoorOpenFactor(bld.id);
    if (doorOpenRatio > 0.05) {
      facadeDampingDba = Math.max(5.0, facadeDampingDba - doorOpenRatio * 9.0);
    }

    const indoorNoiseDba = Math.max(28.0, Math.round((receivedNoiseDba - facadeDampingDba) * 10) / 10);

    // 6. SNI 03-6386-2000 Classification
    // Residential/Education: Max 55 dBA outdoor, Max 45 dBA indoor
    // Commercial: Max 65 dBA outdoor
    let status: 'calm' | 'moderate' | 'noisy' = 'calm';
    let statusLabel = 'Tenang & Nyaman';
    let statusColor = '#34C759'; // iOS 27 system --good
    const outdoorThreshold = isCommercial ? 65.0 : 55.0;

    if (receivedNoiseDba > outdoorThreshold + 10.0) {
      status = 'noisy';
      statusLabel = 'Bising / Di Luar Standar';
      statusColor = '#FF3B30'; // iOS 27 system --bad
    } else if (receivedNoiseDba > outdoorThreshold) {
      status = 'moderate';
      statusLabel = 'Sedang / Perlu Naungan';
      statusColor = '#FF9500'; // iOS 27 system --warn
    }

    const isSniCompliant = receivedNoiseDba <= outdoorThreshold;

    // 7. Architectural Recommendations
    const recommendations: string[] = [];
    if (status === 'noisy') {
      recommendations.push(
        `Kebisingan fasad (${receivedNoiseDba.toFixed(1)} dBA) melampaui batas SNI 03-6386 (${outdoorThreshold} dBA). Tambahkan barisan pohon peneduh di tepi jalan atau mundurkan batas GSB depan.`
      );
    }
    if (hasVentilationNoiseDilemma) {
      recommendations.push(
        'Dilema Bukaan Tropis: Bukaan ventilasi silang optimal untuk pendinginan pasif, namun rentan kebisingan jalan lalu lintas tinggi. Pasang dinding bata roster sekunder (secondary skin) atau tirai akustik vegetasi.'
      );
    }
    if (gsbAttenuationDba < 3.0 && minDistanceToRoad < 6.0) {
      recommendations.push(
        'Jarak bangunan terlalu mepet ke as jalan. Mundurkan bangunan (GSB ≥ 4.5 m) untuk meredam kebisingan hingga -3 dBA.'
      );
    }
    if (nearbyTreeCount === 0 && receivedNoiseDba > 52.0) {
      recommendations.push(
        'Tanam pohon peneduh kanopi lebat (Trembesi/Tanjung) di halaman muka untuk meredam gelombang suara jalan (-2 s/d -6 dBA).'
      );
    }

    let primaryNoiseSource = nearestRoadType;
    if (maxActivityDba > maxRoadNoise) {
      primaryNoiseSource = `Aktivitas ${dominantActivitySource}`;
    }

    return {
      buildingId: bld.id,
      receivedNoiseDba,
      indoorNoiseDba,
      status,
      statusLabel,
      statusColor,
      primaryNoiseSource,
      roadNoiseContributionDba: Math.round(maxRoadNoise * 10) / 10,
      activityNoiseContributionDba: Math.round(activityNoiseContributionDba * 10) / 10,
      gsbAttenuationDba: Math.round(gsbAttenuationDba * 10) / 10,
      treeBufferDba: Math.round(treeBufferDba * 10) / 10,
      facadeDampingDba,
      hasVentilationNoiseDilemma,
      recommendations,
      isSniCompliant
    };
  }

  /**
   * Evaluates aggregate citywide acoustic climate.
   */
  public evaluateCity(
    buildingManager: BuildingManager,
    roadManager: RoadManager,
    landscapeManager: LandscapeManager,
    lotManager?: LotManager
  ): CityAcousticReport {
    const buildingReports = new Map<string, BuildingAcousticReport>();
    let totalDba = 0;
    let calmCount = 0;
    let moderateCount = 0;
    let noisyCount = 0;
    let compliantCount = 0;
    let maxNoiseDba = 0;
    let maxNoiseBuildingName = '-';

    for (const bld of buildingManager.buildings.values()) {
      const rep = this.evaluateBuilding(bld, roadManager, landscapeManager, buildingManager, lotManager);
      buildingReports.set(bld.id, rep);

      totalDba += rep.receivedNoiseDba;
      if (rep.status === 'calm') calmCount++;
      else if (rep.status === 'moderate') moderateCount++;
      else noisyCount++;

      if (rep.isSniCompliant) compliantCount++;

      if (rep.receivedNoiseDba > maxNoiseDba) {
        maxNoiseDba = rep.receivedNoiseDba;
        maxNoiseBuildingName = bld.name;
      }
    }

    const count = buildingManager.buildings.size || 1;
    const averageNoiseDba = Math.round((totalDba / count) * 10) / 10;
    const compliancePercentage = Math.round((compliantCount / count) * 100);

    const mitigationAdvice = noisyCount > 0
      ? `Terdapat ${noisyCount} bangunan mengalami kebisingan jalan tinggi (>65 dBA). Perlebar GSB depan atau tanam sabuk pohon peneduh di tepi jalan arteri.`
      : 'Tingkat kebisingan seluruh bangunan berada dalam koridor nyaman SNI 03-6386-2000.';

    return {
      averageNoiseDba,
      calmBuildingCount: calmCount,
      moderateBuildingCount: moderateCount,
      noisyBuildingCount: noisyCount,
      compliancePercentage,
      buildingReports,
      avgNoiseDba: averageNoiseDba,
      calmCount,
      moderateCount,
      noisyCount,
      maxNoiseDba,
      maxNoiseBuildingName,
      mitigationAdvice
    };
  }
}

export const acousticAnalyzer = AcousticAnalyzer.getInstance();
