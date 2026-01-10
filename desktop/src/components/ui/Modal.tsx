import React, { useEffect, useCallback } from 'react';
import { Icons } from '../Icons';

/* ─────────────────────────────────────────────────────────────────────────────
 * Modal Component
 * 
 * Responsive modal/bottom-sheet that adapts to screen size.
 * - Mobile: Bottom sheet with rounded top corners
 * - Desktop: Centered modal with zoom animation
 * 
 * Uses design system tokens for consistent styling.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-md',
  lg: 'md:max-w-lg',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className = ''
}) => {
  // Memoized escape handler
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) onClose();
  }, [isOpen, onClose]);

  // Escape key listener
  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-150 flex items-end md:items-center justify-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-(--color-surface-overlay) backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div 
        className={`
          relative w-full ${sizeClasses[size]}
          bg-(--color-surface-raised)/95 backdrop-blur-2xl 
          border-t md:border border-(--color-border) 
          rounded-t-3xl md:rounded-2xl 
          shadow-xl overflow-hidden 
          animate-in slide-in-from-bottom md:zoom-in-95 
          duration-300 md:duration-200
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-2 md:pb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 
              id="modal-title" 
              className="text-xl font-semibold text-(--color-text-primary) tracking-tight"
            >
              {title}
            </h2>
            <button 
              className="p-2 -mr-2 text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-surface)/5 rounded-full transition-colors"
              onClick={onClose}
              aria-label="Close modal"
            >
              <div className="w-5 h-5">{Icons.close}</div>
            </button>
          </div>
          {description && (
            <p className="text-sm text-(--color-text-secondary) leading-relaxed mb-6">
              {description}
            </p>
          )}
          
          {/* Content */}
          <div className="mt-4">
            {children}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="bg-(--color-surface-raised)/30 border-t border-(--color-border) p-6 md:p-4 flex md:justify-end gap-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
