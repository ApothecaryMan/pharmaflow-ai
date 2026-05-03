import { ItemCondition } from './inventory';

/** Status of a purchase order */
export type PurchaseStatus = 'completed' | 'pending' | 'rejected' | 'received' | 'approved';

/**
 * PurchaseItem - item in a purchase order from supplier.
 * Represents drugs being received into inventory.
 */
export interface PurchaseItem {
  /** Unique item identifier in cart */
  id: string;
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
  /** Updated selling price (Public Price / سعر الجمهور) */
  publicPrice: number;
  /** Manual unit selling price */
  unitPrice?: number;
  /** Manual unit cost price */
  unitCostPrice?: number;
  /** Tax amount for this item */
  tax?: number;
  /** Whether quantity is in units (true) or packs (false) */
  isUnit?: boolean;
  /** Units per pack for conversion */
  unitsPerPack?: number;
}

/**
 * Purchase - order from supplier to receive inventory.
 * Creates StockBatches when completed.
 */
export interface Purchase {
  /** Unique purchase ID */
  id: string;
  /** Branch receiving the purchase — required for RLS isolation */
  branchId: string;
  /** Organization this purchase belongs to */
  orgId?: string;
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
  /** Total subtotal before tax/discount */
  subtotal?: number;
  /** Discount amount */
  discount?: number;
  /** Total tax amount */
  totalTax?: number;
  /** Order status */
  status: PurchaseStatus;
  /** Payment method */
  paymentMethod: 'cash' | 'credit';
  /** Internal invoice ID */
  invoiceId?: string;
  /** Supplier's invoice number */
  externalInvoiceId?: string;
  /** Date purchase was approved */
  approvalDate?: string;
  /** Employee who approved */
  approvedBy?: string;
  /** Date purchase was received */
  receivedAt?: string;
  /** Employee who received */
  receivedBy?: string;
  /** ISO date of creation */
  createdAt?: string;
  /** ISO date of last update */
  updatedAt?: string;
  /** Employee ID who created the record */
  createdBy?: string;
  /** Employee name who created the record */
  createdByName?: string;
  /** Optimistic lock version */
  version?: number;
}

/**
 * PurchaseTab - represents an open Purchase invoice draft.
 * Allows multiple concurrent purchase invoices to be managed.
 */
export interface PurchaseTab {
  /** Unique tab identifier */
  id: string;
  /** Branch this tab belongs to */
  branchId?: string;
  /** Display name for the tab (e.g., "Inv 1") */
  name: string;
  /** Items currently in the cart */
  cart: PurchaseItem[];
  /** Associated supplier ID */
  supplierId: string;
  /** Supplier's external invoice number */
  externalInvoiceId: string;
  /** Tax calculation mode */
  taxMode: 'exclusive' | 'inclusive';
  /** Payment method for this purchase */
  paymentMethod: 'cash' | 'credit';
  /** Timestamp when tab was created */
  createdAt: number;
  /** Whether this tab is pinned */
  isPinned?: boolean;
  /** Last search query used in this tab */
  searchQuery?: string;
  /** Timestamp when tab was closed (for history) */
  closedAt?: number;
}

/**
 * PurchaseReturnItem - item being returned to supplier.
 */
export interface PurchaseReturnItem {
  /** Unique item identifier in return list */
  id: string;
  /** Drug ID being returned */
  drugId: string;
  /** Drug name for display */
  name: string;
  /** Quantity being returned */
  quantityReturned: number;
  /** Whether quantity is in units (true) or packs (false) */
  isUnit?: boolean;
  /** Units per pack for conversion */
  unitsPerPack?: number;
  /** Cost price for refund calculation */
  costPrice: number;
  /** Calculated refund amount */
  refundAmount: number;
  /** Dosage form for display */
  dosageForm?: string;
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
  /** Branch making the return — required for RLS isolation */
  branchId: string;
  /** Organization this return belongs to */
  orgId?: string;
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
