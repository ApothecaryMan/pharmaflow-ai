import React from 'react';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
import { ROUTES } from '../../config/routes';
import { permissionsService } from '../../services/auth/permissions';
import { useSettings } from '../../context';
import { LandingPage } from '../layout/LandingPage';
import { PageSkeletonRegistry } from '../skeletons/PageSkeletonRegistry';
import { type ViewState } from '../../types';
import { batchService } from '../../services/inventory/batchService';

interface PageRouterProps {
  view: ViewState;
  currentEmployeeId: string | null;
  isLoading: boolean;
  t: any;
  // Navigation
  setView: (view: ViewState) => void;
  handleNavigate: (view: ViewState) => void;
  handleLoginSuccess: () => void;
  navigationParams?: any;
  // Data Handlers
  handlers: Record<string, any>;
  data: Record<string, any>;
  currentShift: any;
}

/**
 * ARCHITECTURE NOTE:
 * PageRouter handles the dynamic injection of props into registered pages.
 * It manages RBAC (Role Based Access Control) and fallback views.
 *
 * PERFORMANCE: Wrapped with React.memo to prevent unnecessary re-renders
 * when parent state changes but PageRouter props remain stable.
 */
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
  data,
  currentShift,
}) => {
  const { language, theme, darkMode, textTransform } = useSettings();

  if (!currentEmployeeId) {
    return <LandingPage color={theme.primary} language={language} darkMode={darkMode} />;
  }

  if (isLoading && view !== 'inventory' && view !== 'inventory-beta') {
    return <PageSkeletonRegistry view={view} />;
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

  // RBAC: Check Page Permissions
  if (pageConfig.permission && !permissionsService.can(pageConfig.permission)) {
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

  // 1. Build base props object
  const props: any = {
    color: theme.primary,
    t: t,
    language: language,
    textTransform: textTransform,
    currentEmployeeId: currentEmployeeId,
    darkMode: darkMode,
    employees: data.employees,
    isLoading: isLoading,
  };

  // 2. Define Data & Handler Mappings
  const dataMap: Record<string, any> = {
    sales: data.sales,
    inventory: data.inventory,
    customers: data.enrichedCustomers,
    products: data.inventory,
    suppliers: data.suppliers,
    purchases: data.purchases,
    purchaseReturns: data.purchaseReturns,
    returns: data.returns,
    drugs: data.inventory,
    employees: data.employees,
    batches: data.batches,
    currentShift: currentShift,
    activeOrgId: data.activeOrgId,
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
    onBatchesChanged: () => handlers.setBatches(batchService.getAllBatches(data.activeBranchId)),
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

  // 3. Inject requested props based on pageConfig
  const requiredProps = pageConfig.requiredProps || [];
  requiredProps.forEach((prop: string) => {
    if (dataMap[prop] !== undefined) props[prop] = dataMap[prop];
    if (handlerMap[prop] !== undefined) props[prop] = handlerMap[prop];
  });

  // Special translations mapping
  const viewTranslations: Record<string, any> = {
    dashboard: t.dashboard,
    inventory: t.inventory,
    pos: t.pos,
    'pos-test': t.pos,
    'sales-history': { ...t.salesHistory, datePickerTranslations: t.global.datePicker },
    'return-history': { ...t.returnHistory, datePickerTranslations: t.global.datePicker },
    suppliers: t.suppliers,
    purchases: t.purchases,
    'purchases-test': t.purchases,
    'pending-approval': t.pendingApproval,
    'barcode-studio': t.barcodeStudio,
    customers: t.customers,
    'customer-history': t.customers,
    'customer-overview': t.customerOverview,
    employees: t.employeeList,
    'add-product': t.inventory.addProduct,
  };

  if (viewTranslations[view]) {
    const vt = viewTranslations[view];
    props.t = vt;
    if (vt.datePickerTranslations) props.datePickerTranslations = vt.datePickerTranslations;
    if (vt.initialMode) props.initialMode = vt.initialMode;
  }

  return <PageComponent {...props} />;
};

// Export memoized version to prevent unnecessary re-renders
export const PageRouter = React.memo(PageRouterComponent);
