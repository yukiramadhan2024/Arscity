import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
  style,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const isSm = size === 'sm';

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`segmented-control ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        borderRadius: 'var(--radius-capsule, 9999px)',
        backgroundColor: 'var(--fill-control)',
        border: '1px solid var(--hairline)',
        position: 'relative',
        userSelect: 'none',
        ...style,
      }}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: isSm ? '4px 10px' : '6px 14px',
              borderRadius: 'var(--radius-capsule, 9999px)',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: isSm ? '11px' : '12px',
              fontWeight: 600,
              color: isSelected ? '#FFFFFF' : 'var(--label)',
              cursor: 'pointer',
              zIndex: 1,
              outline: 'none',
              transition: 'color 120ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            {isSelected && (
              <motion.div
                layoutId={`segment-active-${ariaLabel || 'group'}`}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'var(--radius-capsule, 9999px)',
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 2px 6px rgba(0, 122, 255, 0.35)',
                  zIndex: -1,
                }}
              />
            )}
            {option.icon && (
              <Icon
                icon={option.icon}
                size={isSm ? 'xs' : 'sm'}
                style={{ color: isSelected ? '#FFFFFF' : 'inherit' }}
              />
            )}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                style={{
                  padding: '1px 5px',
                  borderRadius: '9999px',
                  backgroundColor: isSelected ? 'var(--accent)' : 'var(--fill-control-active)',
                  color: isSelected ? '#FFFFFF' : 'var(--label-secondary)',
                  fontSize: '10px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
