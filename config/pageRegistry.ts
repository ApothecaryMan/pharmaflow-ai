import type { ComponentType } from 'react';
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
import { createLazyPage } from '../utils/createLazyPage';
import type { PermissionAction } from './permissions';
import { PERMISSIONS_MAPPING } from './permissionsMapping';

const Login = createLazyPage(() =>
  import('../components/auth/Login').then((m) => ({ default: m.Login }))
);
const CustomerHistory = createLazyPage(() =>
  import('../components/customers/CustomerHistory').then((m) => ({ default: m.CustomerHistory }))
);
const CustomerLoyaltyLookup = createLazyPage(() =>
  import('../components/customers/CustomerLoyaltyLookup').then((m) => ({
    default: m.CustomerLoyaltyLookup,
  }))
);
const CustomerLoyaltyOverview = createLazyPage(() =>
  import('../components/customers/CustomerLoyaltyOverview').then((m) => ({
    default: m.CustomerLoyaltyOverview,
  }))
);
const CustomerManagement = createLazyPage(() =>
  import('../components/customers/CustomerManagement').then((m) => ({
    default: m.CustomerManagement,
  }))
);
const CustomerOverview = createLazyPage(() =>
  import('../components/customers/CustomerOverview').then((m) => ({ default: m.CustomerOverview }))
);
const Dashboard = createLazyPage(() =>
  import('../components/dashboard/Dashboard').then((m) => ({ default: m.Dashboard }))
);
const RealTimeSalesMonitor = createLazyPage(() =>
  import('../components/dashboard/RealTimeSalesMonitor').then((m) => ({
    default: m.RealTimeSalesMonitor,
  }))
);
const AdvancedSmCard = createLazyPage(() =>
  import('../components/experiments/AdvancedSmCard').then((m) => ({ default: m.AdvancedSmCard }))
);
const DashboardExperiments = createLazyPage(() =>
  import('../components/experiments/DashboardExperiments').then((m) => ({
    default: m.DashboardExperiments,
  }))
);
const ExpenseTracker = createLazyPage(() =>
  import('../components/finance/ExpenseTracker').then((m) => ({ default: m.ExpenseTracker }))
);
const EmployeeList = createLazyPage(() =>
  import('../components/hr/EmployeeList').then((m) => ({ default: m.EmployeeList }))
);
const EmployeeProfile = createLazyPage(() =>
  import('../components/hr/EmployeeProfile').then((m) => ({ default: m.EmployeeProfile }))
);
const StaffOverview = createLazyPage(() =>
  import('../components/hr/StaffOverview').then((m) => ({ default: m.StaffOverview }))
);
const DrugApprovalQueue = createLazyPage(() =>
  import('../components/inventory').then((m) => ({ default: m.DrugApprovalQueue }))
);
const ExpiryManagement = createLazyPage(() =>
  import('../components/inventory').then((m) => ({ default: m.ExpiryManagement }))
);
const StockMovementReport = createLazyPage(() =>
  import('../components/inventory').then((m) => ({ default: m.StockMovementReport }))
);
const AddProduct = createLazyPage(() =>
  import('../components/inventory/AddProduct').then((m) => ({ default: m.AddProduct }))
);
const BarcodePrinter = createLazyPage(() =>
  import('../components/inventory/BarcodePrinter').then((m) => ({ default: m.BarcodePrinter }))
);
const BarcodeStudio = createLazyPage(() =>
  import('../components/inventory/BarcodeStudio').then((m) => ({ default: m.BarcodeStudio }))
);
const Inventory = createLazyPage(() =>
  import('../components/inventory/Inventory').then((m) => ({ default: m.Inventory }))
);
const InventoryManagement = createLazyPage(() =>
  import('../components/inventory/InventoryManagement').then((m) => ({
    default: m.InventoryManagement,
  }))
);
const StockAdjustment = createLazyPage(() =>
  import('../components/inventory/StockAdjustment').then((m) => ({ default: m.StockAdjustment }))
);
const LandingPage = createLazyPage(() =>
  import('../components/layout/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const PendingApproval = createLazyPage(() =>
  import('../components/purchases/PendingApproval').then((m) => ({ default: m.PendingApproval }))
);
const PurchaseHistory = createLazyPage(() =>
  import('../components/purchases/PurchaseHistory').then((m) => ({ default: m.PurchaseHistory }))
);
const PurchaseReturns = createLazyPage(() =>
  import('../components/purchases/PurchaseReturns').then((m) => ({ default: m.PurchaseReturns }))
);
const Purchases = createLazyPage(() =>
  import('../components/purchases/Purchases').then((m) => ({ default: m.Purchases }))
);
const SuppliersList = createLazyPage(() =>
  import('../components/purchases/SuppliersList').then((m) => ({ default: m.SuppliersList }))
);
const LoginAuditList = createLazyPage(() =>
  import('../components/reports/LoginAuditList').then((m) => ({ default: m.LoginAuditList }))
);
const ProfitLossPage = createLazyPage(() =>
  import('../components/reports/ProfitLossPage').then((m) => ({ default: m.ProfitLossPage }))
);
const CashRegister = createLazyPage(() =>
  import('../components/sales/CashRegister').then((m) => ({ default: m.CashRegister }))
);
const POS = createLazyPage(() =>
  import('../components/sales/pos/POS').then((m) => ({ default: m.POS }))
);
const ReceiptDesigner = createLazyPage(() =>
  import('../components/sales/ReceiptDesigner').then((m) => ({ default: m.ReceiptDesigner }))
);
const ReturnHistory = createLazyPage(() =>
  import('../components/sales/ReturnHistory').then((m) => ({ default: m.ReturnHistory }))
);
const SalesHistory = createLazyPage(() =>
  import('../components/sales/SalesHistory').then((m) => ({ default: m.SalesHistory }))
);
const ShiftHistory = createLazyPage(() =>
  import('../components/sales/ShiftHistory').then((m) => ({ default: m.ShiftHistory }))
);
const BranchSettings = createLazyPage(() =>
  import('../components/settings/BranchSettings').then((m) => ({ default: m.BranchSettings }))
);
const BrowserPrintSettings = createLazyPage(() =>
  import('../components/settings/BrowserPrintSettings').then((m) => ({
    default: m.BrowserPrintSettings,
  }))
);
const DesktopSettings = createLazyPage(() =>
  import('../components/settings/DesktopSettings').then((m) => ({ default: m.DesktopSettings }))
);
const PricingPage = createLazyPage(() =>
  import('../components/settings/PricingPage').then((m) => ({ default: m.PricingPage }))
);
const ThemeStudioPage = createLazyPage(() =>
  import('../components/settings/ThemeStudio').then((m) => ({ default: m.ThemeStudio }))
);
const A5InvoiceDesigner = createLazyPage(() =>
  import('../components/test/A5InvoiceDesigner').then((m) => ({ default: m.A5InvoiceDesigner }))
);
const AnimatedCounterLab = createLazyPage(() =>
  import('../components/test/AnimatedCounterLab').then((m) => ({ default: m.AnimatedCounterLab }))
);
const FilterDropdownTest = createLazyPage(() =>
  import('../components/test/FilterDropdownTest').then((m) => ({ default: m.FilterDropdownTest }))
);
const ModalTests = createLazyPage(() =>
  import('../components/test/ModalTests').then((m) => ({ default: m.ModalTests }))
);
const ScrollbarLab = createLazyPage(() =>
  import('../components/test/ScrollbarLab').then((m) => ({ default: m.ScrollbarLab }))
);
const CosmoceuticalPage = createLazyPage(() =>
  import('../components/cosmoceutical/CosmoceuticalPage').then((m) => ({
    default: m.CosmoceuticalPage,
  }))
);
const IntelligenceDashboard = createLazyPage(() =>
  import('../pages/IntelligenceDashboard').then((m) => ({ default: m.IntelligenceDashboard }))
);
const ActiveSessionsPage = createLazyPage(() =>
  import('../components/settings/ActiveSessionsPage').then((m) => ({
    default: m.ActiveSessionsPage,
  }))
);
const CustomerDensityMap = createLazyPage(
  () => import('../components/customers/CustomerDensityMap')
);
const OrganizationManagementPage = createLazyPage(() =>
  import('../components/org/OrganizationManagementPage').then((m) => ({
    default: m.OrganizationManagementPage,
  }))
);
const AttendanceTerminal = createLazyPage(
  () => import('../components/hr/attendance/AttendanceTerminal')
);
const AttendanceReports = createLazyPage(
  () => import('../components/hr/attendance/AttendanceReports')
);
const EmployeeAttendanceProfile = createLazyPage(
  () => import('../components/hr/attendance/EmployeeAttendanceProfile')
);
const DrugInteractionsPage = createLazyPage(
  () => import('../components/prescriptions/DrugInteractionsPage')
);
const ShortagesPage = createLazyPage(() => import('../components/inventory/ShortagesPage'));

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
  preload?: () => Promise<{ default: ComponentType<InjectedPageProps> }>;
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
    component: Dashboard.component,
    preload: Dashboard.preload,
    menuLabel: 'Dashboard Overview',
    menuLabelAr: 'نظرة عامة على لوحة التحكم',
    icon: 'dashboard',
    category: 'main-dashboard',

    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING.dashboard,
    layout: 'dashboard',
  },
  inventory: {
    id: 'inventory',
    component: Inventory.component,
    preload: Inventory.preload,
    menuLabel: 'Inventory',
    menuLabelAr: 'المخزون',
    icon: 'inventory_2',
    category: 'inventory',

    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING.inventory,
  },
  'stock-movement': {
    id: 'stock-movement',
    component: StockMovementReport.component,
    preload: StockMovementReport.preload,
    menuLabel: 'Stock Movement Report',
    menuLabelAr: 'تقرير حركة المخزون',
    icon: 'timeline',
    category: 'inventory',
    requiredProps: ['onViewChange'],
    permission: PERMISSIONS_MAPPING['stock-movement'],
  },
  'expiry-calendar': {
    id: 'expiry-calendar',
    component: ExpiryManagement.component,
    preload: ExpiryManagement.preload,
    menuLabel: 'Expiry Calendar',
    menuLabelAr: 'تقويم الانتهاء',
    icon: 'calendar_today',
    category: 'inventory',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['expiry-calendar'],
  },
  'inventory-beta': {
    id: 'inventory-beta',
    component: InventoryManagement.component,
    preload: InventoryManagement.preload,
    menuLabel: 'Inventory (Beta)',
    menuLabelAr: 'المخزون (تجريبي)',
    icon: 'table_view',
    category: 'inventory',

    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['inventory-beta'],
  },
  pos: {
    id: 'pos',
    component: POS.component,
    preload: POS.preload,
    menuLabel: 'Point of Sale',
    menuLabelAr: 'نقطة البيع',
    icon: 'point_of_sale',
    category: 'sales',

    requiredProps: ['color', 't', 'language'],

    permission: PERMISSIONS_MAPPING.pos,
    layout: 'full-bleed',
  },
  'sales-history': {
    id: 'sales-history',
    component: SalesHistory.component,
    preload: SalesHistory.preload,
    menuLabel: 'Sales History',
    menuLabelAr: 'سجل المبيعات',
    icon: 'receipt_long',
    category: 'sales',
    requiredProps: ['color', 't', 'language', 'navigationParams'],
    permission: PERMISSIONS_MAPPING['sales-history'],
  },
  'return-history': {
    id: 'return-history',
    component: ReturnHistory.component,
    preload: ReturnHistory.preload,
    menuLabel: 'Return History',
    menuLabelAr: 'سجل الإرجاعات',
    icon: 'assignment_return',
    category: 'sales',
    requiredProps: ['color', 't', 'language', 'navigationParams'],
    permission: PERMISSIONS_MAPPING['return-history'],
  },
  suppliers: {
    id: 'suppliers',
    component: SuppliersList.component,
    preload: SuppliersList.preload,
    menuLabel: 'Supplier List',
    menuLabelAr: 'قائمة الموردين',
    icon: 'local_shipping',
    category: 'purchase',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING.suppliers,
  },
  purchases: {
    id: 'purchases',
    component: Purchases.component,
    preload: Purchases.preload,
    menuLabel: 'Purchases',
    menuLabelAr: 'المشتريات',
    icon: 'shopping_cart',
    category: 'purchase',
    requiredProps: ['color', 't', 'language', 'navigationParams', 'onViewChange'],
    permission: PERMISSIONS_MAPPING.purchases,
  },
  'pending-approval': {
    id: 'pending-approval',
    component: PendingApproval.component,
    preload: PendingApproval.preload,
    menuLabel: 'Pending Approval',
    menuLabelAr: 'بانتظار الموافقة',
    icon: 'pending_actions',
    category: 'purchase',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['pending-approval'],
  },
  'drug-approval-queue': {
    id: 'drug-approval-queue',
    component: DrugApprovalQueue.component,
    preload: DrugApprovalQueue.preload,
    menuLabel: 'Drug Approval Queue',
    menuLabelAr: 'موافقات الأدوية الجديدة',
    icon: 'assignment_turned_in',
    category: 'inventory',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['drug-approval-queue'],
  },
  'purchase-history': {
    id: 'purchase-history',
    component: PurchaseHistory.component,
    preload: PurchaseHistory.preload,
    menuLabel: 'Purchase History',
    menuLabelAr: 'سجل المشتريات',
    icon: 'history',
    category: 'purchase',
    requiredProps: ['color', 't', 'language', 'navigationParams', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['purchase-history'],
  },
  'purchase-returns': {
    id: 'purchase-returns',
    component: PurchaseReturns.component,
    preload: PurchaseReturns.preload,
    menuLabel: 'Purchase Returns',
    menuLabelAr: 'مرتجعات المشتريات',
    icon: 'assignment_return',
    category: 'purchase',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['purchase-returns'],
  },
  'barcode-printer': {
    id: 'barcode-printer',
    component: BarcodePrinter.component,
    preload: BarcodePrinter.preload,
    menuLabel: 'Barcode Printer',
    menuLabelAr: 'طباعة الباركود',
    icon: 'print',
    category: 'tools',
    requiredProps: ['color', 't', 'language', 'textTransform'],
    permission: PERMISSIONS_MAPPING['barcode-printer'],
  },
  'barcode-studio': {
    id: 'barcode-studio',
    component: BarcodeStudio.component,
    preload: BarcodeStudio.preload,
    menuLabel: 'Barcode Studio',
    menuLabelAr: 'استوديو الباركود',
    icon: 'qr_code_2',
    category: 'tools',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['barcode-studio'],
  },
  customers: {
    id: 'customers',
    component: CustomerManagement.component,
    preload: CustomerManagement.preload,
    menuLabel: 'All Customers',
    menuLabelAr: 'جميع العملاء',
    icon: 'group',
    category: 'customers',
    requiredProps: ['color', 't', 'language', 'onViewChange', 'navigationParams'],
    permission: PERMISSIONS_MAPPING.customers,
  },
  'customer-overview': {
    id: 'customer-overview',
    component: CustomerOverview.component,
    preload: CustomerOverview.preload,
    menuLabel: 'Customer Overview',
    menuLabelAr: 'نظرة عامة على العملاء',
    icon: 'analytics',
    category: 'customer-dashboard',
    requiredProps: ['color', 't', 'language', 'isLoading', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['customer-overview'],
    layout: 'dashboard',
  },
  'customer-history': {
    id: 'customer-history',
    component: CustomerHistory.component,
    preload: CustomerHistory.preload,
    menuLabel: 'Customer History',
    menuLabelAr: 'سجل العملاء',
    icon: 'manage_search',
    category: 'customers',
    requiredProps: ['color', 't', 'language', 'navigationParams', 'isLoading', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['customer-history'],
  },
  'loyalty-overview': {
    id: 'loyalty-overview',
    component: CustomerLoyaltyOverview.component,
    preload: CustomerLoyaltyOverview.preload,
    menuLabel: 'Loyalty Overview',
    menuLabelAr: 'نظرة عامة على الولاء',
    icon: 'stars',
    category: 'customer-dashboard',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['loyalty-overview'],
    layout: 'dashboard',
  },
  'loyalty-lookup': {
    id: 'loyalty-lookup',
    component: CustomerLoyaltyLookup.component,
    preload: CustomerLoyaltyLookup.preload,
    menuLabel: 'Customer Loyalty Lookup',
    menuLabelAr: 'بحث ولاء العملاء',
    icon: 'person_search',
    category: 'customer-dashboard',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['loyalty-lookup'],
  },
  'real-time-sales': {
    id: 'real-time-sales',
    component: RealTimeSalesMonitor.component,
    preload: RealTimeSalesMonitor.preload,
    menuLabel: 'Real-time Sales Monitor',
    menuLabelAr: 'مراقبة المبيعات الفورية',
    icon: 'monitoring',
    category: 'sales-dashboard',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['real-time-sales'],
    layout: 'dashboard',
  },
  'add-product': {
    id: 'add-product',
    component: AddProduct.component,
    preload: AddProduct.preload,
    menuLabel: 'Add New Product',
    menuLabelAr: 'إضافة منتج جديد',
    icon: 'add_box',
    category: 'inventory',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['add-product'],
  },
  'cash-register': {
    id: 'cash-register',
    component: CashRegister.component,
    preload: CashRegister.preload,
    menuLabel: 'Cash Register',
    menuLabelAr: 'سجل النقدية',
    icon: 'point_of_sale',
    category: 'sales',
    requiredProps: ['color', 't', 'language', 'currentEmployeeId', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['cash-register'],
  },
  cosmoceutical: {
    id: 'cosmoceutical',
    component: CosmoceuticalPage.component,
    preload: CosmoceuticalPage.preload,
    menuLabel: 'Cosmoceutical',
    menuLabelAr: 'المستحضرات التجميلية الطبية',
    icon: 'science',
    category: 'cosmoceutical',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING.inventory,
    layout: 'full-screen',
  },
  expenses: {
    id: 'expenses',
    component: ExpenseTracker.component,
    preload: ExpenseTracker.preload,
    menuLabel: 'Expense Tracker',
    menuLabelAr: 'متتبع المصروفات',
    icon: 'receipt_long',
    category: 'finance',
    requiredProps: ['t', 'language', 'currentEmployeeId', 'onViewChange'],
    permission: PERMISSIONS_MAPPING.expenses,
    layout: 'standard',
  },
  'shift-history': {
    id: 'shift-history',
    component: ShiftHistory.component,
    preload: ShiftHistory.preload,
    menuLabel: 'Shift History',
    menuLabelAr: 'سجل الورديات',
    icon: 'history',
    category: 'sales',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['shift-history'],
  },
  'stock-adjustment': {
    id: 'stock-adjustment',
    component: StockAdjustment.component,
    preload: StockAdjustment.preload,
    menuLabel: 'Stock Adjustment',
    menuLabelAr: 'جرد المخزون',
    icon: 'inventory',
    category: 'inventory',
    requiredProps: ['color', 't'],
    permission: PERMISSIONS_MAPPING['stock-adjustment'],
  },
  'receipt-designer': {
    id: 'receipt-designer',
    component: ReceiptDesigner.component,
    preload: ReceiptDesigner.preload,
    menuLabel: 'Receipt Design',
    menuLabelAr: 'تصميم الفاتورة',
    icon: 'brush',
    category: 'sales',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['receipt-designer'],
  },
  'dashboard-experiments': {
    id: 'dashboard-experiments',
    component: DashboardExperiments.component,
    preload: DashboardExperiments.preload,
    menuLabel: 'Dashboard Experiments',
    menuLabelAr: 'تجارب لوحة التحكم',
    icon: 'science',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['dashboard-experiments'],
  },
  'advanced-sm-card': {
    id: 'advanced-sm-card',
    component: AdvancedSmCard.component,
    preload: AdvancedSmCard.preload,
    menuLabel: 'Advanced Sm Card',
    menuLabelAr: 'بطاقات صغيرة متطورة',
    icon: 'dashboard_customize',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['advanced-sm-card'],
  },
  'modal-tests': {
    id: 'modal-tests',
    component: ModalTests.component,
    preload: ModalTests.preload,
    menuLabel: 'Modal Tests',
    menuLabelAr: 'اختبار النوافذ',
    icon: 'dialogs',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['modal-tests'],
  },
  'animated-counter-lab': {
    id: 'animated-counter-lab',
    component: AnimatedCounterLab.component,
    preload: AnimatedCounterLab.preload,
    menuLabel: 'Animated Counter Lab',
    menuLabelAr: 'مختبر الأرقام المتحركة',
    icon: 'text_format',
    category: 'test',
    requiredProps: [],
    permission: PERMISSIONS_MAPPING['animated-counter-lab'],
  },
  'scrollbar-lab': {
    id: 'scrollbar-lab',
    component: ScrollbarLab.component,
    preload: ScrollbarLab.preload,
    menuLabel: 'Scrollbar Lab',
    menuLabelAr: 'مختبر شريط التمرير',
    icon: 'science',
    category: 'test',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['scrollbar-lab'],
    layout: 'standard',
  },
  'theme-studio': {
    id: 'theme-studio',
    component: ThemeStudioPage.component,
    preload: ThemeStudioPage.preload,
    menuLabel: 'Theme Studio',
    menuLabelAr: 'استوديو المظهر',
    icon: 'palette',
    category: 'settings',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['theme-studio'],
    layout: 'full-screen',
  },
  'a5-invoice-designer': {
    id: 'a5-invoice-designer',
    component: A5InvoiceDesigner.component,
    preload: A5InvoiceDesigner.preload,
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
    component: FilterDropdownTest.component,
    preload: FilterDropdownTest.preload,
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
    component: EmployeeList.component,
    preload: EmployeeList.preload,
    menuLabel: 'Employee List',
    menuLabelAr: 'قائمة الموظفين',
    icon: 'badge',
    category: 'hr',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['employee-list'],
  },
  'employee-profile': {
    id: 'employee-profile',
    component: EmployeeProfile.component,
    preload: EmployeeProfile.preload,
    menuLabel: 'Employee Profile',
    menuLabelAr: 'ملف الموظف',
    icon: 'id_card',
    category: 'hr',
    requiredProps: ['color', 't', 'language', 'isLoading', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['employee-profile'],
  },
  'active-sessions': {
    id: 'active-sessions',
    component: ActiveSessionsPage.component,
    preload: ActiveSessionsPage.preload,
    menuLabel: 'Active Sessions',
    menuLabelAr: 'الأجهزة المتصلة',
    icon: 'devices',
    category: 'system',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['active-sessions'],
  },
  login: {
    id: 'login',
    component: Login.component,
    preload: Login.preload,
    menuLabel: 'Login',
    menuLabelAr: 'تسجيل الدخول',
    icon: 'lock',
    category: 'system',
    requiredProps: ['color', 't', 'language', 'onViewChange', 'onLoginSuccess'],
    layout: 'auth',
  },
  intelligence: {
    id: 'intelligence',
    component: IntelligenceDashboard.component,
    preload: IntelligenceDashboard.preload,
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
    component: LoginAuditList.component,
    preload: LoginAuditList.preload,
    menuLabel: 'Login Audit',
    menuLabelAr: 'سجل عمليات الدخول',
    icon: 'history',
    category: 'reports',
    requiredProps: ['language'],
    permission: 'reports.view_financial',
  },
  landing: {
    id: 'landing',
    component: LandingPage.component,
    preload: LandingPage.preload,
    menuLabel: 'Welcome',
    menuLabelAr: 'ترحيب',
    icon: 'home',
    category: 'system',
    requiredProps: ['color', 'language', 'darkMode'],
    layout: 'auth',
  },
  'staff-overview': {
    id: 'staff-overview',
    component: StaffOverview.component,
    preload: StaffOverview.preload,
    menuLabel: 'Staff Overview',
    menuLabelAr: 'نظرة عامة على الموظفين',
    icon: 'supervisor_account',
    category: 'hr-dashboard',
    requiredProps: ['color', 't', 'language', 'isLoading', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['staff-overview'],
    layout: 'dashboard',
  },
  'branch-management': {
    id: 'branch-management',
    component: BranchSettings.component,
    preload: BranchSettings.preload,
    menuLabel: 'Branch Management',
    menuLabelAr: 'إدارة الفروع',
    icon: 'domain',
    category: 'pharmacy-configuration',
    requiredProps: ['language', 'color', 'onViewChange'],
    permission: PERMISSIONS_MAPPING['branch-management'],
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
    component: CustomerDensityMap.component,
    preload: CustomerDensityMap.preload,
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
    component: OrganizationManagementPage.component,
    preload: OrganizationManagementPage.preload,
    menuLabel: 'Org Management',
    menuLabelAr: 'إدارة المنظمة',
    icon: 'corporate_fare',
    category: 'settings',
    requiredProps: ['color', 't', 'language', 'currentEmployeeId', 'activeOrgId', 'onViewChange'],
    permission: 'settings.view',
    layout: 'standard',
  },
  services: {
    id: 'services',
    component: PricingPage.component,
    preload: PricingPage.preload,
    menuLabel: 'Services & Pricing',
    menuLabelAr: 'الخدمات والأسعار',
    icon: 'sell',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: 'settings.view',
    layout: 'full-screen',
  },
  'attendance-terminal': {
    id: 'attendance-terminal',
    component: AttendanceTerminal.component,
    preload: AttendanceTerminal.preload,
    menuLabel: 'Mark Attendance',
    menuLabelAr: 'تسجيل الحضور',
    icon: 'touch_app',
    category: 'hr',
    requiredProps: ['language'],
    permission: PERMISSIONS_MAPPING['attendance-terminal'],
  },
  'attendance-reports': {
    id: 'attendance-reports',
    component: AttendanceReports.component,
    preload: AttendanceReports.preload,
    menuLabel: 'Attendance Reports',
    menuLabelAr: 'تقارير الحضور',
    icon: 'assessment',
    category: 'hr',
    requiredProps: ['onViewChange'],
    permission: PERMISSIONS_MAPPING['attendance-reports'],
  },
  'employee-attendance-profile': {
    id: 'employee-attendance-profile',
    component: EmployeeAttendanceProfile.component,
    preload: EmployeeAttendanceProfile.preload,
    menuLabel: 'Employee Attendance',
    menuLabelAr: 'حضور الموظف',
    icon: 'person_check',
    category: 'hr',
    requiredProps: ['onViewChange'],
    permission: PERMISSIONS_MAPPING['employee-attendance-profile'],
  },
  'desktop-settings': {
    id: 'desktop-settings',
    component: DesktopSettings.component,
    preload: DesktopSettings.preload,
    menuLabel: 'Desktop Settings',
    menuLabelAr: 'إعدادات سطح المكتب',
    icon: 'desktop_windows',
    category: 'settings',
    requiredProps: ['color', 't', 'language'],
    permission: PERMISSIONS_MAPPING['desktop-settings'],
    layout: 'standard',
  },
  'browser-settings': {
    id: 'browser-settings',
    component: BrowserPrintSettings.component,
    preload: BrowserPrintSettings.preload,
    menuLabel: 'Print Settings',
    menuLabelAr: 'إعدادات الطباعة',
    icon: 'print',
    category: 'settings',
    requiredProps: ['color', 't', 'language', 'onViewChange'],
    permission: 'settings.view',
    layout: 'standard',
  },
  'profit-loss': {
    id: 'profit-loss',
    component: ProfitLossPage.component,
    preload: ProfitLossPage.preload,
    menuLabel: 'Profit & Loss',
    menuLabelAr: 'الأرباح والخسائر',
    icon: 'analytics',
    category: 'reports',
    requiredProps: ['t', 'language'],
    permission: 'reports.view_financial',
    layout: 'full-bleed',
  },
  'drug-interactions': {
    id: 'drug-interactions',
    component: DrugInteractionsPage.component,
    preload: DrugInteractionsPage.preload,
    menuLabel: 'Drug Interactions',
    menuLabelAr: 'تفاعلات الأدوية',
    icon: 'medication',
    category: 'prescriptions',
    requiredProps: ['t', 'language'],
    permission: PERMISSIONS_MAPPING['drug-interactions'],
    layout: 'full-bleed',
  },
  shortages: {
    id: 'shortages',
    component: ShortagesPage.component,
    preload: ShortagesPage.preload,
    menuLabel: 'Shortages & Predictive Alerts',
    menuLabelAr: 'النواقص والإنذارات التنبؤية',
    icon: 'warning',
    category: 'inventory',
    requiredProps: ['t', 'language', 'onViewChange', 'navigationParams'],
    permission: PERMISSIONS_MAPPING.inventory,
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
