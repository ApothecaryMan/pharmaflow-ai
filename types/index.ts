/**
 * @fileoverview PharmaFlow-AI Type Definitions
 * 
 * This file contains all TypeScript interfaces and types used throughout
 * the pharmacy management system. Types are organized by domain:
 * 
 * - Inventory: Drug, StockBatch, BatchAllocation
 * - Sales: CartItem, Sale, SaleTab, Return, ReturnItem
 * - Purchases: Purchase, PurchaseItem, PurchaseReturn
 * - People: Customer, Employee, Supplier
 * - Operations: Shift, CashTransaction
 * - Configuration: ThemeColor, ReturnPolicy, Language
 * 
 * @version 2.0.0
 * @author PharmaFlow Team
 */

/**
 * Drug/Medication entity - core inventory item.
 * Represents a sellable medicine with pricing, stock, and metadata.
 */
export interface Drug {
  /** Unique identifier (UUID) */
  id: string;
  /** Branch this drug belongs to (for multi-branch support) */
  branchId?: string;
  /** External database ID (from CSV imports) */
  dbId?: string;
  /** Product name in English */
  name: string;
  /** Product name in Arabic (الاسم عربي) */
  nameArabic?: string;
  /** Generic/scientific name */
  genericName: string;
  /** Category classification */
  category: string;
  /** Selling price per pack */
  price: number;
  /** Purchase/cost price per pack */
  costPrice: number;
  /** Available stock in units */
  stock: number;
  /** Damaged/unsellable stock count */
  damagedStock?: number;
  /** Earliest expiry date (ISO string) */
  expiryDate: string;
  /** Product description */
  description: string;
  /** Primary barcode */
  barcode?: string;
  /** Internal reference code */
  internalCode?: string;
  /** Number of units per pack (for unit sales) */
  unitsPerPack?: number;
  /** Preferred supplier ID */
  supplierId?: string;
  /** Maximum allowed discount percentage */
  maxDiscount?: number;
  /** Additional barcodes for variants */
  additionalBarcodes?: string[];
  /** Dosage form: Tablet, Capsule, Syrup, etc. */
  dosageForm?: string;
  /** Active ingredients/composition */
  activeIngredients?: string[];
  /** Minimum stock alert threshold */
  minStock?: number;
  /** Drug class/category from import */
  class?: string;
  /** Origin: محلي (local) / مستورد (imported) */
  origin?: string;
  /** Item popularity rank (شهرة الصنف) */
  itemRank?: string;
  /** Manufacturer name (الشركة المنتجة) */
  manufacturer?: string;
  /** ISO date of creation */
  createdAt?: string;
  /** ISO date of last update */
  updatedAt?: string;
}

/**
 * Supplier entity - medication/product vendors.
 * Represents companies that supply drugs to the pharmacy.
 */
export interface Supplier {
  /** Unique identifier (UUID) */
  id: string;
  /** Branch this supplier is associated with */
  branchId?: string;
  /** Company/supplier name */
  name: string;
  /** Primary contact person name */
  contactPerson: string;
  /** Contact phone number */
  phone: string;
  /** Contact email address */
  email: string;
  /** Business address */
  address: string;
  /** ISO date of creation */
  createdAt?: string;
  /** ISO date of last update */
  updatedAt?: string;
}

/**
 * Customer entity representing registered customers.
 * - `serialId`: System-generated primary key (internal use only, 1, 2, 3...)
 * - `code`: Customer-facing unique code printed on loyalty cards (e.g., "CUS-001")
 */
export interface Customer {
  id: string;
  branchId?: string;
  /** System-generated primary key (internal, auto-incremented) */
  serialId: number;
  /** Customer-facing code printed on loyalty cards - given to customer */
  code: string;
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
  createdAt?: string; // ISO Date of creation
  vip?: boolean;
}

/**
 * StockBatch - tracks inventory by purchase batch.
 * Enables FEFO (First Expired, First Out) inventory management.
 * Each batch represents a specific purchase with its own expiry date.
 */
