import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-(--color-glass-surface) backdrop-blur-3xl border border-(--color-glass-border) shadow-lg shadow-(--color-glass-shadow)',
  elevated: 'bg-(--color-highlight) backdrop-blur-3xl border border-(--color-glass-border) shadow-xl shadow-(--color-glass-shadow)',
  outlined: 'bg-transparent border border-(--color-border)',
  ghost: 'bg-(--color-glass-surface) hover:bg-(--color-highlight) transition-colors',
};

const paddingStyles: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
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
        rounded-2xl
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${interactive ? 'cursor-pointer hover:bg-white/10 active:scale-[0.98] active:bg-white/15 transition-all duration-300 transform-gpu' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </div>
  );
};
