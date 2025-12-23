import React from 'react';
import { Icons } from '../Icons';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="h-dvh w-full bg-black flex overflow-hidden">
      {/* Left Panel - Branding & Features */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-12 relative overflow-hidden" data-tauri-drag-region>
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-linear-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="absolute top-0 left-0 w-125 h-125 bg-purple-500/20 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-100 h-100 bg-blue-500/15 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-5" 
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} 
        />
        
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4" data-tauri-drag-region>
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-white/20 rotate-3">
            <div className="w-7 h-7 text-black">{Icons.logo}</div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Echo</h1>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Clipboard Sync</p>
          </div>
        </div>
        
        {/* Feature Highlights */}
        <div className="relative z-10 space-y-8" data-tauri-drag-region>
          <h2 className="text-4xl font-black text-white leading-tight">
            Your clipboard,<br/>
            <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400">everywhere.</span>
          </h2>
          
          <div className="space-y-4">
            {[
              { icon: Icons.shield, title: 'End-to-End Encrypted', desc: 'Only you can read your data' },
              { icon: Icons.sync, title: 'Real-time Sync', desc: 'Instant across all devices' },
              { icon: Icons.devices, title: 'Cross Platform', desc: 'Mac, Windows, iOS, Android' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-purple-400">
                  <div className="w-5 h-5">{feature.icon}</div>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{feature.title}</p>
                  <p className="text-xs text-zinc-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="relative z-10 text-xs text-zinc-600" data-tauri-drag-region>
          © 2024 Echo. Secure clipboard synchronization.
        </div>
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="flex-1 md:max-w-xl flex flex-col md:flex-row md:items-center md:justify-center relative bg-black/50 md:bg-transparent">
        {/* Subtle mesh background for mobile/form area */}
        <div className="md:hidden absolute inset-0 overflow-hidden pointer-events-none">
          <div className="mesh-background opacity-50" />
          <div className="absolute top-0 right-0 w-75 h-75 bg-purple-600/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
        </div>
        
        {/* Mobile Layout Container */}
        <div className="md:hidden w-full h-full flex flex-col relative z-10" style={{ paddingTop: 'env(safe-area-inset-top, 20px)' }}>
            {/* Mobile Header/Logo */}
            <div className="w-full h-24 flex items-center justify-center shrink-0">
              <div className="flex items-center gap-3 p-2 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/5">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg rotate-3">
                  <div className="w-4 h-4 text-black">{Icons.logo}</div>
                </div>
                <span className="text-lg font-black text-white tracking-tight pr-1">Echo</span>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto custom-scrollbar">
               <div className="w-full max-w-sm">
                 {children}
               </div>
            </div>
            
            {/* Bottom Safe Area Spacer */}
            <div className="w-full h-6 shrink-0" style={{ height: 'env(safe-area-inset-bottom, 20px)' }} />
        </div>

        {/* Desktop Content (Centered) */}
        <div className="hidden md:block w-full max-w-sm relative z-10 p-8">
          {children}
        </div>
      </div>
    </div>
  );
};
