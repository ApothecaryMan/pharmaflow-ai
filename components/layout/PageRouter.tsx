import React from 'react';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
import { canPerformAction, UserRole } from '../../config/permissions';
import { LandingPage } from '../layout/LandingPage';
import { PageSkeletonRegistry } from '../skeletons/PageSkeletonRegistry';
import { useSettings } from '../../context';
import { ROUTES } from '../../config/routes';

interface PageRouterProps {
  view: string;
  currentEmployeeId: string | null;
  userRole: UserRole;
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
  userRole,
  isLoading,
  t,
  setView,
  handleNavigate,
  handleLoginSuccess,
  navigationParams,
  handlers,
  data,
  currentShift
}) => {
  const { language, theme, darkMode, textTransform } = useSettings();

  if (!currentEmployeeId) {
    return <LandingPage color={theme.primary} language={language} darkMode={darkMode} />;
  }

  if (isLoading) {
    return <PageSkeletonRegistry view={view} />;
  }

  const pageConfig = PAGE_REGISTRY[view];

  if (!pageConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="material-symbols-rounded text-6xl text-gray-300 dark:text-gray-600 mb-4 block">error</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-400">{t.global?.pageNotFound || 'Page not found'}</p>
        </div>
      </div>
    );
  }

  // RBAC: Check Page Permissions
  if (pageConfig.permission && !canPerformAction(userRole, pageConfig.permission)) {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6 border-4 border-red-100 dark:border-red-900/30">
          <span className="material-symbols-rounded text-5xl text-red-500">lock</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {language === 'AR' ? 'وصول مقيد' : 'Access Restricted'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          {language === 'AR'
            ? 'عذراً، ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة. يرجى التواصل مع المسؤول.'
            : "Sorry, you don't have the necessary permissions to access this page. Please contact your administrator."}
        </p>
        <button
          onClick={() => setView(ROUTES.DASHBOARD)}
          className="mt-8 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity active:scale-95"
        >
          {language === 'AR' ? 'العودة للرئيسية' : 'Back to Dashboard'}
        </button>
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
    userRole: userRole,
    currentEmployeeId: currentEmployeeId,
    darkMode: darkMode,
    employees: data.employees
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
  if (requiredProps.includes('currentShift')) props.currentShift = currentShift;

  // Handler mapping
  if (requiredProps.includes('setInventory')) props.setInventory = handlers.setInventory;
  if (requiredProps.includes('setDrugs')) props.setDrugs = handlers.setInventory;
  if (requiredProps.includes('setPurchases')) props.setPurchases = handlers.setPurchases;
  if (requiredProps.includes('setPurchaseReturns')) props.setPurchaseReturns = handlers.setPurchaseReturns;
  if (requiredProps.includes('onAddDrug')) props.onAddDrug = handlers.handleAddDrug;
  if (requiredProps.includes('onUpdateDrug')) props.onUpdateDrug = handlers.handleUpdateDrug;
  if (requiredProps.includes('onDeleteDrug')) props.onDeleteDrug = handlers.handleDeleteDrug;
  if (requiredProps.includes('onUpdateInventory')) props.onUpdateInventory = handlers.setInventory;
  if (requiredProps.includes('onCompleteSale')) props.onCompleteSale = handlers.handleCompleteSale;
  if (requiredProps.includes('onUpdateSale')) props.onUpdateSale = handlers.handleUpdateSale;
  if (requiredProps.includes('onProcessReturn')) props.onProcessReturn = handlers.handleProcessReturn;
  if (requiredProps.includes('onAddCustomer')) props.onAddCustomer = handlers.handleAddCustomer;
  if (requiredProps.includes('onUpdateCustomer')) props.onUpdateCustomer = handlers.handleUpdateCustomer;
  if (requiredProps.includes('onDeleteCustomer')) props.onDeleteCustomer = handlers.handleDeleteCustomer;
  if (requiredProps.includes('setSuppliers')) props.setSuppliers = handlers.setSuppliers;
  if (requiredProps.includes('onAddSupplier')) props.onAddSupplier = handlers.handleAddSupplier;
  if (requiredProps.includes('onUpdateSupplier')) props.onUpdateSupplier = handlers.handleUpdateSupplier;
  if (requiredProps.includes('onDeleteSupplier')) props.onDeleteSupplier = handlers.handleDeleteSupplier;
  if (requiredProps.includes('onCompletePurchase')) props.onPurchaseComplete = handlers.handlePurchaseComplete;
  if (requiredProps.includes('onApprovePurchase')) props.onApprovePurchase = handlers.handleApprovePurchase;
  if (requiredProps.includes('onRejectPurchase')) props.onRejectPurchase = handlers.handleRejectPurchase;
  if (requiredProps.includes('onAddProduct')) props.onAddProduct = () => setView('add-product');
  if (requiredProps.includes('onRestock')) props.onRestock = handlers.handleRestock;
  if (requiredProps.includes('onAddEmployee')) props.onAddEmployee = handlers.handleAddEmployee;
  if (requiredProps.includes('onUpdateEmployee')) props.onUpdateEmployee = handlers.handleUpdateEmployee;
  if (requiredProps.includes('onDeleteEmployee')) props.onDeleteEmployee = handlers.handleDeleteEmployee;
  if (requiredProps.includes('onCreatePurchaseReturn')) props.onCreatePurchaseReturn = handlers.handleCreatePurchaseReturn;
  if (requiredProps.includes('onViewChange')) props.onViewChange = handleNavigate;
  if (requiredProps.includes('onLoginSuccess')) props.onLoginSuccess = handleLoginSuccess;
  if (requiredProps.includes('navigationParams')) props.navigationParams = navigationParams;

  // Special translations mapping
  const viewTranslations: Record<string, any> = {
    'dashboard': t.dashboard,
    'inventory': t.inventory,
    'pos': t.pos,
    'pos-test': t.pos,
    'sales-history': { ...t.salesHistory, datePickerTranslations: t.global.datePicker },
    'return-history': { ...t.returnHistory, datePickerTranslations: t.global.datePicker },
    'suppliers': t.suppliers,
    'purchases': t.purchases,
    'purchases-test': t.purchases,
    'pending-approval': t.pendingApproval,
    'barcode-studio': t.barcodeStudio,
    'customers': t.customers,
    'customer-history': t.customers,
    'customer-overview': t.customerOverview,
    'employees': t.employeeList,
    'add-product': { ...t.inventory, initialMode: 'add' }
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

