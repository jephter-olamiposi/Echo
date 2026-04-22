import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
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

function hasUserMessage(error: unknown): error is { userMessage: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'userMessage' in error &&
    typeof error.userMessage === 'string'
  );
}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timeoutIdsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removeToast = useCallback((id: string) => {
    const timeoutId = timeoutIdsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss: 5s for errors (more time to read), 3s for success/info
    const duration = type === 'error' ? 5000 : 3000;
    const timeoutId = setTimeout(() => {
      removeToast(id);
    }, duration);
    timeoutIdsRef.current.set(id, timeoutId);
  }, [removeToast]);

  const showError = useCallback((error: unknown) => {
    let message = 'An unexpected error occurred';
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    if (hasUserMessage(error)) {
      message = error.userMessage;
    }

    showToast(message, 'error');
  }, [showToast]);

  useEffect(() => {
    return () => {
      for (const timeoutId of timeoutIdsRef.current.values()) {
        clearTimeout(timeoutId);
      }
      timeoutIdsRef.current.clear();
    };
  }, []);

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
