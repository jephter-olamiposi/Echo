import React from 'react';
import { Icons } from '../Icons';
import { 
  formatFullTime, 
  getContentTypeIcon 
} from '../../utils';
import { ClipboardEntry } from '../../types';
import { CopyButton } from '../shared/CopyButton';

interface MobileDetailModalProps {
  entry: ClipboardEntry;
  onClose: () => void;
  onCopy: (text: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}

export const DetailModal: React.FC<MobileDetailModalProps> = ({
  entry,
  onClose,
  onCopy,
  onPin,
  onDelete
}) => {
  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Bottom Sheet wrapper */}
      <div className="relative w-full max-w-lg bg-zinc-900 border-t border-white/10 rounded-t-4xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[90vh]">
        {/* Grabber Handle */}
        <div className="flex justify-center p-3" onClick={onClose}>
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Item Details</h2>
            <button 
              className="p-2 -mr-2 rounded-full text-zinc-400 hover:bg-white/5 active:scale-95 transition-all"
              onClick={onClose}
            >
              <div className="w-5 h-5">{Icons.close}</div>
            </button>
          </div>

          {/* Metadata Card */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Type</span>
              <div className="flex items-center gap-2 text-sm text-white">
                <div className="w-4 h-4 text-purple-400">{getContentTypeIcon(entry.contentType)}</div>
                <span className="font-semibold">{entry.contentType.toUpperCase()}</span>
              </div>
            </div>
            
            <div className="h-px bg-white/5" />
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Captured</span>
              <span className="text-sm text-white font-medium">{formatFullTime(entry.timestamp)}</span>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Source</span>
              <div className="flex items-center gap-2 text-sm text-white">
                <div className={`w-1.5 h-1.5 rounded-full ${entry.source === 'local' ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-blue-500'}`} />
                <span className="font-medium">{entry.source === "local" ? "This Device" : entry.deviceName || "Remote"}</span>
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="relative group">
            <div className="absolute -inset-px bg-linear-to-r from-purple-500/20 to-blue-500/20 rounded-2xl opacity-50 blur-sm" />
            <div className="relative bg-black/40 border border-white/10 rounded-2xl p-4 overflow-hidden">
               <pre className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap break-all max-h-75 overflow-y-auto custom-scrollbar">
                 {entry.content}
               </pre>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="sticky bottom-0 bg-zinc-900/80 backdrop-blur-xl border-t border-white/5 p-6 flex gap-3 pb-10">

          <CopyButton 
            content={entry.content}
            onCopy={onCopy}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-black font-bold text-sm hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-lg shadow-white/5"
            iconClassName="w-5 h-5"
          >
            Copy Content
          </CopyButton>
          
          <button 
            className={`w-14 h-14 flex items-center justify-center rounded-2xl border transition-all active:scale-90 ${entry.pinned ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-zinc-800 border-white/5 text-zinc-400'}`}
            onClick={() => onPin(entry.id)}
            title="Pin Item"
          >
            <div className="w-5 h-5">{Icons.pin}</div>
          </button>

          <button 
            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 active:scale-90 transition-all"
            onClick={() => onDelete(entry.id)}
            title="Delete Item"
          >
            <div className="w-5 h-5">{Icons.trash}</div>
          </button>
        </div>
      </div>
    </div>
  );
};
