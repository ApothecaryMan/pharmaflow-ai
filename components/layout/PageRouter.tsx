import React, { useMemo } from 'react';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
import { useSettings } from '../../context';
import { permissionsService } from '../../services/auth/permissionsService';
import { batchService } from '../../services/inventory/batchService';
import type { ViewState, Customer, Employee } from '../../types';
import { InventoryModuleShell } from '../inventory/InventoryModuleShell';
import { LandingPage } from '../layout/LandingPage';
import { PendingBranchAssignment } from './PendingBranchAssignment';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { PageLoader } from '../common/PageLoader';
import { Suspense } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useInventory, useBatches, useSuppliers } from '../../hooks/queries/useInventoryQuery';
import { useRecentSales } from '../../hooks/queries/useSalesQuery';
import { useEmployees } from '../../hooks/queries/useEmployeesQuery';
import { useCustomers } from '../../hooks/queries/useCustomersQuery';
import { usePurchases } from '../../hooks/queries/usePurchasesQuery';
import { useSalesReturns, usePurchaseReturns } from '../../hooks/queries/useReturnsQuery';
import { useComputedInventory } from '../../hooks/inventory/useComputedInventory';

interface PageRouterProps {
  view: ViewState;
  currentEmployeeId: string | null;
  isLoading: boolean;
  t: Translations;
  setView: (view: ViewState) => void;
  handleNavigate: (view: ViewState) => void;
  handleLoginSuccess: () => void;
  navigationParams?: any;
  handlers: Record<string, any>;
  currentShift: any;
  onSelectEmployee?: (id: string | null) => void;
  onLogout?: () => Promise<void>;
}

