import * as THREE from 'three';
import {
  ThermalVentilationAnalyzer,
  ThermalComfortReport,
  VentilationData,
  CityThermalVentilationSummary
} from './ThermalVentilationAnalyzer';

export type { ThermalComfortReport, VentilationData, CityThermalVentilationSummary };

/**
 * VentilationAnalyzer.ts - 3D Airflow Ribbons & Spatial Ventilation Visualizer
 *
 * Pemisahan Tanggung Jawab:
 * - ThermalVentilationAnalyzer.ts: Mesin kalkulasi utama untuk laju pertukaran udara (ACH),
 *   efek ventilasi silang bukaan dinding, dan penurunan suhu mikroklimat.
 * - VentilationAnalyzer.ts: Membangun geometri pita panah 3D (3D Airflow Ribbons)
 *   yang meliuk melalui bukaan arsitektur dan mengelola visualisasi partikel angin.
 */
export class VentilationAnalyzer extends ThermalVentilationAnalyzer {
  public get thermalAnalyzer(): ThermalVentilationAnalyzer {
    return this;
  }

  /**
   * Helper eksplisit untuk membangun geometri pita aerodinamis 3D (Airflow Ribbon)
   */
  public buildAirflowRibbon(
    points: THREE.Vector3[],
    primaryColor: number = 0x00b4d8,
    glowColor: number = 0x48cae4,
    tubeRadius: number = 0.15
  ): THREE.Group {
    return this.create3DCurvedRibbonArrow(points, primaryColor, glowColor, tubeRadius);
  }
}
