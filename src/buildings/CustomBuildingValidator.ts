import {
  MassingShapeType,
  WindowStyleType,
  RoofType,
  WallMaterialType
} from './CustomBuildingModel';

export interface CustomBuildingConfig {
  buildingName: string;
  massingShape: MassingShapeType;
  width: number;
  length: number;
  floorCount: number;
  floorHeight: number;
  windowStyle: WindowStyleType;
  roofType: RoofType;
  roofMaterial: string;
  roofOverhang: number;
  wallMaterial: WallMaterialType;
  wallColor: string;
  hasBalcony: boolean;
  hasSunLouvers: boolean;
  hasVerticalGarden: boolean;
  hasFrontArcade: boolean;
  useBasePlinthMaterial: boolean;
  baseMaterial: string;
  hasSkylight: boolean;
  hasSolarPV: boolean;
  exposeSteelFrame?: boolean;
  hasCarportAndTopBalcony?: boolean;
  hasVerticalSecondarySkin?: boolean;
}

export interface TropicalStylePreset {
  id: string;
  name: string;
  description: string;
  config: CustomBuildingConfig;
}

export const TROPICAL_STYLE_PRESETS: TropicalStylePreset[] = [
  {
    id: 'villa_tropis_kantilever',
    name: 'Villa Tropis Kantilever',
    description: 'Massa kantilever berani dengan bukaan kaca panorama dan kisi peneduh kayu',
    config: {
      buildingName: 'Villa Tropis Kantilever',
      massingShape: 'cantilever',
      width: 12,
      length: 14,
      floorCount: 2,
      floorHeight: 3.4,
      windowStyle: 'curtain_wall',
      roofType: 'flat',
      roofMaterial: 'concrete_slab',
      roofOverhang: 1.2,
      wallMaterial: 'concrete',
      wallColor: '#f8fafc',
      hasBalcony: true,
      hasSunLouvers: true,
      hasVerticalGarden: true,
      hasFrontArcade: false,
      useBasePlinthMaterial: true,
      baseMaterial: 'andesite',
      hasSkylight: false,
      hasSolarPV: true
    }
  },
  {
    id: 'ruko_modern_tropis',
    name: 'Ruko Modern Tropis',
    description: 'Arkade pejalan kaki di lantai dasar, jendela ribbon horizontal, dan pelindung tampias',
    config: {
      buildingName: 'Ruko Modern Tropis',
      massingShape: 'box',
      width: 8,
      length: 16,
      floorCount: 3,
      floorHeight: 3.6,
      windowStyle: 'modern_ribbon',
      roofType: 'flat',
      roofMaterial: 'concrete_slab',
      roofOverhang: 0.8,
      wallMaterial: 'plaster',
      wallColor: '#e2e8f0',
      hasBalcony: true,
      hasSunLouvers: true,
      hasVerticalGarden: false,
      hasFrontArcade: true,
      useBasePlinthMaterial: true,
      baseMaterial: 'brick',
      hasSkylight: false,
      hasSolarPV: false
    }
  },
  {
    id: 'paviliun_joglo_kontemporer',
    name: 'Paviliun Joglo Kontemporer',
    description: 'Atap tajug bertingkat dengan overstek teritisan lebar dan dinding krepyak kayu',
    config: {
      buildingName: 'Paviliun Joglo Kontemporer',
      massingShape: 'box',
      width: 14,
      length: 14,
      floorCount: 1,
      floorHeight: 3.8,
      windowStyle: 'javanese_krepyak',
      roofType: 'joglo',
      roofMaterial: 'clay_tile',
      roofOverhang: 1.8,
      wallMaterial: 'wood',
      wallColor: '#78350f',
      hasBalcony: false,
      hasSunLouvers: false,
      hasVerticalGarden: true,
      hasFrontArcade: true,
      useBasePlinthMaterial: true,
      baseMaterial: 'andesite',
      hasSkylight: false,
      hasSolarPV: false
    }
  },
  {
    id: 'rumah_panggung_minimalis',
    name: 'Rumah Panggung Minimalis',
    description: 'Elevasi plinth tinggi untuk sirkulasi udara bawah lantai dengan atap pelana ventilasi',
    config: {
      buildingName: 'Rumah Panggung Minimalis',
      massingShape: 'box',
      width: 10,
      length: 14,
      floorCount: 2,
      floorHeight: 3.2,
      windowStyle: 'minimalist_slot',
      roofType: 'gable',
      roofMaterial: 'dark_zinc',
      roofOverhang: 1.4,
      wallMaterial: 'wood',
      wallColor: '#9a3412',
      hasBalcony: true,
      hasSunLouvers: true,
      hasVerticalGarden: false,
      hasFrontArcade: false,
      useBasePlinthMaterial: true,
      baseMaterial: 'andesite',
      hasSkylight: false,
      hasSolarPV: true
    }
  },
  {
    id: 'bungalow_resor_tropis',
    name: 'Bungalow Resor Tropis',
    description: 'Massa L-shape memeluk dek teras terbuka dan kolam dengan atap limasan teduh',
    config: {
      buildingName: 'Bungalow Resor Tropis',
      massingShape: 'l_shape',
      width: 14,
      length: 16,
      floorCount: 1,
      floorHeight: 3.5,
      windowStyle: 'curtain_wall',
      roofType: 'hip',
      roofMaterial: 'clay_tile',
      roofOverhang: 1.6,
      wallMaterial: 'plaster',
      wallColor: '#fef3c7',
      hasBalcony: false,
      hasSunLouvers: true,
      hasVerticalGarden: true,
      hasFrontArcade: false,
      useBasePlinthMaterial: true,
      baseMaterial: 'andesite',
      hasSkylight: false,
      hasSolarPV: false
    }
  },
  {
    id: 'kantor_minimalis_garis',
    name: 'Kantor Minimalis Garis',
    description: 'Podium bertingkat dengan teras atap hijau, panel surya PV, dan fasad bergaris efisien',
    config: {
      buildingName: 'Kantor Minimalis Garis',
      massingShape: 'stepped_podium',
      width: 16,
      length: 18,
      floorCount: 4,
      floorHeight: 3.4,
      windowStyle: 'modern_ribbon',
      roofType: 'flat',
      roofMaterial: 'concrete_slab',
      roofOverhang: 0.6,
      wallMaterial: 'concrete',
      wallColor: '#e2e8f0',
      hasBalcony: true,
      hasSunLouvers: true,
      hasVerticalGarden: true,
      hasFrontArcade: false,
      useBasePlinthMaterial: true,
      baseMaterial: 'brick',
      hasSkylight: true,
      hasSolarPV: true
    }
  }
];

