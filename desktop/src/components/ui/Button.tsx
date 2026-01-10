import React from 'react';
import { haptic } from '../../utils/haptics';

/* ─────────────────────────────────────────────────────────────────────────────
 * Button Component
 * 
 * Standardized button primitive with consistent sizing, touch targets,
 * and visual feedback across the app.
 * 
 * Variants:
 * - primary: Purple filled - main CTAs
 * - secondary: Dark filled - secondary actions
 * - ghost: Transparent - tertiary/navigation
 * - danger: Red - destructive actions
 * ───────────────────────────────────────────────────────────────────────────── */

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
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-purple-500 text-white 
    hover:bg-purple-600 
    active:bg-purple-700 active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  secondary: `
    bg-zinc-800 text-white border border-white/5
    hover:bg-zinc-700 
    active:bg-zinc-600 active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  ghost: `
    bg-transparent text-zinc-400
    hover:bg-white/5 hover:text-white
    active:bg-white/10 active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  danger: `
    bg-red-500/10 text-red-400 border border-red-500/20
    hover:bg-red-500/20 hover:text-red-300
    active:bg-red-500/30 active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] rounded-lg gap-1.5',      // 36px - small buttons
  md: 'h-12 px-4 text-[15px] rounded-xl gap-2',       // 48px - standard
  lg: 'h-14 px-6 text-[16px] rounded-xl gap-2.5',     // 56px - large CTAs
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-5 h-5',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  hapticFeedback = true,
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
        ${fullWidth ? 'w-full' : ''}
        ${loading ? 'opacity-70 cursor-wait' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className={`${iconSizes[size]} animate-spin`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </span>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className={iconSizes[size]}>{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className={iconSizes[size]}>{icon}</span>
          )}
        </>
      )}
    </button>
  );
};
