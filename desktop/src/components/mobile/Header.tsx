import React from 'react';
import { Icons } from '../Icons';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  centerAction?: React.ReactNode;
  className?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBack,
  onBack,
  rightAction,
  centerAction,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between h-14 px-4 sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/5 ${className}`}>
      <div className="min-w-[40px] flex items-start">
        {showBack && (
          <button className="p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white" onClick={onBack}>
            {Icons.back}
          </button>
        )}
      </div>
      <div className="flex-1 flex justify-center items-center">
        {title ? <h2 className="text-lg font-semibold text-white">{title}</h2> : centerAction}
      </div>
      <div className="min-w-[40px] flex justify-end items-center">
        {rightAction}
      </div>
    </div>
  );
};
