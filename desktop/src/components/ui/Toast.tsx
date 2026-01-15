import React from 'react';
import { Icons } from '../Icons';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-(--color-surface-raised)/95',
          border: 'border-green-500/20',
          iconBg: 'bg-green-500/20 text-green-400',
          shadow: 'shadow-[0_8px_30px_rgb(0,0,0,0.4)] shadow-green-500/10'
        };
      case 'error':
        return {
          bg: 'bg-(--color-surface-raised)/95',
          border: 'border-red-500/20',
          iconBg: 'bg-red-500/20 text-red-400',
          shadow: 'shadow-[0_8px_30px_rgb(0,0,0,0.4)] shadow-red-500/10'
        };
      default:
        return {
          bg: 'bg-(--color-surface-raised)/95',
          border: 'border-(--color-border)',
          iconBg: 'bg-(--color-text-primary)/10 text-(--color-text-primary)',
          shadow: 'shadow-[0_8px_30px_rgb(0,0,0,0.4)]'
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return Icons.check;
      case 'error': return Icons.close;
      default: return Icons.info || Icons.shield;
    }
  };

  const styles = getStyles();

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-200 max-w-sm w-full px-4 pointer-events-none flex justify-center">
      <div
        className={`
          flex items-center gap-3 pl-2 pr-5 py-2 rounded-full border backdrop-blur-2xl
          animate-in slide-in-from-top-8 fade-in zoom-in-95 duration-500 ease-(--spring-easing)
          ${styles.bg} ${styles.border} ${styles.shadow}
        `}
        role="alert"
        aria-live={type === 'error' ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${styles.iconBg}`}
          aria-hidden="true"
        >
          <div className="w-4 h-4">
            {getIcon()}
          </div>
        </div>

        <p className="text-[13px] font-medium text-(--color-text-primary) leading-tight">
          {message}
        </p>
      </div>
    </div>
  );
};
