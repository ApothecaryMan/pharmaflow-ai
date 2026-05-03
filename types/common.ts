/** UI theme color configuration */
export interface ThemeColor {
  /** Color name for display */
  name: string;
  /** Primary color Tailwind class */
  primary: string;
  /** Hex color value */
  hex: string;
}

/** Supported UI languages */
export type Language = 'EN' | 'AR';

/** Current view state - used for page routing */
export type ViewState =
  | 'dashboard'
  | 'inventory'
  | 'stock-movement'
  | 'expiry-calendar'
  | 'inventory-beta'
  | 'pos'
  | 'sales-history'
  | 'return-history'
  | 'purchase-history'
  | 'suppliers'
  | 'purchases'
  | 'pending-approval'
  | 'purchase-returns'
  | 'barcode-printer'
  | 'barcode-studio'
  | 'customers'
  | 'customer-overview'
  | 'customer-history'
  | 'medicine-search'
  | 'loyalty-overview'
  | 'loyalty-lookup'
  | 'real-time-sales'
  | 'add-product'
  | 'cash-register'
  | 'shift-history'
  | 'stock-adjustment'
  | 'receipt-designer'
  | 'dashboard-experiments'
  | 'purchases-test'
  | 'pos-test'
  | 'modal-tests'
  | 'advanced-sm-card'
  | 'medicine-search'
  | 'org-settings'
  | 'login-test'
  | 'branch-management'
  | 'org-management'
  | 'intelligence'
  | 'landing'
  | 'employee-list'
  | 'employee-profile'
  | 'login'
  | 'intelligence'
  | 'login-audit'
  | 'landing'
  | 'staff-overview'
  | 'branch-management'
  | 'medicine-search'
  | 'customer-density-map'
  | 'services'
  | 'org-management';

/** Dashboard widget expand options */
export type ExpandedView =
  | 'revenue'
  | 'expenses'
  | 'profit'
  | 'lowStock'
  | 'salesChart'
  | 'topSelling'
  | 'expiring'
  | 'recentSales'
  | null;

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
 * AuditLog — tracks system actions for compliance and debugging.
 * Maps to the `audit_logs` DB table.
 */
export interface AuditLog {
  /** Unique identifier */
  id: string;
  /** Branch where action occurred */
  branchId: string;
  /** Employee who performed the action */
  actorId?: string;
  /** Action identifier (e.g., 'sale.complete', 'inventory.add') */
  action: string;
  /** Entity type (e.g., 'drug', 'sale', 'employee') */
  entityType?: string;
  /** Entity ID affected */
  entityId?: string;
  /** Human-readable details */
  details?: string;
  /** ISO timestamp */
  timestamp: string;
}
