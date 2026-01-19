import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { timeService } from '../../../services/timeService';

// Types
export interface Notification {
  id: string;
  message?: string; // Legacy: direct message string
  messageKey?: string; // Translation key (e.g., 'outOfStock')
  messageParams?: Record<string, string>; // Params for interpolation (e.g., { name: 'Panadol' })
  type: 'info' | 'success' | 'warning' | 'error' | 'out_of_stock';
  timestamp: Date;
  read?: boolean;
}

export interface StatusBarState {
  notifications: Notification[];
  announcement: string | null;
  isOnline: boolean;
  customItems: Map<string, React.ReactNode>;
  timeSynced: boolean;
  lastSyncTime: number | null;
  lastTransactionTime: number;
}

export interface StatusBarContextType {
  state: StatusBarState;
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  markAsRead: (id: string) => void;
  // Announcement actions
  setAnnouncement: (message: string | null) => void;
  // Connection status
  setOnlineStatus: (status: boolean) => void;
  // Custom items (for extensibility)
  registerItem: (key: string, component: React.ReactNode) => void;
  unregisterItem: (key: string) => void;
  // Time management
  getVerifiedDate: () => Date;
  updateLastTransactionTime: (timestamp: number) => void;
  validateTransactionTime: (proposedTime: Date) => { valid: boolean; message?: string };
  syncTime: () => Promise<boolean>;
}

const LAST_TRANSACTION_KEY = 'pharmaflow_last_transaction';
const NOTIFICATIONS_KEY = 'pharmaflow_notifications';

const loadLastTransaction = (): number => {
  try {
    const stored = localStorage.getItem(LAST_TRANSACTION_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
};

const loadNotifications = (): Notification[] => {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Convert timestamp strings back to Date objects
    return parsed.map((n: any) => ({
      ...n,
      timestamp: new Date(n.timestamp),
    }));
  } catch {
    return [];
  }
};

/*
 * STATUS BAR CONTEXT & LOGIC
 * ==========================
 * 
 * This context acts as the "BRAIN" of the status bar system.
 * 
 * CORE RESPONSIBILITIES:
 * 1. UI STATE: Manages Notifications (Ephemeral), Announcements (Sticky), Connection Status.
 * 2. TIME VERIFICATION: 
 *    - Integrates with `timeService` to provide calculating 'Verified Time'.
 *    - Prevents tampering by using server offsets rather than local system time.
 * 3. MONOTONICITY CHECKS:
 *    - `validateTransactionTime` ensures time never goes backwards (preventing fraud).
 *    - Keeps track of `lastTransactionTime` in localStorage.
 */
const defaultState: StatusBarState = {
  notifications: loadNotifications(),
  announcement: null,
  isOnline: navigator.onLine,
  customItems: new Map(),
  timeSynced: timeService.isSynced(),
  lastSyncTime: timeService.getLastSyncTime()?.getTime() || null,
  lastTransactionTime: loadLastTransaction(),
};

const StatusBarContext = createContext<StatusBarContextType | undefined>(undefined);

export const StatusBarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StatusBarState>(defaultState);

  // Persist notifications to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(state.notifications));
    } catch (e) {
      console.warn('Failed to save notifications to localStorage:', e);
    }
  }, [state.notifications]);

  // Notification handlers
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: timeService.getVerifiedDate().getTime().toString(),
      timestamp: timeService.getVerifiedDate(),
    };
    setState(prev => ({
      ...prev,
      notifications: [newNotification, ...prev.notifications].slice(0, 50), // Keep max 50
    }));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id),
    }));
  }, []);

  const clearNotifications = useCallback(() => {
    setState(prev => ({ ...prev, notifications: [] }));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  }, []);

  // Announcement handlers
  const setAnnouncement = useCallback((message: string | null) => {
    setState(prev => ({ ...prev, announcement: message }));
  }, []);

  // Connection status
  const setOnlineStatus = useCallback((status: boolean) => {
    setState(prev => ({ ...prev, isOnline: status }));
  }, []);

  // Custom items for extensibility
  const registerItem = useCallback((key: string, component: React.ReactNode) => {
    setState(prev => {
      const newItems = new Map(prev.customItems);
      newItems.set(key, component);
      return { ...prev, customItems: newItems };
    });
  }, []);

  const unregisterItem = useCallback((key: string) => {
    setState(prev => {
      const newItems = new Map(prev.customItems);
      newItems.delete(key);
      return { ...prev, customItems: newItems };
    });
  }, []);

  // Listen for online/offline events
  React.useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  // Time management functions
  const getVerifiedDate = useCallback((): Date => {
    return timeService.getVerifiedDate();
  }, []);

  const updateLastTransactionTime = useCallback((timestamp: number) => {
    setState(prev => ({ ...prev, lastTransactionTime: timestamp }));
    localStorage.setItem(LAST_TRANSACTION_KEY, timestamp.toString());
  }, []);

  /**
   * MONOTONIC VALIDATION (Anti-Fraud)
   * ---------------------------------
   * Checks if a proposed transaction time is chronologically valid.
   * Prevents users from rolling back system clock to falsify transaction dates.
   * 
   * @param proposedTime The verified time of the current action
   * @returns {valid: boolean, message?: string}
   */
  const validateTransactionTime = useCallback((proposedTime: Date): { valid: boolean; message?: string } => {
    const proposedTimestamp = proposedTime.getTime();
    const lastTimestamp = state.lastTransactionTime;

    // Allow 5 seconds tolerance for concurrent transactions
    const tolerance = 5000;
    
    if (lastTimestamp > 0 && proposedTimestamp < (lastTimestamp - tolerance)) {
      return {
        valid: false,
        message: `Transaction time (${proposedTime.toLocaleString()}) is before last transaction. Possible date tampering detected.`
      };
    }

    return { valid: true };
  }, [state.lastTransactionTime]);

  const syncTime = useCallback(async (): Promise<boolean> => {
    const success = await timeService.syncTime();
    setState(prev => ({ 
      ...prev, 
      timeSynced: success,
      lastSyncTime: timeService.getLastSyncTime()?.getTime() || null
    }));
    return success;
  }, []);

  // Auto-sync when going online (only if not already synced)
  React.useEffect(() => {
    if (state.isOnline && !timeService.isSynced()) {
      syncTime();
    }
  }, [state.isOnline, syncTime]);

  const value = React.useMemo<StatusBarContextType>(() => ({
    state,
    addNotification,
    removeNotification,
    clearNotifications,
    markAsRead,
    setAnnouncement,
    setOnlineStatus,
    registerItem,
    unregisterItem,
    getVerifiedDate,
    updateLastTransactionTime,
    validateTransactionTime,
    syncTime,
  }), [
    state,
    addNotification,
    removeNotification,
    clearNotifications,
    markAsRead,
    setAnnouncement,
    setOnlineStatus,
    registerItem,
    unregisterItem,
    getVerifiedDate,
    updateLastTransactionTime,
    validateTransactionTime,
    syncTime,
  ]);

  return (
    <StatusBarContext.Provider value={value}>
      {children}
    </StatusBarContext.Provider>
  );
};

export const useStatusBar = (): StatusBarContextType => {
  const context = useContext(StatusBarContext);
  if (!context) {
    throw new Error('useStatusBar must be used within a StatusBarProvider');
  }
  return context;
};

export default StatusBarContext;
