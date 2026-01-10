import React from 'react';
import { Icons } from '../Icons';
import { 
  formatFullTime, 
  getContentTypeIcon
} from '../../utils';
import { ClipboardEntry, LinkedDevice } from '../../types';
import { CopyButton } from '../ui/CopyButton';

interface DesktopMainProps {
  selectedEntry: ClipboardEntry | null;
  connected: boolean;
  devices: LinkedDevice[];
  historyCount: number;
  keyFingerprint: string | null;
  backgroundModeEnabled: boolean;
  onCopy: (text: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onLinkDevice: () => void;
  onEnterKey: () => void;
  onManageDevices: () => void;
  onToggleBackgroundMode: () => void;
  onBack: () => void;
  onLogout: () => void;
}

export const Main: React.FC<DesktopMainProps> = ({
  selectedEntry,
  connected,
  devices,
  historyCount,
  keyFingerprint,
  backgroundModeEnabled,
  onCopy,
  onPin,
  onDelete,
  onLinkDevice,
  onEnterKey,
  onManageDevices,
  onToggleBackgroundMode,
  onBack,
  onLogout
}) => {
  return (
    <main className="flex-1 h-screen bg-(--color-bg) flex flex-col overflow-hidden relative">
      {/* Stylish Background - Matching Mobile/Onboarding */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-linear-to-br from-purple-900/20 via-(--color-bg) to-blue-900/20" />
        <div className="absolute top-0 left-0 w-150 h-150 bg-purple-500/20 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-125 h-125 bg-blue-500/15 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5" 
          style={{
            backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} 
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
      {selectedEntry ? (
        /* ===== ENTRY DETAIL VIEW ===== */
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-8 overflow-hidden animate-in fade-in duration-300">
          {/* Header with actions */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={onBack}
                className="p-3 rounded-2xl bg-(--color-surface-raised) border border-(--color-border) text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-surface) transition-all active:scale-95 group"
                title="Back to dashboard"
              >
                <div className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform">{Icons.back}</div>
              </button>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                selectedEntry.contentType === 'code' 
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : selectedEntry.contentType === 'url'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              }`}>
                <div className="w-6 h-6">{getContentTypeIcon(selectedEntry.contentType)}</div>
              </div>
              <div>
                <span className="text-[12px] text-(--color-text-tertiary)">Type</span>
                <p className="text-lg font-semibold text-(--color-text-primary) capitalize">{selectedEntry.contentType}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                className={`p-3 rounded-2xl border transition-all active:scale-95 ${
                    selectedEntry.pinned 
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400" 
                    : "bg-(--color-surface-raised) border-(--color-border) text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-surface)"
                }`}
                onClick={() => onPin(selectedEntry.id)}
                title={selectedEntry.pinned ? "Unpin" : "Pin"}
              >
                <div className="w-5 h-5">{Icons.pin}</div>
              </button>

              <CopyButton
                content={selectedEntry.content}
                onCopy={onCopy}
                className="flex items-center gap-2 px-5 h-12 bg-(--color-text-primary) text-(--color-bg) rounded-xl font-medium text-[15px] hover:opacity-90 active:scale-[0.98] transition-all"
                iconClassName="w-4 h-4"
              >
                Copy
              </CopyButton>
              
              <button
                className="p-3 rounded-2xl bg-(--color-surface-raised) border border-(--color-border) text-(--color-text-muted) hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                onClick={() => onDelete(selectedEntry.id)}
                title="Delete"
              >
                <div className="w-5 h-5">{Icons.trash}</div>
              </button>
            </div>
          </div>

          {/* Meta info bar */}
          <div className="flex items-center gap-6 px-6 py-4 bg-(--color-surface)/50 border border-(--color-border) rounded-2xl mb-6 backdrop-blur-sm">
            {devices.length > 1 && (
              <>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${selectedEntry.source === 'local' ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <span className="text-[14px] text-(--color-text-secondary)">
                    {selectedEntry.deviceName || (selectedEntry.source === "local" ? "This device" : "Remote")}
                  </span>
                </div>
                <div className="w-px h-5 bg-(--color-border)"></div>
              </>
            )}
            <span className="text-sm font-medium text-(--color-text-muted)">{formatFullTime(selectedEntry.timestamp)}</span>
            
            <div className="flex-1"></div>
            
            <div className="flex items-center gap-4 text-xs font-mono text-(--color-text-tertiary)">
              <span>{selectedEntry.content.length.toLocaleString()} chars</span>
              <span>•</span>
              <span>{selectedEntry.content.split(/\n/).length} lines</span>
            </div>
          </div>

          {/* Content preview */}
          <div className="flex-1 relative overflow-hidden mb-6">
            <div className="absolute inset-0 bg-(--color-surface-raised)/30 border border-(--color-border) rounded-3xl backdrop-blur-sm" />
            <div className="relative h-full p-8 overflow-auto custom-scrollbar">
              <pre className="text-sm md:text-base text-(--color-text-secondary) font-mono leading-relaxed whitespace-pre-wrap break-all selection:bg-purple-500/30">
                {selectedEntry.content}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        /* ===== EMPTY STATE / DASHBOARD HOME ===== */
      <div className="flex-1 flex flex-col h-full bg-transparent min-w-0 transition-colors duration-300">
        {/* Top Header Bar */}
        <div className="h-20 border-b border-(--color-border) flex items-center justify-between px-8 bg-(--color-surface)/50 backdrop-blur-xl shrink-0 z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-full bg-(--color-surface-raised)/50 border border-(--color-border)">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-[12px] font-medium text-(--color-text-muted) hidden sm:inline">{connected ? 'Online' : 'Offline'}</span>
            </div>
            <div className="h-4 w-px bg-(--color-border) shrink-0" />
            <div className="flex items-center gap-6 text-[12px] font-medium text-(--color-text-muted)">
              <span className="hidden sm:inline hover:text-(--color-text-primary) transition-colors cursor-default">{historyCount} items</span>
              <span className="hidden sm:inline hover:text-(--color-text-primary) transition-colors cursor-default">{devices.length} device{devices.length !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-(--color-surface-raised) hover:bg-(--color-surface-raised) transition-colors border border-(--color-border) cursor-copy" 
                   onClick={() => onCopy(keyFingerprint || "")}
                   title="Click to copy key fingerprint">
                <span className="text-(--color-text-tertiary)">Key fingerprint:</span>
                <span className="font-mono text-(--color-text-secondary)">
                  {keyFingerprint ? keyFingerprint.substring(0, 8) : '—'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
             <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-(--color-surface-raised) border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-surface) transition-all">
               <div className="w-5 h-5">{Icons.info}</div>
             </button>
             <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-(--color-surface-raised) border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-surface) transition-all" onClick={onLinkDevice}>
               <div className="w-5 h-5">{Icons.link}</div>
             </button>
             <button 
               className="px-4 h-9 bg-(--color-surface-raised) text-red-400 text-[13px] font-medium rounded-xl border border-(--color-border) hover:bg-red-500/10 hover:border-red-500/20 transition-all"
               onClick={onLogout}
             >
               Sign out
             </button>
          </div>
        </div>

        {/* Main Center Content */}
        <div className="flex-1 flex flex-col items-center p-8 relative overflow-y-auto custom-scrollbar">

          <div className="relative z-10 max-w-3xl w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
            {/* Hero Icon */}
            <div className="relative mb-8 group">
              <div className="absolute inset-0 bg-linear-to-br from-purple-500 to-blue-600 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
              <div className="relative w-24 h-24 rounded-3xl bg-(--color-surface-raised) border border-(--color-border) flex items-center justify-center shadow-xl">
                <div className="w-12 h-12 text-(--color-text-primary)/90">{Icons.logo || Icons.clipboard}</div>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-semibold text-(--color-text-primary) mb-4 text-center leading-tight">Welcome to Echo</h1>
            <p className="text-(--color-text-tertiary) text-center mb-12 max-w-lg mx-auto leading-relaxed text-base">
              Your clipboard syncs across all devices in real-time with end-to-end encryption.
            </p>

            {/* 2x2 Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10">
              {/* Connection Card */}
              <div className="bg-(--color-surface-raised)/40 p-6 rounded-xl border border-(--color-border) flex items-center gap-5 hover:bg-(--color-surface-raised)/60 hover:border-(--color-border-subtle) transition-all duration-300 backdrop-blur-sm">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  <div className="w-6 h-6">{Icons.sync}</div>
                </div>
                <div>
                  <h3 className="text-[12px] text-(--color-text-muted) mb-0.5">Status</h3>
                  <p className={`font-semibold text-lg ${connected ? 'text-(--color-text-primary)' : 'text-red-400'}`}>
                    {connected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>

              {/* Encryption Card */}
              <div className="bg-(--color-surface-raised)/40 p-6 rounded-2xl border border-(--color-border) flex items-center gap-5 hover:bg-(--color-surface-raised)/60 hover:border-(--color-border-subtle) transition-all duration-300 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <div className="w-6 h-6">{Icons.shield}</div>
                </div>
                <div>
                  <h3 className="text-[12px] text-(--color-text-muted) mb-0.5">Security</h3>
                  <p className="font-semibold text-lg text-(--color-text-primary)">End-to-end encrypted</p>
                </div>
              </div>

              {/* History Card */}
              <div className="bg-(--color-surface-raised)/40 p-6 rounded-2xl border border-(--color-border) flex items-center gap-5 hover:bg-(--color-surface-raised)/60 hover:border-(--color-border-subtle) transition-all duration-300 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <div className="w-6 h-6">{Icons.history}</div>
                </div>
                <div>
                  <h3 className="text-[12px] text-(--color-text-muted) mb-0.5">History</h3>
                  <p className="font-semibold text-lg text-(--color-text-primary)">{historyCount} items synced</p>
                </div>
              </div>

              {/* Devices Card */}
              <div 
                className="bg-(--color-surface-raised)/40 p-6 rounded-xl border border-(--color-border) flex items-center gap-5 hover:bg-(--color-surface-raised)/60 hover:border-(--color-border-subtle) transition-all duration-300 backdrop-blur-sm cursor-pointer"
                onClick={onManageDevices}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <div className="w-6 h-6">{Icons.devices}</div>
                </div>
                <div>
                  <h3 className="text-[12px] text-(--color-text-muted) mb-0.5">Devices</h3>
                  <p className="font-semibold text-lg text-(--color-text-primary)">{devices.length} connected</p>
                </div>
              </div>
            </div>

            {/* Background Mode Toggle */}
            <div 
              className="w-full bg-(--color-surface-raised)/30 rounded-xl border border-(--color-border) p-5 mb-8 flex items-center justify-between cursor-pointer hover:bg-(--color-surface-raised)/50 transition-all group backdrop-blur-sm"
              onClick={onToggleBackgroundMode}
            >
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${backgroundModeEnabled ? 'bg-(--color-text-primary) text-(--color-bg)' : 'bg-(--color-surface-raised) text-(--color-text-muted)'}`}>
                  <div className="w-6 h-6">{Icons.sync}</div>
                </div>
                <div>
                  <h3 className="text-(--color-text-primary) text-base font-semibold mb-0.5">Background sync</h3>
                  <p className="text-(--color-text-tertiary) text-xs">Keep Echo running when window is closed</p>
                </div>
              </div>
              {/* Toggle Switch */}
              <div className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${backgroundModeEnabled ? 'bg-green-500' : 'bg-(--color-surface-raised) border border-(--color-border)'}`}>
                <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${backgroundModeEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
              <button 
                onClick={onLinkDevice}
                className="w-full sm:w-auto h-12 flex items-center justify-center gap-2 px-6 bg-(--color-text-primary) text-(--color-bg) hover:opacity-90 rounded-xl font-medium text-[15px] transition-all active:scale-[0.98]"
              >
                <div className="w-4 h-4">{Icons.link}</div>
                <span>Link new device</span>
              </button>

               <button 
                onClick={onEnterKey}
                className="w-full sm:w-auto h-12 flex items-center justify-center gap-2 px-6 bg-(--color-surface-raised) border border-(--color-border) hover:bg-(--color-surface) text-(--color-text-primary) rounded-xl font-medium text-[15px] transition-all active:scale-[0.98]"
              >
                <div className="w-4 h-4">{Icons.shield}</div>
                <span>Enter sync key</span>
              </button>
            </div>

          </div>
        </div>
      </div>
      )}
      </div>
    </main>
  );
};
