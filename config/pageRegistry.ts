import React, { type ComponentType } from 'react';
import { Login } from '../components/auth/Login';
import { CustomerHistory } from '../components/customers/CustomerHistory';

import { CustomerLoyaltyLookup } from '../components/customers/CustomerLoyaltyLookup';
import { CustomerLoyaltyOverview } from '../components/customers/CustomerLoyaltyOverview';
import { CustomerManagement } from '../components/customers/CustomerManagement';
import { CustomerOverview } from '../components/customers/CustomerOverview';
import { Dashboard } from '../components/dashboard/Dashboard';
// Skeletons
import { DashboardPageSkeleton } from '../components/intelligence/common/IntelligenceSkeletons';
import { RealTimeSalesMonitor } from '../components/dashboard/RealTimeSalesMonitor';
import { AdvancedSmCard } from '../components/experiments/AdvancedSmCard';
import { DashboardExperiments } from '../components/experiments/DashboardExperiments';
import { EmployeeList } from '../components/hr/EmployeeList';
import { EmployeeProfile } from '../components/hr/EmployeeProfile';
import { StaffOverview } from '../components/hr/StaffOverview';
import { BarcodePrinter } from '../components/inventory/BarcodePrinter';
import { BarcodeStudio } from '../components/inventory/BarcodeStudio';
import { AddProduct } from '../components/inventory/AddProduct';
import { Inventory } from '../components/inventory/Inventory';
import { InventoryManagement } from '../components/inventory/InventoryManagement';
import { StockAdjustment } from '../components/inventory/StockAdjustment';
import { StockMovementReport, ExpiryManagement } from '../components/inventory';
import { BranchSettings } from '../components/settings/BranchSettings';
import { PricingPage } from '../components/settings/PricingPage';
import { LandingPage } from '../components/layout/LandingPage';
import { PendingApproval } from '../components/purchases/PendingApproval';
import { PurchaseHistory } from '../components/purchases/PurchaseHistory';
import { PurchaseReturns } from '../components/purchases/PurchaseReturns';
import { Purchases } from '../components/purchases/Purchases';
import { SuppliersList } from '../components/purchases/SuppliersList';
import { LoginAuditList } from '../components/reports/LoginAuditList';
import { CashRegister } from '../components/sales/CashRegister';
import { POS } from '../components/sales/pos/POS';
import { ReceiptDesigner } from '../components/sales/ReceiptDesigner';
import { ReturnHistory } from '../components/sales/ReturnHistory';
import { SalesHistory } from '../components/sales/SalesHistory';
import { ShiftHistory } from '../components/sales/ShiftHistory';
import { POSSkeleton } from '../components/skeletons/POSSkeleton';
import { ModalTests } from '../components/test/ModalTests';
import { PurchasesTest } from '../components/test/PurchasesTest';
import { IntelligenceDashboard } from '../pages/IntelligenceDashboard';
import type { PermissionAction } from './permissions';

export interface PageConfig {
  id: string;
  component: ComponentType<any>;
  menuLabel: string;
  menuLabelAr: string;
  requiredProps?: string[]; // Props that need to be passed to the component
  icon?: string;
  category?: string;
  permission?: PermissionAction;
  skeleton?: ComponentType<any>;
  layout?: 'standard' | 'full-bleed' | 'dashboard' | 'split' | 'auth' | 'full-screen';
  skeletonProps?: Record<string, any>;
  isProtected?: boolean;
  storageKey?: string;
}

