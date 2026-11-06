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
 * ArscityLogo - Identitas Visual Resmi Arscity
 *
 * Ikon pita geometris huruf "A" 3D dengan 3 faset warna presisi:
 * 1. Kaki Kanan: Navy Blue (#072D59)
 * 2. Lipatan Puncak Atas (Apex): Cerulean Blue (#1F6AB0)
 * 3. Tengah Kiri (Mid Facet): Biru Muda Cerah / Seal Cyan (#54B4F8)
 * 4. Kaki Kiri Bawah: Biru Medium (#1A5B9C)
 *
 * Teks Wordmark: "ARSCITY" huruf besar, font-weight 800, letter-spacing 0.12em.
 */
export const ArscityLogo: React.FC<ArscityLogoProps> = ({
  size = 36,
  className = '',
  style = {},
  showText = true,
  textColor = '#072D59',
  badge,
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', ...style }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
        aria-label="Logo Arscity"
      >
        <defs>
          <linearGradient id="arscityApexShine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#54B4F8" />
            <stop offset="100%" stopColor="#1F6AB0" />
          </linearGradient>
        </defs>

        {/* Kaki Kanan (Navy Blue #072D59) dengan sudut membulat */}
        <path
          d="M 18.8 5.2 C 19.6 3.8 21.4 3.8 22.2 5.2 L 34.8 31.6 C 35.8 33.6 34.4 35.6 32 35.6 L 25.2 35.6 C 23.8 35.6 22.6 34.8 21.8 33.4 L 19.2 28 L 18.4 21.6 L 18.8 5.2 Z"
          fill="#072D59"
        />

        {/* Lipatan Puncak Atas / Apex (Cerulean Blue #1F6AB0) */}
        <path
          d="M 18.8 5.2 C 19.6 3.8 21.4 3.8 22.2 5.2 L 19.2 15.2 L 14 15.2 L 18.8 5.2 Z"
          fill="#1F6AB0"
        />

        {/* Sisi Kiri Tengah / Mid Facet (Bright Seal Cyan #54B4F8) */}
        <path
          d="M 14 15.2 L 19.2 15.2 L 17.6 24.4 L 9.2 24.4 Z"
          fill="#54B4F8"
        />

        {/* Kaki Kiri Bawah (Medium Blue #1A5B9C) dengan sudut membulat */}
        <path
          d="M 9.2 24.4 L 17.6 24.4 L 13.8 33.4 C 13 34.8 11.8 35.6 10.4 35.6 L 7.6 35.6 C 5.2 35.6 3.8 33.6 4.8 31.6 L 9.2 24.4 Z"
          fill="#1A5B9C"
        />
      </svg>

      {showText && (
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: `${size * 0.58}px`,
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: textColor,
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          ARSCITY
        </span>
      )}

      {badge && (
        <span
          style={{
            fontSize: `${Math.max(10, size * 0.28)}px`,
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '9999px',
            background: '#FD6E8E',
            color: '#FFFFFF',
            marginLeft: '2px',
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
};