export interface StockBatch {
  /** Unique batch identifier */
  id: string;
  /** Drug this batch belongs to */
  drugId: string;
  /** Available quantity in this batch (in units) */
  quantity: number;
  /** Expiry date for this batch (ISO string) */
  expiryDate: string;
  /** Cost per unit at time of purchase */
  costPrice: number;
  /** Reference to the purchase order that created this batch */
  purchaseId?: string;
  /** Date this batch was received (ISO string) */
  dateReceived: string;
  /** Manufacturer's batch number for tracking */
  batchNumber?: string;
}

/**
 * BatchAllocation - tracks which batches were used for a sale.
 * Used to maintain FEFO compliance and enable accurate returns.
 */
export interface BatchAllocation {
  /** Reference to the StockBatch used */
  batchId: string;
  /** Quantity taken from this batch */
  quantity: number;
  /** Expiry date of the allocated batch */
  expiryDate: string;
}

/**
 * OrderModification - tracks a single change made to an order.
 * Used in delivery order editing to maintain audit trail.
 */
export interface OrderModification {
  /** Type of modification performed */
  type: 'quantity_update' | 'item_removed' | 'item_added' | 'discount_update';
  /** Drug ID that was modified */
  itemId: string;
  /** Drug name for display purposes */
  itemName: string;
  /** Dosage form for display (e.g., 'Tablet', 'Capsule') */
  dosageForm?: string;
  /** Quantity before modification */
  previousQuantity?: number;
  /** Quantity after modification (0 means deleted) */
  newQuantity?: number;
  /** Units returned to inventory (for reductions) */
  stockReturned?: number;
  /** Units deducted from inventory (for increases) */
  stockDeducted?: number;
  /** Previous discount percentage (for discount changes) */
  previousDiscount?: number;
  /** New discount percentage (for discount changes) */
  newDiscount?: number;
}

/**
 * OrderModificationRecord - groups modifications with metadata.
 * Stores who made changes and when for audit purposes.
 */
export interface OrderModificationRecord {
  /** Unique record identifier */
  id: string;
  /** ISO timestamp of when modifications were made */
  timestamp: string;
  /** Name of employee who made the modifications */
  modifiedBy?: string;
  /** List of individual modifications in this record */
  modifications: OrderModification[];
}

/**
 * CartItem extends Drug with sale-specific properties.
 * Used in POS cart and stored in Sale.items.
 */
export interface CartItem extends Drug {
  quantity: number;
  /** Item-level discount percentage (0-100) */
  discount?: number;
  /** True if quantity is in units, false/undefined if in packs */
  isUnit?: boolean;
  /** 
   * Tracks which inventory batches were used for this sale.
   * Populated by batchService.allocateStock() during checkout.
   * Used for FEFO (First Expired, First Out) tracking.
   */
  batchAllocations?: BatchAllocation[];
}

/**
 * SaleTab - represents an open POS tab/transaction.
 * Allows multiple concurrent sales to be managed.
 */
export interface SaleTab {
  /** Unique tab identifier */
  id: string;
  /** Branch this tab belongs to */
  branchId?: string;
  /** Display name for the tab */
  name: string;
  /** Items currently in the cart */
  cart: CartItem[];
  /** Customer name for this sale */
  customerName: string;
  /** Tab-level discount percentage */
  discount: number;
  /** Timestamp when tab was created */
  createdAt: number;
  /** Whether this tab is pinned (won't auto-close) */
  isPinned?: boolean;
  /** Last search query used in this tab */
  searchQuery?: string;
  /** Associated customer code */
  customerCode?: string;
}

/**
 * PurchaseItem - item in a purchase order from supplier.
 * Represents drugs being received into inventory.
 */
