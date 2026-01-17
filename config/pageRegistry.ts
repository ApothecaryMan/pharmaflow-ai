import { ComponentType } from 'react';
import { Dashboard } from '../components/dashboard/Dashboard';
import { Inventory } from '../components/inventory/Inventory';
import { POS } from '../components/sales/POS';
import { SalesHistory } from '../components/sales/SalesHistory';
import { ReturnHistory } from '../components/sales/ReturnHistory';
import { SuppliersList } from '../components/purchases/SuppliersList';
import { Purchases } from '../components/purchases/Purchases';
import { PurchaseReturns } from '../components/purchases/PurchaseReturns';
import { BarcodePrinter } from '../components/inventory/BarcodePrinter';
import { BarcodeStudio } from '../components/inventory/BarcodeStudio';
import { CustomerManagement } from '../components/customers/CustomerManagement';
import { CustomerOverview } from '../components/customers/CustomerOverview';
import { CustomerLoyaltyOverview } from '../components/customers/CustomerLoyaltyOverview';
import { CustomerLoyaltyLookup } from '../components/customers/CustomerLoyaltyLookup';
import { StockAdjustment } from '../components/inventory/StockAdjustment';
import { RealTimeSalesMonitor } from '../components/dashboard/RealTimeSalesMonitor';
import { InventoryManagement } from '../components/inventory/InventoryManagement';
import { PendingApproval } from '../components/purchases/PendingApproval';
import { CashRegister } from '../components/sales/CashRegister';
import { ShiftHistory } from '../components/sales/ShiftHistory';
import { ReceiptDesigner } from '../components/sales/ReceiptDesigner';
import { POSTest } from '../components/test/POSTest';
import { PurchasesTest } from '../components/test/PurchasesTest';
import { DashboardExperiments } from '../components/experiments/DashboardExperiments';
import { AdvancedSmCard } from '../components/experiments/AdvancedSmCard';
import { ModalTests } from '../components/test/ModalTests';
import { EmployeeList } from '../components/hr/EmployeeList';
import { EmployeeProfile } from '../components/hr/EmployeeProfile';
import { LoginTest } from '../components/test/LoginTest';


export interface PageConfig {
  id: string;
  component: ComponentType<any>;
  menuLabel: string;
  menuLabelAr: string;
  requiredProps?: string[]; // Props that need to be passed to the component
  icon?: string;
  category?: string;
}

