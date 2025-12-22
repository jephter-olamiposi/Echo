import React from 'react';
import { Icons } from '../Icons';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="h-dvh w-full bg-black flex overflow-hidden">
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden" data-tauri-drag-region>
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/15 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">everywhere.</span>
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
      <div className="flex-1 lg:max-w-xl flex items-center justify-center p-8 relative">
        {/* Subtle mesh background for mobile/form area */}
        <div className="lg:hidden absolute inset-0">
          <div className="mesh-background" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-600/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
        </div>
        
        {/* Mobile logo (shown when left panel is hidden) */}
        <div className="lg:hidden absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg rotate-3">
            <div className="w-5 h-5 text-black">{Icons.logo}</div>
          </div>
          <span className="text-lg font-black text-white tracking-tight">Echo</span>
        </div>
        
        <div className="w-full max-w-sm relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
};
