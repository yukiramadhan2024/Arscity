/**
 * Arscity v4.0 Design Tokens - Apple VisionOS Spatial Frosted Glass
 * Single Source of Truth for Design System tokens:
 * - Colors (Apple Spatial Frosted Glass Light identity + legacy token math exports)
 * - 4px concentric grid spacing
 * - Concentric radii hierarchy
 * - Multi-layer soft spatial shadows
 * - Strict 2-Font System: Plus Jakarta Sans & JetBrains Mono
 * - Motion curves
 */

export interface ThemeColors {
  label: string;
  labelSecondary: string;
  labelTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  separator: string;
  surface: string;
  surfaceSolid: string;
  surfaceRaised: string;
  surfaceSubtle: string;
  fillControl: string;
  borderGlass: string;
  borderSubtle: string;
  borderStrong: string;
  accent: string;
  accentHover: string;
  accentSubtle: string;
  good: string;
  goodSubtle: string;
  warn: string;
  warnSubtle: string;
  bad: string;
  badSubtle: string;
  onAccent: string;
}

/**
 * Official 8-Color Palette System for Arscity (COLORS Specification Card):
 * 1. Seal Blue: #D3EFFA (alias #DBF2FC)
 * 2. Navy Blue: #0A2E5B (alias #072D59)
 * 3. Crimson Pink: #FC8296 (alias #FD6E8E)
 * 4. Muted: #EFF7FF
 * 5. Destructive: #133F6E
 * 6. Border: #071A38
 * 7. Card: #EFF8FD
 * 8. Background: #FEFEFE
 */
export const ARSCITY_THEME_PALETTE = {
  sealBlue: '#D3EFFA',
  navyBlue: '#0A2E5B',
  crimsonPink: '#FC8296',
  muted: '#EFF7FF',
  destructive: '#133F6E',
  border: '#071A38',
  card: '#EFF8FD',
  background: '#FEFEFE',

  // Semantics & translucent glass
  sealBlueGlass: 'rgba(211, 239, 250, 0.90)',
  navyBluePanel: 'rgba(10, 46, 91, 0.94)',
  cardGlass: 'rgba(239, 248, 253, 0.92)',
  mutedGlass: 'rgba(239, 247, 255, 0.90)',
  borderGlass: 'rgba(7, 26, 56, 0.22)',
  destructiveGlass: 'rgba(19, 63, 110, 0.16)',
  crimsonPinkHover: '#F45579',
  crimsonPinkShadow: '0 4px 14px rgba(252, 130, 150, 0.40)',
} as const;

export const TRIAD_PALETTE = {
  sealBlue: '#DBF2FC',
  sealBlueGlass: 'rgba(219, 242, 252, 0.90)',
  navyBlue: '#072D59',
  navyBluePanel: 'rgba(7, 45, 89, 0.94)',
  navyBorder: 'rgba(7, 45, 89, 0.22)',
  navyShadow: '0 12px 32px rgba(7, 45, 89, 0.18)',
  crimsonPink: '#FD6E8E',
  crimsonPinkHover: '#F45579',
  crimsonPinkShadow: '0 4px 12px rgba(7, 45, 89, 0.08)'
} as const;

export const LIGHT_THEME_TOKENS: ThemeColors = {
  label: '#072D59',
  labelSecondary: '#0F3D75',
  labelTertiary: '#1A4B84',
  textPrimary: '#072D59',
  textSecondary: '#0F3D75',
  textTertiary: '#1A4B84',

  separator: 'rgba(7, 45, 89, 0.14)',
  surface: 'rgba(219, 242, 252, 0.90)',
  surfaceSolid: '#DBF2FC',
  surfaceRaised: '#EBF8FE',
  surfaceSubtle: '#DBF2FC',
  fillControl: 'rgba(7, 45, 89, 0.08)',

  borderGlass: 'rgba(7, 45, 89, 0.22)',
  borderSubtle: 'rgba(7, 45, 89, 0.14)',
  borderStrong: 'rgba(7, 45, 89, 0.22)',

  accent: '#FD6E8E',
  accentHover: '#F45579',
  accentSubtle: 'rgba(253, 110, 142, 0.16)',

  good: '#10B981',
  goodSubtle: 'rgba(16, 185, 129, 0.14)',
  warn: '#F59E0B',
  warnSubtle: 'rgba(245, 158, 11, 0.14)',
  bad: '#EF4444',
  badSubtle: 'rgba(239, 68, 68, 0.14)',
  onAccent: '#FFFFFF'
};

