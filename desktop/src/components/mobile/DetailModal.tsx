import React from 'react';
import { Icons } from '../Icons';
import { 
  formatFullTime, 
  getContentTypeIcon 
} from '../../utils';
import { ClipboardEntry } from '../../types';
import { CopyButton } from '../ui/CopyButton';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

/* ─────────────────────────────────────────────────────────────────────────────
 * DetailModal Component
 * 
 * Bottom sheet modal showing clipboard entry details.
 * Uses Button and Card primitives for consistent styling.
 * ───────────────────────────────────────────────────────────────────────────── */

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
    <div className="fixed inset-0 z-150 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        className={`
          fixed bottom-0 left-0 right-0 z-50 
          bg-(--color-bg-subtle) border-t border-(--color-border) rounded-t-4xl 
          shadow-[0_-8px_40px_rgba(0,0,0,0.12)]
          flex flex-col max-h-[90dvh]
          animate-in slide-in-from-bottom duration-300
        `.trim().replace(/\s+/g, ' ')}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        {/* Handle */}
        <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full bg-(--color-border-subtle)/50" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
               {getContentTypeIcon(entry.contentType)}
             </div>
             <div>
               <h3 className="text-[17px] font-semibold text-(--color-text-primary)">
                 {entry.contentType === 'url' ? 'Link' : entry.contentType === 'code' ? 'Code Snippet' : 'Text Clip'}
               </h3>
               <p className="text-[13px] text-(--color-text-tertiary) flex items-center gap-1.5">
                 <span>{formatFullTime(entry.timestamp)}</span>
                 <span>•</span>
                 <span>{entry.source === 'local' ? 'This device' : entry.deviceName}</span>
               </p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-(--color-surface-raised) flex items-center justify-center text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors"
          >
            {Icons.close}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
          {/* Metadata Card */}
          <Card variant="default" padding="md" className="mb-6">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-(--color-text-tertiary)">Type</span>
              <div className="flex items-center gap-2 text-[14px] text-(--color-text-primary)">
                <div className="w-4 h-4 text-purple-400">{getContentTypeIcon(entry.contentType)}</div>
                <span>{entry.contentType.charAt(0).toUpperCase() + entry.contentType.slice(1)}</span>
              </div>
            </div>
            
            <div className="h-px bg-(--color-border-subtle) my-4" />
            
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-(--color-text-tertiary)">Captured</span>
              <span className="text-[14px] text-(--color-text-primary)">{formatFullTime(entry.timestamp)}</span>
            </div>

            <div className="h-px bg-(--color-border-subtle) my-4" />

            <div className="flex items-center justify-between">
              <span className="text-[13px] text-(--color-text-tertiary)">Source</span>
              <div className="flex items-center gap-2 text-[14px] text-(--color-text-primary)">
                <div className={`w-2 h-2 rounded-full ${entry.source === 'local' ? 'bg-green-500' : 'bg-purple-500'}`} />
                <span>{entry.source === "local" ? "This device" : entry.deviceName || "Remote"}</span>
              </div>
            </div>
          </Card>

          {/* Content Body */}
          <Card variant="default" padding="md">
            <pre className="text-[14px] text-(--color-text-secondary) font-mono leading-relaxed whitespace-pre-wrap break-all max-h-80 overflow-y-auto custom-scrollbar">
              {entry.content}
            </pre>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="sticky bottom-0 bg-(--color-surface-raised) border-t border-(--color-border) p-4 flex gap-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <CopyButton 
            content={entry.content}
            onCopy={onCopy}
            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-(--color-text-primary) text-(--color-bg) font-semibold text-[15px] active:scale-[0.98] transition-all hover:opacity-90"
            iconClassName="w-5 h-5"
          >
            Copy
          </CopyButton>

          <Button
            variant={entry.pinned ? 'primary' : 'secondary'}
            size="md"
            onClick={() => { onPin(entry.id); onClose(); }}
            className="w-12"
            aria-label={entry.pinned ? 'Unpin' : 'Pin'}
          >
            <div className="w-5 h-5">{Icons.pin}</div>
          </Button>

          <Button
            variant="danger"
            size="md"
            onClick={() => { onDelete(entry.id); onClose(); }}
            className="w-12"
            aria-label="Delete"
          >
            <div className="w-5 h-5">{Icons.trash}</div>
          </Button>
        </div>
      </div>
    </div>
  );
};
