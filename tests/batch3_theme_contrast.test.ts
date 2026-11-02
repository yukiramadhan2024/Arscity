import { describe, it, expect } from 'vitest';
import {
  LIGHT_THEME_TOKENS,
  DARK_THEME_TOKENS,
  getContrastRatio,
  meetsWcagAA
} from '../src/ui/constants/themeTokens';
import fs from 'fs';
import path from 'path';

describe('B1: Theme Token Contrast & Keterbacaan Tema Gelap/Terang (WCAG 2.1 AA)', () => {
  describe('Kalkulator Kontras Relatif WCAG 2.1', () => {
    it('menghitung rasio kontras warna identik adalah 1:1', () => {
      expect(getContrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1.0, 1);
      expect(getContrastRatio('#0F172A', '#0F172A')).toBeCloseTo(1.0, 1);
    });

    it('menghitung rasio kontras hitam dan putih adalah 21:1', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21.0, 0);
    });

    it('simetris terlepas dari urutan foreground dan background', () => {
      const r1 = getContrastRatio('#007AFF', '#FFFFFF');
      const r2 = getContrastRatio('#FFFFFF', '#007AFF');
      expect(r1).toBeCloseTo(r2, 4);
    });
  });

  describe('Tema Terang (Light Theme) - Keterbacaan Teks & Kontrol', () => {
    const lightSurface = LIGHT_THEME_TOKENS.surfaceSolid; // #FFFFFF

    it('teks primer (--label) memenuhi rasio kontras WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(LIGHT_THEME_TOKENS.textPrimary, lightSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWcagAA(LIGHT_THEME_TOKENS.textPrimary, lightSurface)).toBe(true);
    });

    it('teks sekunder (--label-secondary) memenuhi rasio kontras WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(LIGHT_THEME_TOKENS.textSecondary, lightSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWcagAA(LIGHT_THEME_TOKENS.textSecondary, lightSurface)).toBe(true);
    });

    it('teks tersier (--label-tertiary) memenuhi rasio kontras WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(LIGHT_THEME_TOKENS.textTertiary, lightSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWcagAA(LIGHT_THEME_TOKENS.textTertiary, lightSurface)).toBe(true);
    });

    it('kontrol interaktif aksen (--accent) memenuhi batas kontrol UI (>= 3.0:1)', () => {
      const ratio = getContrastRatio(LIGHT_THEME_TOKENS.accent, lightSurface);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
      expect(meetsWcagAA(LIGHT_THEME_TOKENS.accent, lightSurface, true)).toBe(true);
    });

    it('teks di atas tombol aksen (--on-accent) memiliki kontras kontrol UI memadai', () => {
      const ratio = getContrastRatio(LIGHT_THEME_TOKENS.onAccent, LIGHT_THEME_TOKENS.accent);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe('Tema Gelap (Dark Theme) - Keterbacaan Teks & Kontrol', () => {
    const darkSurface = DARK_THEME_TOKENS.surfaceSolid; // #1E293B
    const darkBg = DARK_THEME_TOKENS.surfaceSubtle; // #0F172A

    it('teks primer (--label) memenuhi rasio kontras WCAG AA (>= 4.5:1) pada surface dan bg', () => {
      const ratioOnSurface = getContrastRatio(DARK_THEME_TOKENS.textPrimary, darkSurface);
      const ratioOnBg = getContrastRatio(DARK_THEME_TOKENS.textPrimary, darkBg);
      expect(ratioOnSurface).toBeGreaterThanOrEqual(4.5);
      expect(ratioOnBg).toBeGreaterThanOrEqual(4.5);
      expect(meetsWcagAA(DARK_THEME_TOKENS.textPrimary, darkSurface)).toBe(true);
    });

    it('teks sekunder (--label-secondary) memenuhi rasio kontras WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(DARK_THEME_TOKENS.textSecondary, darkSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWcagAA(DARK_THEME_TOKENS.textSecondary, darkSurface)).toBe(true);
    });

    it('teks tersier (--label-tertiary) memenuhi rasio kontras WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio(DARK_THEME_TOKENS.textTertiary, darkSurface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWcagAA(DARK_THEME_TOKENS.textTertiary, darkSurface)).toBe(true);
    });

    it('status good, warn, bad pada tema gelap memiliki visibilitas kontras >= 3.0:1', () => {
      expect(getContrastRatio(DARK_THEME_TOKENS.good, darkSurface)).toBeGreaterThanOrEqual(3.0);
      expect(getContrastRatio(DARK_THEME_TOKENS.warn, darkSurface)).toBeGreaterThanOrEqual(3.0);
      expect(getContrastRatio(DARK_THEME_TOKENS.bad, darkSurface)).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe('Integritas Token CSS di index.css', () => {
    it('.arscity-glass-bar tidak lagi mengunci warna literal keras yang merusak mode gelap', () => {
      const cssPath = path.resolve(__dirname, '../src/app/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // Memastikan .arscity-glass-bar menggunakan variabel CSS dinamis
      expect(cssContent).toMatch(/\.arscity-glass-bar\s*\{[^}]*background:\s*var\(--surface\)/);
      expect(cssContent).toMatch(/\.arscity-glass-bar\s*\{[^}]*color:\s*var\(--label\)/);
      expect(cssContent).not.toMatch(/\.arscity-glass-bar\s*\{[^}]*color:\s*#0F172A\s*!important/);
    });

    it('variabel --shadow-surface-boundary terdefinisi di :root dan tema gelap', () => {
      const cssPath = path.resolve(__dirname, '../src/app/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      expect(cssContent).toContain('--shadow-surface-boundary');
      expect(cssContent).toContain('--border-glass');
    });

    it('prefers-reduced-transparency tidak mengunci surface gelap pada :root', () => {
      const cssPath = path.resolve(__dirname, '../src/app/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      expect(cssContent).not.toMatch(/prefers-reduced-transparency[^{]*\{[^}]*:root\s*\{[^}]*--surface:\s*#0f172a\s*!important/s);
      expect(cssContent).toMatch(/prefers-reduced-transparency[^{]*\{[^}]*:root\s*\{[^}]*--surface:\s*#ffffff\s*!important/s);
    });

    it('modal overlay di index.css menggunakan token var(--scrim)', () => {
      const cssPath = path.resolve(__dirname, '../src/app/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      expect(cssContent).toMatch(/\.modal-overlay\s*\{[^}]*background:\s*var\(--scrim\)/);
    });
  });
});
