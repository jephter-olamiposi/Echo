import React from 'react';
import { Icons } from '../Icons';
import { MobileHeader } from './Header';
import { ClipboardEntry, LinkedDevice } from '../../types';

interface MobileDashboardProps {
  isLoading?: boolean;
  connected: boolean;
  history: ClipboardEntry[];
  devices: LinkedDevice[];
  onCopy: (text: string) => void;
  onViewAllHistory: () => void;
  onShowDevices: () => void;
  onScanQR: () => void;
  onShowPairingCode: () => void;
  onDelete: (id: string) => void;
}

export const Dashboard: React.FC<MobileDashboardProps> = ({
  isLoading,
  connected,
  history,
  devices,
  onShowDevices,
  onScanQR,
  onShowPairingCode,
  onCopy,
  onDelete
}) => {
  const latestItem = history[0];

  return (
    <div className="min-h-screen w-full bg-black text-white pt-14">
      <MobileHeader 
        centerAction={
          <span className="text-lg font-bold tracking-tight text-white">Echo</span>
        }
      />
      <div className="flex flex-col gap-6 max-w-xl mx-auto w-full p-4">
        {/* Status Section - Hero Style */}
        <div className="flex justify-center py-4">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-white/5"></div>
              <div className="w-32 h-5 rounded-md bg-white/5"></div>
              <div className="w-24 h-7 rounded-full bg-white/5 mt-1"></div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                connected 
                  ? 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_20px_rgba(50,215,75,0.15)]' 
                  : 'bg-white/5 text-zinc-500 border-white/5'
              }`}>
                <div className="w-8 h-8 flex items-center justify-center">
                  {Icons.clipboard}
                </div>
              </div>
              <h2 className="text-base font-semibold text-white/95 tracking-wide">
                {connected ? 'Ready to Sync' : 'Waiting for Device'}
              </h2>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800/90 border border-white/10 rounded-full mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_6px_rgba(50,215,75,0.5)]' : 'bg-zinc-500'}`}></div>
                <span className="text-[11px] font-semibold text-white/90 uppercase tracking-wider">
                  {connected ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Contextual Info Bar - Minimal or Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-5 px-5 py-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
            <div className="w-12 h-10 bg-white/5 rounded-lg animate-pulse"></div>
            <div className="w-12 h-10 bg-white/5 rounded-lg animate-pulse"></div>
            <div className="w-12 h-10 bg-white/5 rounded-lg animate-pulse"></div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-6 py-5 bg-zinc-900/80 border border-white/5 rounded-2xl backdrop-blur-md shadow-lg">
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xl font-bold text-white tabular-nums">{history.length}</span>
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Items</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="flex flex-col items-center gap-1 flex-1 cursor-pointer active:opacity-70" onClick={onShowDevices}>
              <span className="text-xl font-bold text-white tabular-nums">{devices.length}</span>
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Devices</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xl font-bold text-white">E2E</span>
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Encrypted</span>
            </div>
          </div>
        )}

        {/* Latest Item Preview - With Actions */}
        {!isLoading && latestItem && (
          <div className="bg-zinc-800/30 border border-white/5 rounded-2xl p-5 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-white/90 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Latest Clipboard
              </span>
              <span className="text-[10px] text-zinc-500">Just now</span>
            </div>
            <p className="text-sm leading-relaxed text-zinc-300 font-mono line-clamp-2 overflow-hidden">
              {latestItem.content.substring(0, 100)}
              {latestItem.content.length > 100 ? '...' : ''}
            </p>
            <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
              <button 
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-white/5 text-white hover:bg-white/10 active:scale-95 transition-all"
                onClick={() => onCopy(latestItem.content)}
              >
                <span className="w-4 h-4">{Icons.copy}</span>
                <span>Copy</span>
              </button>
              <button 
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-red-500 border border-red-500/20 active:bg-red-500/10 active:scale-95 transition-all"
                onClick={() => onDelete(latestItem.id)}
              >
                <span className="w-4 h-4">{Icons.trash}</span>
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
        
        {/* Loading State for Latest Item */}
        {isLoading && (
           <div className="bg-zinc-800/30 border border-white/5 rounded-2xl p-5 flex flex-col gap-3 min-h-[140px]">
             <div className="w-1/3 h-4 bg-white/5 rounded animate-pulse mb-2"></div>
              <div className="w-full h-4 bg-white/5 rounded animate-pulse"></div>
              <div className="w-2/3 h-4 bg-white/5 rounded animate-pulse"></div>
           </div>
        )}

        {/* Quick Actions - Primary Tasks */}
        <div className="flex flex-col gap-3 mt-2">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest pl-1">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-3">
            <button className="flex flex-col items-center justify-center gap-2 p-3.5 bg-zinc-800/40 border border-white/5 rounded-2xl cursor-pointer active:scale-95 active:bg-zinc-800/60 transition-all" onClick={onScanQR}>
              <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-400/10 text-green-400">
                <div className="w-5 h-5">{Icons.qr}</div>
              </div>
              <span className="text-[11px] font-medium text-zinc-300">Scan QR</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3.5 bg-zinc-800/40 border border-white/5 rounded-2xl cursor-pointer active:scale-95 active:bg-zinc-800/60 transition-all" onClick={onShowPairingCode}>
              <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                <div className="w-5 h-5">{Icons.code}</div>
              </div>
              <span className="text-[11px] font-medium text-zinc-300">Pairing Code</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3.5 bg-zinc-800/40 border border-white/5 rounded-2xl cursor-pointer active:scale-95 active:bg-zinc-800/60 transition-all" onClick={onShowDevices}>
              <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                <div className="w-5 h-5">{Icons.devices}</div>
              </div>
              <span className="text-[11px] font-medium text-zinc-300">Devices</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
