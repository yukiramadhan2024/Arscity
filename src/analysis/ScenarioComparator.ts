import { Engine } from '../core/engine/Engine';
import { costEstimator } from '../simulation/CostEstimator';
import { runoffSimulator } from '../simulation/RunoffSimulator';
import { cityScoreAnalyzer } from './CityScoreAnalyzer';
import { acousticAnalyzer } from './AcousticAnalyzer';

export interface ScenarioSnapshot {
  id: string;
  name: string;
  timestamp: number;
  buildingCount: number;
  averageIndoorTempC: number;
  totalRunoffDischargeM3Hr: number;
  averageResidentialNoiseDba: number;
  cityKdhPercent: number;
  cityKdbPercent: number;
  walkabilityScore: number;
  regulatoryCompliancePercent: number;
  totalCapexIdr: number;
  totalTenYearOpexIdr: number;
}

export interface MetricDelta {
  baselineValue: number;
  currentValue: number;
  deltaAbsolute: number;
  deltaPercent: number;
  isImproved: boolean;
  unit: string;
  label: string;
  formattedBaseline: string;
  formattedCurrent: string;
  formattedDelta: string;
}

export interface ScenarioComparisonResult {
  baseline: ScenarioSnapshot;
  current: ScenarioSnapshot;
  deltas: {
    temperature: MetricDelta;
    runoff: MetricDelta;
    noise: MetricDelta;
    kdh: MetricDelta;
    walkability: MetricDelta;
    compliance: MetricDelta;
    capex: MetricDelta;
    tenYearOpex: MetricDelta;
  };
  overallImprovementScore: number; // 0 to 100
  summaryText: string;
}

/**
 * ScenarioComparator - Scientific A/B Masterplan Design Comparison Engine.
 * Evaluates macro-urban and micro-architectural deltas between a locked
 * Baseline (Scenario A) and the current city state (Scenario B).
 */
export class ScenarioComparator {
  private static instance: ScenarioComparator;
  private baseline: ScenarioSnapshot | null = null;

  public static getInstance(): ScenarioComparator {
    if (!this.instance) {
      this.instance = new ScenarioComparator();
    }
    return this.instance;
  }

  public setBaseline(snapshot: ScenarioSnapshot): void {
    this.baseline = snapshot;
  }

  public getBaseline(): ScenarioSnapshot | null {
    return this.baseline;
  }

  public clearBaseline(): void {
    this.baseline = null;
  }

  public hasBaseline(): boolean {
    return this.baseline !== null;
  }

  /**
   * Captures an instantaneous snapshot of the city's key environmental, physical, and financial metrics.
   */
  public captureSnapshot(engine: Engine, name: string = 'Skenario A (Baseline)'): ScenarioSnapshot {
    const buildings = Array.from(engine.buildingManager.buildings.values());
    const buildingCount = buildings.length;

    // 1. Temperature
    let tempSum = 0;
    for (const bld of buildings) {
      const rep = engine.ventilationAnalyzer.analyzeBuilding(bld.id);
      tempSum += rep?.indoorEstimatedTempC ?? 32.5;
    }
    const averageIndoorTempC = buildingCount > 0 ? Math.round((tempSum / buildingCount) * 10) / 10 : 32.5;

    // 2. Runoff Hydrology
    const runoff = runoffSimulator.evaluateCityRunoff(
      engine.terrain,
      engine.roadManager,
      engine.buildingManager,
      engine.landscapeManager,
      engine.lotManager
    );
    const totalRunoffDischargeM3Hr = Math.round(runoff.netDischargeM3PerSec * 3600 * 10) / 10;

    // 3. Acoustics
    const acoustic = acousticAnalyzer.evaluateCity(
      engine.buildingManager,
      engine.roadManager,
      engine.landscapeManager,
      engine.lotManager
    );
    const averageResidentialNoiseDba = acoustic.averageNoiseDba;

    // 4. Urban Score & Regulations
    const urbanScore = cityScoreAnalyzer.evaluateCity(
      engine.buildingManager,
      engine.roadManager,
      engine.landscapeManager,
      engine.lotManager
    );
    const walkabilityScore = urbanScore.walkabilityPercent;

    let compliantLots = 0;
    const totalLots = engine.lotManager.lots.size;
    for (const lot of engine.lotManager.lots.values()) {
      engine.lotManager.evaluateBuildingCode(lot);
      if (lot.violations.length === 0) compliantLots++;
    }
    const regulatoryCompliancePercent = totalLots > 0 ? Math.round((compliantLots / totalLots) * 100) : 100;

    // 5. Land Cover (KDH & KDB)
    let totalLotArea = 0;
    let totalGreenArea = 0;
    let totalBuiltArea = 0;
    for (const lot of engine.lotManager.lots.values()) {
      totalLotArea += lot.areaM2;
      totalGreenArea += lot.metrics.greenAreaM2;
      totalBuiltArea += lot.metrics.groundFootprintM2;
    }
    const cityKdhPercent = totalLotArea > 0 ? Math.round((totalGreenArea / totalLotArea) * 100) : 0;
    const cityKdbPercent = totalLotArea > 0 ? Math.round((totalBuiltArea / totalLotArea) * 100) : 0;

    // 6. Economics (CAPEX & 10-Year OPEX)
    const budget = costEstimator.estimateCityBudget(
      engine.buildingManager,
      engine.roadManager,
      engine.landscapeManager
    );
    const totalCapexIdr = budget.totalCityCost;

    let opexSum = 0;
    for (const bld of buildings) {
      const bCost = costEstimator.estimateBuildingCost(bld);
      opexSum += bCost.tenYearTotalOpexIdr;
    }
    const totalTenYearOpexIdr = Math.round(opexSum);

    return {
      id: `snap_${Date.now()}`,
      name,
      timestamp: Date.now(),
      buildingCount,
      averageIndoorTempC,
      totalRunoffDischargeM3Hr,
      averageResidentialNoiseDba,
      cityKdhPercent,
      cityKdbPercent,
      walkabilityScore,
      regulatoryCompliancePercent,
      totalCapexIdr,
      totalTenYearOpexIdr
    };
  }