export const PAGE_REGISTRY: Record<string, PageConfig> = {
  dashboard: {
    id: 'dashboard',
    component: Dashboard,
    menuLabel: 'Dashboard Overview',
    menuLabelAr: 'نظرة عامة على لوحة التحكم',
    icon: 'dashboard',
    category: 'main-dashboard',

    requiredProps: [
      'sales',
      'inventory',
      'purchases',
      'customers',
      'color',
      't',
      'language',
      'onViewChange',
    ],
    permission: 'dashboard.view',
    layout: 'dashboard',
  },
  inventory: {
    id: 'inventory',
    component: Inventory,
    menuLabel: 'Inventory',
    menuLabelAr: 'المخزون',
    icon: 'inventory_2',
    category: 'inventory',

    requiredProps: [
      'inventory',
      'onAddDrug',
      'onUpdateDrug',
      'onDeleteDrug',
      'color',
      't',
      'language',
    ],
    permission: 'inventory.view',
  },
  'stock-movement': {
    id: 'stock-movement',
    component: StockMovementReport,
    menuLabel: 'Stock Movement Report',
    menuLabelAr: 'تقرير حركة المخزون',
    icon: 'timeline',
    category: 'inventory',
    requiredProps: ['onViewChange'],
    permission: 'reports.view_stock_movement',
  },
  'expiry-calendar': {
    id: 'expiry-calendar',
    component: ExpiryManagement,
    menuLabel: 'Expiry Calendar',
    menuLabelAr: 'تقويم الانتهاء',
    icon: 'calendar_today',
    category: 'inventory',
    requiredProps: ['inventory', 'batches', 'color', 't', 'language', 'onUpdateInventory', 'onBatchesChanged'],
    permission: 'inventory.view',
  },
  'inventory-beta': {
    id: 'inventory-beta',
    component: InventoryManagement,
    menuLabel: 'Inventory (Beta)',
    menuLabelAr: 'المخزون (تجريبي)',
    icon: 'table_view',
    category: 'inventory',

    requiredProps: ['inventory', 'color', 't', 'language'],
    permission: 'inventory.view_beta',
  },
  pos: {
    id: 'pos',
    component: POS,
    menuLabel: 'Point of Sale',
    menuLabelAr: 'نقطة البيع',
    icon: 'point_of_sale',
    category: 'sales',

    requiredProps: [
      'inventory',
      'customers',
      'onCompleteSale',
      'color',
      't',
      'language',
      'onAddCustomer',
      'sales',
      'employees',
      'onUpdateSale',
    ],
    skeleton: POSSkeleton,
    permission: 'sale.create',
    layout: 'full-bleed',
  },
  'sales-history': {
    id: 'sales-history',
    component: SalesHistory,
    menuLabel: 'Sales History',
    menuLabelAr: 'سجل المبيعات',
    icon: 'receipt_long',
    category: 'sales',
    requiredProps: [
      'sales',
      'returns',
      'onProcessReturn',
      'color',
      't',
      'language',
      'currentShift',
      'navigationParams',
      'customers',
      'employees',
    ],
    permission: 'sale.view_history',
  },
  'return-history': {
    id: 'return-history',
    component: ReturnHistory,
    menuLabel: 'Return History',
    menuLabelAr: 'سجل الإرجاعات',
    icon: 'assignment_return',
    category: 'sales',
    requiredProps: ['returns', 'sales', 'color', 't', 'language', 'navigationParams'],
    permission: 'sale.refund',
  },
  suppliers: {
    id: 'suppliers',
    component: SuppliersList,
    menuLabel: 'Supplier List',
    menuLabelAr: 'قائمة الموردين',
    icon: 'local_shipping',
    category: 'purchase',
    requiredProps: ['suppliers', 'setSuppliers', 'color', 't', 'language'],
    permission: 'supplier.view',
  },
  purchases: {
    id: 'purchases',
    component: Purchases,
    menuLabel: 'Purchases',
    menuLabelAr: 'المشتريات',
    icon: 'shopping_cart',
    category: 'purchase',
    requiredProps: [
      'inventory',
      'suppliers',
      'purchases',
      'purchaseReturns',
      'onPurchaseComplete',
      'drugs',
      'setDrugs',
      'color',
      't',
      'language',
      'currentShift',
      'onApprovePurchase',
      'onMarkAsReceived',
      'onRejectPurchase',
      'navigationParams',
      'onViewChange',
    ],
    permission: 'purchase.view',
  },
  'pending-approval': {
    id: 'pending-approval',
    component: PendingApproval,
    menuLabel: 'Pending Approval',
    menuLabelAr: 'بانتظار الموافقة',
    icon: 'pending_actions',
    category: 'purchase',
    requiredProps: [
      'color',
      't',
      'purchases',
      'onApprovePurchase',
      'onMarkAsReceived',
      'onRejectPurchase',
      'language',
      'currentShift',
      'currentEmployeeId',
      'employees',
      'onViewChange',
    ],
    permission: 'purchase.approve',
  },
  'purchase-history': {
    id: 'purchase-history',
    component: PurchaseHistory,
    menuLabel: 'Purchase History',
    menuLabelAr: 'سجل المشتريات',
    icon: 'history',
    category: 'purchase',
    requiredProps: [
      'purchases',
      'purchaseReturns',
      'inventory',
      'suppliers',
      'color',
      't',
      'language',
      'navigationParams',
      'onViewChange',
      'onMarkAsReceived',
      'employees',
    ],
    permission: 'purchase.view',
  },
  'purchase-returns': {
    id: 'purchase-returns',
    component: PurchaseReturns,
    menuLabel: 'Purchase Returns',
    menuLabelAr: 'مرتجعات المشتريات',
    icon: 'assignment_return',
    category: 'purchase',
    requiredProps: [
      'purchases',
      'purchaseReturns',
      'setPurchaseReturns',
      'drugs',
      'setDrugs',
      'color',
      't',
      'language',
      'onCreatePurchaseReturn',
    ],
    permission: 'purchase.view',
  },
  'barcode-printer': {
    id: 'barcode-printer',
    component: BarcodePrinter,
    menuLabel: 'Barcode Printer',
    menuLabelAr: 'طباعة الباركود',
    icon: 'print',
    category: 'tools',
    requiredProps: ['inventory', 'color', 't', 'language', 'textTransform'],
    permission: 'inventory.update',
  },
  'barcode-studio': {
    id: 'barcode-studio',
    component: BarcodeStudio,
    menuLabel: 'Barcode Studio',
    menuLabelAr: 'استوديو الباركود',
    icon: 'qr_code_2',
    category: 'tools',
    requiredProps: ['inventory', 'color', 't', 'language'],
    permission: 'inventory.update',
  },
  customers: {
    id: 'customers',
    component: CustomerManagement,
    menuLabel: 'All Customers',
    menuLabelAr: 'جميع العملاء',
    icon: 'group',
    category: 'customers',
    requiredProps: [
      'customers',
      'onAddCustomer',
      'onUpdateCustomer',
      'onDeleteCustomer',
      'color',
      't',
      'language',
      'isLoading',
      'onViewChange',
      'navigationParams',
    ],
    permission: 'customer.view',
  },
  'customer-overview': {
    id: 'customer-overview',
    component: CustomerOverview,
    menuLabel: 'Customer Overview',
    menuLabelAr: 'نظرة عامة على العملاء',
    icon: 'analytics',
    category: 'customer-dashboard',
    requiredProps: ['customers', 'sales', 'color', 't', 'language', 'isLoading', 'onViewChange'],
    permission: 'customer.view',
    layout: 'dashboard',
  },
  'customer-history': {
    id: 'customer-history',
    component: CustomerHistory,
    menuLabel: 'Customer History',
    menuLabelAr: 'سجل العملاء',
    icon: 'manage_search',
    category: 'customers',
    requiredProps: [
      'customers',
      'sales',
      'returns',
      'color',
      't',
      'language',
      'navigationParams',
      'isLoading',
      'onViewChange',
    ],
    permission: 'customer.view',
  },
  'loyalty-overview': {
    id: 'loyalty-overview',
    component: CustomerLoyaltyOverview,
    menuLabel: 'Loyalty Overview',
    menuLabelAr: 'نظرة عامة على الولاء',
    icon: 'stars',
    category: 'customer-dashboard',
    requiredProps: ['customers', 'sales', 'color', 't', 'language'],
    permission: 'customer.view_loyalty',
    layout: 'dashboard',
  },
  'loyalty-lookup': {
    id: 'loyalty-lookup',
    component: CustomerLoyaltyLookup,
    menuLabel: 'Customer Loyalty Lookup',
    menuLabelAr: 'بحث ولاء العملاء',
    icon: 'person_search',
    category: 'customer-dashboard',
    requiredProps: ['customers', 'sales', 'color', 't', 'language'],
    permission: 'customer.view_loyalty',
  },
  'real-time-sales': {
    id: 'real-time-sales',
    component: RealTimeSalesMonitor,
    menuLabel: 'Real-time Sales Monitor',
    menuLabelAr: 'مراقبة المبيعات الفورية',
    icon: 'monitoring',
    category: 'sales-dashboard',
    requiredProps: ['sales', 'customers', 'products', 'color', 't', 'language'],
    permission: 'reports.view_financial',
    layout: 'dashboard',
  },
  'add-product': {
    id: 'add-product',
    component: AddProduct,
    menuLabel: 'Add New Product',
    menuLabelAr: 'إضافة منتج جديد',
    icon: 'add_box',
    category: 'inventory',
    requiredProps: [
      'inventory',
      'onAddDrug',
      'color',
      't',
      'language',
    ],
    permission: 'inventory.add',
  },
  'cash-register': {
    id: 'cash-register',
    component: CashRegister,
    menuLabel: 'Cash Register',
    menuLabelAr: 'سجل النقدية',
    icon: 'point_of_sale',
    category: 'sales',
    requiredProps: ['color', 't', 'language', 'employees', 'currentEmployeeId'],
    permission: 'shift.open',
  },
  'shift-history': {
    id: 'shift-history',
    component: ShiftHistory,
    menuLabel: 'Shift History',
    menuLabelAr: 'سجل الورديات',
    icon: 'history',
    category: 'sales',
    requiredProps: ['color', 't', 'language', 'employees'],
    permission: 'shift.reports',
  },
  'stock-adjustment': {
    id: 'stock-adjustment',
    component: StockAdjustment,
    menuLabel: 'Stock Adjustment',
    menuLabelAr: 'جرد المخزون',
    icon: 'inventory',
    category: 'inventory',
    requiredProps: ['inventory', 'batches', 'onUpdateInventory', 'color', 't'],
    permission: 'inventory.adjust',
  },
  'receipt-designer': {
    id: 'receipt-designer',
    component: ReceiptDesigner,
    menuLabel: 'Receipt Design',
    menuLabelAr: 'تصميم الفاتورة',
    icon: 'brush',
    category: 'sales',
    requiredProps: ['color', 't', 'language'],
    permission: 'settings.update',
  },
  'dashboard-experiments': {
    id: 'dashboard-experiments',
    component: DashboardExperiments,
    menuLabel: 'Dashboard Experiments',
    menuLabelAr: 'تجارب لوحة التحكم',
    icon: 'science',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: 'system.debug',
  },
  'purchases-test': {
    id: 'purchases-test',
    component: PurchasesTest,
    menuLabel: 'Create PO (Test)',
    menuLabelAr: 'انشاء امر شراء (تيست)',
    icon: 'shopping_cart',
    category: 'test',
    requiredProps: [
      'inventory',
      'suppliers',
      'purchases',
      'purchaseReturns',
      'onCompletePurchase',
      'color',
      't',
      'language',
    ],
    permission: 'system.debug',
  },
  'advanced-sm-card': {
    id: 'advanced-sm-card',
    component: AdvancedSmCard,
    menuLabel: 'Advanced Sm Card',
    menuLabelAr: 'بطاقات صغيرة متطورة',
    icon: 'dashboard_customize',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: 'system.debug',
  },
  'modal-tests': {
    id: 'modal-tests',
    component: ModalTests,
    menuLabel: 'Modal Tests',
    menuLabelAr: 'اختبار النوافذ',
    icon: 'dialogs',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: 'system.debug',
  },
  'employee-list': {
    id: 'employee-list',
    component: EmployeeList,
    menuLabel: 'Employee List',
    menuLabelAr: 'قائمة الموظفين',
    icon: 'badge',
    category: 'hr',
    requiredProps: [
      'employees',
      'onAddEmployee',
      'onUpdateEmployee',
      'onDeleteEmployee',
      'color',
      't',
      'language',
      'isLoading',
      'onViewChange',
    ],
    permission: 'users.view',
  },
  'employee-profile': {
    id: 'employee-profile',
    component: EmployeeProfile,
    menuLabel: 'Employee Profile',
    menuLabelAr: 'ملف الموظف',
    icon: 'id_card',
    category: 'hr',
    requiredProps: ['sales', 'employees', 'color', 't', 'language', 'isLoading', 'onViewChange'],
    permission: 'users.view',
  },
  login: {
    id: 'login',
    component: Login,
    menuLabel: 'Login',
    menuLabelAr: 'تسجيل الدخول',
    icon: 'lock',
    category: 'system',
    requiredProps: ['color', 't', 'language', 'onViewChange', 'onLoginSuccess'],
    layout: 'auth',
  },
  intelligence: {
    id: 'intelligence',
    component: IntelligenceDashboard,
    menuLabel: 'Business Intelligence',
    menuLabelAr: 'ذكاء الأعمال',
    icon: 'auto_graph',
    category: 'reports',
    requiredProps: ['color', 't', 'language'],
    skeleton: DashboardPageSkeleton,
    skeletonProps: { withTopBar: true },
    permission: 'reports.view_financial',
    layout: 'dashboard',
  },
  'login-audit': {
    id: 'login-audit',
    component: LoginAuditList,
    menuLabel: 'Login Audit',
    menuLabelAr: 'سجل عمليات الدخول',
    icon: 'history',
    category: 'reports',
    requiredProps: ['language'],
    permission: 'reports.view_financial',
  },
  landing: {
    id: 'landing',
    component: LandingPage as any,
    menuLabel: 'Welcome',
    menuLabelAr: 'ترحيب',
    icon: 'home',
    category: 'system',
    requiredProps: ['color', 'language', 'darkMode'],
    layout: 'auth',
  },
  'staff-overview': {
    id: 'staff-overview',
    component: StaffOverview,
    menuLabel: 'Staff Overview',
    menuLabelAr: 'نظرة عامة على الموظفين',
    icon: 'supervisor_account',
    category: 'hr-dashboard',
    requiredProps: [
      'sales',
      'employees',
      'customers',
      'color',
      't',
      'language',
      'getVerifiedDate',
      'isLoading',
      'onViewChange',
    ],
    permission: 'users.view',
    layout: 'dashboard',
  },
  'branch-management': {
    id: 'branch-management',
    component: BranchSettings,
    menuLabel: 'Branch Management',
    menuLabelAr: 'إدارة الفروع',
    icon: 'domain',
    category: 'pharmacy-configuration',
    requiredProps: ['language', 'color', 'onViewChange'],
    permission: 'settings.update',
    isProtected: true,
    storageKey: 'branch_settings_unlocked',
  },
  'medicine-search': {
    id: 'medicine-search',
    component: () => null, // Rendered as overlay in MobileNavigation
    menuLabel: 'Medicine Search',
    menuLabelAr: 'بحث الأدوية',
    icon: 'search',
    category: 'inventory',
    permission: 'inventory.view',
  },
  'customer-density-map': {
    id: 'customer-density-map',
    component: React.lazy(() => import('../components/customers/CustomerDensityMap')) as any,
    menuLabel: 'Customer Density Map',
    menuLabelAr: 'خريطة كثافة العملاء',
    icon: 'map',
    category: 'customer-dashboard',
    requiredProps: ['color', 't', 'language'],
    permission: 'customer.view',
    layout: 'full-screen',
  },
  'org-management': {
    id: 'org-management',
    component: React.lazy(() => import('../components/org/OrganizationManagementPage').then(m => ({ default: m.OrganizationManagementPage }))) as any,
    menuLabel: 'Org Management',
    menuLabelAr: 'إدارة المنظمة',
    icon: 'corporate_fare',
    category: 'settings',
    requiredProps: ['color', 't', 'language', 'employees', 'currentEmployeeId', 'activeOrgId', 'onViewChange'],
    permission: 'settings.view',
    layout: 'standard',
  },
  'services': {
    id: 'services',
    component: PricingPage,
    menuLabel: 'Services & Pricing',
    menuLabelAr: 'الخدمات والأسعار',
    icon: 'sell',
    category: 'settings',
    requiredProps: ['color', 't', 'language'],
    permission: 'settings.view',
    layout: 'full-bleed',
  },
};

// Helper function to get page config
export const getPageConfig = (pageId: string): PageConfig | undefined => {
  return PAGE_REGISTRY[pageId];
};

// Helper function to get all page IDs
export const getAllPageIds = (): string[] => {
  return Object.keys(PAGE_REGISTRY);
};

// Helper function to get menu translations
export const getMenuTranslationsFromRegistry = (): Record<string, string> => {
  const translations: Record<string, string> = {};
  Object.values(PAGE_REGISTRY).forEach((page) => {
    translations[page.menuLabel] = page.menuLabelAr;
  });
  return translations;
};
