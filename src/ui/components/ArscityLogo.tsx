import React from 'react';

export interface ArscityLogoProps {
  iconOnly?: boolean;
  size?: number;
  variant?: 'dark' | 'light';
  showText?: boolean;
  className?: string;
  style?: React.CSSProperties;
  textColor?: string;
  badge?: string;
}

export const ArscityLogo: React.FC<ArscityLogoProps> = ({
  iconOnly = false,
  size = 32,
  variant = 'dark',
  showText = true,
  className = '',
  style = {},
  textColor,
  badge,
}) => {
  const primaryColor = textColor || (variant === 'dark' ? '#072D59' : '#DBF2FC');
  const accentColor = '#FD6E8E';
  const shouldRenderText = showText && !iconOnly;
  const gradId = `arscityTowerGrad_${variant}_${size}`;

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.round(size * 0.35),
        userSelect: 'none',
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: 'block' }}
        aria-label="Logo Arscity"
      >
        <defs>
          <linearGradient
            id={gradId}
            x1="11"
            y1="9.5"
            x2="29"
            y2="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#DBF2FC" />
            <stop offset="100%" stopColor={variant === 'dark' ? '#8ECAE6' : '#DBF2FC'} />
          </linearGradient>
        </defs>

        {/* Bingkai Dasar Persegi Arsitektur Presisi */}
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="8"
          fill={variant === 'dark' ? '#072D59' : 'rgba(219, 242, 252, 0.12)'}
          stroke={variant === 'dark' ? '#072D59' : 'rgba(219, 242, 252, 0.35)'}
          strokeWidth="1.5"
        />

        {/* Pilar Kiri Menara Isometrik (Membentuk Kaki Kiri A) */}
        <path
          d="M11 30V15L20 9.5V24.5L11 30Z"
          fill="#DBF2FC"
        />

        {/* Pilar Kanan Menara Isometrik (Membentuk Kaki Kanan A) */}
        <path
          d="M29 30V15L20 9.5V24.5L29 30Z"
          fill={variant === 'dark' ? '#8ECAE6' : '#DBF2FC'}
          fillOpacity="0.75"
        />

        {/* Balok Kantilever Melintang (Palang Huruf A & Aksen Crimson Pink) */}
        <path
          d="M9 22.5L20 16L31 22.5L20 29L9 22.5Z"
          fill={accentColor}
        />

        {/* Void Struktur Tengah */}
        <path
          d="M16.5 22.5L20 20.3L23.5 22.5L20 24.7L16.5 22.5Z"
          fill="#072D59"
        />
      </svg>

      {shouldRenderText && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontWeight: 800,
              fontSize: Math.round(size * 0.56),
              letterSpacing: '-0.02em',
              color: primaryColor,
              lineHeight: 1,
            }}
          >
            ARSCITY
          </span>
          {badge && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                fontSize: Math.round(size * 0.28),
                color: accentColor,
                letterSpacing: '0.05em',
              }}
            >
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ArscityLogo;
