import type React from 'react';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { storage } from '../utils/storage';

export interface NotificationState {
  showTicker: boolean;
  showNotificationBell: boolean;
  showNotificationOverlay: boolean;
  showTickerSales: boolean;
  showTickerInventory: boolean;
  showTickerCustomers: boolean;
  showTickerTopSeller: boolean;
}

export interface NotificationContextType extends NotificationState {
  setShowTicker: (show: boolean) => void;
  setShowNotificationBell: (show: boolean) => void;
  setShowNotificationOverlay: (show: boolean) => void;
  setShowTickerSales: (show: boolean) => void;
  setShowTickerInventory: (show: boolean) => void;
  setShowTickerCustomers: (show: boolean) => void;
  setShowTickerTopSeller: (show: boolean) => void;
}

const STORAGE_PREFIX = 'pharma_';

const defaultNotification: NotificationState = {
  showTicker: false,
  showNotificationBell: true,
  showNotificationOverlay: false,
  showTickerSales: false,
  showTickerInventory: false,
  showTickerCustomers: false,
  showTickerTopSeller: true,
};

const loadNotification = (): NotificationState => {
  if (typeof window === 'undefined') return defaultNotification;

  return {
    showTicker: storage.get(`${STORAGE_PREFIX}showTicker`, defaultNotification.showTicker),
    showNotificationBell: storage.get(
      `${STORAGE_PREFIX}showNotificationBell`,
      defaultNotification.showNotificationBell
    ),
    showNotificationOverlay: storage.get(
      `${STORAGE_PREFIX}showNotificationOverlay`,
      defaultNotification.showNotificationOverlay
    ),
    showTickerSales: storage.get(
      `${STORAGE_PREFIX}showTickerSales`,
      defaultNotification.showTickerSales
    ),
    showTickerInventory: storage.get(
      `${STORAGE_PREFIX}showTickerInventory`,
      defaultNotification.showTickerInventory
    ),
    showTickerCustomers: storage.get(
      `${STORAGE_PREFIX}showTickerCustomers`,
      defaultNotification.showTickerCustomers
    ),
    showTickerTopSeller: storage.get(
      `${STORAGE_PREFIX}showTickerTopSeller`,
      defaultNotification.showTickerTopSeller
    ),
  };
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NotificationState>(loadNotification);

  const persist = useCallback((key: string, value: boolean) => {
    storage.set(`${STORAGE_PREFIX}${key}`, value);
  }, []);

  const setShowTicker = useCallback(
    (showTicker: boolean) => {
      setState((prev) => ({ ...prev, showTicker }));
      persist('showTicker', showTicker);
    },
    [persist]
  );

  const setShowNotificationBell = useCallback(
    (showNotificationBell: boolean) => {
      setState((prev) => ({ ...prev, showNotificationBell }));
      persist('showNotificationBell', showNotificationBell);
    },
    [persist]
  );

  const setShowNotificationOverlay = useCallback(
    (showNotificationOverlay: boolean) => {
      setState((prev) => ({ ...prev, showNotificationOverlay }));
      persist('showNotificationOverlay', showNotificationOverlay);
    },
    [persist]
  );

  const setShowTickerSales = useCallback(
    (showTickerSales: boolean) => {
      setState((prev) => ({ ...prev, showTickerSales }));
      persist('showTickerSales', showTickerSales);
    },
    [persist]
  );

  const setShowTickerInventory = useCallback(
    (showTickerInventory: boolean) => {
      setState((prev) => ({ ...prev, showTickerInventory }));
      persist('showTickerInventory', showTickerInventory);
    },
    [persist]
  );

  const setShowTickerCustomers = useCallback(
    (showTickerCustomers: boolean) => {
      setState((prev) => ({ ...prev, showTickerCustomers }));
      persist('showTickerCustomers', showTickerCustomers);
    },
    [persist]
  );

  const setShowTickerTopSeller = useCallback(
    (showTickerTopSeller: boolean) => {
      setState((prev) => ({ ...prev, showTickerTopSeller }));
      persist('showTickerTopSeller', showTickerTopSeller);
    },
    [persist]
  );

  const value = useMemo<NotificationContextType>(
    () => ({
      ...state,
      setShowTicker,
      setShowNotificationBell,
      setShowNotificationOverlay,
      setShowTickerSales,
      setShowTickerInventory,
      setShowTickerCustomers,
      setShowTickerTopSeller,
    }),
    [
      state,
      setShowTicker,
      setShowNotificationBell,
      setShowNotificationOverlay,
      setShowTickerSales,
      setShowTickerInventory,
      setShowTickerCustomers,
      setShowTickerTopSeller,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
