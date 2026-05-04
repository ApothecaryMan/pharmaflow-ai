/**
 * GlobalDrug - Master catalog entry shared across all branches.
 * Contains standard data like name, ingredients, and public price.
 */
export interface GlobalDrug {
  id: string;
  name: string;
  nameAr?: string;
  activeSubstance?: string;
  /** International Barcode (Global) */
  barcode?: string;
  category?: string;
  publicPrice?: number;
  manufacturer?: string;
  dosageForm?: string;
  updatedAt: string;
}

/**
 * GroupingKey - Canonical identity key for a product group.
 * Format: `barcode || (name|dosageForm|manufacturer)`
 */
export type GroupingKey = string;

/**
 * GroupedDrug - Represents a virtual collection of batches for the same drug.
 * Used in Inventory and POS to display a single row for multiple batches.
 */
export interface GroupedDrug extends Drug {
  /** Canonical grouping key for this product */
  groupId: GroupingKey;
  /** Total aggregate stock across all batches in the group (in units) */
  totalStock: number;
  /** All batches belonging to this group, sorted by FEFO (earliest expiry first) */
  batches: Drug[];
}

/**
 * Drug/Medication entity - core inventory item.
 * Represents a sellable medicine with pricing, stock, and metadata.
 */
export interface Drug {
  /** Unique identifier (UUID) */
  id: string;
  /** Link to global catalog entry */
  globalDrugId?: string;
  /** Branch this drug belongs to — required for RLS isolation */
  branchId?: string;
  /** Organization this drug belongs to */
  orgId?: string;
  /** Product name in English */
  name: string;
  /** Product name in Arabic (الاسم عربي) */
  nameAr?: string;
  /** Generic/scientific name */
  genericName: string[];
  /** Category classification */
  category: string;
  /** Selling price per pack (Public Price / سعر الجمهور) */
  publicPrice: number;
  /** Selling price per unit (strip/tablet) - Manual entry to avoid division errors */
  unitPrice?: number;
  /** Purchase/cost price per pack */
  costPrice: number;
  /** Purchase/cost price per unit (strip/tablet) */
  unitCostPrice?: number;
  /** Available stock in units */
  stock: number;
  /** Damaged/unsellable stock count */
  damagedStock?: number;
  /** Earliest expiry date (ISO string) */
  expiryDate: string;
  /** International Barcode (Primary Global Code) */
  barcode?: string;
  /** Internal Barcode (System-generated Sequential Code) */
  internalCode?: string;
  /** Number of units per pack (for unit sales) */
  unitsPerPack?: number;
  /** Preferred supplier ID */
  supplierId?: string;
  /** Maximum allowed discount percentage */
  maxDiscount?: number;
  /** Dosage form: Tablet, Capsule, Syrup, etc. */
  dosageForm?: string;
  /** Minimum stock alert threshold */
  minStock?: number;
  /** Origin: محلي (local) / مستورد (imported) */
  origin?: string;
  /** Manufacturer name (الشركة المنتجة) */
  manufacturer?: string;
  /** Value Added Tax percentage (VAT %) */
  tax?: number;
  /** Drug status for restock alerts */
  status?: 'active' | 'inactive' | 'discontinued';
  /** Additional product description/notes */
  description?: string;
  /** Secondary barcodes for the same product */
  additionalBarcodes?: string[];
  /** Item classification/rank for prioritization */
  itemRank?: string;
  /** Legacy database ID from CSV/migration */
  dbId?: string;
  batches?: Drug[];
  /** Product class/grouping */
  class?: string;
  /** ISO date of creation */
  createdAt?: string;
  /** ISO date of last update */
  updatedAt?: string;
}

/**
 * StockBatch - tracks inventory by purchase batch.
 * Enables FEFO (First Expired, First Out) inventory management.
 * Each batch represents a specific purchase with its own expiry date.
 */
export interface StockBatch {
  /** Unique batch identifier */
  id: string;
  /** Branch this batch belongs to — required for RLS isolation */
  branchId: string;
  /** Organization this batch belongs to */
  orgId?: string;
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
  /** Optimistic lock version to catch concurrent modifications (default: 1) */
  version: number;
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
  /** Manufacturer's batch number for tracking */
  batchNumber?: string;
}

/** Types for inventory movements */
export type StockMovementType =
  | 'initial' // Initial stock entry
  | 'sale' // Sold to customer
  | 'purchase' // Received from supplier
  | 'return_customer' // Returned by customer
  | 'return_supplier' // Returned to supplier
  | 'adjustment' // Manual adjustment (inventory count)
  | 'damage' // Damaged/Expired
  | 'transfer_in' // Transfer from another branch
  | 'transfer_out' // Transfer to another branch
  | 'correction'; // Data correction

/** Unified item condition type for returns (both sales and purchases) */
export type ItemCondition = 'sellable' | 'damaged' | 'expired' | 'other';

export interface StockMovement {
  id: string;
  drugId: string;
  drugName: string; // Snapshot name
  branchId: string;
  orgId?: string;

  type: StockMovementType;
  quantity: number; // Positive for add, Negative for remove

  previousStock: number;
  newStock: number;

  /** Snapshot of pack selling price at movement time (Public Price) */
  publicPrice?: number;
  /** Snapshot of unit selling price at movement time */
  unitPrice?: number;
  /** Snapshot of pack cost price at movement time */
  costPrice?: number;
  /** Snapshot of unit cost price at movement time */
  unitCostPrice?: number;

  reason?: string;
  notes?: string;

  referenceId?: string; // ID of Sale, Purchase, Return, etc.
  transactionId?: string; // Grouping ID for bulk adjustments
  batchId?: string; // If using batch tracking

  performedBy: string; // User ID
  performedByName?: string; // User Name Snapshot
  timestamp: string; // ISO Date

  // Approval Workflow
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  expiryDate?: string; // Optional: snapshot of expiry
}

export * from '../services/inventory/stockMovement/types';
