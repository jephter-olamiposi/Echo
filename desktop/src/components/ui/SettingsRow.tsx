import React from 'react';
import { Icons } from '../Icons';
import { haptic } from '../../utils/haptics';

/* ─────────────────────────────────────────────────────────────────────────────
 * SettingsRow Component
 * 
 * Single settings row following iOS/Android patterns.
 * 56px height for proper touch target (Apple HIG compliant).
 * ───────────────────────────────────────────────────────────────────────────── */

export interface SettingsRowProps {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  value?: string;
  onClick?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  disabled?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconBg = 'bg-(--color-surface) text-(--color-text-tertiary)',
  label,
  value,
  onClick,
  destructive = false,
  showChevron = true,
  disabled = false,
}) => {
  const handleClick = () => {
    if (disabled || !onClick) return;
    haptic.light();
    onClick();
  };

  return (
    <button
      className={`
        flex items-center gap-3 px-4 min-h-14 w-full text-left
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-white/5'}
        transition-colors
      `.trim().replace(/\s+/g, ' ')}
      onClick={handleClick}
      disabled={disabled}
      type="button"
    >
      {/* Icon Container */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <div className="w-4.5 h-4.5">{icon}</div>
      </div>
      
      {/* Label */}
      <span className={`flex-1 text-[16px] font-normal ${destructive ? 'text-red-400' : 'text-(--color-text-primary)'}`}>
        {label}
      </span>
      
      {/* Value */}
      {value && (
        <span className="text-[15px] text-(--color-text-tertiary) truncate max-w-[40%]">
          {value}
        </span>
      )}
      
      {/* Chevron */}
      {showChevron && !destructive && onClick && (
        <div className="w-4 h-4 text-(--color-text-tertiary) ml-1 shrink-0">
          {Icons.chevron}
        </div>
      )}
    </button>
  );
};
