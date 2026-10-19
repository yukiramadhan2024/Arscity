import { BuildingInstance } from '../buildings/PrefabTypes';
import { RoadManager } from '../roads/RoadManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { LandscapeManager } from '../world/LandscapeManager';
import { BuildingCatalogRegistry } from '../buildings/BuildingCatalogRegistry';

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
  monthlyAcCostIdr: number;
  formattedMonthlyAcCost: string;
  // 10-Year Lifecycle OPEX & Efficiency Rating
  tenYearAcCostIdr: number;
  tenYearMaintenanceCostIdr: number;
  tenYearTotalOpexIdr: number;
  formattedTenYearOpex: string;
  tropicalEfficiencyGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  efficiencyExplanation: string;
  tenYearSavingsVsBaselineIdr: number;
  hasSolarPv: boolean;
  hasRooftopSolar?: boolean;
  solarCapacityKwp: number;
  solarAnnualGenerationKwh: number;
  solarTenYearSavingsIdr: number;
  tenYearBaselineOpexIdr?: number;
}

export interface CityBudgetReport {
  buildingsCost: number;
  roadsCost: number;
  landscapeCost: number;
  totalCityCost: number;
  formattedTotalCityCost: string;
  totalMonthlyAcElectricityCost: number;
  formattedTotalMonthlyAcElectricityCost: string;
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
   * Calculates detailed cost breakdown and 10-year lifecycle OPEX for an individual building instance.
   */
  public estimateBuildingCost(
    bld: BuildingInstance,
    lot?: { metrics?: { kdhPercent?: number } },
    hasShadeTreesNearby: boolean = false
  ): BuildingCostEstimate {
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

    // Tropical passive design impact on monthly AC electricity bill
    const catalogItem = bld.presetKey ? BuildingCatalogRegistry.getBuilding(bld.presetKey) : undefined;
    const hasCrossVent = catalogItem ? catalogItem.hasCrossVentilation : ['joglo', 'limasan', 'house_36', 'house_54', 'villa_2fl', 'community_hall'].includes(bld.presetKey || '');
    const overhang = bld.roofOverhang ?? catalogItem?.defaultOverhang ?? (bld.roofType === 'joglo' ? 1.6 : bld.roofType === 'hip' ? 1.2 : bld.roofType === 'gable' ? 1.0 : 0.4);
    const isFlatRoof = bld.roofType === 'flat' || bld.roofType === 'flat_parapet';

    let indoorHeatDelta = 32.5 - 24.0; // Base difference from 32.5°C afternoon to 24°C AC target
    if (hasCrossVent) indoorHeatDelta -= 2.4;
    if (overhang >= 1.2) indoorHeatDelta -= 1.6;
    if (hasShadeTreesNearby) indoorHeatDelta -= 1.2;
    if (isFlatRoof) indoorHeatDelta += 1.8; // Flat concrete slab absorbs heavy direct solar radiation
    indoorHeatDelta = Math.max(0, indoorHeatDelta);

    const acPowerKw = indoorHeatDelta > 2.0 ? (totalFloorArea * 0.075 * (indoorHeatDelta / 3.0)) : 0;
    const monthlyAcCostIdr = Math.round(acPowerKw * 10 * 30 * 1500);

    // 10-Year Lifecycle OPEX
    const tenYearAcCostIdr = monthlyAcCostIdr * 12 * 10;

    // Annual maintenance rate (1.2% base, +0.8% for flat concrete roofs prone to tropical water pooling, +0.5% for poor KDH dampness)
    let annualMaintenanceRate = 0.012;
    if (isFlatRoof) annualMaintenanceRate += 0.008;
    if (lot?.metrics?.kdhPercent !== undefined && lot.metrics.kdhPercent < 25) {
      annualMaintenanceRate += 0.005;
    }

    const tenYearMaintenanceCostIdr = Math.round(totalCost * annualMaintenanceRate * 10);

    // Solar PV Generation & OPEX Deduction (SNI/Yogyakarta ~4.8 kWh/m²/day)
    const hasSolarPv = Boolean(bld.hasRooftopSolar);
    const effectiveRoofArea = footprintArea * 0.65;
    const solarCapacityKwp = hasSolarPv ? Math.round((effectiveRoofArea / 6.0) * 10) / 10 : 0;
    const solarAnnualGenerationKwh = hasSolarPv ? Math.round(solarCapacityKwp * 1400) : 0;
    const solarTenYearSavingsIdr = solarAnnualGenerationKwh * 1500 * 10;

    const rawTenYearOpex = tenYearAcCostIdr + tenYearMaintenanceCostIdr;
    const tenYearTotalOpexIdr = Math.max(0, rawTenYearOpex - solarTenYearSavingsIdr);

    // Baseline inefficient building (Flat roof, zero cross vent, zero overhang):
    const baselineAcMonthly = Math.round((totalFloorArea * 0.075 * ((32.5 - 24.0 + 1.8) / 3.0)) * 10 * 30 * 1500);
    const baselineTenYearOpex = (baselineAcMonthly * 12 * 10) + Math.round(totalCost * 0.025 * 10);
    const tenYearSavingsVsBaselineIdr = Math.max(0, baselineTenYearOpex - tenYearTotalOpexIdr);

    // Green Building Tropical Efficiency Grade (A to E)
    let tropicalEfficiencyGrade: 'A' | 'B' | 'C' | 'D' | 'E' = 'C';
    let efficiencyExplanation = '';

    if (hasCrossVent && overhang >= 1.2 && !isFlatRoof) {
      tropicalEfficiencyGrade = 'A';
      efficiencyExplanation = 'Sangat Efisien: Ventilasi silang optimal & teritisan lebar memangkas beban AC hingga 75%.';
    } else if ((hasCrossVent || overhang >= 1.0) && !isFlatRoof) {
      tropicalEfficiencyGrade = hasSolarPv ? 'A' : 'B';
      efficiencyExplanation = 'Efisien: Naungan atap cukup baik, konsumsi energi pendinginan terkendali.';
    } else if (!isFlatRoof && overhang >= 0.6) {
      tropicalEfficiencyGrade = hasSolarPv ? 'B' : 'C';
      efficiencyExplanation = 'Standar: Memiliki teritisan minimal, namun masih memerlukan ventilasi silang aktif.';
    } else if (isFlatRoof && hasCrossVent) {
      tropicalEfficiencyGrade = hasSolarPv ? 'C' : 'D';
      efficiencyExplanation = 'Kurang Efisien: Dak beton datar menyerap radiasi termal tinggi dari atas.';
    } else {
      tropicalEfficiencyGrade = hasSolarPv ? 'D' : 'E';
      efficiencyExplanation = 'Kritis: Beban pendinginan dan risiko rembesan air dak beton datar sangat tinggi.';
    }

    if (hasSolarPv) {
      efficiencyExplanation += ` Dilengkapi Solar PV ${solarCapacityKwp} kWp (${solarAnnualGenerationKwh.toLocaleString('id-ID')} kWh/tahun), memangkas OPEX 10 tahun sebesar ${this.formatRupiah(solarTenYearSavingsIdr)}.`;
    }

    return {
      structureCost: Math.round(structureCost),
      wallsCost: Math.round(wallsCost),
      roofCost: Math.round(roofCost),
      finishingCost: Math.round(finishingCost),
      totalCost,
      totalFloorAreaM2: Math.round(totalFloorArea),
      formattedTotal: this.formatRupiah(totalCost),
      monthlyAcCostIdr,
      formattedMonthlyAcCost: this.formatRupiah(monthlyAcCostIdr),
      tenYearAcCostIdr,
      tenYearMaintenanceCostIdr,
      tenYearTotalOpexIdr,
      formattedTenYearOpex: this.formatRupiah(tenYearTotalOpexIdr),
      tropicalEfficiencyGrade,
      efficiencyExplanation,
      tenYearSavingsVsBaselineIdr,
      hasSolarPv,
      hasRooftopSolar: hasSolarPv,
      solarCapacityKwp,
      solarAnnualGenerationKwh,
      solarTenYearSavingsIdr,
      tenYearBaselineOpexIdr: baselineTenYearOpex
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
    let totalMonthlyAcElectricityCost = 0;
    for (const bld of buildingManager.buildings.values()) {
      const bEst = this.estimateBuildingCost(bld);
      buildingsCost += bEst.totalCost;
      totalMonthlyAcElectricityCost += bEst.monthlyAcCostIdr;
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
      formattedTotalCityCost: this.formatRupiah(totalCityCost),
      totalMonthlyAcElectricityCost,
      formattedTotalMonthlyAcElectricityCost: this.formatRupiah(totalMonthlyAcElectricityCost)
    };
  }
}

export const costEstimator = CostEstimator.getInstance();
