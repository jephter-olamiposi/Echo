import React from 'react';
import { haptic } from '../../utils/haptics';

/* ─────────────────────────────────────────────────────────────────────────────
 * NavItem Component
 * 
 * Bottom navigation item with icon, label, and optional badge.
 * Supports active/inactive states with proper touch targets.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface NavItemProps {
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

export const NavItem: React.FC<NavItemProps> = ({ 
  icon, 
  activeIcon, 
  label, 
  isActive, 
  onClick,
  badge 
}) => (
  <button 
    className={`
      relative flex flex-col items-center justify-center gap-1 
      min-w-16 min-h-12 
      transition-all duration-200
      ${isActive ? 'text-purple-400' : 'text-(--color-text-muted)'}
    `.trim().replace(/\s+/g, ' ')}
    onClick={() => {
      if (!isActive) {
        haptic.selection();
        onClick();
      }
    }}
  >
    {/* Active indicator glow - Removed as per user request */}
    
    <span className="relative w-6 h-6">
      {isActive && activeIcon ? activeIcon : icon}
    </span>
    <span className="relative text-[10px] font-medium">{label}</span>
    
    {/* Badge */}
    {badge !== undefined && badge > 0 && (
      <span className="absolute top-0.5 right-2 min-w-4 h-4 bg-red-500 text-white text-[9px] font-semibold rounded-full flex items-center justify-center px-1">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
);
