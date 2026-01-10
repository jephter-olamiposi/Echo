import React from 'react';
import { haptic } from '../../utils/haptics';

/* ─────────────────────────────────────────────────────────────────────────────
 * QuickAction Component
 * 
 * Action tile with icon and label for dashboard quick actions.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface QuickActionProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  onClick: () => void;
}

export const QuickAction: React.FC<QuickActionProps> = ({ 
  icon, 
  iconBg, 
  label, 
  onClick 
}) => (
  <button 
    className="flex flex-col items-center justify-center gap-2.5 p-4 bg-(--color-surface-raised) border border-(--color-border) rounded-xl active:scale-[0.98] active:bg-(--color-surface) hover:border-(--color-border-focus) hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-200"
    onClick={() => { haptic.light(); onClick(); }}
  >
    <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${iconBg}`}>
      <div className="w-5 h-5">{icon}</div>
    </div>
    <span className="text-[13px] font-medium text-(--color-text-secondary)">{label}</span>
  </button>
);