export interface PurchaseItem {
  /** Drug ID being purchased */
  drugId: string;
  /** Drug name for display */
  name: string;
  /** Quantity (in packs or units based on isUnit) */
  quantity: number;
  /** Cost price per pack/unit at purchase time */
  costPrice: number;
  /** Expiry date for this batch (ISO string) */
  expiryDate?: string;
  /** Dosage form (Tablet, Capsule, etc.) */
  dosageForm?: string;
  /** Supplier discount percentage */
  discount?: number;
  /** Updated selling price (if price changes) */
  salePrice?: number;
  /** Tax amount for this item */
  tax?: number;
  /** Whether quantity is in units (true) or packs (false) */
  isUnit?: boolean;
  /** Units per pack for conversion */
  unitsPerPack?: number;
}

/**
 * Sale record representing a completed or in-progress transaction.
 * Supports both walk-in and delivery sale types.
 */
export interface Sale {
  id: string;
  branchId?: string;
  date: string;
  /** Employee who processed the sale */
  soldByEmployeeId?: string;
  /** Sequential order number for the day (1, 2, 3...) */
  dailyOrderNumber?: number;
  items: CartItem[];
  total: number;
  subtotal?: number;
  customerName: string;
  customerCode?: string;
  customerPhone?: string;
  /** System-selected location (area, city, governorate) */
  customerAddress?: string;
  /** Hand-written detailed street address */
  customerStreetAddress?: string;
  paymentMethod: 'cash' | 'visa';
  saleType?: 'walk-in' | 'delivery';
  deliveryFee?: number;
  /** 
   * @computed Total discount calculated as sum of all item discounts.
   * Formula: sum(item.price * item.quantity * (item.discount/100)) for all items
   */
  globalDiscount?: number;
  // Return tracking
  hasReturns?: boolean;
  returnIds?: string[];
  returnDates?: string[];
  returnDetails?: Array<{
    date: string;
    items: Array<{
      drugId: string;
      name: string;
      quantity: number;
      refundAmount: number;
    }>;
  }>;
  /** Total after deducting returns */
  netTotal?: number;
  /** Maps drugId to total quantity returned */
  itemReturnedQuantities?: Record<string, number>;
  status: 'completed' | 'cancelled' | 'pending' | 'with_delivery' | 'on_way';
  /** Delivery driver assigned to this order */
  deliveryEmployeeId?: string;
  /** 
   * Tracks all modifications made to delivery orders.
   * Each record contains timestamp, modifier, and list of changes.
   * Used for audit trail and order history display.
   */
  modificationHistory?: OrderModificationRecord[];
}

/** Type of return/refund operation */
export type ReturnType = 'full' | 'partial' | 'unit';

/** Reason for product return */
export type ReturnReason = 
  | 'customer_request'
  | 'wrong_item'
  | 'damaged'
  | 'expired'
  | 'defective'
  | 'other';

/** Unified item condition type for returns (both sales and purchases) */
export type ItemCondition = 'sellable' | 'damaged' | 'expired' | 'other';

/**
 * ReturnItem - individual item being returned.
 * Tracks quantity, condition, and refund amount.
 */
export interface ReturnItem {
  /** Drug ID being returned */
  drugId: string;
  /** Drug name for display */
  name: string;
  /** Quantity being returned (packs or units) */
  quantityReturned: number;
  /** Whether quantity is in units */
  isUnit: boolean;
  /** Original selling price */
  originalPrice: number;
  /** Calculated refund amount */
  refundAmount: number;
  /** Reason for this item's return */
  reason?: ReturnReason;
  /** Physical condition of returned item */
  condition: ItemCondition;
  /** Dosage form for display */
  dosageForm?: string;
}

/**
 * Return - customer return/refund record.
 * Linked to original sale for tracking.
 */
export interface Return {
  /** Unique return ID */
  id: string;
  /** Branch where return was processed */
  branchId?: string;
  /** Original sale ID */
  saleId: string;
  /** Date of return (ISO string) */
  date: string;
  /** Type of return operation */
  returnType: ReturnType;
  /** Items being returned */
  items: ReturnItem[];
  /** Total refund amount */
  totalRefund: number;
  /** Primary reason for return */
  reason: ReturnReason;
  /** Additional notes */
  notes?: string;
  /** Employee who processed the return */
  processedBy?: string;
}

/** Status of a purchase order */
export type PurchaseStatus = 'completed' | 'pending' | 'rejected';

