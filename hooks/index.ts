// Hooks Barrel File

// Layout Hooks
export { type AppState, type ToastState, useAppState } from './layout/useAppState';
export { useColumnReorder } from './layout/useColumnReorder';
export { useFilterDropdown } from './layout/useFilterDropdown';
export { type NavigationHandlers, useNavigation } from './layout/useNavigation';
export { useTheme } from './layout/useTheme';

// Auth Hooks
export { type AuthActions, type AuthState, useAuth } from './auth/useAuth';
export { useAuthenticatedData } from './auth/useAuthenticatedData';
export { useOnboardingStatus } from './auth/useOnboardingStatus';

// Common Hooks
export { useLongPress } from './common/useLongPress';

// Domain Hooks
export { useFinancials } from './sales/useFinancials';
export { usePOSTabs } from './sales/usePOSTabs';
export { useShift } from './sales/useShift';
export { useProcurement } from './purchases/useProcurement';
export { useInventorySearch } from './inventory/useInventorySearch';
export { useRisk } from './inventory/useRisk';
export { useInventoryHandlers } from './inventory/useInventoryHandlers';
export { useCustomerHandlers } from './customers/useCustomerHandlers';
export { useSupplierHandlers } from './suppliers/useSupplierHandlers';
export { useEmployeeHandlers } from './hr/useEmployeeHandlers';
export { usePurchaseHandlers } from './purchases/usePurchaseHandlers';
export { useSalesHandlers } from './sales/useSalesHandlers';

// Infrastructure Hooks
export { useAudit } from './infrastructure/useAudit';
export { useGlobalEventHandlers } from './infrastructure/useGlobalEventHandlers';
export { usePrinter } from './infrastructure/usePrinter';

// Root Hooks
export { type EntityHandlers, type SaleData, useEntityHandlers } from './useEntityHandlers';
export { useDynamicTickerData } from './layout/useDynamicTickerData';
