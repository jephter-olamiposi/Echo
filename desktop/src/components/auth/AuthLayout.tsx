import React from 'react';
import { Icons } from '../Icons';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="h-dvh w-full bg-(--color-bg) flex overflow-hidden transition-colors duration-300">
      <div className="mesh-gradient-bg" />

      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-1">
        <div className="glass-shape shape-sphere float-slow w-48 h-48 top-[10%] left-[5%] opacity-20 blur-[2px]" />
        <div className="glass-shape shape-ring rotate-slow w-64 h-64 top-[35%] left-[20%] opacity-15" />
        <div className="glass-shape shape-cube float-medium rotate-slow w-24 h-24 bottom-[15%] left-[10%] opacity-10" />
      </div>

      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden" data-tauri-drag-region>
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            color: 'var(--color-text-primary)'
          }}
        />

        <div className="relative z-10 flex items-center gap-4" data-tauri-drag-region>
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl rotate-3">
            <div className="w-7 h-7 text-black">{Icons.logo}</div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-(--color-text-primary) tracking-tight">Echo</h1>
            <p className="text-xs text-(--color-text-tertiary)">Clipboard sync</p>
          </div>
        </div>

        <div className="relative z-10 space-y-8" data-tauri-drag-region>
          <h2 className="text-4xl font-semibold text-(--color-text-primary) leading-tight">
            Your clipboard,<br />
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

        <div className="relative z-10 text-xs text-(--color-text-tertiary)" data-tauri-drag-region>
          © 2024 Echo. Secure clipboard synchronization.
        </div>
      </div>

      <div className="flex-1 lg:max-w-xl flex flex-col lg:flex-row lg:items-center lg:justify-center relative bg-(--color-bg) lg:bg-transparent">
        <div className="lg:hidden w-full h-full flex flex-col relative z-10">
          {/* Mobile Header/Logo - Safe Area Aware */}
          <div className="w-full pt-[calc(env(safe-area-inset-top,0px)+1rem)] lg:pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-4 lg:pb-6 flex items-center justify-center shrink-0 landscape:pt-2 landscape:pb-2">
            <div className="flex items-center gap-3 p-1 lg:p-1.5 pl-1.5 pr-3 lg:pr-4 rounded-xl bg-(--color-surface-raised) border border-(--color-border) shadow-xl landscape:scale-90">
              <div className="w-8 h-8 lg:w-9 lg:h-9 bg-(--color-text-primary) rounded-lg flex items-center justify-center shadow-md rotate-6">
                <div className="w-4.5 h-4.5 lg:w-5 lg:h-5 text-(--color-bg)">{Icons.logo}</div>
              </div>
              <div>
                <h2 className="text-sm lg:text-base font-semibold text-(--color-text-primary) leading-none tracking-tight">Echo</h2>
                <p className="text-[9px] lg:text-[10px] text-(--color-text-tertiary) mt-0.5">Secure sync</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] lg:pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] overflow-y-auto custom-scrollbar landscape:pb-4">
            <div className="w-full max-w-sm py-4 lg:py-8">
              {children}
            </div>
          </div>
        </div>

        {/* Desktop Content (Centered) */}
        <div className="hidden lg:block w-full max-w-md relative z-10 p-12 bg-(--color-glass-surface) backdrop-blur-3xl border border-(--color-glass-border) rounded-2xl shadow-2xl shadow-(--color-glass-shadow)">
          {children}
        </div>
      </div>
    </div>
  );
};