const PageRouterComponent: React.FC<PageRouterProps> = ({
  view,
  currentEmployeeId,
  isLoading,
  t,
  setView,
  handleNavigate,
  handleLoginSuccess,
  navigationParams,
  handlers,
  currentShift,
  onSelectEmployee,
  onLogout,
}) => {
  const { language, theme, darkMode, textTransform, developerMode } = useSettings();

  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const activeOrgId = useAuthStore(s => s.activeOrgId);
  const branches = useAuthStore(s => s.branches);
  const isLoadingAuth = useAuthStore(s => s.isLoading);
  const switchBranch = useAuthStore(s => s.switchBranch);

  const { data: inventory = [] } = useInventory(activeBranchId);
  const { data: sales = [] } = useRecentSales(activeBranchId);
  const { data: employees = [] } = useEmployees(activeBranchId);
  const { data: customers = [] } = useCustomers(activeBranchId);
  const { data: suppliers = [] } = useSuppliers(activeBranchId);
  const { data: purchases = [] } = usePurchases(activeBranchId);
  const { data: purchaseReturns = [] } = usePurchaseReturns(activeBranchId);
  const { data: returns = [] } = useSalesReturns(activeBranchId);
  const { data: batches = [] } = useBatches(activeBranchId);

  const enrichedInventory = useComputedInventory(inventory, batches, activeBranchId);

  const currentEmployee = useMemo(
    () => employees.find((e: Employee) => e.id === currentEmployeeId),
    [employees, currentEmployeeId]
  );

  const enrichedCustomers = useMemo(() => {
    return customers.map((customer: Customer) => {
      const customerSales = sales.filter(
        (s: any) => s.customerCode === customer.code && s.branchId === customer.branchId
      );
      const totalPurchases = customerSales.reduce((sum: number, s: any) => sum + s.total, 0);
      const lastVisit =
        customerSales.length > 0
          ? Math.max(...customerSales.map((s: any) => new Date(s.date).getTime()))
          : null;

      return {
        ...customer,
        totalPurchases,
        lastVisit: lastVisit ? new Date(lastVisit).toISOString() : null,
        visitCount: customerSales.length,
      };
    });
  }, [customers, sales]);

  if (!currentEmployeeId) {
    return <LandingPage language={language} darkMode={darkMode} />;
  }

  if (!isLoadingAuth && !activeBranchId) {
    return (
      <PendingBranchAssignment
        branches={branches}
        switchBranch={switchBranch}
        onSelectEmployee={onSelectEmployee}
        onLogout={onLogout}
        t={t}
      />
    );
  }

  const pageConfig = PAGE_REGISTRY[view];

  if (!pageConfig) {
    return (
      <div className='flex items-center justify-center h-full'>
        <div className='text-center'>
          <span className='material-symbols-rounded text-6xl text-gray-300 dark:text-gray-600 mb-4 block'>
            error
          </span>
          <p className='text-lg font-medium text-gray-600 dark:text-gray-400'>
            {t.global?.pageNotFound || 'Page not found'}
          </p>
        </div>
      </div>
    );
  }

  const isDebugOverride = pageConfig.permission === 'system.debug' && developerMode;
  if (pageConfig.permission && !isDebugOverride && !permissionsService.can(pageConfig.permission)) {
    return (
      <div className='flex flex-col items-center justify-center h-full p-8 animate-fade-in select-none text-center'>
        <div className='mb-12'>
          <div
            style={{ width: '180px', height: '180px' }}
            className='rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mx-auto border border-zinc-200 dark:border-zinc-700/50 shadow-sm'
          >
            <span
              style={{ fontSize: '96px' }}
              className='material-symbols-rounded text-zinc-400 dark:text-zinc-500'
            >
              lock
            </span>
          </div>
        </div>

        <h2 className='text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3'>
          {language === 'AR' ? 'وصول مقيد' : 'Access Restricted'}
        </h2>

        <p className='text-base text-zinc-500 dark:text-zinc-400 mb-0 max-w-sm leading-relaxed font-medium'>
          {language === 'AR'
            ? 'عذراً، ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة. يرجى التواصل مع المسؤول.'
            : "Sorry, you don't have the necessary permissions to access this page. Please contact your administrator."}
        </p>
      </div>
    );
  }

  const PageComponent = pageConfig.component;

  const props: any = {
    color: theme.primary,
    t: t,
    language: language,
    textTransform: textTransform,
    currentEmployeeId: currentEmployeeId,
    darkMode: darkMode,
    employees: employees,
    isLoading: isLoading,
    activeBranchId: activeBranchId,
    activeOrgId: activeOrgId,
  };

  const dataMap: Record<string, any> = {
    sales: sales,
    inventory: enrichedInventory,
    customers: enrichedCustomers,
    products: enrichedInventory,
    suppliers: suppliers,
    purchases: purchases,
    purchaseReturns: purchaseReturns,
    returns: returns,
    drugs: enrichedInventory,
    employees: employees,
    batches: batches,
    currentShift: currentShift,
    activeOrgId: activeOrgId,
    navigationParams: navigationParams,
  };

  const handlerMap: Record<string, any> = {
    setInventory: handlers.setInventory,
    setDrugs: handlers.setInventory,
    setPurchases: handlers.setPurchases,
    setPurchaseReturns: handlers.setPurchaseReturns,
    onAddDrug: handlers.handleAddDrug,
    onUpdateDrug: handlers.handleUpdateDrug,
    onDeleteDrug: handlers.handleDeleteDrug,
    onUpdateInventory: handlers.setInventory,
    onBatchesChanged: async () =>
      handlers.setBatches(await batchService.getAllBatches(activeBranchId)),
    onCompleteSale: handlers.handleCompleteSale,
    onUpdateSale: handlers.handleUpdateSale,
    onProcessReturn: handlers.handleProcessReturn,
    onAddCustomer: handlers.handleAddCustomer,
    onUpdateCustomer: handlers.handleUpdateCustomer,
    onDeleteCustomer: handlers.handleDeleteCustomer,
    setSuppliers: handlers.setSuppliers,
    onAddSupplier: handlers.handleAddSupplier,
    onUpdateSupplier: handlers.handleUpdateSupplier,
    onDeleteSupplier: handlers.handleDeleteSupplier,
    onPurchaseComplete: handlers.handlePurchaseComplete,
    onApprovePurchase: handlers.handleApprovePurchase,
    onMarkAsReceived: handlers.handleMarkAsReceived,
    onRejectPurchase: handlers.handleRejectPurchase,
    onAddProduct: () => setView('add-product'),
    onRestock: handlers.handleRestock,
    onAddEmployee: handlers.handleAddEmployee,
    onUpdateEmployee: handlers.handleUpdateEmployee,
    onDeleteEmployee: handlers.handleDeleteEmployee,
    onCreatePurchaseReturn: handlers.handleCreatePurchaseReturn,
    onViewChange: handleNavigate,
    onLoginSuccess: handleLoginSuccess,
    getVerifiedDate: handlers.getVerifiedDate,
  };

  const requiredProps = pageConfig.requiredProps || [];
  requiredProps.forEach((prop: string) => {
    if (dataMap[prop] !== undefined) props[prop] = dataMap[prop];
    if (handlerMap[prop] !== undefined) props[prop] = handlerMap[prop];
  });

  const viewTranslations: Record<string, any> = {
    dashboard: t.dashboard,
    inventory: t.inventory,
    pos: t.pos,
    'pos-test': t.pos,
    'sales-history': { ...t.salesHistory, datePickerTranslations: t.global.datePicker },
    'return-history': { ...t.returnHistory, datePickerTranslations: t.global.datePicker },
    suppliers: t.suppliers,
    purchases: {
      ...t.purchases,
      pendingApproval: t.pendingApproval,
      datePickerTranslations: t.global.datePicker,
    },
    'purchases-test': {
      ...t.purchases,
      pendingApproval: t.pendingApproval,
      datePickerTranslations: t.global.datePicker,
    },
    'pending-approval': {
      ...t.purchases,
      pendingApproval: t.pendingApproval,
      datePickerTranslations: t.global.datePicker,
    },
    'purchase-history': {
      ...t.purchases,
      pendingApproval: t.pendingApproval,
      datePickerTranslations: t.global.datePicker,
    },
    'barcode-studio': t.barcodeStudio,
    customers: t.customers,
    'customer-history': t.customers,
    'customer-overview': t.customerOverview,
    employees: t.employeeList,
    'add-product': t.inventory.addProduct,
    'drug-interactions': t.drugInteractions,
    shortages: t.shortages,
    'scrollbar-lab': t.newTests,
    'a5-invoice-designer': t.a5InvoiceDesigner,
  };

  if (viewTranslations[view]) {
    const vt = viewTranslations[view];
    props.t = vt;
    if (vt.datePickerTranslations) props.datePickerTranslations = vt.datePickerTranslations;
    if (vt.initialMode) props.initialMode = vt.initialMode;
  }

  if (['inventory', 'add-product', 'stock-movement', 'shortages'].includes(view)) {
    return (
      <InventoryModuleShell activeView={view} onViewChange={handleNavigate} t={t}>
        <ErrorBoundary onReset={() => setView('dashboard')}>
          <Suspense fallback={<PageLoader />}>
            <PageComponent {...props} />
          </Suspense>
        </ErrorBoundary>
      </InventoryModuleShell>
    );
  }

  return (
    <ErrorBoundary onReset={() => setView('dashboard')}>
      <Suspense fallback={<PageLoader />}>
        <PageComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

export const PageRouter = React.memo(PageRouterComponent);
