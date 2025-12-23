import React from 'react';
import { Icons } from '../Icons';

interface ScanningOverlayProps {
  onCancel: () => void;
}

export const ScanningOverlay: React.FC<ScanningOverlayProps> = ({ onCancel }) => {
  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-between p-8 bg-transparent">
      {/* Top Banner */}
      <div className="w-full flex justify-between items-center pt-8">
         <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <span className="text-sm font-medium text-white/90">Position QR code inside the box</span>
         </div>
      </div>

      {/* Target Reticle */}
      <div className="relative w-64 h-64 border-2 border-white/20 rounded-3xl">
         {/* Corner Accents */}
         <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-purple-500 rounded-tl-xl"></div>
         <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-purple-500 rounded-tr-xl"></div>
         <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-purple-500 rounded-bl-xl"></div>
         <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-purple-500 rounded-br-xl"></div>
         
         {/* Scanning Line Animation */}
         <div className="absolute left-0 w-full h-0.5 bg-linear-to-r from-transparent via-purple-400 to-transparent top-0 animate-[scan-line_2s_ease-in-out_infinite]"></div>
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-xs pb-12">
        <button 
          onClick={onCancel}
          className="w-full bg-black/60 backdrop-blur-xl border border-white/10 text-white font-semibold py-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl"
        >
          <span className="w-5 h-5">{Icons.close}</span>
          <span>Cancel Scan</span>
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
