import { describe, it, expect } from 'vitest';
import {
  TROPICAL_STYLE_PRESETS,
  validateBuildingDesign,
  generateCuratedRandomDesign,
  formatMeters,
  formatArea,
  CustomBuildingConfig
} from '../src/buildings/CustomBuildingValidator';

describe('B4 & T5, T6, T9: Studio CAD Rule-Based Generator, Validator, & Formatting', () => {
  it('semua 6 gaya arsitektur tropis terkurasi valid dan memenuhi kaidah arsitektur', () => {
    expect(TROPICAL_STYLE_PRESETS.length).toBe(6);

    const expectedNames = [
      'Villa Tropis Kantilever',
      'Ruko Modern Tropis',
      'Paviliun Joglo Kontemporer',
      'Rumah Panggung Minimalis',
      'Bungalow Resor Tropis',
      'Kantor Minimalis Garis'
    ];

    const names = TROPICAL_STYLE_PRESETS.map((p) => p.name);
    for (const exp of expectedNames) {
      expect(names).toContain(exp);
    }

    for (const style of TROPICAL_STYLE_PRESETS) {
      const res = validateBuildingDesign(style.config);
      expect(res.isValid).toBe(true);
      expect(res.warnings.length).toBe(0);
    }
  });

  it('200 seeded random designs dari generator terkurasi lolos validasi tanpa peringatan', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const design = generateCuratedRandomDesign(seed);
      const res = validateBuildingDesign(design);

      expect(res.isValid).toBe(true);
      expect(res.warnings).toEqual([]);
      expect(design.floorHeight).toBeGreaterThanOrEqual(2.8);
      expect(design.floorHeight).toBeLessThanOrEqual(4.2);

      if (design.roofType !== 'flat') {
        expect(design.roofOverhang).toBeGreaterThanOrEqual(0.6);
      }
      if (design.massingShape === 'cantilever') {
        expect(design.floorCount).toBeLessThan(4);
      }
    }
  });

  it('validator mendeteksi kejanggalan geometri dan memberikan koreksi otomatis', () => {
    // 1. Tinggi lantai tidak ergonomis (misal 1.8m)
    const badHeight: CustomBuildingConfig = {
      ...TROPICAL_STYLE_PRESETS[0].config,
      floorHeight: 1.8
    };
    const resHeight = validateBuildingDesign(badHeight);
    expect(resHeight.isValid).toBe(false);
    expect(resHeight.warnings.some((w) => w.includes('Tinggi lantai'))).toBe(true);
    expect(resHeight.correctedConfig.floorHeight).toBe(2.8);

    // 2. Teritisan terlalu sempit untuk atap pelana
    const badOverhang: CustomBuildingConfig = {
      ...TROPICAL_STYLE_PRESETS[3].config,
      roofOverhang: 0.2
    };
    const resOverhang = validateBuildingDesign(badOverhang);
    expect(resOverhang.isValid).toBe(false);
    expect(resOverhang.warnings.some((w) => w.includes('Teritisan atap'))).toBe(true);
    expect(resOverhang.correctedConfig.roofOverhang).toBeGreaterThanOrEqual(0.6);

    // 3. Atap Joglo pada denah sangat memanjang (rasio bentang ekstrem)
    const badJoglo: CustomBuildingConfig = {
      ...TROPICAL_STYLE_PRESETS[2].config,
      width: 8,
      length: 24
    };
    const resJoglo = validateBuildingDesign(badJoglo);
    expect(resJoglo.isValid).toBe(false);
    expect(resJoglo.warnings.some((w) => w.includes('Joglo'))).toBe(true);
    expect(resJoglo.correctedConfig.length).toBe(resJoglo.correctedConfig.width);
  });

  it('T5: format desimal menggunakan koma dan spasi sebelum satuan (10,59 m)', () => {
    expect(formatMeters(10.59)).toBe('10,59 m');
    expect(formatMeters(3.2, 1)).toBe('3,2 m');
    expect(formatMeters(0, 2)).toBe('0,00 m');
    expect(formatArea(120)).toBe('120 m²');
  });
});
