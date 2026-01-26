import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastType } from '../components/common/Toast';

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastData, 'id'>) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((options: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...options, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const helpers = {
    toast: addToast,
    success: (message: string, title?: string, duration?: number) => 
      addToast({ type: 'success', message, title, duration }),
    error: (message: string, title?: string, duration?: number) => 
      addToast({ type: 'error', message, title, duration }),
    warning: (message: string, title?: string, duration?: number) => 
      addToast({ type: 'warning', message, title, duration }),
    info: (message: string, title?: string, duration?: number) => 
      addToast({ type: 'info', message, title, duration }),
    removeToast
  };

  return (
    <ToastContext.Provider value={helpers}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast {...t} onClose={removeToast} />
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
