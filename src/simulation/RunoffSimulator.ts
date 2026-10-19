import * as THREE from 'three';
import { Terrain } from '../world/Terrain';
import { RoadManager } from '../roads/RoadManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { LandscapeManager } from '../world/LandscapeManager';
import { LotManager } from '../zones/LotManager';
import { LotParcel } from '../zones/ZoneTypes';

export interface RunoffCoefficients {
  roof: number;        // Roof surfaces (SNI 03-2453-2002)
  asphalt: number;     // Asphalt roads (SNI 03-2453-2002)
  paving: number;      // Paving blocks (SNI 03-2453-2002)
  grass: number;       // Grass garden (Permen PUPR 12/2014)
  openSoil: number;    // Open natural soil (Permen PUPR 12/2014)
  rainfallIntensityMmHr: number; // Design rainfall intensity (e.g. 60 mm/hr for Yogyakarta)
}

export interface InundationPoint {
  position: THREE.Vector3;
  depthM: number;
  riskLevel: 'low' | 'medium' | 'high';
  catchmentAreaM2: number;
}

export interface CityRunoffReport {
  totalCatchmentAreaM2: number;
  imperviousAreaM2: number;
  perviousAreaM2: number;
  weightedRunoffCoeff: number;
  peakDischargeM3PerSec: number;
  mitigatedRunoffM3PerHr: number;
  netDischargeM3PerSec: number;
  inundationRiskScore: number; // 0 (Dry & Safe) to 100 (Severe Flood Risk)
  inundationPoints: InundationPoint[];
  wellCount: number;
  bioporeCount: number;
  retentionPondCount: number;
  bioswaleCount: number;
}

export interface LotFloodingReport {
  lotId: string;
  floodDepthCm: number;
  riskLevel: 'safe' | 'warning' | 'flooded';
  unabsorbedVolumeM3: number;
  mitigationKdhMet: boolean;
  wellCount: number;
  bioporeCount: number;
  neighborRunoffSurplusM3Hr: number;
  neighborAbsorptionAidM3Hr: number;
  netNeighborRunoffImpactM3Hr: number;
  retentionPondsNearby: number;
  bioswalesNearby: number;
}

export class RunoffSimulator {
  private static instance: RunoffSimulator;

  public coefficients: RunoffCoefficients = {
    roof: 0.90,
    asphalt: 0.85,
    paving: 0.60,
    grass: 0.20,
    openSoil: 0.15,
    rainfallIntensityMmHr: 60.0 // Standard design rain storm
  };

  public isExtremeStorm: boolean = false;

  public setExtremeStorm(active: boolean): void {
    this.isExtremeStorm = active;
    this.coefficients.rainfallIntensityMmHr = active ? 120.0 : 60.0;
  }

  public coefficientSources = {
    roof: 'SNI 03-2453-2002 / Permen PUPR 12/2014',
    asphalt: 'SNI 03-2453-2002',
    paving: 'SNI 03-2453-2002 (Perkerasan Berpori)',
    grass: 'Permen PUPR 12/2014',
    openSoil: 'Permen PUPR 12/2014',
    rainfallIntensity: 'BMKG Stasiun Klimatologi Yogyakarta (Hujan Ekstrem Tropis)'
  };

  public static getInstance(): RunoffSimulator {
    if (!this.instance) {
      this.instance = new RunoffSimulator();
    }
    return this.instance;
  }

