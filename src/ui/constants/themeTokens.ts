/**
 * Arscity Design Tokens - iOS 27 Liquid Glass Refined
 * Single Source of Truth for Design System tokens:
 * - Colors (Single System Blue #007AFF accent, semantic tokens)
 * - 4px concentric grid spacing
 * - Concentric radii hierarchy
 * - Multi-layer shadows
 * - Apple System font with local Inter fallback
 * - Motion curves
 */

export const THEME_TOKENS = {
  colors: {
    accent: '#007AFF',
    accentHover: '#0066D6',
    accentSubtle: 'rgba(0, 122, 255, 0.12)',

    // Semantic Status Tokens
    good: '#30D158',
    goodSubtle: 'rgba(48, 209, 88, 0.12)',
    warn: '#FF9F0A',
    warnSubtle: 'rgba(255, 159, 10, 0.12)',
    bad: '#FF453A',
    badSubtle: 'rgba(255, 69, 58, 0.12)',

    // Neutral Text (WCAG AA & AAA compliant contrast)
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',

    // Liquid Glass Surfaces
    glassBackground: 'rgba(244, 247, 251, 0.94)',
    glassBorder: 'rgba(255, 255, 255, 0.95)',
    glassDarkBackground: 'rgba(15, 23, 42, 0.85)',
    glassDarkBorder: 'rgba(255, 255, 255, 0.15)',

    surfaceSolid: '#FFFFFF',
    surfaceSubtle: '#F8FAFC',
    borderSubtle: '#E2E8F0',
    borderStrong: '#CBD5E1'
  },

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

  // Typography (Apple System Font with Inter fallback)
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', sans-serif",
    sizes: {
      dim3D: '11px',
      xs: '12px',
      sm: '13px',
      base: '14px',
      md: '15px',
      lg: '20px'
    },
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },

  // Liquid Motion
  motion: {
    appleSpring: 'cubic-bezier(0.25, 1, 0.5, 1)',
    fast: '0.15s ease',
    normal: '0.25s ease'
  }
} as const;
