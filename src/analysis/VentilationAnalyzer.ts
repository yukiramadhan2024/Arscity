import {
  ThermalVentilationAnalyzer,
  ThermalComfortReport,
  VentilationData,
  CityThermalVentilationSummary
} from './ThermalVentilationAnalyzer';

export type { ThermalComfortReport, VentilationData, CityThermalVentilationSummary };

/**
 * VentilationAnalyzer.ts
 *
 * Clean unified wrapper and re-export over ThermalVentilationAnalyzer.
 * Preserves 100% backward compatibility for all test suites and UI components.
 */
export class VentilationAnalyzer extends ThermalVentilationAnalyzer {
  public get thermalAnalyzer(): ThermalVentilationAnalyzer {
    return this;
  }
}
