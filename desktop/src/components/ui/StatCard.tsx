import React from 'react';
import { haptic } from '../../utils/haptics';

/* ─────────────────────────────────────────────────────────────────────────────
 * StatCard Component
 * 
 * Displays a stat value with label, optionally interactive.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface StatCardProps {
  value: string | number;
  label: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  value, 
  label, 
  onClick 
}) => (
  <div 
    className={`
      flex flex-col items-center gap-0.5 flex-1 py-2
      ${onClick ? 'cursor-pointer active:opacity-70 hover:bg-(--color-surface-raised) rounded-lg transition-colors' : ''}
    `.trim().replace(/\s+/g, ' ')}
    onClick={onClick ? () => { haptic.light(); onClick(); } : undefined}
  >
    <span className="text-xl font-semibold text-(--color-text-primary) tabular-nums">{value}</span>
    <span className="text-[12px] text-(--color-text-tertiary)">{label}</span>
  </div>
);
