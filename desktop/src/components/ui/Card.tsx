import React from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
 * Card Component
 * 
 * Surface container with consistent styling.
 * Used for grouping related content.
 * ───────────────────────────────────────────────────────────────────────────── */

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-(--color-surface-raised) border border-(--color-border)',
  elevated: 'bg-(--color-surface-raised) border border-(--color-border) shadow-xl',
  outlined: 'bg-transparent border border-(--color-border)',
  ghost: 'bg-(--color-surface-raised)/50',
};

const paddingStyles: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`
        rounded-xl
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${interactive ? 'cursor-pointer active:scale-[0.99] active:bg-(--color-surface) transition-all' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </div>
  );
};
