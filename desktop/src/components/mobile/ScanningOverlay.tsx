import React from 'react';
import { Icons } from '../Icons';

interface ScanningOverlayProps {
  onCancel: () => void;
}

export const ScanningOverlay: React.FC<ScanningOverlayProps> = ({ onCancel }) => {
  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-between p-8 bg-transparent overflow-hidden">
      <div className="w-full flex justify-between items-center pt-8 z-20 relative">
        <div className="bg-(--color-surface-raised)/80 backdrop-blur-md px-4 py-2 rounded-full border border-(--color-border)">
          <span className="text-sm font-medium text-(--color-text-primary)">Position QR code inside the box</span>
        </div>
      </div>

      <div className="relative w-64 h-64 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.85)] z-0">
        <div className="absolute inset-0 border-2 border-white/20 rounded-3xl" />

        <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-purple-500 rounded-tl-xl z-10"></div>
        <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-purple-500 rounded-tr-xl z-10"></div>
        <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-purple-500 rounded-bl-xl z-10"></div>
        <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-purple-500 rounded-br-xl z-10"></div>

        <div className="absolute left-0 w-full h-0.5 bg-linear-to-r from-transparent via-purple-400 to-transparent top-0 animate-[scan-line_2s_ease-in-out_infinite] z-10"></div>
      </div>

      <div className="w-full max-w-xs pb-12 z-20 relative">
        <button
          onClick={onCancel}
          className="w-full h-14 bg-(--color-surface-raised)/90 backdrop-blur-xl border border-(--color-border) text-(--color-text-primary) font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl"
        >
          <div className="w-5 h-5">{Icons.close}</div>
          <span>Cancel scan</span>
        </button>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
