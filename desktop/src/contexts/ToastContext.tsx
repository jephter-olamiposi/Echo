import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast } from '../components/ui/Toast';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  showError: (error: unknown) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss: 5s for errors (more time to read), 3s for success/info
    const duration = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const showError = useCallback((error: unknown) => {
    let message = 'An unexpected error occurred';
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    // Handle AppError specifically if imported, but simpler string extraction works for now
    if ((error as any)?.userMessage) {
      message = (error as any).userMessage;
    }

    showToast(message, 'error');
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showError }}>
      {children}
      <div className="fixed top-6 left-0 right-0 z-50 pointer-events-none flex flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="animate-in fade-in slide-in-from-top-5 duration-300">
            <Toast message={toast.message} type={toast.type} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