/**
 * Purchase - order from supplier to receive inventory.
 * Creates StockBatches when completed.
 */
export interface Purchase {
  /** Unique purchase ID */
  id: string;
  /** Branch receiving the purchase */
  branchId?: string;
  /** Purchase date (ISO string) */
  date: string;
  /** Supplier ID */
  supplierId: string;
  /** Supplier name for display */
  supplierName: string;
  /** Items in this purchase */
  items: PurchaseItem[];
  /** Total cost of purchase */
  totalCost: number;
  /** Total tax amount */
  totalTax?: number;
  /** Order status */
  status: PurchaseStatus;
  /** Payment method */
  paymentType?: 'cash' | 'credit';
  /** Internal invoice ID */
  invoiceId?: string;
  /** Supplier's invoice number */
  externalInvoiceId?: string;
  /** Track returned quantities per drugId */
  returnedQuantities?: Record<string, number>;
  /** Date purchase was approved */
  approvalDate?: string;
  /** Employee who approved */
  approvedBy?: string;
  /** ISO date of creation */
  createdAt?: string;
  /** ISO date of last update */
  updatedAt?: string;
}

/**
 * PurchaseReturnItem - item being returned to supplier.
 */
export interface PurchaseReturnItem {
  /** Drug ID being returned */
  drugId: string;
  /** Drug name for display */
  name: string;
  /** Quantity being returned */
  quantityReturned: number;
  /** Cost price for refund calculation */
  costPrice: number;
  /** Calculated refund amount */
  refundAmount: number;
  /** Reason for return */
  reason: 'damaged' | 'expired' | 'wrong_item' | 'defective' | 'overage' | 'other';
  /** Physical condition of items */
  condition: ItemCondition;
}

/**
 * PurchaseReturn - record of items returned to supplier.
 */
export interface PurchaseReturn {
  /** Unique return ID */
  id: string;
  /** Branch making the return */
  branchId?: string;
  /** Original purchase ID */
  purchaseId: string;
  /** Supplier ID */
  supplierId: string;
  /** Supplier name for display */
  supplierName: string;
  /** Return date (ISO string) */
  date: string;
  /** Items being returned */
  items: PurchaseReturnItem[];
  /** Total refund amount */
  totalRefund: number;
  /** Return status */
  status: 'pending' | 'approved' | 'completed';
  /** Additional notes */
  notes?: string;
}

/** UI theme color configuration */
export interface ThemeColor {
  /** Color name for display */
  name: string;
  /** Primary color Tailwind class */
  primary: string;
  /** Hex color value */
  hex: string;
}

// Auto-generated from pageRegistry.ts - no need to manually update!
// Broken circular dependency
// import { PAGE_REGISTRY } from './pageRegistry';

/** Current view state - used for page routing */
export type ViewState = string;

/** Application language setting */
export type Language = 'EN' | 'AR';

/** Dashboard widget expand options */
export type ExpandedView = 'revenue' | 'expenses' | 'profit' | 'lowStock' | 'salesChart' | 'topSelling' | 'expiring' | 'recentSales' | null;

/** Date range filter for reports */
export interface DateRange {
  /** Start date (ISO string) */
  start: string;
  /** End date (ISO string) */
  end: string;
}

/** Export file format options */
export type ExportFormat = 'csv' | 'json' | 'image';

/** Chart time grouping options */
export type ChartViewMode = 'daily' | 'weekly' | 'monthly';

/** Sort field options for lists */
export type SortOption = 'name' | 'quantity' | 'revenue' | 'date' | 'stock' | 'expiry' | 'amount';

/**
 * ReturnPolicy - configurable return/refund rules.
 * Determines what returns are allowed and under what conditions.
 */
