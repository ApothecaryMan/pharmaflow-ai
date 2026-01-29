import React from 'react';
import { useAlert } from '../components/features/alerts/AlertContext';

/**
 * @deprecated Legacy Context - Use AlertContext instead.
 * This file exists to maintain backward compatibility during migration.
 */

// Dummy provider since AlertProvider is now the source of truth
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useToast = () => {
  const alert = useAlert();

  return {
    toast: (options: { message: string; type?: 'success' | 'error' | 'info' | 'warning'; title?: string; duration?: number }) => {
       const type = options.type || 'info';
       // Map legacy 'toast' calls to specific alert methods
       switch (type) {
           case 'success': alert.success(options.message, options.title, options.duration); break;
           case 'error': alert.error(options.message, options.title, options.duration); break;
           case 'warning': alert.warning(options.message, options.title, options.duration); break;
           case 'info': 
           default:
               alert.info(options.message, options.title, options.duration); break;
       }
    },
    success: alert.success,
    error: alert.error,
    warning: alert.warning,
    info: alert.info,
    removeToast: alert.removeAlert
  };
};
