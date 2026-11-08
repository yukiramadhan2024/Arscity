import React from 'react';

export interface ArscityLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  showText?: boolean;
  iconOnly?: boolean;
  variant?: 'dark' | 'light';
  textColor?: string;
  badge?: string;
}

/**
 * ArscityLogo - Minimalist Geometric City-Builder Emblem
 *
 * Dual-contrast architectural "A" prism & urban skyline mark:
 * - On Navy Blue (#072D59) dark surfaces (`variant="dark"`): Seal Blue (#DBF2FC) & Crimson Pink (#FD6E8E)
 * - On Light / Seal Blue (#DBF2FC) surfaces (`variant="light"`): Navy Blue (#072D59) & Crimson Pink (#FD6E8E)
 */
export const ArscityLogo: React.FC<ArscityLogoProps> = ({
  size = 36,
  className = '',
  style = {},
  showText = true,
  iconOnly = false,
  variant = 'light',
  textColor,
  badge,
}) => {
  const isDarkSurface = variant === 'dark';
  const primaryColor = isDarkSurface ? '#DBF2FC' : '#072D59';
  const secondaryColor = isDarkSurface ? '#9ADCF9' : '#133F6E';
  const accentColor = '#FD6E8E';
  const resolvedTextColor = textColor || (isDarkSurface ? '#DBF2FC' : '#072D59');
  const shouldRenderText = showText && !iconOnly;
  const gradId = `arscityPrism_${variant}_${size}`;

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
        style={{ flexShrink: 0, display: 'block' }}
        aria-label="Logo Arscity"
      >
        <defs>
          <linearGradient id={gradId} x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
        </defs>

        {/* Left Ascending Architectural Monolith */}
        <path
          d="M 8 33.5 L 18.2 7.2 C 18.9 5.5 21.1 5.5 21.8 7.2 L 24.4 13.8 L 16.5 33.5 Z"
          fill={`url(#${gradId})`}
        />

        {/* Right Structural Buttress */}
        <path
          d="M 24.4 13.8 L 32 33.5 L 25.4 33.5 L 20.6 20.6 Z"
          fill={secondaryColor}
        />

        {/* Dynamic Crimson Pink Canton Crossbar / Roof Prism Accent */}
        <path
          d="M 15.2 23.2 L 26.8 23.2 L 28.4 27.6 L 13.6 27.6 Z"
          fill={accentColor}
        />

        {/* Minimal Apex Beacon Triangle */}
        <path
          d="M 20 6 L 23.4 13.6 L 16.6 13.6 Z"
          fill={accentColor}
        />
      </svg>

      {shouldRenderText && (
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: `${size * 0.56}px`,
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: resolvedTextColor,
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
