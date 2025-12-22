import React from 'react';
import { Icons } from '../Icons';
import { 
  formatFullTime, 
  getContentTypeIcon
} from '../../utils';
import { ClipboardEntry, LinkedDevice } from '../../types';
import { CopyButton } from '../shared/CopyButton';

interface DesktopMainProps {
  selectedEntry: ClipboardEntry | null;
  connected: boolean;
  devices: LinkedDevice[];
  historyCount: number;
  keyFingerprint: string | null;
  onCopy: (text: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onLinkDevice: () => void;
  onEnterKey: () => void;
  onManageDevices: () => void;
  onBack: () => void;
  onLogout: () => void;
}

export const Main: React.FC<DesktopMainProps> = ({
  selectedEntry,
  connected,
  devices,
  historyCount,
  keyFingerprint,
  onCopy,
  onPin,
  onDelete,
  onLinkDevice,
  onEnterKey,
  onManageDevices,
  onBack,
  onLogout
}) => {
  return (
    <main className="flex-1 h-screen bg-black flex flex-col overflow-hidden">
      {selectedEntry ? (
        /* ===== ENTRY DETAIL VIEW ===== */
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-8 overflow-hidden animate-in fade-in duration-300">
          {/* Header with actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {/* Back Button */}
              <button
                onClick={onBack}
                className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 mr-2"
                title="Back to dashboard"
              >
                <div className="w-4 h-4">{Icons.back}</div>
              </button>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                selectedEntry.contentType === 'code' 
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : selectedEntry.contentType === 'url'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              }`}>
                <div className="w-5 h-5">{getContentTypeIcon(selectedEntry.contentType)}</div>
              </div>
              <div>
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Entry Type</span>
                <p className="text-sm font-semibold text-white capitalize">{selectedEntry.contentType}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
                    selectedEntry.pinned 
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400" 
                    : "bg-zinc-900/80 border-white/5 text-zinc-500 hover:text-white hover:bg-zinc-800"
                }`}
                onClick={() => onPin(selectedEntry.id)}
                title={selectedEntry.pinned ? "Unpin" : "Pin"}
              >
                <div className="w-4 h-4">{Icons.pin}</div>
              </button>

              <CopyButton
                content={selectedEntry.content}
                onCopy={onCopy}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl font-semibold text-sm hover:bg-zinc-200 active:scale-95 transition-all"
                iconClassName="w-4 h-4"
              >
                Copy
              </CopyButton>
              
              <button
                className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                onClick={() => onDelete(selectedEntry.id)}
                title="Delete"
              >
                <div className="w-4 h-4">{Icons.trash}</div>
              </button>
            </div>
          </div>

          {/* Meta info bar */}
          <div className="flex items-center gap-6 px-5 py-4 bg-zinc-900/60 border border-white/5 rounded-2xl mb-6">
            {devices.length > 1 && (
              <>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedEntry.source === 'local' ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <span className="text-sm font-medium text-zinc-300">
                    {selectedEntry.deviceName || (selectedEntry.source === "local" ? "This Device" : "Remote")}
                  </span>
                </div>
                <div className="w-px h-4 bg-white/10"></div>
              </>
            )}
            <span className="text-sm text-zinc-500">{formatFullTime(selectedEntry.timestamp)}</span>
          </div>

          {/* Content preview */}
          <div className="flex-1 relative overflow-hidden mb-6">
            <div className="h-full bg-zinc-900/40 border border-white/5 rounded-2xl p-6 overflow-auto custom-scrollbar">
              <pre className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap break-all selection:bg-purple-500/40">
                {selectedEntry.content}
              </pre>
            </div>
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-center gap-8 px-6 py-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
            <div className="flex flex-col items-center">
              <span className="text-lg font-semibold text-white tabular-nums">{selectedEntry.content.length.toLocaleString()}</span>
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">characters</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-semibold text-white tabular-nums">{selectedEntry.content.split(/\s+/).filter(Boolean).length.toLocaleString()}</span>
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">words</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-semibold text-white tabular-nums">{selectedEntry.content.split(/\n/).length}</span>
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">lines</span>
            </div>
          </div>
        </div>
      ) : (
        /* ===== EMPTY STATE / DASHBOARD HOME ===== */
      <div className="flex-1 flex flex-col h-full bg-[#141517] min-w-0">
        {/* Top Header Bar */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-[#1a1b1e] shrink-0">
          <div className="flex items-center gap-4 md:gap-6 overflow-hidden">
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm font-medium text-zinc-300 hidden sm:inline">{connected ? 'Syncing' : 'Offline'}</span>
            </div>
            <div className="h-4 w-px bg-white/10 shrink-0" />
            <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 overflow-hidden whitespace-nowrap">
              <span className="hidden sm:inline">{historyCount} items</span>
              <span className="hidden sm:inline">{devices.length} device{devices.length !== 1 ? 's' : ''}</span>
              <span className="font-mono bg-white/5 px-2 py-1 rounded text-zinc-400 truncate max-w-[120px] md:max-w-none">
                Key: {keyFingerprint ? keyFingerprint.substring(0, 8) : '—'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-4">
             <button className="p-2 text-zinc-400 hover:text-white transition-colors">
               <div className="w-5 h-5">{Icons.info}</div>
             </button>
             <button className="p-2 text-zinc-400 hover:text-white transition-colors" onClick={onLinkDevice}>
               <div className="w-5 h-5">{Icons.link}</div>
             </button>
             <button 
               className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all whitespace-nowrap"
               onClick={onLogout}
             >
               Sign Out
             </button>
          </div>
        </div>

        {/* Main Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-y-auto custom-scrollbar">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-purple-500/5 blur-[80px] md:blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-2xl w-full flex flex-col items-center">
            {/* Hero Icon */}
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/10">
              <div className="w-8 h-8 md:w-10 md:h-10">{Icons.clipboard}</div>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 text-center tracking-tight">Welcome to Echo</h1>
            <p className="text-zinc-500 text-center mb-8 md:mb-12 max-w-md mx-auto leading-relaxed px-4 text-sm md:text-base">
              Your clipboard syncs across all devices in real-time with end-to-end encryption.
            </p>

            {/* 2x2 Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full mb-8">
              {/* Connection Card */}
              <div className="bg-[#25262b] p-4 md:p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-[#2c2d33] transition-colors group">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  <div className="w-5 h-5 md:w-6 md:h-6">{Icons.sync}</div>
                </div>
                <div>
                  <h3 className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-0.5">Connection</h3>
                  <p className={`font-semibold text-sm md:text-base ${connected ? 'text-green-400' : 'text-zinc-300'}`}>
                    {connected ? 'Active' : 'Disconnected'}
                  </p>
                </div>
              </div>

              {/* Encryption Card */}
              <div className="bg-[#25262b] p-4 md:p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-[#2c2d33] transition-colors group">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <div className="w-5 h-5 md:w-6 md:h-6">{Icons.shield}</div>
                </div>
                <div>
                  <h3 className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-0.5">Encryption</h3>
                  <p className="font-semibold text-sm md:text-base text-emerald-400">End-to-end</p>
                </div>
              </div>

              {/* History Card */}
              <div className="bg-[#25262b] p-4 md:p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-[#2c2d33] transition-colors group">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-zinc-700/50 text-zinc-400 flex items-center justify-center shrink-0">
                  <div className="w-5 h-5 md:w-6 md:h-6">{Icons.history}</div>
                </div>
                <div>
                  <h3 className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-0.5">History</h3>
                  <p className="font-semibold text-sm md:text-base text-white">{historyCount} items</p>
                </div>
              </div>

              {/* Devices Card */}
              <div 
                className="bg-[#25262b] p-4 md:p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-[#2c2d33] transition-colors group cursor-pointer"
                onClick={onManageDevices}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-zinc-700/50 text-zinc-400 flex items-center justify-center shrink-0">
                  <div className="w-5 h-5 md:w-6 md:h-6">{Icons.devices}</div>
                </div>
                <div>
                  <h3 className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-0.5">Devices</h3>
                  <p className="font-semibold text-sm md:text-base text-white">{devices.length} linked</p>
                </div>
              </div>
            </div>

            {/* Encryption Key Banner */}
            <div className="w-full bg-[#25262b] rounded-2xl border border-white/5 p-4 md:p-6 text-center mb-6 md:mb-10 relative overflow-hidden group">
               <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
               <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[2px] mb-2">Encryption Key</h3>
               <p className="font-mono text-base md:text-xl text-indigo-400 font-medium tracking-wide break-all selection:bg-indigo-500/30">
                 {keyFingerprint || '—'}
               </p>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-8 w-full justify-center">
              <button 
                onClick={onLinkDevice}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#2c2d33] hover:bg-[#35363c] text-zinc-200 rounded-xl font-medium transition-all active:scale-[0.98] border border-white/5"
              >
                <div className="w-4 h-4 text-indigo-400">{Icons.link}</div>
                <span>Link New Device</span>
              </button>

               <button 
                onClick={onEnterKey}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm font-medium p-2"
              >
                <div className="w-4 h-4">{Icons.shield}</div>
                <span>Enter Sync Key</span>
              </button>

              <button 
                onClick={onManageDevices}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm font-medium p-2"
              >
                <div className="w-4 h-4">{Icons.settings || Icons.devices}</div>
                <span>Manage Devices</span>
              </button>
            </div>

          </div>
        </div>
      </div>
      )}
    </main>
  );
};
