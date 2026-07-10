import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
import { StorageKeys } from '../../config/storageKeys';
import { useAlert, useSettings } from '../../context';
import type { AuthState } from '../../hooks/auth/useAuth';
import { useSessionHandlers } from '../../hooks/auth/useSessionHandlers';
import { useGlobalEventHandlers } from '../../hooks/infrastructure/useGlobalEventHandlers';
import type { AppState } from '../../hooks/layout/useAppState';
import { useNavigation } from '../../hooks/layout/useNavigation';
import {
  useAddPurchase,
  useApprovePurchase,
  useMarkPurchaseReceived,
} from '../../hooks/mutations/usePurchaseMutations';
import {
  useCreatePurchaseReturn,
  useProcessSalesReturn,
} from '../../hooks/mutations/useReturnsMutations';
import { useCompleteSale } from '../../hooks/mutations/useSalesMutations';
import { useCustomers } from '../../hooks/queries/useCustomersQuery';
import { useEmployees } from '../../hooks/queries/useEmployeesQuery';
import { useBatches, useInventory, useSuppliers } from '../../hooks/queries/useInventoryQuery';
import { usePurchases } from '../../hooks/queries/usePurchasesQuery';
import { usePurchaseReturns, useSalesReturns } from '../../hooks/queries/useReturnsQuery';
import { useRecentSales } from '../../hooks/queries/useSalesQuery';
import { useRealtimeSync } from '../../hooks/realtime/useRealtimeSync';
import { useShift } from '../../hooks/sales/useShift';
import { useEntityHandlers } from '../../hooks/useEntityHandlers';
import { TRANSLATIONS } from '../../i18n/translations';
import { queryClient } from '../../lib/queryClient';
import { queryKeys } from '../../lib/queryKeys';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type {
  ActionContext,
  Customer,
  Drug,
  Employee,
  Purchase,
  PurchaseReturn,
  Return,
  Sale,
  StockBatch,
  Supplier,
  ViewState,
} from '../../types';
import { storage } from '../../utils/storage';
import { Modal } from '../common/Modal';
import { SecureGate } from '../common/SecureGate';
import { WidgetUpdateEmitter } from '../dashboard/WidgetUpdateEmitter';
import { LogoutOverlay } from './LogoutOverlay';
import { MainLayout } from './MainLayout';
import { PageRouter } from './PageRouter';
import { useStatusBar } from './StatusBar';

export interface AuthenticatedContentProps extends AppState, AuthState {}

