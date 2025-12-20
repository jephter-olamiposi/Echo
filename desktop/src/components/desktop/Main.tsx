import React from 'react';
import { Icons } from '../Icons';
import { 
  formatFullTime, 
  getContentTypeIcon
} from '../../utils';
import { ClipboardEntry, LinkedDevice } from '../../types';

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
  onManageDevices
}) => {
  return (
    <main className="flex-1 h-screen bg-black flex flex-col overflow-hidden">
      {selectedEntry ? (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-8 overflow-hidden">
          {/* Preview Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <div className="w-5 h-5">{getContentTypeIcon(selectedEntry.contentType)}</div>
              </div>
              <div>
                <span className="text-xs font-black text-zinc-600 uppercase tracking-widest block mb-0.5">Type</span>
                <span className="text-sm font-bold text-white uppercase tracking-tight">{selectedEntry.contentType}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
                    selectedEntry.pinned 
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400" 
                    : "bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }`}
                onClick={() => onPin(selectedEntry.id)}
                title={selectedEntry.pinned ? "Unpin" : "Pin"}
              >
                <div className="w-5 h-5">{Icons.pin}</div>
              </button>
              
              <button
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-200 active:scale-95 transition-all shadow-lg shadow-white/5"
                onClick={() => onCopy(selectedEntry.content)}
              >
                <div className="w-4 h-4">{Icons.copy}</div>
                Copy to Clipboard
              </button>
              
              <button
                className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all active:scale-95"
                onClick={() => onDelete(selectedEntry.id)}
                title="Delete item"
              >
                <div className="w-5 h-5">{Icons.trash}</div>
              </button>
            </div>
          </div>

          {/* Preview Meta */}
          <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-1">
               <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Source</span>
               <div className="flex items-center gap-2 mt-1">
                 <div className={`w-2 h-2 rounded-full ${selectedEntry.source === 'local' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-blue-500'}`} />
                 <span className="text-sm font-bold text-white">{selectedEntry.deviceName || (selectedEntry.source === "local" ? "This Device" : "Remote")}</span>
               </div>
             </div>
             <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-1">
               <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Captured</span>
               <span className="text-sm font-bold text-white mt-1">{formatFullTime(selectedEntry.timestamp)}</span>
             </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 relative group mb-8 overflow-hidden">
             <div className="absolute -inset-px bg-linear-to-br from-purple-500/20 via-transparent to-blue-500/20 rounded-3xl opacity-50 blur-sm group-hover:opacity-70 transition-opacity" />
             <div className="relative h-full bg-zinc-950/80 border border-white/10 rounded-3xl p-8 overflow-auto custom-scrollbar shadow-inner">
                <pre className="text-base text-zinc-300 font-mono leading-loose whitespace-pre-wrap break-all selection:bg-purple-500/30">
                  {selectedEntry.content}
                </pre>
             </div>
          </div>

          {/* Footer Stats */}
          <div className="grid grid-cols-3 gap-1 px-8 py-4 bg-zinc-900/20 border border-white/5 rounded-3xl backdrop-blur-md">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-white tabular-nums">{selectedEntry.content.length.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">characters</span>
            </div>
            <div className="flex flex-col items-center border-x border-white/5">
              <span className="text-lg font-bold text-white tabular-nums">{selectedEntry.content.split(/\s+/).filter(Boolean).length.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">words</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-white tabular-nums">{selectedEntry.content.split(/\n/).length}</span>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">lines</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center px-8">
          <div className="mb-10 relative">
             <div className="absolute inset-0 bg-purple-500/20 blur-[60px] rounded-full animate-pulse" />
             <div className="relative w-24 h-24 rounded-4xl bg-zinc-900 border border-white/10 flex items-center justify-center text-purple-500 shadow-2xl">
                <div className="w-10 h-10">{Icons.logo}</div>
             </div>
          </div>
          
          <h2 className="text-3xl font-black text-white tracking-tight mb-4">Welcome to Echo</h2>
          <p className="text-zinc-500 leading-relaxed mb-12 max-w-md mx-auto font-medium">
             Your clipboard syncs across all devices in real-time with military-grade end-to-end encryption.
          </p>

          <div className="grid grid-cols-2 gap-4 w-full mb-12">
            <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-3xl group hover:border-white/10 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${connected ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                {Icons.sync}
              </div>
              <p className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-1">Status</p>
              <p className={`font-bold ${connected ? 'text-green-400' : 'text-orange-400'}`}>{connected ? "Active" : "Offline"}</p>
            </div>
            
            <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-3xl hover:border-white/10 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                {Icons.shield}
              </div>
              <p className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-1">Security</p>
              <p className="font-bold text-white truncate">{keyFingerprint || "Encrypted"}</p>
            </div>
            
            <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-3xl hover:border-white/10 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center mb-4">
                {Icons.history}
              </div>
              <p className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-1">Stored</p>
              <p className="font-bold text-white">{historyCount} items</p>
            </div>
            
            <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-3xl hover:border-white/10 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center mb-4">
                {Icons.devices}
              </div>
              <p className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-1">Connected</p>
              <p className="font-bold text-white">{devices.length} devices</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className="flex items-center gap-2 px-8 py-3.5 bg-white text-black rounded-2xl font-black text-sm hover:bg-zinc-200 active:scale-95 transition-all shadow-xl shadow-white/5"
              onClick={onLinkDevice}
            >
              <div className="w-4 h-4">{Icons.link}</div> <span>Link Device</span>
            </button>
            <button 
              className="px-6 py-3.5 bg-zinc-900 border border-white/5 text-zinc-300 rounded-2xl font-bold text-sm hover:bg-zinc-800 active:scale-95 transition-all"
              onClick={onEnterKey}
            >
              Sync Key
            </button>
            <button 
              className="px-4 py-3.5 text-zinc-500 hover:text-white transition-colors"
              onClick={onManageDevices}
            >
              {Icons.devices}
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
