/**
 * Types for Stock Movement Service
 */

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

export interface StockMovement {
  id: string;
  drugId: string;
  drugName: string; // Snapshot name
  branchId: string;

  type: StockMovementType;
  quantity: number; // Positive for add, Negative for remove

  previousStock: number;
  newStock: number;

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

export interface StockMovementFilters {
  drugId?: string;
  type?: StockMovementType;
  startDate?: string;
  endDate?: string;
  performedBy?: string;
  branchId?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface StockMovementService {
  getAll: () => Promise<StockMovement[]>;
  getByDrugId: (drugId: string) => Promise<StockMovement[]>;
  logMovement: (movement: Omit<StockMovement, 'id' | 'timestamp'>) => Promise<StockMovement>;
  getHistory: (filters: StockMovementFilters) => Promise<StockMovement[]>;
  approveMovement: (id: string, userId: string) => Promise<void>;
  rejectMovement: (id: string, userId: string) => Promise<void>;
}
