import React from 'react';
import { Icons } from '../Icons';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const getStyles = () => {
    switch(type) {
      case 'success': return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'error': return 'bg-red-500/10 border-red-500/20 text-red-400';
      default: return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'success': return Icons.check || Icons.sync; // Fallback if check missing
      case 'error': return Icons.close;
      default: return Icons.shield;
    }
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-200 max-w-sm w-[calc(100%-2rem)]">
      <div className={`flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom duration-300 ${getStyles()}`}>
        <div className="w-5 h-5 shrink-0 opacity-80">
          {getIcon()}
        </div>
        <p className="text-sm font-semibold tracking-tight leading-tight">
          {message}
        </p>
      </div>
    </div>
  );
};
