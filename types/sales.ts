import { Drug, BatchAllocation } from './inventory';

/**
 * OrderModification - tracks a single change made to an order.
 * Used in delivery order editing to maintain audit trail.
 */
export interface OrderModification {
  type: 'status_change' | 'item_added' | 'item_removed' | 'quantity_update' | 'price_update' | 'discount_update';
  itemId?: string;
  itemName?: string;
  dosageForm?: string;
  previousValue?: any;
  newValue?: any;
  previousQuantity?: number;
  newQuantity?: number;
  stockReturned?: number;
  stockDeducted?: number;
  previousDiscount?: number;
  newDiscount?: number;
  notes?: string;
}

/**
 * OrderModificationRecord - groups modifications with metadata.
 * Stores who made changes and when for audit purposes.
 */
export interface OrderModificationRecord {
  id: string;
  timestamp: string;
  modifiedBy: string;
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
  /** Base price for a full pack (to ensure consistent price resolution when toggling) */
  basePackPrice?: number;
  /**
   * Tracks which inventory batches were used for this sale.
   * Populated by batchService.allocateStock() during checkout.
   * Used for FEFO (First Expired, First Out) tracking.
   */
  batchAllocations?: BatchAllocation[];
  /**
   * Optional manual override for batch selection.
   * If set, allocation will attempt to take from this batch first.
   */
  preferredBatchId?: string;
}

/**
 * SaleItem — lean representation matching the `sale_items` DB table.
 * Used when persisting to Supabase. CartItem → SaleItem mapping happens at checkout.
 */
export interface SaleItem {
  /** Unique identifier */
  id: string;
  /** Parent sale ID */
  saleId: string;
  /** Drug reference */
  drugId: string;
  /** Drug name snapshot (frozen at sale time for historical accuracy) */
  drugNameSnapshot: string;
  /** Quantity sold */
  quantity: number;
  /** Selling price at time of sale (Public Price) */
  publicPrice: number;
  /** Item-level discount percentage */
  discount?: number;
  /** Whether quantity is in units */
  isUnit?: boolean;
}

/**
 * SaleItemBatch — normalized batch allocation for sale items.
 * Replaces the old `batch_allocations` JSONB field.
 * Maps to the `sale_item_batches` DB table.
 */
export interface SaleItemBatch {
  /** Unique identifier */
  id: string;
  /** Reference to the sale_item */
  saleItemId: string;
  /** Reference to the stock_batch consumed */
  batchId: string;
  /** Quantity taken from this batch */
  quantity: number;
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
  /** Timestamp when first item was added to cart (for accurate processing time) */
  firstItemAt?: number;
  /** Timestamp when tab was closed (for history) */
  closedAt?: number;
}

/**
 * Sale record representing a completed or in-progress transaction.
 * Supports both walk-in and delivery sale types.
 */
export interface Sale {
  id: string;
  /** Sequential, branch-specific human-readable ID (e.g., 100001) */
  serialId?: string;
  /** Branch this sale belongs to — required for RLS isolation */
  branchId: string;
  /** Organization this sale belongs to */
  orgId?: string;
  date: string;
  /** ISO date of last update (essential for statistics timing) */
  updatedAt?: string;
  /** Employee who processed the sale */
  soldByEmployeeId?: string;
  /** Shift ID during which sale occurred */
  shiftId?: string;
  /** Sequential order number for the day (1, 2, 3...) */
  dailyOrderNumber?: number;
  /**
   * Cart items in this sale. Uses CartItem (extends Drug) for frontend display.
   * When persisting to Supabase, map to SaleItem[] via the service layer.
   */
  items: CartItem[];
  total: number;
  subtotal?: number;
  /** Global tax amount */
  tax?: number;
  customerName?: string;
  customerCode?: string;
  customerPhone?: string;
  /** System-selected location (area, city, governorate) */
  customerAddress?: string;
  /** Hand-written detailed street address */
  customerStreetAddress?: string;
  paymentMethod: 'cash' | 'visa' | 'credit';
  saleType?: 'walk-in' | 'delivery';
  deliveryFee?: number;
  /**
   * @computed Total discount calculated as sum of all item discounts.
   * Formula: sum(item.publicPrice * item.quantity * (item.discount/100)) for all items
   */
  globalDiscount?: number;
  /** Optional notes */
  notes?: string;
  /** Optimistic lock version */
  version?: number;
  // ── @computed Return tracking ── (derived from `returns` table, NOT stored in DB)
  /** @computed Quick lookup: has this sale been returned? */
  hasReturns?: boolean;
  /** @computed IDs of associated Return records */
  returnIds?: string[];
  /** @computed Total after deducting returns */
  netTotal?: number;
  /** @computed Maps drugId to total quantity returned */
  itemReturnedQuantities?: Record<string, number>;
  status: 'completed' | 'cancelled' | 'pending' | 'with_delivery' | 'on_way';
  /** Delivery driver assigned to this order */
  deliveryEmployeeId?: string;
  /** Time in minutes from tab creation to checkout completion */
  processingTimeMinutes?: number;
  /** BUG-C1: Idempotency flag — true once shift transaction has been recorded for this sale */
  shiftTransactionRecorded?: boolean;
  /** Audit log of changes made to the order (e.g., items added/removed, status changes) */
  modificationHistory?: OrderModificationRecord[];
}