  /**
   * Calculates comprehensive hydrological runoff and flood inundation risk.
   * Uses Rational Method: Q = 0.278 * C * I * A (m³/s)
   */
  public evaluateCityRunoff(
    terrain: Terrain,
    roadManager: RoadManager,
    buildingManager: BuildingManager,
    landscapeManager: LandscapeManager,
    lotManager: LotManager
  ): CityRunoffReport {
    // 1. Calculate surface areas
    let roofArea = 0;
    for (const bld of buildingManager.buildings.values()) {
      roofArea += (bld.width * bld.length);
    }

    let roadArea = 0;
    for (const edge of roadManager.graph.edges.values()) {
      const roadWidth = edge.customProfile?.width || 8.0;
      roadArea += (edge.length || 0) * roadWidth;
    }

    let pavingArea = 0;
    let grassArea = 0;
    let wellCount = 0;
    let bioporeCount = 0;
    let retentionPondCount = 0;
    let bioswaleCount = 0;

    for (const item of landscapeManager.items.values()) {
      if (item.type === 'paving_block') {
        pavingArea += (item.width || 4) * (item.length || 4);
      } else if (item.type === 'grass_garden') {
        grassArea += (item.width || 4) * (item.length || 4);
      } else if (item.type === 'shade_tree') {
        const r = item.radius || 2.5;
        grassArea += Math.PI * r * r;
      } else if (item.type === 'well') {
        wellCount++;
      } else if (item.type === 'biopore') {
        bioporeCount++;
      } else if (item.type === 'retention_pond') {
        retentionPondCount++;
      } else if (item.type === 'bioswale_channel') {
        bioswaleCount++;
      }
    }

    // City domain footprint (e.g., active area ~ 300x300m = 90,000 m²)
    const totalDomainAreaM2 = Math.max(10000, (roofArea + roadArea + pavingArea + grassArea) * 1.5);
    const openSoilArea = Math.max(0, totalDomainAreaM2 - (roofArea + roadArea + pavingArea + grassArea));

    const totalCatchmentAreaM2 = totalDomainAreaM2;
    const imperviousAreaM2 = roofArea + roadArea + (pavingArea * 0.7);
    const perviousAreaM2 = grassArea + openSoilArea + (pavingArea * 0.3);

    // Weighted Runoff Coefficient C
    const weightedC = (
      roofArea * this.coefficients.roof +
      roadArea * this.coefficients.asphalt +
      pavingArea * this.coefficients.paving +
      grassArea * this.coefficients.grass +
      openSoilArea * this.coefficients.openSoil
    ) / totalDomainAreaM2;

    // Rational Method Peak Discharge Q = 0.278 * C * I (mm/hr) * A (km²)
    const areaKm2 = totalDomainAreaM2 / 1_000_000;
    const rawPeakDischargeM3PerSec = 0.278 * weightedC * this.coefficients.rainfallIntensityMmHr * areaKm2;

    // Mitigation capacity:
    // Wells (2.5 m³/hr per SNI well), Biopores (0.2 m³/hr)
    // Retention Pond (25.0 m³/hr), Bioswale Channel (4.0 m³/hr)
    const wellAbsorptionRateM3Hr = wellCount * 2.5;
    const bioporeAbsorptionRateM3Hr = bioporeCount * 0.2;
    const retentionAbsorptionRateM3Hr = retentionPondCount * 25.0;
    const bioswaleAbsorptionRateM3Hr = bioswaleCount * 4.0;
    const totalMitigationM3Hr =
      wellAbsorptionRateM3Hr +
      bioporeAbsorptionRateM3Hr +
      retentionAbsorptionRateM3Hr +
      bioswaleAbsorptionRateM3Hr;
    const mitigationM3PerSec = totalMitigationM3Hr / 3600;

    const netDischargeM3PerSec = Math.max(0, rawPeakDischargeM3PerSec - mitigationM3PerSec);

    // Inundation Risk Score: Lower C + more mitigation => low risk score
    // Baseline acceptable runoff C is ~0.35 in well-planned tropical neighborhoods
    const excessC = Math.max(0, weightedC - 0.30);
    const mitigationDeficitRatio = Math.min(1.0, netDischargeM3PerSec / (rawPeakDischargeM3PerSec || 1));
    const inundationRiskScore = Math.min(100, Math.round((excessC * 140 + mitigationDeficitRatio * 30)));

    // Detect topographic depressions & flood accumulation spots
    const inundationPoints = this.detectTopographicInundations(terrain, weightedC);

    return {
      totalCatchmentAreaM2: Math.round(totalCatchmentAreaM2),
      imperviousAreaM2: Math.round(imperviousAreaM2),
      perviousAreaM2: Math.round(perviousAreaM2),
      weightedRunoffCoeff: Math.round(weightedC * 100) / 100,
      peakDischargeM3PerSec: Math.round(rawPeakDischargeM3PerSec * 1000) / 1000,
      mitigatedRunoffM3PerHr: Math.round(totalMitigationM3Hr * 10) / 10,
      netDischargeM3PerSec: Math.round(netDischargeM3PerSec * 1000) / 1000,
      inundationRiskScore,
      inundationPoints,
      wellCount,
      bioporeCount,
      retentionPondCount,
      bioswaleCount
    };
  }

