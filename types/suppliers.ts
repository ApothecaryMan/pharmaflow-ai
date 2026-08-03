/**
 * Supplier entity - medication/product vendors.
 * Represents companies that supply drugs to the pharmacy.
 */
export interface Supplier {
  /** Unique identifier (UUID) */
  id: string;
  /** Branch this supplier is associated with — required for RLS isolation */
  branchId: string;
  /** Organization this supplier belongs to */
  orgId?: string;
  /** Human-readable unique code (e.g., 'SUP-0001') */
  supplierCode?: string;
  /** Company/supplier name */
  name: string;
  /** Primary contact person name */
  contactPerson: string;
  /** Contact phone number */
  phone: string;
  /** Contact email address */
  email: string;
  // Address Details
  governorate?: string;
  city?: string;
  area?: string;
  address: string; // Specific street address details
  /** ISO date of creation */
  createdAt?: string;
  /** ISO date of last update */
  updatedAt?: string;
  /** Active status */
  status: 'active' | 'inactive';
  /** Opening payable (prior debt owed to supplier) — feeds the ledger */
  openingBalance?: number;
  /** Default payment type for new invoices from this supplier */
  paymentType?: 'cash' | 'credit';
  /** Default credit period in days (due_date = invoice date + this) */
  creditDays?: number;
  /** Optional credit ceiling (alert-only) */
  creditLimit?: number;
  /** Live payable balance — computed via get_supplier_balance, never stored */
  currentBalance?: number;
  /** Whether to show unit price columns in the purchase invoice for this supplier */
  showUnitPrices?: boolean;
}
