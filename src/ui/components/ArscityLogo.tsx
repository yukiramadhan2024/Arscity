import React from 'react';

export interface ArscityLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  showText?: boolean;
  textColor?: string;
}

/**
 * ArscityLogo - Identitas Visual Resmi Arscity
 *
 * Memadukan:
 * 1. Siluet atap Joglo Brunjung Nusantara di bagian depan
 * 2. Struktur gedung pencakar langit modern ber-grid tektonik di belakang
 * 3. Lengkungan busur lintasan matahari tropis emas-biru (#FF9500 -> #0A84FF)
 * 4. Aksen helai daun tropis hijau subur di bagian dasar (#34C759)
 */
export const ArscityLogo: React.FC<ArscityLogoProps> = ({
  size = 36,
  className = '',
  style = {},
  showText = false,
  textColor
}) => {
  const uniqueId = React.useId().replace(/:/g, '');

  const svgElement = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle', ...style }}
      aria-label="Logo Arscity"
    >
      <defs>
        {/* Primary Architect Cobalt Blue Gradient */}
        <linearGradient id={`gradBluePrimary_${uniqueId}`} x1="15%" y1="10%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="40%" stopColor="#0A84FF" />
          <stop offset="100%" stopColor="#004BB7" />
        </linearGradient>

        {/* Deep Isometric Facade Indigo Gradient (3D Depth) */}
        <linearGradient id={`gradBlueDepth_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="60%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Golden Sun & Joglo Apex Gradient */}
        <linearGradient id={`gradGold_${uniqueId}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#FEF08A" />
        </linearGradient>

        {/* Emerald Sustainable Foundation Gradient */}
        <linearGradient id={`gradEmerald_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>

        {/* Glass Specular Glow */}
        <linearGradient id={`gradGlass_${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
        </linearGradient>

        {/* Architectural Drop Shadow */}
        <filter id={`brandShadow_${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter={`url(#brandShadow_${uniqueId})`}>
        {/* 1. Base Groundline / Sustainable Green City Foundation */}
        <rect x="18" y="85" width="64" height="4" rx="2" fill={`url(#gradEmerald_${uniqueId})`} />
        <circle cx="50" cy="87" r="1.5" fill="#FFFFFF" opacity="0.9" />

        {/* 2. Right Isometric Pylon (Depth & Shadow Facet) */}
        <path
          d="M 50 16 L 82 82 L 67 82 L 50 44 L 50 16 Z"
          fill={`url(#gradBlueDepth_${uniqueId})`}
        />

        {/* 3. Left Modern Skyscraper Pylon (Primary Light Facet) */}
        <path
          d="M 50 16 L 18 82 L 33 82 L 50 44 Z"
          fill={`url(#gradBluePrimary_${uniqueId})`}
        />

        {/* Specular Highlight along Left Ridge */}
        <path
          d="M 50 16 L 22 78 L 26 80 L 50 22 Z"
          fill={`url(#gradGlass_${uniqueId})`}
          opacity="0.6"
        />

        {/* 4. Nusantara Joglo Tiered Eaves & Canopy (Iconic Flared Contour) */}
        {/* Tier 1: Lower Flared Eaves */}
        <path
          d="M 22 54 C 32 50 42 46 50 38 C 58 46 68 50 78 54 L 80 50 C 69 45 59 40 50 32 C 41 40 31 45 20 50 Z"
          fill={`url(#gradGold_${uniqueId})`}
        />

        {/* Tier 2: Steep Joglo Brunjung Crown Apex */}
        <path
          d="M 37 32 C 42 27 46 21 50 12 C 54 21 58 27 63 32 L 60 34 C 56 29 53 23 50 16 C 47 23 44 29 40 34 Z"
          fill={`url(#gradGold_${uniqueId})`}
        />

        {/* 5. Horizontal Structural Floor Plate / Bridge */}
        <path
          d="M 30 62 L 70 62 L 66 69 L 34 69 Z"
          fill={`url(#gradBluePrimary_${uniqueId})`}
        />
        <line x1="32" y1="63" x2="68" y2="63" stroke="#93C5FD" strokeWidth="1" opacity="0.8" />

        {/* 6. Central Gateway / Light Portal (Negative Space Spire) */}
        <polygon
          points="50,44 43,62 57,62"
          fill="#38BDF8"
          opacity="0.85"
        />
        <polygon
          points="50,47 45,61 55,61"
          fill="#F0F9FF"
          opacity="0.95"
        />

        {/* 7. Wuwungan Ridge Crown Finial (Apex Symbol of Excellence) */}
        <path
          d="M 47 10 L 50 6 L 53 10 L 50 12 Z"
          fill="#FEF08A"
        />
        <circle cx="50" cy="6" r="2.2" fill="#F59E0B" />
        <circle cx="50" cy="6" r="1.2" fill="#FFFBEB" />
      </g>
    </svg>
  );

  if (!showText) {
    return svgElement;
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: `${Math.max(8, size * 0.25)}px` }}>
      {svgElement}
      <span
        style={{
          fontFamily: 'var(--font-sans, Inter, sans-serif)',
          fontSize: `${Math.max(14, size * 0.45)}px`,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: textColor || 'var(--label)'
        }}
      >
        <span>Ars</span>
        <span style={{ color: '#0A84FF' }}>city</span>
      </span>
    </div>
  );
};

export default ArscityLogo;
