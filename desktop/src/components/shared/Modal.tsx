import React, { useEffect } from 'react';
import { Icons } from '../Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className = ''
}) => {
  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Container */}
      <div 
        className={`relative w-full max-w-md bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
            <button 
              className="p-2 -mr-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                onClick={onClose}
            >
              <div className="w-5 h-5">{Icons.close}</div>
            </button>
          </div>
          {description && <p className="text-sm text-zinc-500 leading-relaxed mb-6">{description}</p>}
          
          <div className="mt-4">
            {children}
          </div>
        </div>

        {footer && (
          <div className="bg-white/2 border-t border-white/5 p-4 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