export const AuthenticatedContent: React.FC<AuthenticatedContentProps> = ({
  // App State
  view,
  setView,
  activeModule,
  setActiveModule,
  dashboardSubView,
  setDashboardSubView,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentEmployeeId,
  setCurrentEmployeeId,
  navigationParams,
  setNavigationParams,
  windowedView,
  setWindowedView,

  // Auth State
  isAuthenticated,
  isAuthChecking,
  isLoggingOut,
  logoutReason,
  terminatorName,
  isRecoveringPassword,
  handleLogout,
  resolveView,
  setIsAuthenticated,
  user,
}) => {
  // --- Shifts ---
  const { currentShift } = useShift();

  // --- Global Secure Gate State ---
  const [pendingNavigation, setPendingNavigation] = useState<{
    viewId: string;
    params?: any;
  } | null>(null);

  // --- Settings from Context ---
  const {
    theme,
    setTheme,
    darkMode,
    setDarkMode,
    language,
    textTransform,
    sidebarVisible,
    setSidebarVisible,
    hideInactiveModules,
    setHideInactiveModules,
    developerMode,
    setDeveloperMode,
    navStyle,
    setNavStyle,
  } = useSettings();

  // --- StatusBar Utilities ---
  const { getVerifiedDate, validateTransactionTime, updateLastTransactionTime } = useStatusBar();

  // --- Auth State ---
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const branches = useAuthStore((s) => s.branches);
  const isLoading = useAuthStore((s) => s.isLoading);
  const switchBranch = useAuthStore((s) => s.switchBranch);

  // --- Domain Data from React Query ---
  const { data: inventory = [] } = useInventory(activeBranchId);
  const { data: sales = [] } = useRecentSales(activeBranchId);
  const { data: employees = [] } = useEmployees(activeBranchId);
  const { data: customers = [] } = useCustomers(activeBranchId);
  const { data: suppliers = [] } = useSuppliers(activeBranchId);
  const { data: purchases = [] } = usePurchases(activeBranchId);
  const { data: purchaseReturns = [] } = usePurchaseReturns(activeBranchId);
  const { data: returns = [] } = useSalesReturns(activeBranchId);
  const { data: batches = [] } = useBatches(activeBranchId);

  // --- Mutation Hooks ---
  const completeSaleMut = useCompleteSale();
  const addPurchaseMut = useAddPurchase();
  const approvePurchaseMut = useApprovePurchase();
  const markAsReceivedMut = useMarkPurchaseReceived();
  const processSalesReturnMut = useProcessSalesReturn();
  const createPurchaseReturnMut = useCreatePurchaseReturn();

  // --- Adapter functions to match UseEntityHandlersParams signatures ---
  const addPurchaseAction = useCallback(
    (purchase: Omit<Purchase, 'id'>, context?: ActionContext) =>
      addPurchaseMut.mutateAsync({ purchase, context }),
    [addPurchaseMut]
  );

  const approvePurchaseAction = useCallback(
    (id: string, context: ActionContext) => approvePurchaseMut.mutateAsync({ id, context }),
    [approvePurchaseMut]
  );

  const markAsReceivedAction = useCallback(
    async (id: string, receiverId: string, receiverName: string, shiftId?: string) => {
      await markAsReceivedMut.mutateAsync({ id, receiverId, receiverName, shiftId });
    },
    [markAsReceivedMut]
  );

  const completeSale = useCallback(
    async (saleData: any, context: ActionContext) => {
      const result = await completeSaleMut.mutateAsync({ saleData, context });
      if (!result.success) throw new Error(result.error || 'Checkout failed');
      return result.sale as Sale;
    },
    [completeSaleMut]
  );

  const processSalesReturnAction = useCallback(
    (returnData: any, sale: Sale, context: ActionContext) =>
      processSalesReturnMut.mutateAsync({ returnData, sale, context }),
    [processSalesReturnMut]
  );

  const createPurchaseReturnAction = useCallback(
    async (ret: Omit<PurchaseReturn, 'id'>, context: ActionContext) => {
      const result = await createPurchaseReturnMut.mutateAsync({ ret, context });
      return result.data as PurchaseReturn;
    },
    [createPurchaseReturnMut]
  );

  // --- Setter Functions (queryClient.setQueryData wrappers) ---
  // TRANSITIONAL: These adapters exist for backward compatibility with components
  // that still use imperative setState patterns. Each setter bakes in the query
  // key parameters (e.g., limit=100). If any consumer uses a non-default limit,
  // the setter will miss the correct cache entry. Prefer invalidateQueries()
  // when the old setter pattern is fully removed.
  const setInventory = useCallback(
    (updater: Drug[] | ((prev: Drug[]) => Drug[])) => {
      queryClient.setQueryData(
        queryKeys.inventory.all(activeBranchId),
        (old: Drug[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setSales = useCallback(
    (updater: Sale[] | ((prev: Sale[]) => Sale[])) => {
      queryClient.setQueryData(
        queryKeys.sales.recent(activeBranchId, 100),
        (old: Sale[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setSuppliersState = useCallback(
    (updater: Supplier[] | ((prev: Supplier[]) => Supplier[])) => {
      queryClient.setQueryData(
        queryKeys.suppliers.all(activeBranchId),
        (old: Supplier[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setPurchasesState = useCallback(
    (updater: Purchase[] | ((prev: Purchase[]) => Purchase[])) => {
      queryClient.setQueryData(
        queryKeys.purchases.all(activeBranchId, 100),
        (old: Purchase[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setPurchaseReturnsState = useCallback(
    (updater: PurchaseReturn[] | ((prev: PurchaseReturn[]) => PurchaseReturn[])) => {
      queryClient.setQueryData(
        queryKeys.returns.purchases(activeBranchId, 100),
        (old: PurchaseReturn[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setReturnsState = useCallback(
    (updater: Return[] | ((prev: Return[]) => Return[])) => {
      queryClient.setQueryData(
        queryKeys.returns.sales(activeBranchId, 100),
        (old: Return[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setCustomersState = useCallback(
    (updater: Customer[] | ((prev: Customer[]) => Customer[])) => {
      queryClient.setQueryData(
        queryKeys.customers.all(activeBranchId),
        (old: Customer[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setEmployeesState = useCallback(
    (updater: Employee[] | ((prev: Employee[]) => Employee[])) => {
      queryClient.setQueryData(
        queryKeys.employees.all(activeBranchId),
        (old: Employee[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setBatchesState = useCallback(
    (updater: StockBatch[] | ((prev: StockBatch[]) => StockBatch[])) => {
      queryClient.setQueryData(
        queryKeys.batches.all(activeBranchId),
        (old: StockBatch[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  // --- Realtime Sync ---
  useRealtimeSync({ activeBranchId });

  // --- Navigation Hook ---
  const { handleViewChange, handleNavigate, handleModuleChange, filteredMenuItems } = useNavigation(
    {
      view,
      setView,
      activeModule,
      setActiveModule,
      dashboardSubView,
      setDashboardSubView,
      resolveView,
      setMobileMenuOpen,
      hideInactiveModules,
      developerMode,
      setNavigationParams: (params: any) => setNavigationParams(params),
      onProtectedNavigation: (viewId: string, params?: any) =>
        setPendingNavigation({ viewId, params }),
      currentEmployeeId,
      activeBranchId,
      activeOrgId,
    }
  );

  // --- Entity Handlers Hook ---
  const {
    handleAddDrug,
    handleUpdateDrug,
    handleDeleteDrug,
    handleRestock,
    handleAddSupplier,
    handleUpdateSupplier,
    handleDeleteSupplier,
    handleAddCustomer,
    handleUpdateCustomer,
    handleDeleteCustomer,
    handlePurchaseComplete,
    handleApprovePurchase,
    handleMarkAsReceived,
    handleRejectPurchase,
    handleCreatePurchaseReturn,
    handleCompleteSale,
    handleUpdateSale,
    handleProcessReturn,
    handleAddEmployee,
    handleUpdateEmployee,
    handleDeleteEmployee,
  } = useEntityHandlers({
    inventory,
    setInventory,
    sales,
    setSales,
    suppliers,
    setSuppliers: setSuppliersState,
    purchases,
    setPurchases: setPurchasesState,
    returns,
    setReturns: setReturnsState,
    customers,
    setCustomers: setCustomersState,
    purchaseReturns,
    setPurchaseReturns: setPurchaseReturnsState,
    currentEmployeeId,
    activeBranchId,
    activeOrgId,
    employees,
    setEmployees: setEmployeesState,
    isLoading,
    batches,
    setBatches: setBatchesState,
    approvePurchase: approvePurchaseAction,
    addPurchase: addPurchaseAction,
    completeSale,
    processSalesReturn: processSalesReturnAction,
    createPurchaseReturn: createPurchaseReturnAction,
    markAsReceived: markAsReceivedAction,
    getVerifiedDate,
    validateTransactionTime,
    updateLastTransactionTime,
  });

  // --- Translations ---
  const t = TRANSLATIONS[language];

  // --- Session Handlers Hook ---
  const { onLogoutClick, handleSelectEmployee } = useSessionHandlers({
    employees,
    currentEmployeeId,
    setCurrentEmployeeId,
    setView,
    setActiveModule,
    setNavigationParams,
    handleLogout,
    switchBranch,
    branches,
  });

  useEffect(() => {
    // We listen directly to the session broadcast to lock the POS instantly
    const currentSessionId = storage.get<string | null>(StorageKeys.ACTIVE_SESSION_ID, null);
    if (!currentSessionId) return;

    const channelName = `session-${currentSessionId}`;

    // Clean up any existing channel with same name to avoid strict-mode duplication
    const existing = supabase.getChannels().find((c) => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'remote-employee-logout' }, (payload) => {
        if (payload.payload?.sessionId === currentSessionId) {
          console.log('[AuthenticatedContent] Locking POS due to remote employee logout');
          setCurrentEmployeeId(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setCurrentEmployeeId]);

  // --- Global Event Handlers ---
  useGlobalEventHandlers({
    language,
    inventory,
    isLoading,
    onToggleSidebar: () => setSidebarVisible(!sidebarVisible),
    onNavigate: (targetView) => handleViewChange(targetView),
  });

  // --- Global Navigation Event Listener ---
  React.useEffect(() => {
    const handleGlobalNavigate = (e: any) => {
      const { detail } = e;
      if (detail) {
        handleViewChange(detail);
      }
    };
    window.addEventListener('navigate-to-view', handleGlobalNavigate);
    return () => window.removeEventListener('navigate-to-view', handleGlobalNavigate);
  }, [handleViewChange]);

  // --- Login Success Handler ---
  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    setView('landing' as ViewState);
    setActiveModule('');
  }, [setIsAuthenticated, setActiveModule, setView]);

  // --- Memoized Props for PageRouter ---
  const handlers = React.useMemo(
    () => ({
      setInventory,
      setPurchases: setPurchasesState,
      setPurchaseReturns: setPurchaseReturnsState,
      handleAddDrug,
      handleUpdateDrug,
      handleDeleteDrug,
      handleCompleteSale,
      handleUpdateSale,
      handleProcessReturn,
      handleAddCustomer,
      handleUpdateCustomer,
      handleDeleteCustomer,
      setSuppliers: setSuppliersState,
      handleAddSupplier,
      handleUpdateSupplier,
      handleDeleteSupplier,
      handlePurchaseComplete,
      handleApprovePurchase,
      handleMarkAsReceived,
      handleRejectPurchase,
      handleRestock,
      handleAddEmployee,
      handleUpdateEmployee,
      handleDeleteEmployee,
      handleCreatePurchaseReturn,
      getVerifiedDate,
      setBatches: setBatchesState,
    }),
    [
      setInventory,
      setPurchasesState,
      setPurchaseReturnsState,
      handleAddDrug,
      handleUpdateDrug,
      handleDeleteDrug,
      handleCompleteSale,
      handleUpdateSale,
      handleProcessReturn,
      handleAddCustomer,
      handleUpdateCustomer,
      handleDeleteCustomer,
      setSuppliersState,
      handleAddSupplier,
      handleUpdateSupplier,
      handleDeleteSupplier,
      handlePurchaseComplete,
      handleApprovePurchase,
      handleMarkAsReceived,
      handleRejectPurchase,
      handleRestock,
      handleAddEmployee,
      handleUpdateEmployee,
      handleDeleteEmployee,
      handleCreatePurchaseReturn,
      getVerifiedDate,
      setBatchesState,
    ]
  );

  // --- TRANSITION SKELETON STATE ---
  if (isLoggingOut) {
    return (
      <LogoutOverlay
        language={language}
        darkMode={darkMode}
        currentEmployeeId={currentEmployeeId}
        activeBranchId={activeBranchId}
        employees={employees}
        inventory={inventory}
        sales={sales}
        logoutReason={logoutReason}
        terminatorName={terminatorName}
      />
    );
  }

  return (
    <MainLayout
      view={view}
      activeModule={activeModule}
      t={t}
      onLogout={onLogoutClick}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
      filteredMenuItems={filteredMenuItems}
      handleModuleChange={handleModuleChange}
      handleNavigate={handleNavigate}
      handleViewChange={handleViewChange}
      currentEmployeeId={currentEmployeeId}
      setCurrentEmployeeId={handleSelectEmployee}
      employees={employees}
      dashboardSubView={dashboardSubView}
      onOpenInWindow={setWindowedView}
      isRecoveringPassword={isRecoveringPassword}
    >
      <PageRouter
        view={view}
        currentEmployeeId={currentEmployeeId}
        isLoading={isLoading}
        t={t}
        setView={setView}
        handleNavigate={handleNavigate}
        handleLoginSuccess={handleLoginSuccess}
        navigationParams={navigationParams}
        currentShift={currentShift}
        handlers={handlers}
        onSelectEmployee={handleSelectEmployee}
        onLogout={onLogoutClick}
      />

      <WidgetUpdateEmitter />

      {/* Windowed Mode Modal */}
      <Modal
        isOpen={!!windowedView}
        onClose={() => setWindowedView(null)}
        size='full'
        disabled={isLoading}
        title={
          windowedView
            ? (t.nav as any)[windowedView.replace(/-/, '_')] ||
              t.nav[windowedView as keyof typeof t.nav] ||
              windowedView
            : ''
        }
        icon={windowedView ? PAGE_REGISTRY[windowedView]?.icon : 'window'}
        className='bg-[#f3f4f6]! dark:bg-black!'
      >
        <div className='h-[80vh]'>
          {windowedView && (
            <PageRouter
              view={windowedView}
              currentEmployeeId={currentEmployeeId}
              isLoading={false} // No skeleton for windowed
              t={t}
              setView={(v) => {
                setWindowedView(null);
                setView(v);
              }}
              handleNavigate={(v) => {
                setWindowedView(null);
                handleNavigate(v);
              }}
              handleLoginSuccess={handleLoginSuccess}
              navigationParams={null}
              currentShift={currentShift}
              handlers={handlers}
              onSelectEmployee={handleSelectEmployee}
              onLogout={onLogoutClick}
            />
          )}
        </div>
      </Modal>

      {/* Global Secure Gate */}
      <SecureGate
        standalone={true}
        isOpen={!!pendingNavigation}
        language={language}
        storageKey={
          pendingNavigation ? PAGE_REGISTRY[pendingNavigation.viewId]?.storageKey : 'area_unlocked'
        }
        onUnlock={() => {
          if (pendingNavigation) {
            handleViewChange(pendingNavigation.viewId, pendingNavigation.params);
            setPendingNavigation(null);
          }
        }}
        onClose={() => setPendingNavigation(null)}
      />
    </MainLayout>
  );
};