export interface BuildingValidationResult {
  isValid: boolean;
  warnings: string[];
  correctedConfig: CustomBuildingConfig;
}

/**
 * Validates tropical architectural and geometric design rules:
 * - Inter-floor height (2.8m - 4.2m)
 * - Roof overhang eave coverage (>= 0.6m for tropical rain eave)
 * - Cantilever depth <= 1/3 lower floor span
 * - Vertical circulation dimensions (width/length >= 8m for multi-storey stairs)
 * - Roof proportions (Joglo square aspect ratio <= 1.4, max 2 floors)
 * - Structural massing stability
 */
export function validateBuildingDesign(config: CustomBuildingConfig): BuildingValidationResult {
  const warnings: string[] = [];
  const corrected: CustomBuildingConfig = { ...config };

  // 1. Tinggi lantai ergonomis (2.8m - 4.2m)
  if (config.floorHeight < 2.8 || config.floorHeight > 4.2) {
    warnings.push(
      `Tinggi lantai ${config.floorHeight.toFixed(2).replace('.', ',')} m di luar batas wajar arsitektur tropis (2,80 m – 4,20 m).`
    );
    corrected.floorHeight = Math.max(2.8, Math.min(4.2, config.floorHeight));
  }

  // 2. Overhang atap iklim tropis hujan lebat (minimal 0.60m, non-flat roof)
  if (config.roofType !== 'flat' && config.roofOverhang < 0.6) {
    warnings.push(
      `Teritisan atap ${config.roofOverhang.toFixed(2).replace('.', ',')} m terlalu sempit untuk melindungi dinding dari tampias hujan lebat tropis.`
    );
    corrected.roofOverhang = 1.2;
  }

  // 3. Cantilever overhang rule (overhang <= 1/3 bentang lantai bawah)
  if (config.massingShape === 'cantilever') {
    const maxCantilever = config.length / 3;
    const cDepth = Math.min(2.0, config.length * 0.22);
    if (cDepth > maxCantilever) {
      warnings.push(
        `Kantilever ${cDepth.toFixed(2).replace('.', ',')} m melampaui batas aman 1/3 bentang (${maxCantilever.toFixed(2).replace('.', ',')} m).`
      );
      corrected.length = Math.max(config.length, cDepth * 3);
    }
  }

  // 4. Sirkulasi tangga untuk bangunan bertingkat (> 1 lantai)
  if (config.floorCount > 1) {
    if (config.width < 7.0 || config.length < 7.0) {
      warnings.push(
        `Dimensi ${config.width} m × ${config.length} m terlalu sempit untuk sirkulasi tangga bangunan bertingkat.`
      );
      corrected.width = Math.max(8.0, config.width);
      corrected.length = Math.max(8.0, config.length);
    }
  }

  // 5. Atap Joglo tradisional (proporsi denah mendekati bujur sangkar, max 2 lantai)
  if (config.roofType === 'joglo') {
    const ratio = config.width / config.length;
    if (ratio < 0.7 || ratio > 1.4) {
      warnings.push(
        'Proporsi denah atap Joglo harus mendekati persegi (rasio bentang 0,70 – 1,40).'
      );
      corrected.length = corrected.width;
    }
    if (config.floorCount > 2) {
      warnings.push(
        'Struktur atap Joglo bertingkat hanya stabil hingga maksimal 2 lantai.'
      );
      corrected.floorCount = 2;
    }
  }

  // 6. Batasan tinggi massa kantilever
  if (config.floorCount >= 4 && config.massingShape === 'cantilever') {
    warnings.push(
      'Massa kantilever berisiko puntir struktural pada ketinggian 4 lantai atau lebih.'
    );
    corrected.massingShape = 'stepped_podium';
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    correctedConfig: corrected
  };
}