  /**
   * Scans terrain elevation profile to detect natural drainage accumulation spots and depressions.
   */
  private detectTopographicInundations(terrain: Terrain, weightedC: boolean | number): InundationPoint[] {
    const points: InundationPoint[] = [];
    const step = 20;
    const halfSize = 120;

    for (let x = -halfSize; x <= halfSize; x += step) {
      for (let z = -halfSize; z <= halfSize; z += step) {
        const hCenter = terrain.getHeightAt(x, z);
        const hNorth = terrain.getHeightAt(x, z - step);
        const hSouth = terrain.getHeightAt(x, z + step);
        const hEast = terrain.getHeightAt(x + step, z);
        const hWest = terrain.getHeightAt(x - step, z);

        const minSurrounding = Math.min(hNorth, hSouth, hEast, hWest);

        // Local depression or flat low-lying drainage convergence
        if (hCenter <= minSurrounding + 0.15) {
          const depthEstimate = Math.max(0.1, (minSurrounding - hCenter) + (Number(weightedC) * 0.4));
          const riskLevel = depthEstimate > 0.4 ? 'high' : depthEstimate > 0.2 ? 'medium' : 'low';

          points.push({
            position: new THREE.Vector3(x, hCenter + 0.05, z),
            depthM: Math.round(depthEstimate * 100) / 100,
            riskLevel,
            catchmentAreaM2: step * step
          });
        }
      }
    }

    return points;
  }