export const DARK_THEME_TOKENS: ThemeColors = {
  label: '#DBF2FC',
  labelSecondary: '#B8E3F8',
  labelTertiary: '#8CCCF0',
  textPrimary: '#DBF2FC',
  textSecondary: '#B8E3F8',
  textTertiary: '#8CCCF0',

  separator: 'rgba(219, 242, 252, 0.22)',
  surface: 'rgba(7, 45, 89, 0.94)',
  surfaceSolid: '#072D59',
  surfaceRaised: '#0B3B73',
  surfaceSubtle: '#052244',
  fillControl: 'rgba(219, 242, 252, 0.14)',

  borderGlass: 'rgba(219, 242, 252, 0.22)',
  borderSubtle: 'rgba(219, 242, 252, 0.16)',
  borderStrong: 'rgba(219, 242, 252, 0.28)',

  accent: '#FD6E8E',
  accentHover: '#FF85A0',
  accentSubtle: 'rgba(253, 110, 142, 0.22)',

  good: '#30D158',
  goodSubtle: 'rgba(48, 209, 88, 0.18)',
  warn: '#FF9F0A',
  warnSubtle: 'rgba(255, 159, 10, 0.18)',
  bad: '#FF453A',
  badSubtle: 'rgba(255, 69, 58, 0.18)',
  onAccent: '#FFFFFF'
};

export const THEME_TOKENS = {
  colors: LIGHT_THEME_TOKENS,
  light: LIGHT_THEME_TOKENS,
  dark: DARK_THEME_TOKENS,

  // 4px Concentric Spacing Grid
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px'
  },

  // Concentric Radius Hierarchy
  radius: {
    button: '10px',
    card: '14px',
    panel: '18px',
    modal: '22px',
    capsule: '9999px'
  },

  // Multi-layer Apple Elevations
  shadows: {
    sm: '0 1px 3px rgba(15, 23, 42, 0.06)',
    md: '0 4px 12px rgba(15, 23, 42, 0.08)',
    glass: '0 12px 36px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.08)',
    popover: '0 16px 40px rgba(15, 23, 42, 0.14)',
    modal: '0 24px 60px rgba(15, 23, 42, 0.20)'
  },

  // Typography (Strict 2-Font System: Plus Jakarta Sans + JetBrains Mono)
  typography: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontMono: "'JetBrains Mono', monospace",
    sizes: {
      dim3D: '11px',
      xs: '12px',
      sm: '13px',
      base: '14px',
      md: '15px',
      lg: '20px'
    },
    weights: {
      regular: 500,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    }
  },

  // Liquid Motion
  motion: {
    appleSpring: 'cubic-bezier(0.25, 1, 0.5, 1)',
    fast: '0.15s ease',
    normal: '0.25s ease'
  }
} as const;

/**
 * Parses color (hex e.g. #FFFFFF or rgb/rgba) to relative luminance according to WCAG 2.1 specs.
 */
export function getRelativeLuminance(colorStr: string): number {
  colorStr = colorStr.trim();
  let r = 0, g = 0, b = 0;

  if (colorStr.startsWith('#')) {
    let hex = colorStr.replace('#', '').trim();
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  } else {
    const rgbaMatch = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d\.]+))?\s*\)/);
    if (rgbaMatch) {
      r = parseInt(rgbaMatch[1], 10) / 255;
      g = parseInt(rgbaMatch[2], 10) / 255;
      b = parseInt(rgbaMatch[3], 10) / 255;
    }
  }

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const rLin = toLinear(r);
  const gLin = toLinear(g);
  const bLin = toLinear(b);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calculates WCAG 2.1 contrast ratio between two colors.
 */
export function getContrastRatio(c1: string, c2: string): number {
  const l1 = getRelativeLuminance(c1);
  const l2 = getRelativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Evaluates whether contrast meets WCAG AA (4.5:1 for normal text, 3.0:1 for large text/controls).
 */
export function meetsWcagAA(foreground: string, background: string, isControlOrLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  const minRatio = isControlOrLargeText ? 3.0 : 4.5;
  return ratio >= minRatio;
}