  /**
   * Compares the current city state with the active baseline.
   */
  public compareWithCurrent(engine: Engine, currentName: string = 'Skenario B (Saat Ini)'): ScenarioComparisonResult | null {
    if (!this.baseline) return null;
    const current = this.captureSnapshot(engine, currentName);
    return this.compareSnapshots(this.baseline, current);
  }

  /**
   * Calculates delta matrix between any two snapshots.
   */
  public compareSnapshots(baseline: ScenarioSnapshot, current: ScenarioSnapshot): ScenarioComparisonResult {
    const makeDelta = (
      base: number,
      curr: number,
      lowerIsBetter: boolean,
      unit: string,
      label: string,
      formatter?: (val: number) => string
    ): MetricDelta => {
      const deltaAbsolute = Math.round((curr - base) * 100) / 100;
      const deltaPercent = base !== 0
        ? Math.round(((curr - base) / Math.abs(base)) * 1000) / 10
        : curr > 0 ? 100 : 0;

      const isImproved = lowerIsBetter ? deltaAbsolute < 0 : deltaAbsolute > 0;

      const formatVal = formatter || ((v) => `${v.toFixed(1)} ${unit}`);
      const sign = deltaAbsolute > 0 ? '+' : '';

      return {
        baselineValue: base,
        currentValue: curr,
        deltaAbsolute,
        deltaPercent,
        isImproved,
        unit,
        label,
        formattedBaseline: formatVal(base),
        formattedCurrent: formatVal(curr),
        formattedDelta: `${sign}${formatVal(deltaAbsolute)} (${sign}${deltaPercent.toFixed(1)}%)`
      };
    };

    const formatCurrency = (val: number): string => costEstimator.formatRupiah(val);

    const temperature = makeDelta(
      baseline.averageIndoorTempC,
      current.averageIndoorTempC,
      true,
      '°C',
      'Suhu Ruang Rata-rata'
    );

    const runoff = makeDelta(
      baseline.totalRunoffDischargeM3Hr,
      current.totalRunoffDischargeM3Hr,
      true,
      'm³/jam',
      'Debit Limpasan Banjir'
    );

    const noise = makeDelta(
      baseline.averageResidentialNoiseDba,
      current.averageResidentialNoiseDba,
      true,
      'dBA',
      'Tingkat Kebisingan'
    );

    const kdh = makeDelta(
      baseline.cityKdhPercent,
      current.cityKdhPercent,
      false,
      '%',
      'RTH / KDH Kawasan'
    );

    const walkability = makeDelta(
      baseline.walkabilityScore,
      current.walkabilityScore,
      false,
      'Poin',
      'Skor Walkability 400m'
    );

    const compliance = makeDelta(
      baseline.regulatoryCompliancePercent,
      current.regulatoryCompliancePercent,
      false,
      '%',
      'Kepatuhan Regulasi'
    );

    const capex = makeDelta(
      baseline.totalCapexIdr,
      current.totalCapexIdr,
      true,
      'Rp',
      'Biaya Awal (CAPEX)',
      formatCurrency
    );

    const tenYearOpex = makeDelta(
      baseline.totalTenYearOpexIdr,
      current.totalTenYearOpexIdr,
      true,
      'Rp',
      'OPEX 10 Tahun (Energi & Rawat)',
      formatCurrency
    );

    // Compute composite improvement score (0 to 100)
    let score = 50;
    if (temperature.isImproved) score += 10; else if (temperature.deltaAbsolute > 0) score -= 10;
    if (runoff.isImproved) score += 12; else if (runoff.deltaAbsolute > 0) score -= 12;
    if (noise.isImproved) score += 8; else if (noise.deltaAbsolute > 0) score -= 8;
    if (kdh.isImproved) score += 10; else if (kdh.deltaAbsolute < 0) score -= 10;
    if (compliance.isImproved) score += 10; else if (compliance.deltaAbsolute < 0) score -= 10;
    if (tenYearOpex.isImproved) score += 10; else if (tenYearOpex.deltaAbsolute > 0) score -= 10;
    const overallImprovementScore = Math.max(0, Math.min(100, score));

    let summaryText = 'Skenario B menunjukkan performa setara dengan Skenario A.';
    if (overallImprovementScore >= 75) {
      summaryText = 'Skenario B unggul signifikan: iklim mikro lebih sejuk, resapan air meningkat, dan biaya siklus hidup 10 tahun lebih hemat.';
    } else if (overallImprovementScore >= 60) {
      summaryText = 'Skenario B memberikan perbaikan positif pada tata ruang dan efisiensi lingkungan kawasan.';
    } else if (overallImprovementScore <= 40) {
      summaryText = 'Peringatan: Skenario B mengalami degradasi pada kenyamanan termal, beban limpasan air hujan, atau regulasi kawasan.';
    }

    return {
      baseline,
      current,
      deltas: {
        temperature,
        runoff,
        noise,
        kdh,
        walkability,
        compliance,
        capex,
        tenYearOpex
      },
      overallImprovementScore,
      summaryText
    };
  }
}

export const scenarioComparator = ScenarioComparator.getInstance();
