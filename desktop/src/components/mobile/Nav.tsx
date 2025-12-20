import React from 'react';
import { Icons } from '../Icons';

type MobileView = 'dashboard' | 'history' | 'settings';

interface MobileNavProps {
  currentView: MobileView;
  onChange: (view: MobileView) => void;
  badgeCount?: number;
}

export const Nav: React.FC<MobileNavProps> = ({ currentView, onChange, badgeCount = 0 }) => {
  return (
    <nav className="h-20 bg-black/90 backdrop-blur-xl border-t border-white/10 flex justify-around items-center px-2 pb-[env(safe-area-inset-bottom,20px)] pt-2 w-full">
      <button 
        className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors ${currentView === 'dashboard' ? 'text-purple-500' : 'text-zinc-500 hover:text-zinc-300'}`}
        onClick={() => onChange('dashboard')}
      >
        <span className="w-6 h-6">{Icons.home}</span>
        <span className="text-[10px] font-medium">Home</span>
      </button>
      
      <button 
        className={`relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors ${currentView === 'history' ? 'text-purple-500' : 'text-zinc-500 hover:text-zinc-300'}`}
        onClick={() => onChange('history')}
      >
        <span className="w-6 h-6">{Icons.history}</span>
        <span className="text-[10px] font-medium">History</span>
        {badgeCount > 0 && (
          <span className="absolute top-1 right-2 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>
      
      <button 
        className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors ${currentView === 'settings' ? 'text-purple-500' : 'text-zinc-500 hover:text-zinc-300'}`}
        onClick={() => onChange('settings')}
      >
        <span className="w-6 h-6">{Icons.settings}</span>
        <span className="text-[10px] font-medium">Settings</span>
      </button>
    </nav>
  );
};
