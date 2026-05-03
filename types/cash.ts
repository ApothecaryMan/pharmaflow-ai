/** Type of cash register transaction */
export type CashTransactionType =
  | 'opening'
  | 'sale'
  | 'card_sale'
  | 'in'
  | 'out'
  | 'closing'
  | 'return'
  | 'card_return'
  | 'purchase'
  | 'purchase_return';

/**
 * CashTransaction - individual cash movement record.
 * Tracked within a shift for cash reconciliation.
 */
export interface CashTransaction {
  /** Unique transaction ID */
  id: string;
  /** Branch this transaction belongs to — required for RLS isolation */
  branchId: string;
  /** Shift this transaction belongs to */
  shiftId: string;
  /** Organization this transaction belongs to */
  orgId?: string;
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
  /** Branch this shift belongs to — required for RLS isolation */
  branchId: string;
  /** Organization this shift belongs to */
  orgId?: string;
  /** Branch name for display/receipts */
  branchName?: string;
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
  /** Cash purchases total during this shift (snapshot at close) */
  cashPurchases?: number;
  /** Cash purchase returns total during this shift (snapshot at close) */
  cashPurchaseReturns?: number;
  /** Total discounts granted during this shift (snapshot at close) */
  totalDiscounts?: number;
  /** Number of cash invoices during this shift */
  cashInvoiceCount?: number;
  /** Number of card invoices during this shift */
  cardInvoiceCount?: number;
  /** Shift duration in minutes */
  shiftDurationMinutes?: number;
  /** Sequential handover receipt number (human-readable audit ID) */
  handoverReceiptNumber?: number;
  /** Number of times this shift receipt has been printed */
  printCount?: number;
}
