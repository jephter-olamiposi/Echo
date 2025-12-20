import React from 'react';
import { Icons } from '../Icons';

interface SettingsItemProps {
  icon?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  label,
  value,
  onClick,
  showChevron = true,
  className = '',
  children
}) => {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component 
      className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 transition-all outline-none ${
        onClick 
          ? 'hover:bg-white/[0.06] active:scale-[0.98] cursor-pointer' 
          : 'cursor-default'
      } ${className}`} 
      onClick={onClick}
    >
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
          <div className="w-5 h-5">{icon}</div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col items-start min-w-0">
        <span className="text-sm font-bold text-white tracking-tight">{label}</span>
        {value && <span className="text-[11px] font-medium text-zinc-500 truncate uppercase tracking-widest mt-0.5">{value}</span>}
        {children}
      </div>

      {showChevron && onClick && (
        <div className="w-5 h-5 text-zinc-600">
           {Icons.chevron || Icons.back}
        </div>
      )}
    </Component>
  );
};