export interface ReturnPolicy {
  /** Days after purchase when returns are allowed (default: 30) */
  returnWindowDays: number;
  /** Allow returns of expired items (default: false) */
  allowExpiredReturns: boolean;
  /** Allow returns of damaged items (default: true) */
  allowDamagedReturns: boolean;
  /** Percentage deducted as restocking fee (default: 0) */
  restockingFeePercent: number;
  /** Require manager approval for returns (default: false) */
  requireManagerApproval: boolean;
  /** Threshold above which manager approval is required (default: 1000) */
  managerApprovalThreshold: number;
}

/** Type of cash register transaction */
export type CashTransactionType = 'opening' | 'sale' | 'card_sale' | 'in' | 'out' | 'closing' | 'return';

/**
 * CashTransaction - individual cash movement record.
 * Tracked within a shift for cash reconciliation.
 */
export interface CashTransaction {
  /** Unique transaction ID */
  id: string;
  /** Shift this transaction belongs to */
  shiftId: string;
  /** Time of transaction (ISO string) */
  time: string;
  /** Type of cash movement */
  type: CashTransactionType;
  /** Amount (positive or negative) */
  amount: number;
  /** Reason for cash in/out */
  reason?: string;
  /** Employee who made the transaction */
  userId: string;
  /** Related sale ID (for sale transactions) */
  relatedSaleId?: string;
}

/**
 * Shift - cash register work session.
 * Tracks all cash movements from open to close.
 */
export interface Shift {
  /** Unique shift ID */
  id: string;
  /** Branch this shift belongs to */
  branchId?: string;
  /** Current shift status */
  status: 'open' | 'closed';
  /** Shift open time (ISO string) */
  openTime: string;
  /** Shift close time (ISO string) */
  closeTime?: string;
  /** Employee who opened the shift */
  openedBy: string;
  /** Employee who closed the shift */
  closedBy?: string;
  /** Cash counted at shift start */
  openingBalance: number;
  /** Cash counted at shift end */
  closingBalance?: number;
  /** System-calculated expected closing balance */
  expectedBalance?: number;
  /** Total cash added during shift */
  cashIn: number;
  /** Total cash removed during shift */
  cashOut: number;
  /** Total cash sales amount */
  cashSales: number;
  /** Total card/visa sales amount */
  cardSales: number;
  /** Total returns amount during shift */
  returns: number;
  /** All transactions in this shift */
  transactions: CashTransaction[];
  /** Shift notes */
  notes?: string;
}

export interface Employee {
  // --- Identification ---
  id: string;              // Unique UUID
  branchId?: string;
  employeeCode: string;    // Auto-generated: EMP-001, EMP-002, etc.
  
  // --- Personal Info ---
  name: string;            // Full name (English)
  phone: string;           // Required, validated by SmartPhoneInput
  email?: string;          // Optional, validated by SmartEmailInput
  
  // --- Employment Details ---
  position: string;        // Job title (e.g., "Senior Pharmacist")
  department: 'sales' | 'pharmacy' | 'marketing' | 'hr' | 'it';  // Department
  role: 'pharmacist' | 'cashier' | 'manager' | 'delivery' | 'officeboy';      // System role
  startDate: string;       // ISO date (YYYY-MM-DD)
  status: 'active' | 'inactive' | 'holiday';  // Employment status
  
  // --- Financial (Optional) ---
  salary?: number;         // Monthly salary
  
  // --- Additional ---
  notes?: string;          // Free text notes
  
  // --- Auth ---
  username?: string;       // Login Username
  /** 
   * @security CRITICAL: This field stores login password.
   * In production, this MUST be hashed using bcrypt or similar.
   * Never store or transmit plain text passwords.
   * Consider using a separate AuthCredentials table with proper encryption.
   */
  password?: string;
  
  // --- Profile ---
  image?: string;          // Base64 encoded profile image
  
  // --- Documents ---
  nationalIdCard?: string;      // Base64 encoded National ID Card (البطاقة الشخصية)
  nationalIdCardBack?: string;  // Base64 encoded National ID Card Back Side
  mainSyndicateCard?: string;   // Base64 encoded Main Syndicate Card (كارنية النقابة الرئيسية)
  subSyndicateCard?: string;    // Base64 encoded Sub Syndicate Card (كارنية النقابة الفرعية)
}