import React from 'react';
import { Icons } from '../Icons';
import { MobileHeader } from './Header';
import { LinkedDevice } from '../../types';

interface MobileSettingsProps {
  email: string;
  devices: LinkedDevice[];
  historyCount: number;
  onClearHistory: () => void;
  onLogout: () => void;
  onShowDevices: () => void;
  onScanQR: () => void;
  onEnterKey: () => void;
  onShowPairingCode: () => void;
}

export const Settings: React.FC<MobileSettingsProps> = ({
  email,
  devices,
  historyCount,
  onClearHistory,
  onLogout,
  onShowDevices,
  onScanQR,
  onEnterKey,
  onShowPairingCode
}) => {
  const [showDebug, setShowDebug] = React.useState(false);
  const debugClickCount = React.useRef(0);
  const debugTimer = React.useRef<NodeJS.Timeout>();
  const [debugToken, setDebugToken] = React.useState<string | null>(null);

  const handleDebugClick = () => {
    debugClickCount.current += 1;
    
    if (debugTimer.current) clearTimeout(debugTimer.current);
    
    debugTimer.current = setTimeout(() => {
      debugClickCount.current = 0;
    }, 500);

    if (debugClickCount.current >= 3) {
      const token = window.EchoBridge?.getFcmToken() || "No token found";
      setDebugToken(token);
      setShowDebug(true);
      debugClickCount.current = 0;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-black text-white overflow-hidden">
      {/* Fixed Header */}
      <MobileHeader 
        title="Settings" 
        className="bg-black!" 
      />

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
        <div className="p-4 flex flex-col gap-6">
          {/* Profile Section - Hero Style */}
          <div className="flex flex-col items-center py-6 pb-2">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-3 border-2 border-white/10">
              {email.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-white">{email.split('@')[0]}</h2>
            <span className="text-sm text-zinc-400">{email}</span>
            <span className="mt-2 px-3 py-1 bg-zinc-800 rounded-full text-[10px] uppercase font-bold text-zinc-400 tracking-wider border border-white/5">Free Plan</span>
          </div>

          {/* Devices Section */}
          <div className="flex flex-col gap-2">
            <div className="px-2">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Devices</h3>
            </div>
            <div className="flex flex-col bg-zinc-900/40 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
              <button className="flex items-center gap-3 p-4 w-full text-left active:bg-white/5 transition-colors" onClick={onShowDevices}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-violet-400 bg-violet-400/15">
                  <div className="w-5 h-5">{Icons.devices}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-white">Linked Devices</span>
                  <span className="text-[11px] text-zinc-500 block">{devices.length} connected</span>
                </div>
                <div className="text-zinc-700">
                  <div className="w-4 h-4">{Icons.chevron}</div>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 w-full text-left active:bg-white/5 transition-colors" onClick={onScanQR}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 bg-emerald-400/15">
                  <div className="w-5 h-5">{Icons.qr}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-white">Scan QR Code</span>
                </div>
                <div className="text-zinc-700">
                  <div className="w-4 h-4">{Icons.chevron}</div>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 w-full text-left active:bg-white/5 transition-colors" onClick={onEnterKey}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-pink-400 bg-pink-400/15">
                  <div className="w-5 h-5">{Icons.shield}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-white">Enter Key Manually</span>
                </div>
                <div className="text-zinc-700">
                  <div className="w-4 h-4">{Icons.chevron}</div>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 w-full text-left active:bg-white/5 transition-colors" onClick={onShowPairingCode}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-400 bg-blue-400/15">
                  <div className="w-5 h-5">{Icons.code}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-white">Show Pairing Code</span>
                </div>
                <div className="text-zinc-700">
                  <div className="w-4 h-4">{Icons.chevron}</div>
                </div>
              </button>
            </div>
          </div>

          {/* Data Section */}
          <div className="flex flex-col gap-2">
             <div className="px-2">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Data & Storage</h3>
            </div>
            <div className="flex flex-col bg-zinc-900/40 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
              <div className="flex items-center gap-3 p-4 w-full text-left">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-400 bg-amber-400/15">
                  <div className="w-5 h-5">{Icons.history}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-white">History Items</span>
                  <span className="text-[11px] text-zinc-500 block">{historyCount} items stored</span>
                </div>
              </div>
              
              {historyCount > 0 && (
                <button className="flex items-center gap-3 p-4 w-full text-left active:bg-white/5 transition-colors" onClick={onClearHistory}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 bg-red-500/15">
                    <div className="w-5 h-5">{Icons.trash}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-red-500">Clear History</span>
                  </div>
                  <div className="text-zinc-700">
                    <div className="w-4 h-4">{Icons.chevron}</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Logout */}
          <div className="mt-2">
            <button className="w-full py-3.5 rounded-2xl bg-red-500/10 text-red-500 font-semibold text-sm border border-red-500/20 active:bg-red-500/20 transition-all hover:bg-red-500/15" onClick={onLogout}>
              Sign Out
            </button>
          </div>

          {/* App Info */}
          <div 
            className="text-center py-4 text-xs text-zinc-600 flex flex-col gap-1 active:text-zinc-400 transition-colors cursor-pointer select-none"
            onClick={handleDebugClick}
          >
            <p>Echo v1.0.0</p>
            <p>Made with ♥ for secure clipboard sync</p>
          </div>
        </div>
      </div>

      {/* Debug Modal */}
      {showDebug && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDebug(false)} />
          <div className="relative w-full max-w-lg bg-zinc-900 border-t border-white/10 rounded-t-3xl p-6 pb-12 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Debug Info</h3>
              <button onClick={() => setShowDebug(false)} className="p-2 bg-zinc-800 rounded-full">
                <div className="w-5 h-5">{Icons.close}</div>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">FCM Token</label>
                <div 
                  className="mt-2 p-3 bg-black rounded-xl border border-white/10 text-xs font-mono text-zinc-300 break-all active:bg-zinc-900"
                  onClick={() => {
                    navigator.clipboard.writeText(debugToken || "");
                  }}
                >
                  {debugToken || "Loading..."}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Tap to copy</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-800/50 rounded-xl border border-white/5">
                  <label className="text-xs text-zinc-500 block mb-1">Opened from Push?</label>
                  <span className="text-sm font-medium text-white">
                    {window.EchoBridge?.wasOpenedFromPush() ? "YES" : "NO"}
                  </span>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-xl border border-white/5">
                  <label className="text-xs text-zinc-500 block mb-1">Platform</label>
                  <span className="text-sm font-medium text-white">
                    {window.EchoBridge ? "Android" : "Web/Other"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
