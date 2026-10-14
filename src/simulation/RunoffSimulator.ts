import * as THREE from 'three';
import { Terrain } from '../world/Terrain';
import { RoadManager } from '../roads/RoadManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { LandscapeManager } from '../world/LandscapeManager';
import { LotManager } from '../zones/LotManager';

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

    // Mitigation capacity from Absorption Wells (2.5 m³/hr per SNI well) & Biopores (0.2 m³/hr)
    const wellAbsorptionRateM3Hr = wellCount * 2.5;
    const bioporeAbsorptionRateM3Hr = bioporeCount * 0.2;
    const totalMitigationM3Hr = wellAbsorptionRateM3Hr + bioporeAbsorptionRateM3Hr;
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
      bioporeCount
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
}

export const runoffSimulator = RunoffSimulator.getInstance();