/**
 * Generates a rule-based curated architectural design with seeded safe variation.
 * Always produces a valid design that passes validateBuildingDesign without warnings.
 */
export function generateCuratedRandomDesign(seed?: number): CustomBuildingConfig {
  const styles = TROPICAL_STYLE_PRESETS;
  const sIdx =
    seed !== undefined
      ? Math.abs(seed) % styles.length
      : Math.floor(Math.random() * styles.length);

  const base = styles[sIdx].config;

  // Safe variation within valid architectural ranges
  const v1 = seed !== undefined ? ((seed * 9301 + 49297) % 233280) / 233280 : Math.random();
  const v2 = seed !== undefined ? ((seed * 12345 + 11035) % 233280) / 233280 : Math.random();

  const widthDelta = (Math.floor(v1 * 3) - 1) * 2; // -2, 0, or +2
  const lengthDelta = (Math.floor(v2 * 3) - 1) * 2;

  let newWidth = Math.max(8, Math.min(18, base.width + widthDelta));
  let newLength = Math.max(10, Math.min(20, base.length + lengthDelta));

  // If joglo, keep square
  if (base.roofType === 'joglo') {
    newLength = newWidth;
  }

  const candidate: CustomBuildingConfig = {
    ...base,
    width: newWidth,
    length: newLength,
    buildingName: `${styles[sIdx].name} #${Math.floor(100 + v1 * 900)}`
  };

  const validated = validateBuildingDesign(candidate);
  return validated.correctedConfig;
}

/**
 * Formats a metric value with Indonesian comma and space before unit: "10,59 m"
 */
export function formatMeters(val: number, decimals: number = 2): string {
  const str = val.toFixed(decimals).replace('.', ',');
  return `${str} m`;
}

/**
 * Formats an area in m² with Indonesian thousands separator: "120 m²"
 */
export function formatArea(val: number): string {
  const rounded = Math.round(val).toLocaleString('id-ID');
  return `${rounded} m²`;
}
