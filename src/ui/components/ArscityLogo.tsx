import React from 'react';

export interface ArscityLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  showText?: boolean;
  textColor?: string;
  badge?: string;
}

/**
 * ArscityLogo - Identitas Visual Resmi Arscity v3.0.0
 *
 * Konsep: "The Tectonic Isometric Monogram A"
 * Dirancang dengan grid aksonometri 30 derajat presisi (Pentagram / Apple Design Team standard).
 *
 * 3 Bidang Geometris Tektonik Terkunci:
 * 1. Bidang Struktur Kiri (Sisi Teduh): Poligon Titanium Gelap (#0F172A -> #1E293B)
 * 2. Bidang Struktur Kanan (Sisi Terkena Cahaya): Poligon Biru Arsitek (#0284C7 -> #0A84FF)
 * 3. Bidang Kantilever Horizontal (Palang Huruf A / Tritisan Tropis): Sian Jernih (#38BDF8)
 *    dengan garis tepi spekular putih 0.75px (rgba(255,255,255,0.45))
 *
 * Membentuk negative space courtyard di bagian tengah yang melambangkan ruang terbuka hijau tropis.
 */
export const ArscityLogo: React.FC<ArscityLogoProps> = ({
  size = 36,
  className = '',
  style = {},
  showText = false,
  textColor,
  badge = '3.0'
}) => {
  const uniqueId = React.useId().replace(/:/g, '');

  const svgElement = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle', ...style }}
      aria-label="Logo Arscity"
    >
      <defs>
        {/* Bidang Struktur Kiri (Sisi Teduh): Titanium Gelap */}
        <linearGradient id={`gradTitanium_${uniqueId}`} x1="0%" y1="100%" x2="60%" y2="0%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        {/* Bidang Struktur Kanan (Sisi Terang): Biru Arsitek Teknis */}
        <linearGradient id={`gradArchitectBlue_${uniqueId}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0A84FF" />
        </linearGradient>

        {/* Bidang Kantilever Horizontal: Sian Jernih dengan kedalaman */}
        <linearGradient id={`gradCantilever_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#7DD3FC" />
        </linearGradient>

        {/* Bayangan halus arsitektural */}
        <filter id={`ambientGlow_${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter={`url(#ambientGlow_${uniqueId})`}>
        {/* 1. Bidang Struktur Kiri (Sisi Teduh) */}
        {/* Poligon monolitik miring ke atas menuju apex */}
        <path
          d="M 20 6.5 L 7.5 33.5 L 13.5 33.5 L 20 17 Z"
          fill={`url(#gradTitanium_${uniqueId})`}
        />

        {/* 2. Bidang Struktur Kanan (Sisi Terkena Cahaya) */}
        {/* Poligon presisi bersilangan di puncak atap, memantulkan cahaya */}
        <path
          d="M 20 5.5 L 22.5 5.5 L 32.5 33.5 L 26.5 33.5 L 20 16 Z"
          fill={`url(#gradArchitectBlue_${uniqueId})`}
        />

        {/* Puncak Bersilangan (Apex Tectonic Lock) */}
        <path
          d="M 18.5 7.5 L 22.5 5.5 L 20 10.5 Z"
          fill="#38BDF8"
          opacity="0.85"
        />

        {/* 3. Bidang Kantilever Horizontal (Palang Tengah Huruf A / Tritisan Tropis) */}
        {/* Pelat isometrik tipis memotong melintang dengan specular edge 0.75px */}
        <path
          d="M 10 22.5 L 30 22.5 L 28.5 25 L 8.5 25 Z"
          fill={`url(#gradCantilever_${uniqueId})`}
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="0.75"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );

  if (!showText) {
    return svgElement;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${Math.max(8, size * 0.25)}px`,
        lineHeight: 1
      }}
    >
      {svgElement}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            fontFamily: 'var(--font-sans, Inter, sans-serif)',
            fontSize: `${Math.max(14, size * 0.45)}px`,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: textColor || 'var(--label, #0F172A)'
          }}
        >
          ARSCITY
        </span>
        {badge && (
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '1.5px 5px',
              borderRadius: '4px',
              background: 'rgba(10, 132, 255, 0.1)',
              color: '#0A84FF',
              border: '1px solid rgba(10, 132, 255, 0.22)',
              lineHeight: 1.1
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
};

export default ArscityLogo;
