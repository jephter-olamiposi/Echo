import React from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
 * StatusBadge Component
 * 
 * Visual indicator for connection/sync status.
 * Includes animated pulse for active states.
 * ───────────────────────────────────────────────────────────────────────────── */

export type StatusType = 'online' | 'offline' | 'connecting' | 'syncing' | 'error';

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

const statusConfig: Record<StatusType, { dotColor: string; bgColor: string; textColor: string; label: string; pulse: boolean }> = {
  online: {
    dotColor: 'bg-green-500',
    bgColor: 'bg-(--color-surface-raised) border-(--color-border)',
    textColor: 'text-(--color-text-secondary)',
    label: 'Connected',
    pulse: true,
  },
  offline: {
    dotColor: 'bg-zinc-500',
    bgColor: 'bg-(--color-surface-raised) border-(--color-border)',
    textColor: 'text-(--color-text-tertiary)',
    label: 'Offline',
    pulse: false,
  },
  connecting: {
    dotColor: 'bg-amber-500',
    bgColor: 'bg-(--color-surface-raised) border-(--color-border)',
    textColor: 'text-(--color-text-secondary)',
    label: 'Connecting...',
    pulse: true,
  },
  syncing: {
    dotColor: 'bg-purple-500',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    textColor: 'text-purple-400',
    label: 'Syncing',
    pulse: true,
  },
  error: {
    dotColor: 'bg-red-500',
    bgColor: 'bg-red-500/10 border-red-500/20',
    textColor: 'text-red-400',
    label: 'Error',
    pulse: false,
  },
};

const sizeStyles = {
  sm: {
    container: 'px-2 py-1',
    dot: 'w-1.5 h-1.5',
    text: 'text-[10px]',
    gap: 'gap-1.5',
  },
  md: {
    container: 'px-3 py-1.5',
    dot: 'w-2 h-2',
    text: 'text-[11px]',
    gap: 'gap-2',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  showDot = true,
}) => {
  const config = statusConfig[status];
  const styles = sizeStyles[size];
  const displayLabel = label || config.label;

  return (
    <div
      className={`
        inline-flex items-center ${styles.gap} ${styles.container}
        border rounded-full
        ${config.bgColor}
      `.trim().replace(/\s+/g, ' ')}
    >
      {showDot && (
        <div 
          className={`
            ${styles.dot} rounded-full ${config.dotColor}
            ${config.pulse ? 'animate-pulse' : ''}
          `.trim().replace(/\s+/g, ' ')}
        />
      )}
      <span className={`${styles.text} font-medium ${config.textColor}`}>
        {displayLabel}
      </span>
    </div>
  );
};
