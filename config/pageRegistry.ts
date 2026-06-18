import React, { type ComponentType } from 'react';

import type {
  Customer,
  Drug,
  Employee,
  Purchase,
  PurchaseReturn,
  Return,
  Sale,
  Shift,
  StockBatch,
  Supplier,
  ViewState,
} from '../types';
import type { PermissionAction } from './permissions';
import { PERMISSIONS_MAPPING } from './permissionsMapping';

const Login = React.lazy(() => import('../components/auth/Login').then(m => ({ default: m.Login })));
const CustomerHistory = React.lazy(() => import('../components/customers/CustomerHistory').then(m => ({ default: m.CustomerHistory })));
const CustomerLoyaltyLookup = React.lazy(() => import('../components/customers/CustomerLoyaltyLookup').then(m => ({ default: m.CustomerLoyaltyLookup })));
const CustomerLoyaltyOverview = React.lazy(() => import('../components/customers/CustomerLoyaltyOverview').then(m => ({ default: m.CustomerLoyaltyOverview })));
const CustomerManagement = React.lazy(() => import('../components/customers/CustomerManagement').then(m => ({ default: m.CustomerManagement })));
const CustomerOverview = React.lazy(() => import('../components/customers/CustomerOverview').then(m => ({ default: m.CustomerOverview })));
const Dashboard = React.lazy(() => import('../components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const RealTimeSalesMonitor = React.lazy(() => import('../components/dashboard/RealTimeSalesMonitor').then(m => ({ default: m.RealTimeSalesMonitor })));
const AdvancedSmCard = React.lazy(() => import('../components/experiments/AdvancedSmCard').then(m => ({ default: m.AdvancedSmCard })));
const DashboardExperiments = React.lazy(() => import('../components/experiments/DashboardExperiments').then(m => ({ default: m.DashboardExperiments })));
const ExpenseTracker = React.lazy(() => import('../components/finance/ExpenseTracker').then(m => ({ default: m.ExpenseTracker })));
const EmployeeList = React.lazy(() => import('../components/hr/EmployeeList').then(m => ({ default: m.EmployeeList })));
const EmployeeProfile = React.lazy(() => import('../components/hr/EmployeeProfile').then(m => ({ default: m.EmployeeProfile })));
const StaffOverview = React.lazy(() => import('../components/hr/StaffOverview').then(m => ({ default: m.StaffOverview })));
const DrugApprovalQueue = React.lazy(() => import('../components/inventory').then(m => ({ default: m.DrugApprovalQueue })));
const ExpiryManagement = React.lazy(() => import('../components/inventory').then(m => ({ default: m.ExpiryManagement })));
const StockMovementReport = React.lazy(() => import('../components/inventory').then(m => ({ default: m.StockMovementReport })));
const AddProduct = React.lazy(() => import('../components/inventory/AddProduct').then(m => ({ default: m.AddProduct })));
const BarcodePrinter = React.lazy(() => import('../components/inventory/BarcodePrinter').then(m => ({ default: m.BarcodePrinter })));
const BarcodeStudio = React.lazy(() => import('../components/inventory/BarcodeStudio').then(m => ({ default: m.BarcodeStudio })));
const Inventory = React.lazy(() => import('../components/inventory/Inventory').then(m => ({ default: m.Inventory })));
const InventoryManagement = React.lazy(() => import('../components/inventory/InventoryManagement').then(m => ({ default: m.InventoryManagement })));
const StockAdjustment = React.lazy(() => import('../components/inventory/StockAdjustment').then(m => ({ default: m.StockAdjustment })));
const LandingPage = React.lazy(() => import('../components/layout/LandingPage').then(m => ({ default: m.LandingPage })));
const PendingApproval = React.lazy(() => import('../components/purchases/PendingApproval').then(m => ({ default: m.PendingApproval })));
const PurchaseHistory = React.lazy(() => import('../components/purchases/PurchaseHistory').then(m => ({ default: m.PurchaseHistory })));
const PurchaseReturns = React.lazy(() => import('../components/purchases/PurchaseReturns').then(m => ({ default: m.PurchaseReturns })));
const Purchases = React.lazy(() => import('../components/purchases/Purchases').then(m => ({ default: m.Purchases })));
const SuppliersList = React.lazy(() => import('../components/purchases/SuppliersList').then(m => ({ default: m.SuppliersList })));
const LoginAuditList = React.lazy(() => import('../components/reports/LoginAuditList').then(m => ({ default: m.LoginAuditList })));
const ProfitLossPage = React.lazy(() => import('../components/reports/ProfitLossPage').then(m => ({ default: m.ProfitLossPage })));
const CashRegister = React.lazy(() => import('../components/sales/CashRegister').then(m => ({ default: m.CashRegister })));
const POS = React.lazy(() => import('../components/sales/pos/POS').then(m => ({ default: m.POS })));
const ReceiptDesigner = React.lazy(() => import('../components/sales/ReceiptDesigner').then(m => ({ default: m.ReceiptDesigner })));
const ReturnHistory = React.lazy(() => import('../components/sales/ReturnHistory').then(m => ({ default: m.ReturnHistory })));
const SalesHistory = React.lazy(() => import('../components/sales/SalesHistory').then(m => ({ default: m.SalesHistory })));
const ShiftHistory = React.lazy(() => import('../components/sales/ShiftHistory').then(m => ({ default: m.ShiftHistory })));
const BranchSettings = React.lazy(() => import('../components/settings/BranchSettings').then(m => ({ default: m.BranchSettings })));
const DesktopSettings = React.lazy(() => import('../components/settings/DesktopSettings').then(m => ({ default: m.DesktopSettings })));
const PricingPage = React.lazy(() => import('../components/settings/PricingPage').then(m => ({ default: m.PricingPage })));
const A5InvoiceDesigner = React.lazy(() => import('../components/test/A5InvoiceDesigner').then(m => ({ default: m.A5InvoiceDesigner })));
const FilterDropdownTest = React.lazy(() => import('../components/test/FilterDropdownTest').then(m => ({ default: m.FilterDropdownTest })));
const ModalTests = React.lazy(() => import('../components/test/ModalTests').then(m => ({ default: m.ModalTests })));
const ScrollbarLab = React.lazy(() => import('../components/test/ScrollbarLab').then(m => ({ default: m.ScrollbarLab })));
const IntelligenceDashboard = React.lazy(() => import('../pages/IntelligenceDashboard').then(m => ({ default: m.IntelligenceDashboard })));

export interface InjectedPageProps {
  color?: string;
  t?: Translations;
  language?: 'AR' | 'EN';
  textTransform?: string;
  currentEmployeeId?: string | null;
  darkMode?: boolean;
  employees?: Employee[];
  isLoading?: boolean;
  activeBranchId?: string;
  activeOrgId?: string;
  sales?: Sale[];
  inventory?: Drug[];
  customers?: Customer[];
  products?: Drug[];
  suppliers?: Supplier[];
  purchases?: Purchase[];
  purchaseReturns?: PurchaseReturn[];
  returns?: Return[];
  drugs?: Drug[];
  batches?: StockBatch[];
  currentShift?: Shift | null;
  navigationParams?: Record<string, string | number | boolean | null | undefined>;
  setInventory?: (inventory: Drug[]) => void;
  setDrugs?: (drugs: Drug[]) => void;
  setPurchases?: (purchases: Purchase[]) => void;
  setPurchaseReturns?: (returns: PurchaseReturn[]) => void;
  onAddDrug?: (drug: Drug) => void;
  onUpdateDrug?: (id: string, drug: Partial<Drug>) => void;
  onDeleteDrug?: (id: string) => void;
  onUpdateInventory?: (inventory: Drug[]) => void;
  onBatchesChanged?: () => void;
  onCompleteSale?: (sale: Sale) => void;
  onUpdateSale?: (id: string, sale: Partial<Sale>) => void;
  onProcessReturn?: (returnTx: Return) => void;
  onAddCustomer?: (customer: Customer) => void;
  onUpdateCustomer?: (id: string, customer: Partial<Customer>) => void;
  onDeleteCustomer?: (id: string) => void;
  setSuppliers?: (suppliers: Supplier[]) => void;
  onAddSupplier?: (supplier: Supplier) => void;
  onUpdateSupplier?: (id: string, supplier: Partial<Supplier>) => void;
  onDeleteSupplier?: (id: string) => void;
  onPurchaseComplete?: (purchase: Purchase) => void;
  onApprovePurchase?: (id: string) => void;
  onMarkAsReceived?: (id: string) => void;
  onRejectPurchase?: (id: string) => void;
  onAddProduct?: () => void;
  onRestock?: () => void;
  onAddEmployee?: (employee: Employee) => void;
  onUpdateEmployee?: (id: string, employee: Partial<Employee>) => void;
  onDeleteEmployee?: (id: string) => void;
  onCreatePurchaseReturn?: (returnTx: PurchaseReturn) => void;
  onViewChange?: (view: ViewState) => void;
  onLoginSuccess?: () => void;
  getVerifiedDate?: () => Date;
  datePickerTranslations?: Record<string, string>;
  initialMode?: string;
}

export interface PageConfig {
  id: string;
  component: ComponentType<InjectedPageProps>;
  menuLabel: string;
  menuLabelAr: string;
  requiredProps?: string[]; // Props that need to be passed to the component
  icon?: string;
  category?: string;
  permission?: PermissionAction;
  skeleton?: ComponentType<InjectedPageProps>;
  layout?: 'standard' | 'full-bleed' | 'dashboard' | 'split' | 'auth' | 'full-screen';
  skeletonProps?: Partial<InjectedPageProps>;
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
    permission: PERMISSIONS_MAPPING['dashboard'],
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
      'onViewChange',
    ],
    permission: PERMISSIONS_MAPPING['inventory'],
  },
  'stock-movement': {
    id: 'stock-movement',
    component: StockMovementReport,
    menuLabel: 'Stock Movement Report',
    menuLabelAr: 'تقرير حركة المخزون',
    icon: 'timeline',
    category: 'inventory',
    requiredProps: ['onViewChange'],
    permission: PERMISSIONS_MAPPING['stock-movement'],
  },
  'expiry-calendar': {
    id: 'expiry-calendar',
    component: ExpiryManagement,
    menuLabel: 'Expiry Calendar',
    menuLabelAr: 'تقويم الانتهاء',
    icon: 'calendar_today',
    category: 'inventory',
    requiredProps: [
      'inventory',
      'batches',
      'color',
      't',
      'language',
      'onUpdateInventory',
      'onBatchesChanged',
    ],
    permission: PERMISSIONS_MAPPING['expiry-calendar'],
  },
  'inventory-beta': {
    id: 'inventory-beta',
    component: InventoryManagement,
    menuLabel: 'Inventory (Beta)',
    menuLabelAr: 'المخزون (تجريبي)',
    icon: 'table_view',
    category: 'inventory',

    requiredProps: ['inventory', 'color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['inventory-beta'],
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

    permission: PERMISSIONS_MAPPING['pos'],
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
      'onViewChange',
    ],
    permission: PERMISSIONS_MAPPING['sales-history'],
  },
  'return-history': {
    id: 'return-history',
    component: ReturnHistory,
    menuLabel: 'Return History',
    menuLabelAr: 'سجل الإرجاعات',
    icon: 'assignment_return',
    category: 'sales',
    requiredProps: ['returns', 'sales', 'color', 't', 'language', 'navigationParams'],
    permission: PERMISSIONS_MAPPING['return-history'],
  },
  suppliers: {
    id: 'suppliers',
    component: SuppliersList,
    menuLabel: 'Supplier List',
    menuLabelAr: 'قائمة الموردين',
    icon: 'local_shipping',
    category: 'purchase',
    requiredProps: [
      'suppliers',
      'setSuppliers',
      'onAddSupplier',
      'onUpdateSupplier',
      'onDeleteSupplier',
      'color',
      't',
      'language',
    ],
    permission: PERMISSIONS_MAPPING['suppliers'],
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
    permission: PERMISSIONS_MAPPING['purchases'],
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
    permission: PERMISSIONS_MAPPING['pending-approval'],
  },
  'drug-approval-queue': {
    id: 'drug-approval-queue',
    component: DrugApprovalQueue,
    menuLabel: 'Drug Approval Queue',
    menuLabelAr: 'موافقات الأدوية الجديدة',
    icon: 'assignment_turned_in',
    category: 'inventory',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['drug-approval-queue'],
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
    permission: PERMISSIONS_MAPPING['purchase-history'],
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
    permission: PERMISSIONS_MAPPING['purchase-returns'],
  },
  'barcode-printer': {
    id: 'barcode-printer',
    component: BarcodePrinter,
    menuLabel: 'Barcode Printer',
    menuLabelAr: 'طباعة الباركود',
    icon: 'print',
    category: 'tools',
    requiredProps: ['inventory', 'color', 't', 'language', 'textTransform'],
    permission: PERMISSIONS_MAPPING['barcode-printer'],
  },
  'barcode-studio': {
    id: 'barcode-studio',
    component: BarcodeStudio,
    menuLabel: 'Barcode Studio',
    menuLabelAr: 'استوديو الباركود',
    icon: 'qr_code_2',
    category: 'tools',
    requiredProps: ['inventory', 'color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['barcode-studio'],
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
    permission: PERMISSIONS_MAPPING['customers'],
  },
  'customer-overview': {
    id: 'customer-overview',
    component: CustomerOverview,
    menuLabel: 'Customer Overview',
    menuLabelAr: 'نظرة عامة على العملاء',
    icon: 'analytics',
    category: 'customer-dashboard',
    requiredProps: ['customers', 'sales', 'color', 't', 'language', 'isLoading', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['customer-overview'],
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
    permission: PERMISSIONS_MAPPING['customer-history'],
  },
  'loyalty-overview': {
    id: 'loyalty-overview',
    component: CustomerLoyaltyOverview,
    menuLabel: 'Loyalty Overview',
    menuLabelAr: 'نظرة عامة على الولاء',
    icon: 'stars',
    category: 'customer-dashboard',
    requiredProps: ['customers', 'sales', 'color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['loyalty-overview'],
    layout: 'dashboard',
  },
  'loyalty-lookup': {
    id: 'loyalty-lookup',
    component: CustomerLoyaltyLookup,
    menuLabel: 'Customer Loyalty Lookup',
    menuLabelAr: 'بحث ولاء العملاء',
    icon: 'person_search',
    category: 'customer-dashboard',
    requiredProps: ['customers', 'sales', 'color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['loyalty-lookup'],
  },
  'real-time-sales': {
    id: 'real-time-sales',
    component: RealTimeSalesMonitor,
    menuLabel: 'Real-time Sales Monitor',
    menuLabelAr: 'مراقبة المبيعات الفورية',
    icon: 'monitoring',
    category: 'sales-dashboard',
    requiredProps: ['sales', 'customers', 'products', 'color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['real-time-sales'],
    layout: 'dashboard',
  },
  'add-product': {
    id: 'add-product',
    component: AddProduct,
    menuLabel: 'Add New Product',
    menuLabelAr: 'إضافة منتج جديد',
    icon: 'add_box',
    category: 'inventory',
    requiredProps: ['inventory', 'onAddDrug', 'color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['add-product'],
  },
  'cash-register': {
    id: 'cash-register',
    component: CashRegister,
    menuLabel: 'Cash Register',
    menuLabelAr: 'سجل النقدية',
    icon: 'point_of_sale',
    category: 'sales',
    requiredProps: ['color', 't', 'language', 'employees', 'currentEmployeeId', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['cash-register'],
  },
  expenses: {
    id: 'expenses',
    component: ExpenseTracker,
    menuLabel: 'Expense Tracker',
    menuLabelAr: 'متتبع المصروفات',
    icon: 'receipt_long',
    category: 'finance',
    requiredProps: ['t', 'language', 'employees', 'currentEmployeeId', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['expenses'],
    layout: 'standard',
  },
  'shift-history': {
    id: 'shift-history',
    component: ShiftHistory,
    menuLabel: 'Shift History',
    menuLabelAr: 'سجل الورديات',
    icon: 'history',
    category: 'sales',
    requiredProps: ['color', 't', 'language', 'employees', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['shift-history'],
  },
  'stock-adjustment': {
    id: 'stock-adjustment',
    component: StockAdjustment,
    menuLabel: 'Stock Adjustment',
    menuLabelAr: 'جرد المخزون',
    icon: 'inventory',
    category: 'inventory',
    requiredProps: ['inventory', 'batches', 'onUpdateInventory', 'color', 't'],
    permission: PERMISSIONS_MAPPING['stock-adjustment'],
  },
  'receipt-designer': {
    id: 'receipt-designer',
    component: ReceiptDesigner,
    menuLabel: 'Receipt Design',
    menuLabelAr: 'تصميم الفاتورة',
    icon: 'brush',
    category: 'sales',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['receipt-designer'],
  },
  'dashboard-experiments': {
    id: 'dashboard-experiments',
    component: DashboardExperiments,
    menuLabel: 'Dashboard Experiments',
    menuLabelAr: 'تجارب لوحة التحكم',
    icon: 'science',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['dashboard-experiments'],
  },
  'advanced-sm-card': {
    id: 'advanced-sm-card',
    component: AdvancedSmCard,
    menuLabel: 'Advanced Sm Card',
    menuLabelAr: 'بطاقات صغيرة متطورة',
    icon: 'dashboard_customize',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['advanced-sm-card'],
  },
  'modal-tests': {
    id: 'modal-tests',
    component: ModalTests,
    menuLabel: 'Modal Tests',
    menuLabelAr: 'اختبار النوافذ',
    icon: 'dialogs',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['modal-tests'],
  },
  'scrollbar-lab': {
    id: 'scrollbar-lab',
    component: ScrollbarLab,
    menuLabel: 'Scrollbar Lab',
    menuLabelAr: 'مختبر شريط التمرير',
    icon: 'science',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['scrollbar-lab'],
    layout: 'standard',
  },
  'a5-invoice-designer': {
    id: 'a5-invoice-designer',
    component: A5InvoiceDesigner,
    menuLabel: 'A5 Invoice Designer',
    menuLabelAr: 'مصمم فواتير A5',
    icon: 'print',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['a5-invoice-designer'],
    layout: 'standard',
  },
  'filter-dropdown-test': {
    id: 'filter-dropdown-test',
    component: FilterDropdownTest,
    menuLabel: 'Filter Dropdown Test',
    menuLabelAr: 'اختبار القائمة المنسدلة',
    icon: 'filter_alt',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['filter-dropdown-test'],
    layout: 'standard',
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
    permission: PERMISSIONS_MAPPING['employee-list'],
  },
  'employee-profile': {
    id: 'employee-profile',
    component: EmployeeProfile,
    menuLabel: 'Employee Profile',
    menuLabelAr: 'ملف الموظف',
    icon: 'id_card',
    category: 'hr',
    requiredProps: ['sales', 'employees', 'color', 't', 'language', 'isLoading', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['employee-profile'],
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
    component: LandingPage,
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
    permission: PERMISSIONS_MAPPING['staff-overview'],
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
    permission: PERMISSIONS_MAPPING['branch-management'],
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
    permission: PERMISSIONS_MAPPING['medicine-search'],
  },
  'customer-density-map': {
    id: 'customer-density-map',
    component: React.lazy(() => import('../components/customers/CustomerDensityMap')),
    menuLabel: 'Customer Density Map',
    menuLabelAr: 'خريطة كثافة العملاء',
    icon: 'map',
    category: 'customer-dashboard',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['customer-density-map'],
    layout: 'full-screen',
  },
  'org-management': {
    id: 'org-management',
    component: React.lazy(() =>
      import('../components/org/OrganizationManagementPage').then((m) => ({
        default: m.OrganizationManagementPage,
      }))
    ),
    menuLabel: 'Org Management',
    menuLabelAr: 'إدارة المنظمة',
    icon: 'corporate_fare',
    category: 'settings',
    requiredProps: [
      'color',
      't',
      'language',
      'employees',
      'currentEmployeeId',
      'activeOrgId',
      'onViewChange',
    ],
    permission: 'settings.view',
    layout: 'standard',
  },
  services: {
    id: 'services',
    component: PricingPage,
    menuLabel: 'Services & Pricing',
    menuLabelAr: 'الخدمات والأسعار',
    icon: 'sell',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: 'settings.view',
    layout: 'full-screen',
  },
  'attendance-terminal': {
    id: 'attendance-terminal',
    component: React.lazy(() => import('../components/hr/attendance/AttendanceTerminal')),
    menuLabel: 'Mark Attendance',
    menuLabelAr: 'تسجيل الحضور',
    icon: 'touch_app',
    category: 'hr',
    requiredProps: ['language'],
    permission: PERMISSIONS_MAPPING['attendance-terminal'],
  },
  'attendance-reports': {
    id: 'attendance-reports',
    component: React.lazy(() => import('../components/hr/attendance/AttendanceReports')),
    menuLabel: 'Attendance Reports',
    menuLabelAr: 'تقارير الحضور',
    icon: 'assessment',
    category: 'hr',
    requiredProps: ['onViewChange'],
    permission: PERMISSIONS_MAPPING['attendance-reports'],
  },
  'employee-attendance-profile': {
    id: 'employee-attendance-profile',
    component: React.lazy(() => import('../components/hr/attendance/EmployeeAttendanceProfile')),
    menuLabel: 'Employee Attendance',
    menuLabelAr: 'حضور الموظف',
    icon: 'person_check',
    category: 'hr',
    requiredProps: ['onViewChange'],
    permission: PERMISSIONS_MAPPING['employee-attendance-profile'],
  },
  'desktop-settings': {
    id: 'desktop-settings',
    component: DesktopSettings,
    menuLabel: 'Desktop Settings',
    menuLabelAr: 'إعدادات سطح المكتب',
    icon: 'desktop_windows',
    category: 'settings',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['desktop-settings'],
    layout: 'standard',
  },
  'profit-loss': {
    id: 'profit-loss',
    component: ProfitLossPage,
    menuLabel: 'Profit & Loss',
    menuLabelAr: 'الأرباح والخسائر',
    icon: 'analytics',
    category: 'reports',
    requiredProps: ['t', 'language'],
    permission: 'reports.view_financial',
    layout: 'standard',
  },
  'drug-interactions': {
    id: 'drug-interactions',
    component: React.lazy(() => import('../components/prescriptions/DrugInteractionsPage')),
    menuLabel: 'Drug Interactions',
    menuLabelAr: 'تفاعلات الأدوية',
    icon: 'medication',
    category: 'prescriptions',
    requiredProps: ['t', 'language', 'inventory'],
    permission: PERMISSIONS_MAPPING['drug-interactions'],
    layout: 'standard',
  },
  shortages: {
    id: 'shortages',
    component: React.lazy(() => import('../components/inventory/ShortagesPage')),
    menuLabel: 'Shortages & Predictive Alerts',
    menuLabelAr: 'النواقص والإنذارات التنبؤية',
    icon: 'warning',
    category: 'inventory',
    requiredProps: ['t', 'language', 'inventory', 'onViewChange', 'navigationParams'],
    permission: PERMISSIONS_MAPPING['inventory'],
    layout: 'standard',
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
