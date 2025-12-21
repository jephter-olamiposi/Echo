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
    <main className="flex-1 h-screen bg-black flex flex-col overflow-hidden relative">
      {/* Big Tech: Dynamic Mesh Background */}
      <div className="mesh-background" />
      
      {selectedEntry ? (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-12 overflow-hidden animate-in fade-in slide-in-from-right-8 duration-700 ease-(--spring-easing)">
          {/* Preview Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-inner">
                <div className="w-6 h-6">{getContentTypeIcon(selectedEntry.contentType)}</div>
              </div>
              <div>
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] block mb-1">Entry Type</span>
                <span className="text-sm font-black text-white uppercase tracking-tight">{selectedEntry.contentType}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                className={`p-3 rounded-2xl border spring-transition active:scale-90 ${
                    selectedEntry.pinned 
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-lg shadow-purple-500/10" 
                    : "bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10"
                }`}
                onClick={() => onPin(selectedEntry.id)}
                title={selectedEntry.pinned ? "Unpin" : "Pin"}
              >
                <div className="w-5 h-5">{Icons.pin}</div>
              </button>

              <CopyButton
                content={selectedEntry.content}
                onCopy={onCopy}
                className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-2xl font-black text-sm hover:bg-zinc-200 active:scale-95 spring-transition shadow-2xl shadow-white/10"
                iconClassName="w-4 h-4"
              >
                Copy Entry
              </CopyButton>
              
              <button
                className="p-3 rounded-2xl bg-white/5 border border-white/5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 spring-transition active:scale-90"
                onClick={() => onDelete(selectedEntry.id)}
                title="Delete item"
              >
                <div className="w-5 h-5">{Icons.trash}</div>
              </button>
            </div>
          </div>

          {/* Preview Meta */}
          <div className={`grid gap-6 mb-10 ${devices.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
             {devices.length > 1 && (
               <div className="glass rounded-4xl p-6 flex flex-col gap-1.5 overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-4xl italic tracking-tighter">SOURCE</div>
                 <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Origin Device</span>
                 <div className="flex items-center gap-2.5 mt-1">
                   <div className={`w-2.5 h-2.5 rounded-full ${selectedEntry.source === 'local' ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]'}`} />
                   <span className="text-base font-black text-white tracking-tight">{selectedEntry.deviceName || (selectedEntry.source === "local" ? "Primary Workstation" : "Remote Node")}</span>
                 </div>
               </div>
             )}
             <div className="glass rounded-4xl p-6 flex flex-col gap-1.5 overflow-hidden relative">
               <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-4xl italic tracking-tighter">TIME</div>
               <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Synchronization Epoch</span>
               <span className="text-base font-black text-white mt-1 tracking-tight">{formatFullTime(selectedEntry.timestamp)}</span>
             </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 relative group mb-10 overflow-hidden">
              <div className="absolute -inset-px bg-linear-to-br from-purple-500/30 via-transparent to-blue-500/30 rounded-[40px] opacity-40 blur-sm group-hover:opacity-60 spring-transition" />
              <div className="relative h-full bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 overflow-auto custom-scrollbar shadow-inner">
                 <pre className="text-lg text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap break-all selection:bg-purple-500/40">
                   {selectedEntry.content}
                 </pre>
              </div>
          </div>

          {/* Footer Stats */}
          <div className="grid grid-cols-3 gap-1 px-10 py-6 glass rounded-4xl">
            <div className="flex flex-col items-center">
              <span className="text-xl font-black text-white tabular-nums">{selectedEntry.content.length.toLocaleString()}</span>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">characters</span>
            </div>
            <div className="flex flex-col items-center border-x border-white/10">
              <span className="text-xl font-black text-white tabular-nums">{selectedEntry.content.split(/\s+/).filter(Boolean).length.toLocaleString()}</span>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">words</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-black text-white tabular-nums">{selectedEntry.content.split(/\n/).length}</span>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">lines</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full text-center px-12 animate-in fade-in zoom-in-95 duration-1000 ease-(--spring-easing)">
          <div className="mb-12 relative">
             <div className="absolute inset-0 bg-purple-500/30 blur-[100px] rounded-full animate-pulse" />
             <div className="relative w-32 h-32 rounded-[40px] bg-white text-black flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)] rotate-3 hover:rotate-0 spring-transition">
                <div className="w-14 h-14">{Icons.logo}</div>
             </div>
          </div>
          
          <h2 className="text-5xl font-black text-white tracking-tighter mb-6">Security In Motion</h2>
          <p className="text-zinc-500 text-lg leading-relaxed mb-16 max-w-lg mx-auto font-medium">
             Your secure clipboard ecosystem is active. Copy anything on any device to see it appear here instantly.
          </p>

          <div className="grid grid-cols-4 gap-4 w-full mb-16 px-4">
            {[
              { label: 'Network', value: connected ? "Link Active" : "Offline", icon: Icons.sync, color: connected ? 'text-green-400' : 'text-orange-400', bg: connected ? 'bg-green-500/10' : 'bg-orange-500/10' },
              { label: 'Encryption', value: keyFingerprint?.substring(0, 8) || "Secured", icon: Icons.shield, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Archive', value: `${historyCount} Entries`, icon: Icons.history, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { label: 'Ecosystem', value: `${devices.length} Nodes`, icon: Icons.devices, color: 'text-zinc-400', bg: 'bg-white/5' }
            ].map((stat, i) => (
              <div key={i} className="glass p-6 rounded-4xl group hover:border-white/20 spring-transition">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${stat.bg} ${stat.color} group-hover:scale-110 spring-transition`}>
                  <div className="w-5 h-5">{stat.icon}</div>
                </div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1.5">{stat.label}</p>
                <p className={`font-black tracking-tight truncate ${stat.color === 'text-zinc-400' ? 'text-white' : stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button 
              className="flex items-center gap-3 px-10 py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-zinc-200 active:scale-95 spring-transition shadow-2xl shadow-white/10"
              onClick={onLinkDevice}
            >
              <div className="w-5 h-5">{Icons.link}</div> Link New Node
            </button>
            <button 
              className="px-8 py-4 bg-white/5 border border-white/5 text-zinc-300 rounded-2xl font-black text-sm hover:bg-white/10 active:scale-95 spring-transition backdrop-blur-xl"
              onClick={onEnterKey}
            >
              Configure Identity
            </button>
            <button 
              className="p-4 glass rounded-2xl text-zinc-500 hover:text-white spring-transition active:scale-90"
              onClick={onManageDevices}
            >
               <div className="w-6 h-6">{Icons.devices}</div>
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
