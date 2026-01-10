import React from 'react';
import { Icons } from '../Icons';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="h-dvh w-full bg-(--color-bg) flex overflow-hidden transition-colors duration-300">
      {/* Left Panel - Branding & Features */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-12 relative overflow-hidden" data-tauri-drag-region>
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-linear-to-br from-purple-900/20 via-(--color-bg) to-blue-900/20" />
        <div className="absolute top-0 left-0 w-125 h-125 bg-purple-500/20 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-100 h-100 bg-blue-500/15 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-5" 
          style={{
            backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            color: 'var(--color-text-primary)'
          }} 
        />
        
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4" data-tauri-drag-region>
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl rotate-3">
            <div className="w-7 h-7 text-black">{Icons.logo}</div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-(--color-text-primary) tracking-tight">Echo</h1>
            <p className="text-xs text-(--color-text-tertiary)">Clipboard sync</p>
          </div>
        </div>
        
        {/* Feature Highlights */}
        <div className="relative z-10 space-y-8" data-tauri-drag-region>
          <h2 className="text-4xl font-semibold text-(--color-text-primary) leading-tight">
            Your clipboard,<br/>
            <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400">everywhere.</span>
          </h2>
          
          <div className="space-y-4">
            {[
              { icon: Icons.shield, title: 'End-to-End Encrypted', desc: 'Only you can read your data' },
              { icon: Icons.sync, title: 'Real-time Sync', desc: 'Instant across all devices' },
              { icon: Icons.devices, title: 'Cross Platform', desc: 'Mac, Windows, iOS, Android' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-(--color-surface-raised)/50 border border-(--color-border) backdrop-blur-sm">
                <div className="w-10 h-10 rounded-xl bg-(--color-surface-raised) flex items-center justify-center text-purple-400">
                  <div className="w-5 h-5">{feature.icon}</div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-(--color-text-primary)">{feature.title}</p>
                  <p className="text-xs text-(--color-text-secondary)">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="relative z-10 text-xs text-(--color-text-tertiary)" data-tauri-drag-region>
          © 2024 Echo. Secure clipboard synchronization.
        </div>
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="flex-1 md:max-w-xl flex flex-col md:flex-row md:items-center md:justify-center relative bg-(--color-bg) md:bg-transparent">
        {/* Mobile Background Elements */}
        <div className="md:hidden absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] -translate-x-1/2 translate-y-1/2" />
        </div>
        
        {/* Mobile Layout Container */}
        <div className="md:hidden w-full h-full flex flex-col relative z-10">
            {/* Mobile Header/Logo - Safe Area Aware */}
            <div className="w-full pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-6 flex items-center justify-center shrink-0">
              <div className="flex items-center gap-3 p-1.5 pl-1.5 pr-4 rounded-xl bg-(--color-surface-raised) border border-(--color-border) shadow-xl">
                <div className="w-9 h-9 bg-(--color-text-primary) rounded-lg flex items-center justify-center shadow-md rotate-6">
                  <div className="w-5 h-5 text-(--color-bg)">{Icons.logo}</div>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-(--color-text-primary) leading-none tracking-tight">Echo</h2>
                  <p className="text-[10px] text-(--color-text-tertiary) mt-0.5">Secure sync</p>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex items-center justify-center px-6 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] overflow-y-auto custom-scrollbar">
               <div className="w-full max-w-sm">
                 {children}
               </div>
            </div>
        </div>

        {/* Desktop Content (Centered) */}
        <div className="hidden md:block w-full max-w-md relative z-10 p-12 bg-(--color-surface-raised)/40 backdrop-blur-3xl border border-(--color-border) rounded-2xl shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
};
