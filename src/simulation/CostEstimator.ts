import { BuildingInstance } from '../buildings/PrefabTypes';
import { RoadManager } from '../roads/RoadManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { LandscapeManager } from '../world/LandscapeManager';

export interface UnitCostRates {
  structurePerM2: number;       // Struktur pondasi, kolom, balok beton bertulang
  wallsPerM2: number;           // Dinding bata, plesteran, acian, finishing cat
  roofPerM2: number;            // Kuda-kuda baja ringan, reng, genteng tanah liat
  finishingPerM2: number;       // Lantai keramik/granit, plafon gipsum, kusen & pintu
  landscapePerM2: number;       // Lansekap, perkerasan paving, taman resapan
  roadPerMeter: number;         // Pembangunan perkerasan jalan per meter panjang
}

export interface BuildingCostEstimate {
  structureCost: number;
  wallsCost: number;
  roofCost: number;
  finishingCost: number;
  totalCost: number;
  totalFloorAreaM2: number;
  formattedTotal: string;
}

export interface CityBudgetReport {
  buildingsCost: number;
  roadsCost: number;
  landscapeCost: number;
  totalCityCost: number;
  formattedTotalCityCost: string;
}

export class CostEstimator {
  private static instance: CostEstimator;

  // Editable unit rates labeled "ilustrasi edukasi, bukan acuan harga pasar"
  public unitRates: UnitCostRates = {
    structurePerM2: 1_800_000,
    wallsPerM2: 650_000,
    roofPerM2: 550_000,
    finishingPerM2: 800_000,
    landscapePerM2: 250_000,
    roadPerMeter: 1_200_000
  };

  public static getInstance(): CostEstimator {
    if (!this.instance) {
      this.instance = new CostEstimator();
    }
    return this.instance;
  }

  public formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Calculates detailed cost breakdown for an individual building instance.
   */
  public estimateBuildingCost(bld: BuildingInstance): BuildingCostEstimate {
    const footprintArea = bld.width * bld.length;
    const totalFloorArea = footprintArea * bld.floorCount;

    // Roof area takes overhang and slope into account (~1.2x footprint)
    const roofArea = footprintArea * 1.25;

    // Exterior & interior wall area estimate (~2.8x floor area)
    const wallArea = footprintArea * bld.floorCount * 2.2;

    const structureCost = totalFloorArea * this.unitRates.structurePerM2;
    const wallsCost = wallArea * (this.unitRates.wallsPerM2 * 0.45); // convert wall surface area to floor-basis
    const roofCost = roofArea * this.unitRates.roofPerM2;
    const finishingCost = totalFloorArea * this.unitRates.finishingPerM2;

    const totalCost = Math.round(structureCost + wallsCost + roofCost + finishingCost);

    return {
      structureCost: Math.round(structureCost),
      wallsCost: Math.round(wallsCost),
      roofCost: Math.round(roofCost),
      finishingCost: Math.round(finishingCost),
      totalCost,
      totalFloorAreaM2: Math.round(totalFloorArea),
      formattedTotal: this.formatRupiah(totalCost)
    };
  }

  /**
   * Calculates complete citywide capital expenditure / RAB.
   */
  public estimateCityBudget(
    buildingManager: BuildingManager,
    roadManager: RoadManager,
    landscapeManager: LandscapeManager
  ): CityBudgetReport {
    let buildingsCost = 0;
    for (const bld of buildingManager.buildings.values()) {
      buildingsCost += this.estimateBuildingCost(bld).totalCost;
    }

    let totalRoadLengthM = 0;
    for (const edge of roadManager.graph.edges.values()) {
      totalRoadLengthM += edge.length || 0;
    }
    const roadsCost = Math.round(totalRoadLengthM * this.unitRates.roadPerMeter);

    let totalLandscapeAreaM2 = 0;
    for (const item of landscapeManager.items.values()) {
      if (item.type === 'grass_garden' || item.type === 'paving_block') {
        totalLandscapeAreaM2 += (item.width || 4) * (item.length || 4);
      } else if (item.type === 'shade_tree') {
        const r = item.radius || 2.5;
        totalLandscapeAreaM2 += Math.PI * r * r;
      } else if (item.type === 'well' || item.type === 'biopore') {
        totalLandscapeAreaM2 += 10; // Nominal installation cost
      }
    }
    const landscapeCost = Math.round(totalLandscapeAreaM2 * this.unitRates.landscapePerM2);

    const totalCityCost = buildingsCost + roadsCost + landscapeCost;

    return {
      buildingsCost,
      roadsCost,
      landscapeCost,
      totalCityCost,
      formattedTotalCityCost: this.formatRupiah(totalCityCost)
    };
  }
}

export const costEstimator = CostEstimator.getInstance();
