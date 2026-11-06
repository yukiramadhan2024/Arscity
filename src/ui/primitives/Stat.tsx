import React from 'react';

export interface StatProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'warn' | 'bad' | 'accent' | 'neutral';
  progress?: number; // 0 to 100 percentage
  maxProgress?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  unit,
  status = 'neutral',
  progress,
  maxProgress = 100,
  className = '',
  style,
}) => {
  const getStatusColor = (): string => {
    switch (status) {
      case 'good':
        return 'var(--good, #30D158)';
      case 'warn':
        return 'var(--warn, #FF9F0A)';
      case 'bad':
        return 'var(--bad, #FF453A)';
      case 'accent':
        return 'var(--accent, #0A84FF)';
      case 'neutral':
      default:
        return 'var(--label)';
    }
  };

  const percentage = progress !== undefined ? Math.min(100, Math.max(0, (progress / maxProgress) * 100)) : undefined;

  return (
    <div
      className={`stat-item ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--label-secondary)', letterSpacing: '0.01em' }}>
          {label}
        </span>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '2px' }}>
          <span
            className="num"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: getStatusColor(),
              fontVariantNumeric: 'tabular-nums',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {value}
          </span>
          {unit && (
            <span style={{ fontSize: '10px', color: 'var(--label-tertiary)', marginLeft: '1px' }}>
              {unit}
            </span>
          )}
        </div>
      </div>

      {percentage !== undefined && (
        <div
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '9999px',
            backgroundColor: 'var(--fill-control-active)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              borderRadius: '9999px',
              backgroundColor: getStatusColor(),
              transition: 'width 250ms ease-out',
            }}
          />
        </div>
      )}
    </div>
  );
};
