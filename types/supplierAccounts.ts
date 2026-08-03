/**
 * Supplier Accounts (AP) types — ledger, statement, aging, payments.
 */

export type SupplierPaymentMethod = 'cash' | 'bank' | 'visa';

export type SupplierLedgerEntryType =
  | 'opening_balance'
  | 'purchase'
  | 'credit_note'
  | 'payment'
  | 'purchase_reversal'
  | 'credit_note_reversal'
  | 'payment_reversal';

export interface SupplierLedgerEntry {
  id: string;
  orgId?: string;
  branchId: string;
  supplierId: string;
  entryType: SupplierLedgerEntryType;
  sourceTable: string;
  sourceId: string;
  date: string;
  amount: number;
  dueDate?: string;
  reversalOf?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface SupplierStatementRow {
  id: string;
  entryDate: string;
  entryType: string;
  sourceTable: string;
  sourceId: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface SupplierAgingRow {
  id: string;
  supplierId: string;
  supplierName: string;
  currentAmount: number;
  due1To30: number;
  due31To60: number;
  due61To90: number;
  dueOver90: number;
  totalOpen: number;
}

export type AgingBucketKey = 'current' | 'due1To30' | 'due31To60' | 'due61To90' | 'dueOver90';

export interface AgingBucket {
  key: AgingBucketKey;
  label: string;
  amount: number;
}

export interface SupplierOpenPayable {
  id: string;
  purchaseId: string;
  invoiceId?: string;
  date: string;
  dueDate?: string;
  totalCost: number;
  openAmount: number;
}

export interface SupplierPaymentAllocation {
  id?: string;
  orgId?: string;
  paymentId?: string;
  purchaseId: string;
  amount: number;
}

export interface SupplierPayment {
  id: string;
  orgId?: string;
  branchId: string;
  serialId?: string;
  supplierId: string;
  date: string;
  amount: number;
  paymentMethod: SupplierPaymentMethod;
  reference?: string;
  notes?: string;
  voidedAt?: string | null;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
  supplierName?: string;
  allocations?: SupplierPaymentAllocation[];
}

export interface RecordSupplierPaymentInput {
  supplierId: string;
  branchId: string;
  orgId?: string;
  amount: number;
  date: string;
  paymentMethod: SupplierPaymentMethod;
  reference?: string;
  notes?: string;
  performedBy?: string;
  performedByName?: string;
  shiftId?: string;
  allocations?: SupplierPaymentAllocation[];
}
