import type React from 'react';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

export interface AlertData {
  id: string;
  message: string;
  type: AlertType;
  title?: string;
  duration?: number;
}

interface AlertContextType {
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  removeAlert: (id: string) => void;
  alerts: AlertData[];
  currentAlert: AlertData | null; // Keep for backward compatibility with status bar
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  const addAlert = useCallback((options: Omit<AlertData, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newAlert = { ...options, id };

    setAlerts((prev) => [...prev, newAlert]);

    // if (options.duration && options.duration > 0) {
    //   setTimeout(() => {
    //     setAlerts((prev) => prev.filter((a) => a.id !== id));
    //   }, options.duration);
    // }
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const helpers = {
    success: (message: string, title?: string, duration?: number) =>
      addAlert({ type: 'success', message, title, duration: duration || 5000 }),
    error: (message: string, title?: string, duration?: number) =>
      addAlert({ type: 'error', message, title, duration: duration || 8000 }),
    warning: (message: string, title?: string, duration?: number) =>
      addAlert({ type: 'warning', message, title, duration: duration || 6000 }),
    info: (message: string, title?: string, duration?: number) =>
      addAlert({ type: 'info', message, title, duration: duration || 5000 }),
    removeAlert,
    alerts,
    currentAlert: alerts[alerts.length - 1] || null,
  };

  return <AlertContext.Provider value={helpers}>{children}</AlertContext.Provider>;
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
