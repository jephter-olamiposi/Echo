import React from 'react';
import { haptic } from '../../utils/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  hapticFeedback?: boolean;
  square?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-linear-to-br from-purple-500 to-purple-600 text-white 
    shadow-[0_8px_16px_-4px_rgba(168,85,247,0.3)]
    hover:from-purple-400 hover:to-purple-500 hover:shadow-[0_12px_20px_-4px_rgba(168,85,247,0.4)]
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  secondary: `
    bg-(--color-glass-surface) backdrop-blur-xl text-(--color-glass-text) border border-(--color-glass-border)
    hover:bg-(--color-highlight) hover:border-(--color-border-focus)
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  ghost: `
    bg-transparent text-(--color-text-secondary)
    hover:bg-(--color-glass-surface) hover:text-(--color-text-primary)
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  danger: `
    bg-red-500/10 text-red-500 border border-red-500/20
    hover:bg-red-500/20 hover:text-red-600 hover:border-red-500/30
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
    /* Light Mode Specific Overwrite */
    [data-theme='light']_&:bg-red-50
    [data-theme='light']_&:border-red-100
    [data-theme='light']_&:hover:bg-red-100
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] rounded-lg gap-1.5',
  md: 'h-12 px-5 text-[15px] rounded-xl gap-2',
  lg: 'h-14 px-8 text-[16px] rounded-2xl gap-2.5',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  hapticFeedback = true,
  square = false,
  className = '',
  children,
  onClick,
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (hapticFeedback && !disabled && !loading) {
      haptic.light();
    }
    onClick?.(e);
  };

  const baseStyles = `
    inline-flex items-center justify-center
    font-medium transition-all duration-200
    select-none touch-manipulation
  `;

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${square ? 'aspect-square !px-0' : ''}
        ${fullWidth ? 'w-full' : ''}
        ${loading ? 'opacity-70 cursor-wait' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className={`${iconSizes[size]} animate-spin flex items-center justify-center`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </span>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className={`${iconSizes[size]} flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:block`}>
              {icon}
            </span>
          )}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && (
            <span className={`${iconSizes[size]} flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:block`}>
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
};
