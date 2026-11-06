import { describe, it, expect } from 'vitest';
import { ARSCITY_THEME_PALETTE, getContrastRatio, meetsWcagAA } from '../src/ui/constants/themeTokens';
import fs from 'fs';
import path from 'path';

describe('Arscity Mandatory 8-Color Theme System (COLORS Specification Card)', () => {
  it('1. Exposes all 8 mandatory swatch colors with exact HEX values', () => {
    expect(ARSCITY_THEME_PALETTE.sealBlue).toBe('#D3EFFA');
    expect(ARSCITY_THEME_PALETTE.navyBlue).toBe('#0A2E5B');
    expect(ARSCITY_THEME_PALETTE.crimsonPink).toBe('#FC8296');
    expect(ARSCITY_THEME_PALETTE.muted).toBe('#EFF7FF');
    expect(ARSCITY_THEME_PALETTE.destructive).toBe('#133F6E');
    expect(ARSCITY_THEME_PALETTE.border).toBe('#071A38');
    expect(ARSCITY_THEME_PALETTE.card).toBe('#EFF8FD');
    expect(ARSCITY_THEME_PALETTE.background).toBe('#FEFEFE');
  });

  it('2. Navy Blue text on Background passes WCAG AAA (>= 7.0:1)', () => {
    const ratio = getContrastRatio(ARSCITY_THEME_PALETTE.navyBlue, ARSCITY_THEME_PALETTE.background);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
    expect(meetsWcagAA(ARSCITY_THEME_PALETTE.navyBlue, ARSCITY_THEME_PALETTE.background)).toBe(true);
  });

  it('3. Navy Blue text on Card passes WCAG AAA (>= 7.0:1)', () => {
    const ratio = getContrastRatio(ARSCITY_THEME_PALETTE.navyBlue, ARSCITY_THEME_PALETTE.card);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
    expect(meetsWcagAA(ARSCITY_THEME_PALETTE.navyBlue, ARSCITY_THEME_PALETTE.card)).toBe(true);
  });

  it('4. Destructive color (#133F6E) text or button passes high contrast requirements', () => {
    // Destructive on white background
    const ratioOnWhite = getContrastRatio(ARSCITY_THEME_PALETTE.destructive, '#FFFFFF');
    expect(ratioOnWhite).toBeGreaterThanOrEqual(7.0);

    // White text on Destructive button
    const ratioWhiteOnDestructive = getContrastRatio('#FFFFFF', ARSCITY_THEME_PALETTE.destructive);
    expect(ratioWhiteOnDestructive).toBeGreaterThanOrEqual(7.0);
  });

  it('5. index.css defines all 8 core swatches in :root', () => {
    const cssPath = path.resolve(__dirname, '../src/app/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toContain('--seal-blue: #D3EFFA');
    expect(cssContent).toContain('--navy-blue: #0A2E5B');
    expect(cssContent).toContain('--crimson-pink: #FC8296');
    expect(cssContent).toContain('--muted: #EFF7FF');
    expect(cssContent).toContain('--destructive: #133F6E');
    expect(cssContent).toContain('--border-color: #071A38');
    expect(cssContent).toContain('--card-bg: #EFF8FD');
    expect(cssContent).toContain('--background-bg: #FEFEFE');
  });

  it('6. .ios-btn-destructive uses #133F6E theme token', () => {
    const cssPath = path.resolve(__dirname, '../src/app/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toMatch(/\.ios-btn-destructive\s*\{[^}]*#133F6E/);
  });

  it('7. ArscityLogo defines 3-facet ribbon "A" with #072D59, #1F6AB0, #54B4F8, and #1A5B9C', () => {
    const logoPath = path.resolve(__dirname, '../src/ui/components/ArscityLogo.tsx');
    const content = fs.readFileSync(logoPath, 'utf-8');

    expect(content).toContain('#072D59');
    expect(content).toContain('#1F6AB0');
    expect(content).toContain('#54B4F8');
    expect(content).toContain('#1A5B9C');
    expect(content).toContain('ARSCITY');
  });

  it('8. LoginPage renders "Rancang Kota Impian", "di ARSCITY", and single-icon CTA "Mulai Rancang Kota"', () => {
    const loginPath = path.resolve(__dirname, '../src/ui/components/LoginPage.tsx');
    const content = fs.readFileSync(loginPath, 'utf-8');

    expect(content).toContain('Rancang Kota Impian');
    expect(content).toContain('di <span style={{ color: \'#FD6E8E\' }}>ARSCITY</span>');
    expect(content).toContain('Mulai Rancang Kota');
    expect(content).toContain('Lanjutkan Kota');
    expect(content).toContain('Perpustakaan Peta');
    expect(content).toContain('Impor Berkas CAD');
  });
});

