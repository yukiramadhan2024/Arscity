import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type GlassVariant = 'panel' | 'capsule' | 'inset' | 'card' | 'floating';

export interface GlassPanelProps extends Omit<HTMLMotionProps<'div'>, 'style'> {
  variant?: GlassVariant;
  interactive?: boolean;
  elevation?: 'low' | 'normal' | 'high';
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      variant = 'panel',
      interactive = false,
      elevation = 'normal',
      className = '',
      style,
      children,
      ...motionProps
    },
    ref
  ) => {
    const getVariantStyles = (): React.CSSProperties => {
      switch (variant) {
        case 'capsule':
          return {
            borderRadius: 'var(--radius-capsule, 9999px)',
            padding: '6px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--hairline)',
            boxShadow: 'var(--shadow-glass)',
          };
        case 'inset':
          return {
            borderRadius: 'var(--radius-md, 12px)',
            padding: '10px 14px',
            background: 'var(--fill-control)',
            border: '1px solid var(--hairline)',
          };
        case 'card':
          return {
            borderRadius: 'var(--radius-lg, 16px)',
            padding: '16px',
            background: 'var(--fill-control)',
            border: '1px solid var(--hairline)',
            boxShadow: 'var(--shadow-card)',
          };
        case 'floating':
          return {
            borderRadius: 'var(--radius-xl, 20px)',
            padding: '14px',
            background: 'var(--surface-raised)',
            border: '1px solid var(--hairline)',
            boxShadow: 'var(--shadow-modal)',
          };
        case 'panel':
        default:
          return {
            borderRadius: 'var(--radius-xl, 20px)',
            padding: '14px',
            background: 'var(--surface)',
            border: '1px solid var(--hairline)',
            boxShadow: 'var(--shadow-glass)',
          };
      }
    };

    const baseStyles: React.CSSProperties = {
      backdropFilter: 'blur(var(--glass-blur, 20px))',
      WebkitBackdropFilter: 'blur(var(--glass-blur, 20px))',
      pointerEvents: interactive ? 'auto' : undefined,
      color: 'var(--label)',
      boxSizing: 'border-box',
      ...getVariantStyles(),
      ...style,
    };

    return (
      <motion.div
        ref={ref}
        className={`glass-panel ${className}`}
        style={baseStyles as any}
        {...motionProps}
      >
        {children}
      </motion.div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';
