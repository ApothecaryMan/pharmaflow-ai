

export interface Drug {
  id: string;
  name: string;
  genericName: string;
  category: string;
  price: number;
  costPrice: number; // New: Buying price
  stock: number;
  damagedStock?: number; // Damaged/unsellable stock
  expiryDate: string;
  description: string;
  barcode?: string;
  internalCode?: string;
  unitsPerPack?: number;
  supplierId?: string; // Preferred supplier
  maxDiscount?: number; // Maximum allowed discount percentage
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

export interface CartItem extends Drug {
  quantity: number;
  discount?: number;
  isUnit?: boolean;
}

export interface SaleTab {
  id: string;
  name: string;
  cart: CartItem[];
  customerName: string;
  discount: number;
  createdAt: number;
  isPinned?: boolean; // For pinning tabs
}

export interface PurchaseItem {
  drugId: string;
  name: string;
  quantity: number; // Packs
  costPrice: number; // Cost per pack at time of purchase
  expiryDate?: string;
}

export interface Sale {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  subtotal?: number;
  customerName?: string;
  globalDiscount?: number;
  // Return tracking
  hasReturns?: boolean;
  returnIds?: string[];
  netTotal?: number; // Total after returns
  itemReturnedQuantities?: Record<string, number>; // drugId -> quantity returned
}

// Return/Refund System Types
export type ReturnType = 'full' | 'partial' | 'unit';

export type ReturnReason = 
  | 'customer_request'
  | 'wrong_item'
  | 'damaged'
  | 'expired'
  | 'defective'
  | 'other';

export interface ReturnItem {
  drugId: string;
  name: string;
  quantityReturned: number; // Packs or units
  isUnit: boolean;
  originalPrice: number;
  refundAmount: number;
  reason?: ReturnReason;
  condition: 'sellable' | 'damaged' | 'expired'; // Item condition
}

export interface Return {
  id: string;
  saleId: string;
  date: string;
  returnType: ReturnType;
  items: ReturnItem[];
  totalRefund: number;
  reason: ReturnReason;
  notes?: string;
  processedBy?: string;
}


export interface Purchase {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalCost: number;
  status: 'completed' | 'pending';
}

export interface ThemeColor {
  name: string;
  primary: string;
  hex: string;
}

export type ViewState = 'dashboard' | 'inventory' | 'pos' | 'sales-history' | 'suppliers' | 'purchases' | 'barcode-studio';

export type Language = 'EN' | 'AR';

// Dashboard Expand Functionality Types
export type ExpandedView = 'revenue' | 'expenses' | 'profit' | 'lowStock' | 'salesChart' | 'topSelling' | 'expiring' | 'recentSales' | null;

export interface DateRange {
  start: string;
  end: string;
}

export type ExportFormat = 'csv' | 'json' | 'image';

export type ChartViewMode = 'daily' | 'weekly' | 'monthly';

export type SortOption = 'name' | 'quantity' | 'revenue' | 'date' | 'stock' | 'expiry' | 'amount';

// Return Policy Configuration
export interface ReturnPolicy {
  returnWindowDays: number; // Default: 30
  allowExpiredReturns: boolean; // Default: false
  allowDamagedReturns: boolean; // Default: true
  restockingFeePercent: number; // Default: 0
  requireManagerApproval: boolean; // Default: false
  managerApprovalThreshold: number; // Default: 1000
}