import React from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
 * Input Component
 * 
 * Standardized text input with consistent styling and states.
 * Follows design system tokens for sizing and colors.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  icon,
  fullWidth = true,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="text-[14px] font-medium text-(--color-text-secondary)"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-(--color-text-tertiary) pointer-events-none">
            {icon}
          </div>
        )}
        
        <input
          id={inputId}
          className={`
            w-full h-12 px-4 
            ${icon ? 'pl-12' : ''}
            bg-(--color-surface-raised) 
            border ${error ? 'border-red-500/50' : 'border-(--color-border)'}
            rounded-xl
            text-(--color-text-primary) text-[14px] font-normal
            placeholder:text-(--color-text-muted)
            focus:outline-none focus:ring-2 
            ${error ? 'focus:ring-red-500/20' : 'focus:ring-purple-500/20'}
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `.trim().replace(/\s+/g, ' ')}
          {...props}
        />
      </div>

      {(error || hint) && (
        <p className={`text-[12px] ${error ? 'text-red-400' : 'text-(--color-text-tertiary)'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
};
