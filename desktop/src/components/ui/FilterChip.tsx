import React from 'react';
import { haptic } from '../../utils/haptics';



export interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  isActive,
  onClick,
  className = ''
}) => (
  <button
    type="button"
    onClick={() => {
      onClick();
      haptic.selection();
    }}
    className={`
      flex-1 py-3 rounded-xl text-[14px] font-semibold text-center 
      select-none transition-all duration-300 ease-out active:scale-95
      ${isActive
        ? 'bg-linear-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25'
        : 'bg-(--color-surface) text-(--color-text-secondary) hover:bg-(--color-surface-raised) hover:text-(--color-text-primary) border border-(--color-border)'
      }
      ${className}
    `.trim().replace(/\s+/g, ' ')}
  >
    {label}
  </button>
);
