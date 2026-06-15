import type React from 'react';
import { createContext, useContext } from 'react';

export interface InventoryHeaderContextType {
  setLeftContent: (node: React.ReactNode) => void;
  setRightContent: (node: React.ReactNode) => void;
  setBottomContent: (node: React.ReactNode) => void;
  setShowStatsToggle: (show: boolean) => void;
  setShowStats: (show: boolean) => void;
  showStats: boolean;
}

export const InventoryHeaderContext = createContext<InventoryHeaderContextType | null>(null);

export const useInventoryHeader = () => {
  const context = useContext(InventoryHeaderContext);
  if (!context) {
    // Graceful context fallbacks for standalone components in tests
    return {
      setLeftContent: () => {},
      setRightContent: () => {},
      setBottomContent: () => {},
      setShowStatsToggle: () => {},
      setShowStats: () => {},
      showStats: false,
    };
  }
  return context;
};
