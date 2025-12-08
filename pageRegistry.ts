import { ComponentType } from 'react';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { POS } from './components/POS';
import { SalesHistory } from './components/SalesHistory';
import { ReturnHistory } from './components/ReturnHistory';
import { SuppliersList } from './components/SuppliersList';
import { Purchases } from './components/Purchases';
import { PurchaseReturns } from './components/PurchaseReturns';
import { BarcodeStudio } from './components/BarcodeStudio';
import { CustomerManagement } from './components/CustomerManagement';
import { CustomerOverview } from './components/CustomerOverview';
import { CustomerLoyaltyOverview } from './components/CustomerLoyaltyOverview';
import { CustomerLoyaltyLookup } from './components/CustomerLoyaltyLookup';
import { RealTimeSalesMonitor } from './components/RealTimeSalesMonitor';
import { InventoryManagement } from './components/InventoryManagement';
import { PendingApproval } from './components/PendingApproval';

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
    requiredProps: ['inventory', 'setInventory', 'color', 't', 'language', 'onAddProduct']
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
    requiredProps: ['inventory', 'customers', 'onCompleteSale', 'color', 't', 'language', 'onAddCustomer']
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
    requiredProps: ['color', 't', 'purchases', 'onApprovePurchase', 'onRejectPurchase']
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
    requiredProps: ['inventory', 'setInventory', 'color', 't', 'language', 'onAddProduct', 'initialMode']
  }
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
