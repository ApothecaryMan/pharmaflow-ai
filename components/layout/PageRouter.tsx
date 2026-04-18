import React from 'react';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
import { ROUTES } from '../../config/routes';
import { permissionsService } from '../../services/auth/permissions';
import { useSettings } from '../../context';
import { LandingPage } from '../layout/LandingPage';
import { PageSkeletonRegistry } from '../skeletons/PageSkeletonRegistry';
import { batchService } from '../../services/inventory/batchService';

interface PageRouterProps {
  view: string;
  currentEmployeeId: string | null;
  isLoading: boolean;
  t: any;
  // Navigation
  setView: (view: string) => void;
  handleNavigate: (view: string) => void;
  handleLoginSuccess: () => void;
  navigationParams?: any;
  // Data Handlers (Required by various pages)
  handlers: any;
  data: any;
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

  // Build props object based on required props
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

  // Inject requested data and handlers
  const requiredProps = pageConfig.requiredProps || [];

  // Data mapping
  if (requiredProps.includes('sales')) props.sales = data.sales;
  if (requiredProps.includes('inventory')) props.inventory = data.inventory;
  if (requiredProps.includes('customers')) props.customers = data.enrichedCustomers;
  if (requiredProps.includes('products')) props.products = data.inventory;
  if (requiredProps.includes('suppliers')) props.suppliers = data.suppliers;
  if (requiredProps.includes('purchases')) props.purchases = data.purchases;
  if (requiredProps.includes('purchaseReturns')) props.purchaseReturns = data.purchaseReturns;
  if (requiredProps.includes('returns')) props.returns = data.returns;
  if (requiredProps.includes('drugs')) props.drugs = data.inventory;
  if (requiredProps.includes('employees')) props.employees = data.employees;
  if (requiredProps.includes('batches')) props.batches = data.batches;
  if (requiredProps.includes('currentShift')) props.currentShift = currentShift;
  if (requiredProps.includes('activeOrgId')) props.activeOrgId = data.activeOrgId;

  // Handler mapping
  if (requiredProps.includes('setInventory')) props.setInventory = handlers.setInventory;
  if (requiredProps.includes('setDrugs')) props.setDrugs = handlers.setInventory;
  if (requiredProps.includes('setPurchases')) props.setPurchases = handlers.setPurchases;
  if (requiredProps.includes('setPurchaseReturns'))
    props.setPurchaseReturns = handlers.setPurchaseReturns;
  if (requiredProps.includes('onAddDrug')) props.onAddDrug = handlers.handleAddDrug;
  if (requiredProps.includes('onUpdateDrug')) props.onUpdateDrug = handlers.handleUpdateDrug;
  if (requiredProps.includes('onDeleteDrug')) props.onDeleteDrug = handlers.handleDeleteDrug;
  if (requiredProps.includes('onUpdateInventory')) props.onUpdateInventory = handlers.setInventory;
  if (requiredProps.includes('onBatchesChanged')) props.onBatchesChanged = () => handlers.setBatches(batchService.getAllBatches(data.activeBranchId));
  if (requiredProps.includes('onCompleteSale')) props.onCompleteSale = handlers.handleCompleteSale;
  if (requiredProps.includes('onUpdateSale')) props.onUpdateSale = handlers.handleUpdateSale;
  if (requiredProps.includes('onProcessReturn'))
    props.onProcessReturn = handlers.handleProcessReturn;
  if (requiredProps.includes('onAddCustomer')) props.onAddCustomer = handlers.handleAddCustomer;
  if (requiredProps.includes('onUpdateCustomer'))
    props.onUpdateCustomer = handlers.handleUpdateCustomer;
  if (requiredProps.includes('onDeleteCustomer'))
    props.onDeleteCustomer = handlers.handleDeleteCustomer;
  if (requiredProps.includes('setSuppliers')) props.setSuppliers = handlers.setSuppliers;
  if (requiredProps.includes('onAddSupplier')) props.onAddSupplier = handlers.handleAddSupplier;
  if (requiredProps.includes('onUpdateSupplier'))
    props.onUpdateSupplier = handlers.handleUpdateSupplier;
  if (requiredProps.includes('onDeleteSupplier'))
    props.onDeleteSupplier = handlers.handleDeleteSupplier;
  if (requiredProps.includes('onPurchaseComplete'))
    props.onPurchaseComplete = handlers.handlePurchaseComplete;
  if (requiredProps.includes('onApprovePurchase'))
    props.onApprovePurchase = handlers.handleApprovePurchase;
  if (requiredProps.includes('onRejectPurchase'))
    props.onRejectPurchase = handlers.handleRejectPurchase;
  if (requiredProps.includes('onAddProduct')) props.onAddProduct = () => setView('add-product');
  if (requiredProps.includes('onRestock')) props.onRestock = handlers.handleRestock;
  if (requiredProps.includes('onAddEmployee')) props.onAddEmployee = handlers.handleAddEmployee;
  if (requiredProps.includes('onUpdateEmployee'))
    props.onUpdateEmployee = handlers.handleUpdateEmployee;
  if (requiredProps.includes('onDeleteEmployee'))
    props.onDeleteEmployee = handlers.handleDeleteEmployee;
  if (requiredProps.includes('onCreatePurchaseReturn'))
    props.onCreatePurchaseReturn = handlers.handleCreatePurchaseReturn;
  if (requiredProps.includes('onViewChange')) props.onViewChange = handleNavigate;
  if (requiredProps.includes('onLoginSuccess')) props.onLoginSuccess = handleLoginSuccess;
  if (requiredProps.includes('navigationParams')) props.navigationParams = navigationParams;
  if (requiredProps.includes('getVerifiedDate')) props.getVerifiedDate = handlers.getVerifiedDate;

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
