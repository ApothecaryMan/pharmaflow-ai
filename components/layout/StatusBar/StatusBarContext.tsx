import React, { createContext, type ReactNode, useCallback, useContext, useReducer, useMemo, useEffect } from 'react';
import { timeService } from '../../../services/timeService';
import { storage } from '../../../utils/storage';
import { idGenerator } from '../../../utils/idGenerator';
import { StorageKeys } from '../../../config/storageKeys';

// --- Types & Constants ---

export interface Notification {
  id: string;
  message?: string;
  messageKey?: string;
  messageParams?: Record<string, string>;
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

type StatusBarAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; id: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'MARK_AS_READ'; id: string }
  | { type: 'SET_ANNOUNCEMENT'; payload: string | null }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'REGISTER_ITEM'; key: string; component: React.ReactNode }
  | { type: 'UNREGISTER_ITEM'; key: string }
  | { type: 'SET_TIME_SYNC'; synced: boolean; lastSync: number | null }
  | { type: 'SET_LAST_TRANSACTION'; timestamp: number };

export interface StatusBarContextType {
  state: StatusBarState;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  markAsRead: (id: string) => void;
  setAnnouncement: (message: string | null) => void;
  setOnlineStatus: (status: boolean) => void;
  registerItem: (key: string, component: React.ReactNode) => void;
  unregisterItem: (key: string) => void;
  getVerifiedDate: () => Date;
  updateLastTransactionTime: (timestamp: number) => void;
  validateTransactionTime: (proposedTime: Date) => { valid: boolean; message?: string };
  syncTime: () => Promise<boolean>;
}

const LAST_TRANSACTION_KEY = StorageKeys.LAST_TRANSACTION;
const NOTIFICATIONS_KEY = StorageKeys.NOTIFICATIONS;

// --- State Helpers ---

const loadInitialState = (): StatusBarState => {
  const lastTransaction = storage.get<number>(LAST_TRANSACTION_KEY, 0);
  const storedNotifications = storage.get<any[]>(NOTIFICATIONS_KEY, []);
  
  return {
    notifications: storedNotifications.map(n => ({ ...n, timestamp: new Date(n.timestamp) })),
    announcement: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    customItems: new Map(),
    timeSynced: timeService.isSynced(),
    lastSyncTime: timeService.getLastSyncTime()?.getTime() || null,
    lastTransactionTime: lastTransaction,
  };
};

const statusBarReducer = (state: StatusBarState, action: StatusBarAction): StatusBarState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications].slice(0, 50) };
    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.id) };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    case 'MARK_AS_READ':
      return { ...state, notifications: state.notifications.map(n => n.id === action.id ? { ...n, read: true } : n) };
    case 'SET_ANNOUNCEMENT':
      return { ...state, announcement: action.payload };
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };
    case 'REGISTER_ITEM': {
      const next = new Map(state.customItems);
      next.set(action.key, action.component);
      return { ...state, customItems: next };
    }
    case 'UNREGISTER_ITEM': {
      const next = new Map(state.customItems);
      next.delete(action.key);
      return { ...state, customItems: next };
    }
    case 'SET_TIME_SYNC':
      return { ...state, timeSynced: action.synced, lastSyncTime: action.lastSync };
    case 'SET_LAST_TRANSACTION':
      return { ...state, lastTransactionTime: action.timestamp };
    default:
      return state;
  }
};

const StatusBarContext = createContext<StatusBarContextType | undefined>(undefined);

export const StatusBarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(statusBarReducer, null, loadInitialState);

  // --- Persistence Side Effects ---
  useEffect(() => { storage.set(NOTIFICATIONS_KEY, state.notifications); }, [state.notifications]);
  useEffect(() => { storage.set(LAST_TRANSACTION_KEY, state.lastTransactionTime); }, [state.lastTransactionTime]);

  // --- Connection Side Effects ---
  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Time Sync Side Effects ---
  const syncTime = useCallback(async () => {
    const success = await timeService.syncTime();
    dispatch({ 
      type: 'SET_TIME_SYNC', 
      synced: success, 
      lastSync: timeService.getLastSyncTime()?.getTime() || null 
    });
    return success;
  }, []);

  useEffect(() => {
    if (state.isOnline && !timeService.isSynced()) syncTime();
  }, [state.isOnline, syncTime]);

  // --- Actions ---
  const actions = useMemo(() => ({
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { ...notification, id: idGenerator.generateSync('notification'), timestamp: timeService.getVerifiedDate() }
    }),
    removeNotification: (id: string) => dispatch({ type: 'REMOVE_NOTIFICATION', id }),
    clearNotifications: () => dispatch({ type: 'CLEAR_NOTIFICATIONS' }),
    markAsRead: (id: string) => dispatch({ type: 'MARK_AS_READ', id }),
    setAnnouncement: (payload: string | null) => dispatch({ type: 'SET_ANNOUNCEMENT', payload }),
    setOnlineStatus: (payload: boolean) => dispatch({ type: 'SET_ONLINE_STATUS', payload }),
    registerItem: (key: string, component: React.ReactNode) => dispatch({ type: 'REGISTER_ITEM', key, component }),
    unregisterItem: (key: string) => dispatch({ type: 'UNREGISTER_ITEM', key }),
    getVerifiedDate: () => timeService.getVerifiedDate(),
    updateLastTransactionTime: (timestamp: number) => dispatch({ type: 'SET_LAST_TRANSACTION', timestamp }),
    validateTransactionTime: (proposedTime: Date) => {
      const proposedTimestamp = proposedTime.getTime();
      const lastTimestamp = state.lastTransactionTime;
      const tolerance = 5000;
      if (lastTimestamp > 0 && proposedTimestamp < lastTimestamp - tolerance) {
        return { valid: false, message: `Possible date tampering detected.` };
      }
      return { valid: true };
    },
    syncTime,
  }), [state.lastTransactionTime, syncTime]);

  const value = useMemo(() => ({ state, ...actions }), [state, actions]);

  return <StatusBarContext.Provider value={value}>{children}</StatusBarContext.Provider>;
};

export const useStatusBar = (): StatusBarContextType => {
  const context = useContext(StatusBarContext);
  if (!context) throw new Error('useStatusBar must be used within a StatusBarProvider');
  return context;
};

export default StatusBarContext;
