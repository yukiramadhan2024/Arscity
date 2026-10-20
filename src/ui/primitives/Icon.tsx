import React from 'react';
import { LucideIcon } from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | number;

export interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

const sizeMap: Record<string, number> = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
};

export const Icon: React.FC<IconProps> = ({
  icon: LucideComp,
  size = 'sm',
  strokeWidth = 1.75,
  className = '',
  style,
  color,
}) => {
  const pixelSize = typeof size === 'number' ? size : (sizeMap[size] || 16);

  return (
    <LucideComp
      size={pixelSize}
      strokeWidth={strokeWidth}
      className={`inline-icon ${className}`}
      style={{
        flexShrink: 0,
        color: color || 'currentColor',
        ...style,
      }}
    />
  );
};
