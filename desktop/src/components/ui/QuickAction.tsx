import React from 'react';
import { haptic } from '../../utils/haptics';

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
    className="flex flex-col items-center justify-center gap-3 p-5 bg-(--color-glass-surface) backdrop-blur-3xl border border-(--color-glass-border) rounded-3xl active:scale-[0.96] active:bg-(--color-highlight) hover:border-(--color-border-focus) transition-all duration-300 group shadow-lg shadow-(--color-glass-shadow)"
    onClick={() => { haptic.light(); onClick(); }}
  >
    <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${iconBg} bg-(--color-glass-surface) border border-(--color-glass-border) shadow-inner group-active:scale-95 transition-transform duration-300`}>
      <div className="w-6 h-6">{icon}</div>
    </div>
    <span className="text-[14px] font-bold text-(--color-glass-text-muted) group-hover:text-(--color-glass-text) transition-colors tracking-tight">{label}</span>
  </button>
);