export const PAGE_REGISTRY: Record<string, PageConfig> = {
  'dashboard': {
    id: 'dashboard',
    component: Dashboard,
    menuLabel: 'Dashboard Overview',
    menuLabelAr: 'نظرة عامة على لوحة التحكم',
    icon: 'dashboard',
    category: 'main-dashboard',
    requiredProps: ['sales', 'inventory', 'purchases', 'customers', 'color', 't', 'language', 'onViewChange']
  },
  'inventory': {
    id: 'inventory',
    component: Inventory,
    menuLabel: 'Inventory',
    menuLabelAr: 'المخزون',
    icon: 'inventory_2',
    category: 'inventory',
    requiredProps: ['inventory', 'onAddDrug', 'onUpdateDrug', 'onDeleteDrug', 'color', 't', 'language']
  },
  'inventory-beta': {
    id: 'inventory-beta',
    component: InventoryManagement,
    menuLabel: 'Inventory (Beta)',
    menuLabelAr: 'المخزون (تجريبي)',
    icon: 'table_view',
    category: 'inventory',
    requiredProps: ['inventory', 'color', 't', 'language']
  },
  'pos': {
    id: 'pos',
    component: POS,
    menuLabel: 'Point of Sale',
    menuLabelAr: 'نقطة البيع',
    icon: 'point_of_sale',
    category: 'sales',
    requiredProps: ['inventory', 'customers', 'onCompleteSale', 'color', 't', 'language', 'onAddCustomer', 'sales', 'employees', 'onUpdateSale']
  },
  'sales-history': {
    id: 'sales-history',
    component: SalesHistory,
    menuLabel: 'Sales History',
    menuLabelAr: 'سجل المبيعات',
    icon: 'receipt_long',
    category: 'sales',
    requiredProps: ['sales', 'onProcessReturn', 'color', 't', 'language']
  },
  'return-history': {
    id: 'return-history',
    component: ReturnHistory,
    menuLabel: 'Return History',
    menuLabelAr: 'سجل الإرجاعات',
    icon: 'assignment_return',
    category: 'sales',
    requiredProps: ['returns', 'sales', 'color', 't', 'language']
  },
  'suppliers': {
    id: 'suppliers',
    component: SuppliersList,
    menuLabel: 'Supplier List',
    menuLabelAr: 'قائمة الموردين',
    icon: 'local_shipping',
    category: 'purchase',
    requiredProps: ['suppliers', 'setSuppliers', 'color', 't', 'language']
  },
  'purchases': {
    id: 'purchases',
    component: Purchases,
    menuLabel: 'Purchases',
    menuLabelAr: 'المشتريات',
    icon: 'shopping_cart',
    category: 'purchase',
    requiredProps: ['inventory', 'suppliers', 'purchases', 'purchaseReturns', 'onCompletePurchase', 'drugs', 'setDrugs', 'color', 't', 'language']
  },
  'pending-approval': {
    id: 'pending-approval',
    component: PendingApproval,
    menuLabel: 'Pending Approval',
    menuLabelAr: 'بانتظار الموافقة',
    icon: 'pending_actions',
    category: 'purchase',
    requiredProps: ['color', 't', 'purchases', 'onApprovePurchase', 'onRejectPurchase', 'language']
  },
  'purchase-returns': {
    id: 'purchase-returns',
    component: PurchaseReturns,
    menuLabel: 'Purchase Returns',
    menuLabelAr: 'مرتجعات المشتريات',
    icon: 'assignment_return',
    category: 'purchase',
    requiredProps: ['purchases', 'purchaseReturns', 'setPurchaseReturns', 'drugs', 'setDrugs', 'color', 't', 'language']
  },
  'barcode-printer': {
    id: 'barcode-printer',
    component: BarcodePrinter,
    menuLabel: 'Barcode Printer',
    menuLabelAr: 'طباعة الباركود',
    icon: 'print',
    category: 'tools',
    requiredProps: ['inventory', 'color', 't', 'language', 'textTransform']
  },
  'barcode-studio': {
    id: 'barcode-studio',
    component: BarcodeStudio,
    menuLabel: 'Barcode Studio',
    menuLabelAr: 'استوديو الباركود',
    icon: 'qr_code_2',
    category: 'tools',
    requiredProps: ['inventory', 'color', 't', 'language']
  },
  'customers': {
    id: 'customers',
    component: CustomerManagement,
    menuLabel: 'All Customers',
    menuLabelAr: 'جميع العملاء',
    icon: 'group',
    category: 'customers',
    requiredProps: ['customers', 'onAddCustomer', 'onUpdateCustomer', 'onDeleteCustomer', 'color', 't', 'language']
  },
  'customer-overview': {
    id: 'customer-overview',
    component: CustomerOverview,
    menuLabel: 'Customer Overview',
    menuLabelAr: 'نظرة عامة على العملاء',
    icon: 'analytics',
    category: 'customer-dashboard',
    requiredProps: ['customers', 'sales', 'color', 't', 'language']
  },
  'loyalty-overview': {
    id: 'loyalty-overview',
    component: CustomerLoyaltyOverview,
    menuLabel: 'Loyalty Overview',
    menuLabelAr: 'نظرة عامة على الولاء',
    icon: 'stars',
    category: 'customer-dashboard',
    requiredProps: ['customers', 'sales', 'color', 't', 'language']
  },
  'loyalty-lookup': {
    id: 'loyalty-lookup',
    component: CustomerLoyaltyLookup,
    menuLabel: 'Customer Loyalty Lookup',
    menuLabelAr: 'بحث ولاء العملاء',
    icon: 'person_search',
    category: 'customer-dashboard',
    requiredProps: ['customers', 'sales', 'color', 't', 'language']
  },
  'real-time-sales': {
    id: 'real-time-sales',
    component: RealTimeSalesMonitor,
    menuLabel: 'Real-time Sales Monitor',
    menuLabelAr: 'مراقبة المبيعات الفورية',
    icon: 'monitoring',
    category: 'sales-dashboard',
    requiredProps: ['sales', 'customers', 'products', 'color', 't', 'language']
  },
  'add-product': {
    id: 'add-product',
    component: Inventory, // Uses Inventory component with mode='add'
    menuLabel: 'Add New Product',
    menuLabelAr: 'إضافة منتج جديد',
    icon: 'add_box',
    category: 'inventory',
    requiredProps: ['inventory', 'onAddDrug', 'onUpdateDrug', 'onDeleteDrug', 'color', 't', 'language', 'initialMode']
  },
  'cash-register': {
    id: 'cash-register',
    component: CashRegister,
    menuLabel: 'Cash Register',
    menuLabelAr: 'سجل النقدية',
    icon: 'point_of_sale',
    category: 'sales',
    requiredProps: ['color', 't', 'language']
  },
  'shift-history': {
    id: 'shift-history',
    component: ShiftHistory,
    menuLabel: 'Shift History',
    menuLabelAr: 'سجل الورديات',
    icon: 'history',
    category: 'sales',
    requiredProps: ['color', 't', 'language']
  },
  'stock-adjustment': {
    id: 'stock-adjustment',
    component: StockAdjustment,
    menuLabel: 'Stock Adjustment',
    menuLabelAr: 'جرد المخزون',
    icon: 'inventory',
    category: 'inventory',
    requiredProps: ['inventory', 'onUpdateInventory', 'color', 't']
  },
  'receipt-designer': {
    id: 'receipt-designer',
    component: ReceiptDesigner,
    menuLabel: 'Receipt Design',
    menuLabelAr: 'تصميم الفاتورة',
    icon: 'brush', 
    category: 'sales',
    requiredProps: ['color', 't', 'language']
  },
  'dashboard-experiments': {
    id: 'dashboard-experiments',
    component: DashboardExperiments,
    menuLabel: 'Dashboard Experiments',
    menuLabelAr: 'تجارب لوحة التحكم',
    icon: 'science',
    category: 'test',
    requiredProps: ['color', 't', 'language']
  },
  'pos-test': {
    id: 'pos-test',
    component: POSTest,
    menuLabel: 'POS Test',
    menuLabelAr: 'نقطة بيع (اختبار)',
    icon: 'science',
    category: 'test',
    requiredProps: ['inventory', 'customers', 'onCompleteSale', 'color', 't', 'language', 'onAddCustomer']
  },
  'purchases-test': {
    id: 'purchases-test',
    component: PurchasesTest,
    menuLabel: 'Create PO (Test)',
    menuLabelAr: 'انشاء امر شراء (تيست)',
    icon: 'shopping_cart',
    category: 'test',
    requiredProps: ['inventory', 'suppliers', 'purchases', 'purchaseReturns', 'onCompletePurchase', 'color', 't', 'language']
  },
  'advanced-sm-card': {
    id: 'advanced-sm-card',
    component: AdvancedSmCard,
    menuLabel: 'Advanced Sm Card',
    menuLabelAr: 'بطاقات صغيرة متطورة',
    icon: 'dashboard_customize',
    category: 'test',
    requiredProps: ['color', 't', 'language']
  },
  'modal-tests': {
    id: 'modal-tests',
    component: ModalTests,
    menuLabel: 'Modal Tests',
    menuLabelAr: 'اختبار النوافذ',
    icon: 'dialogs',
    category: 'test',
    requiredProps: ['color', 't', 'language']
  },
  'employee-list': {
    id: 'employee-list',
    component: EmployeeList,
    menuLabel: 'Employee List',
    menuLabelAr: 'قائمة الموظفين',
    icon: 'badge',
    category: 'hr',
    requiredProps: ['color', 't', 'language']
  },
  'employee-profile': {
    id: 'employee-profile',
    component: EmployeeProfile,
    menuLabel: 'Employee Profile',
    menuLabelAr: 'ملف الموظف',
    icon: 'id_card',
    category: 'hr',
    requiredProps: ['sales', 'employees', 'color', 't', 'language']
  },
  'login-test': {
    id: 'login-test',
    component: LoginTest,
    menuLabel: 'Login Test',
    menuLabelAr: 'اختبار تسجيل الدخول',
    icon: 'lock',
    category: 'test',
    requiredProps: ['color', 't', 'language', 'onViewChange', 'onLoginSuccess']
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
  Object.values(PAGE_REGISTRY).forEach(page => {
    translations[page.menuLabel] = page.menuLabelAr;
  });
  return translations;
};
