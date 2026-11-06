import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Icon, IconSize } from './Icon';
import { spring } from '../motion/presets';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'default' | 'ghost' | 'primary' | 'danger';

export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  icon: LucideIcon;
  iconSize?: IconSize;
  size?: ButtonSize;
  variant?: ButtonVariant;
  active?: boolean;
  title?: string;
  badge?: string | number;
  'aria-label': string;
}

const sizePxMap: Record<ButtonSize, number> = {
  sm: 28,
  md: 36,
  lg: 44,
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      iconSize,
      size = 'md',
      variant = 'default',
      active = false,
      title,
      badge,
      style,
      disabled,
      className = '',
      ...motionProps
    },
    ref
  ) => {
    const px = sizePxMap[size];

    const getVariantStyles = (): React.CSSProperties => {
      if (active) {
        return {
          backgroundColor: 'var(--accent)',
          color: '#FFFFFF',
          border: '1px solid var(--accent)',
          boxShadow: '0 2px 8px rgba(10, 132, 255, 0.35)',
        };
      }

      switch (variant) {
        case 'primary':
          return {
            backgroundColor: 'var(--accent)',
            color: '#FFFFFF',
            border: '1px solid var(--accent)',
            boxShadow: '0 2px 8px rgba(10, 132, 255, 0.3)',
          };
        case 'danger':
          return {
            backgroundColor: 'rgba(255, 69, 58, 0.12)',
            color: 'var(--bad, #FF453A)',
            border: '1px solid rgba(255, 69, 58, 0.25)',
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: 'var(--label-secondary)',
            border: '1px solid transparent',
          };
        case 'default':
        default:
          return {
            backgroundColor: 'var(--fill-control)',
            color: 'var(--label)',
            border: '1px solid var(--hairline)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          };
      }
    };

    return (
      <motion.button
        ref={ref}
        type="button"
        title={title}
        disabled={disabled}
        whileHover={disabled ? undefined : spring.hover}
        whileTap={disabled ? undefined : spring.press}
        className={`icon-button ${active ? 'active' : ''} ${className}`}
        style={{
          width: `${px}px`,
          height: `${px}px`,
          minWidth: `${px}px`,
          minHeight: `${px}px`,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          position: 'relative',
          padding: 0,
          outline: 'none',
          userSelect: 'none',
          transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
          ...getVariantStyles(),
          ...style,
        }}
        {...motionProps}
      >
        <Icon icon={icon} size={iconSize || (size === 'sm' ? 'xs' : size === 'lg' ? 'md' : 'sm')} />
        {badge !== undefined && badge !== null && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              padding: '1px 5px',
              borderRadius: '9999px',
              backgroundColor: 'var(--accent)',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            {badge}
          </span>
        )}
      </motion.button>
    );
  }
);

IconButton.displayName = 'IconButton';
