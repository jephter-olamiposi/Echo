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
  onShowPairingCode
}) => {
  return (
    <div className="min-h-screen w-full bg-black pt-14 pb-24">
      <MobileHeader title="Settings" />

      <div className="p-4 flex flex-col gap-6">
        {/* Profile Section - Hero Style */}
        <div className="flex flex-col items-center py-6 pb-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-3 border-2 border-white/10">
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
        <div className="text-center py-4 text-xs text-zinc-600 flex flex-col gap-1">
          <p>Echo v1.0.0</p>
          <p>Made with ♥ for secure clipboard sync</p>
        </div>
      </div>
    </div>
  );
};
