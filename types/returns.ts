import { BatchAllocation, ItemCondition } from './inventory';

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

/**
 * ReturnItem - individual item being returned.
 * Tracks quantity, condition, and refund amount.
 */
export interface ReturnItem {
  /** Drug ID being returned */
  drugId: string;
  /** The specific sale item ID (line item) this return refers to */
  saleItemId: string;
  /** Drug name for display */
  name: string;
  /** Quantity being returned (packs or units) */
  quantityReturned: number;
  /** Whether quantity is in units */
  isUnit: boolean;
  /** Public price at time of original sale */
  publicPrice: number;
  /** Actual refund amount per item */
  refundAmount: number;
  /** Reason for this item's return */
  reason?: ReturnReason;
  /** Physical condition of returned item */
  condition: ItemCondition;
  /** Dosage form for display */
  dosageForm?: string;
  /**
   * Optional manual override for batch selection during return.
   * Allows restoring stock to the exact same batches originally sold.
   */
  batchAllocations?: BatchAllocation[];
}

/**
 * Return - customer return/refund record.
 * Linked to original sale for tracking.
 */
export interface Return {
  /** Unique return ID */
  id: string;
  /** Human-readable ID (e.g., RET-0001) */
  serialId?: string;
  /** Branch where return was processed — required for RLS isolation */
  branchId: string;
  /** Organization this return belongs to */
  orgId?: string;
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
