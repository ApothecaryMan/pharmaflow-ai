import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
  currentAlert: AlertData | null;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentAlert, setCurrentAlert] = useState<AlertData | null>(null);

  const addAlert = useCallback((options: Omit<AlertData, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newAlert = { ...options, id };
    
    // Set current alert for the status bar
    setCurrentAlert(newAlert);

    // Clear current alert reference after duration (roughly)
    if (options.duration && options.duration > 0) {
      setTimeout(() => {
        setCurrentAlert(prev => prev?.id === id ? null : prev);
      }, options.duration);
    }
  }, []);

  const removeAlert = useCallback((id: string) => {
    setCurrentAlert(prev => prev?.id === id ? null : prev);
  }, []);

  const helpers = {
    alert: addAlert, // Generic internal helper
    success: (message: string, title?: string, duration?: number) => 
      addAlert({ type: 'success', message, title, duration }),
    error: (message: string, title?: string, duration?: number) => 
      addAlert({ type: 'error', message, title, duration }),
    warning: (message: string, title?: string, duration?: number) => 
      addAlert({ type: 'warning', message, title, duration }),
    info: (message: string, title?: string, duration?: number) => 
      addAlert({ type: 'info', message, title, duration }),
    removeAlert,
    currentAlert
  };

  return (
    <AlertContext.Provider value={helpers}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
