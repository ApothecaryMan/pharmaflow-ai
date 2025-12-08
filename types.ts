

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
  additionalBarcodes?: string[]; // Multiple barcodes support
  dosageForm?: string; // Tablet, Capsule, Syrup, etc.
  activeIngredients?: string[]; // For formula/composition
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

export interface Customer {
  id: string;
  serialId: number; // Auto-generated serial ID (1, 2, 3...)
  code: string; // Unique, Not Null
  name: string;
  phone: string;
  email?: string;
  // Address Details
  governorate?: string;
  city?: string;
  area?: string;
  streetAddress?: string; // Specific address details
  insuranceProvider?: string;
  policyNumber?: string;
  preferredLocation?: string;
  preferredContact?: 'phone' | 'email' | 'sms';
  chronicConditions?: string[];
  totalPurchases: number; // Total value of purchases
  points: number; // Loyalty points
  lastVisit: string;
  notes?: string;
  status: 'active' | 'inactive';
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
  searchQuery?: string;
  customerCode?: string;
}

export interface PurchaseItem {
  drugId: string;
  name: string;
  quantity: number; // Packs
  costPrice: number; // Cost per pack at time of purchase
  expiryDate?: string;
  dosageForm?: string;
  discount?: number; // Discount percentage
  salePrice?: number; // Selling price (defaults to existing price)
}

export interface Sale {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  subtotal?: number;
  customerName: string;
  customerCode?: string;
  paymentMethod: 'cash' | 'visa';
  saleType?: 'walk-in' | 'delivery';
  deliveryFee?: number;
  globalDiscount: number;
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
  paymentType?: 'cash' | 'credit';
  invoiceId?: string;
  externalInvoiceId?: string;
  returnedQuantities?: Record<string, number>; // Track returned quantities per drugId
}

export interface PurchaseReturnItem {
  drugId: string;
  name: string;
  quantityReturned: number;
  costPrice: number;
  refundAmount: number;
  reason: 'damaged' | 'expired' | 'wrong_item' | 'defective' | 'overage' | 'other';
  condition: 'damaged' | 'expired' | 'other';
}

export interface PurchaseReturn {
  id: string;
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseReturnItem[];
  totalRefund: number;
  status: 'pending' | 'approved' | 'completed';
  notes?: string;
}

export interface ThemeColor {
  name: string;
  primary: string;
  hex: string;
}

// Auto-generated from pageRegistry.ts - no need to manually update!
import { PAGE_REGISTRY } from './pageRegistry';

export type ViewState = keyof typeof PAGE_REGISTRY;

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