  /**
   * Evaluates micro-watershed lot flooding based on KDH, ground permeability,
   * absorption wells, biopores, and cellular automata neighbor runoff spillover.
   */
  public evaluateLotFlooding(
    lot: LotParcel,
    landscapeManager: LandscapeManager,
    rainfallIntensityMmHr?: number,
    lotManager?: LotManager
  ): LotFloodingReport {
    const intensity = rainfallIntensityMmHr !== undefined ? rainfallIntensityMmHr : this.coefficients.rainfallIntensityMmHr;
    const lotArea = lot.areaM2 || (lot.width * lot.length);
    const greenArea = lot.metrics?.greenAreaM2 || 0;
    const groundBuiltArea = lot.metrics?.groundFootprintM2 || 0;
    const kdhPercent = lot.metrics?.kdhPercent || 0;

    let wellCount = 0;
    let bioporeCount = 0;
    for (const item of landscapeManager.items.values()) {
      if (item.lotId === lot.id) {
        if (item.type === 'well') wellCount++;
        if (item.type === 'biopore') bioporeCount++;
      } else {
        const dist = item.position.distanceTo(lot.position);
        if (dist <= Math.max(lot.width, lot.length) * 0.6) {
          if (item.type === 'well') wellCount++;
          if (item.type === 'biopore') bioporeCount++;
        }
      }
    }

    // Cellular Automata: Neighborhood Lot Hydrological Diffusion within 25m
    let neighborRunoffSurplusM3Hr = 0;
    let neighborAbsorptionAidM3Hr = 0;
    if (lotManager) {
      for (const otherLot of lotManager.lots.values()) {
        if (otherLot.id === lot.id) continue;
        const dist = otherLot.position.distanceTo(lot.position);
        if (dist <= 25.0) {
          const oKdb = otherLot.metrics?.kdbPercent ?? ((otherLot as any).kdbMax !== undefined ? (otherLot as any).kdbMax * 100 : 0);
          const oKdh = otherLot.metrics?.kdhPercent ?? ((otherLot as any).kdhMin !== undefined ? (otherLot as any).kdhMin * 100 : 0);
          if (oKdb > 75 && oKdh < 15) {
            neighborRunoffSurplusM3Hr += 0.4;
          }
          if (oKdh >= 30) {
            neighborAbsorptionAidM3Hr += 0.3;
          }
        }
      }
    }

    const netNeighborRunoffImpactM3Hr = Math.round((neighborRunoffSurplusM3Hr - neighborAbsorptionAidM3Hr) * 10) / 10;

    const pavedArea = Math.max(0, lotArea - greenArea - groundBuiltArea);
    const weightedC = (
      groundBuiltArea * this.coefficients.roof +
      pavedArea * this.coefficients.paving +
      greenArea * this.coefficients.grass
    ) / (lotArea || 1);

    const baseRainVolM3 = lotArea * weightedC * (intensity / 1000);
    // Factor neighbor runoff spillover into effective storm volume
    const effectiveRainVolM3 = Math.max(0, baseRainVolM3 + (netNeighborRunoffImpactM3Hr * 0.2));

    // Downstream Blue-Green Infrastructure: Retention Ponds (25 m³/hr) & Bioswales (4 m³/hr) within 100m
    let retentionPondsNearby = 0;
    let bioswalesNearby = 0;
    for (const item of landscapeManager.items.values()) {
      const dist = item.position.distanceTo(lot.position);
      if (dist <= 100.0) {
        if (item.type === 'retention_pond') retentionPondsNearby++;
        if (item.type === 'bioswale_channel') bioswalesNearby++;
      }
    }

    const downstreamAbsorptionAidM3 = (retentionPondsNearby * 5.0) + (bioswalesNearby * 1.5);
    const absVolM3 = (wellCount * 2.5) + (bioporeCount * 0.2) + (greenArea * 0.08) + downstreamAbsorptionAidM3;
    const unabsorbedVolumeM3 = Math.max(0, effectiveRainVolM3 - absVolM3);

    const openArea = Math.max(10, lotArea - groundBuiltArea);
    let floodDepthCm = Math.round((unabsorbedVolumeM3 / openArea) * 100 * 10) / 10;

    if (kdhPercent >= 25 && (wellCount >= 1 || bioporeCount >= 2)) {
      floodDepthCm = Math.min(1.5, floodDepthCm * 0.15);
    }
    if (retentionPondsNearby > 0) {
      floodDepthCm = Math.min(floodDepthCm, floodDepthCm * 0.35);
    } else if (bioswalesNearby > 0) {
      floodDepthCm = Math.min(floodDepthCm, floodDepthCm * 0.65);
    }

    let riskLevel: 'safe' | 'warning' | 'flooded' = 'safe';
    if (floodDepthCm >= 15) {
      riskLevel = 'flooded';
    } else if (floodDepthCm >= 5) {
      riskLevel = 'warning';
    }

    return {
      lotId: lot.id,
      floodDepthCm,
      riskLevel,
      unabsorbedVolumeM3: Math.round(unabsorbedVolumeM3 * 100) / 100,
      mitigationKdhMet: kdhPercent >= 25,
      wellCount,
      bioporeCount,
      neighborRunoffSurplusM3Hr: Math.round(neighborRunoffSurplusM3Hr * 10) / 10,
      neighborAbsorptionAidM3Hr: Math.round(neighborAbsorptionAidM3Hr * 10) / 10,
      netNeighborRunoffImpactM3Hr,
      retentionPondsNearby,
      bioswalesNearby
    };
  }
}

export const runoffSimulator = RunoffSimulator.getInstance();
