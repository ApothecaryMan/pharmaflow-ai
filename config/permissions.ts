export type UserRole = 'admin' | 'pharmacist_owner' | 'pharmacist_manager' | 'pharmacist' | 'inventory_officer' | 'assistant' | 'hr_manager' | 'cashier' | 'senior_cashier' | 'delivery' | 'delivery_pharmacist' | 'officeboy' | 'manager';

export type PermissionAction = 
  // Inventory
  | 'inventory.view'
  | 'inventory.view_beta'
  | 'inventory.add'
  | 'inventory.update'
  | 'inventory.delete'
  | 'inventory.adjust' // Manual stock adjustment
  | 'inventory.approve' // Approve stock adjustments
  | 'inventory.restock' // Quick restock/adjust in UI
  
  // Sales
  | 'sale.create'
  | 'sale.view_history' // View basic sales list
  | 'sale.view_details' // View detailed sale info
  | 'sale.refund'       // Process return/refund
  | 'sale.modify'       // Modify delivery orders
  | 'sale.cancel'       // Cancel pending/completed sales
  | 'sale.discount'     // Apply discounts
  | 'sale.checkout'     // Finalize walk-in sales
  | 'sale.view_assigned_only' // Restrict view to assigned delivery orders
  
  // Purchases
  | 'purchase.view'
  | 'purchase.create'
  | 'purchase.approve'
  | 'purchase.reject'
  | 'purchase.return'
  
  // Suppliers
  | 'supplier.view'
  | 'supplier.add'
  | 'supplier.update'
  | 'supplier.delete'
  
  // Customers
  | 'customer.view'
  | 'customer.view_loyalty'
  | 'customer.add'
  | 'customer.update'
  | 'customer.delete'
  
  // Shifts
  | 'shift.view'
  | 'shift.view_history'
  | 'shift.open'
  | 'shift.close'
  | 'shift.reports' // View X/Z reports
  | 'shift.view_expected_balance' // See expected balance (Blind closing override)
  | 'shift.cash_in' // Add cash manually
  | 'shift.cash_out' // Remove cash manually
  
  // Reports & Dashboard
  | 'dashboard.view'
  | 'reports.view_financial'
  | 'reports.view_inventory'
  | 'reports.view_intelligence'
  | 'reports.export'
  
  // Settings & Users
  | 'settings.view'
  | 'settings.update'
  | 'users.view'
  | 'users.manage' // Add/Edit/Delete employees
  | 'backup.manage'
  | 'system.debug';

const ALL_PERMISSIONS: PermissionAction[] = [
  'inventory.view', 'inventory.view_beta', 'inventory.add', 'inventory.update', 'inventory.delete', 'inventory.adjust', 'inventory.approve',
  'sale.create', 'sale.view_history', 'sale.view_details', 'sale.refund', 'sale.modify', 'sale.cancel', 'sale.discount', 'sale.checkout',
  'purchase.view', 'purchase.create', 'purchase.approve', 'purchase.reject', 'purchase.return',
  'supplier.view', 'supplier.add', 'supplier.update', 'supplier.delete',
  'customer.view', 'customer.view_loyalty', 'customer.add', 'customer.update', 'customer.delete',
  'shift.view', 'shift.view_history', 'shift.open', 'shift.close', 'shift.reports', 'shift.view_expected_balance', 'shift.cash_in', 'shift.cash_out',
  'dashboard.view', 'reports.view_financial', 'reports.view_inventory', 'reports.view_intelligence', 'reports.export',
  'settings.view', 'settings.update', 'users.view', 'users.manage', 'backup.manage', 'system.debug',
  'inventory.restock'
];

export const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  admin: [...ALL_PERMISSIONS], // Absolute Power (Including IT/System)

  // --- Pharmacy Roles ---
  pharmacist_owner: [
    // Full Business Access, NO System/IT access
    'dashboard.view',
    'inventory.view', 'inventory.add', 'inventory.update', 'inventory.delete', 'inventory.adjust', 'inventory.approve', 'inventory.restock',
    'sale.create', 'sale.view_history', 'sale.view_details', 'sale.refund', 'sale.modify', 'sale.cancel', 'sale.discount', 'sale.checkout',
    'purchase.view', 'purchase.create', 'purchase.approve', 'purchase.reject', 'purchase.return',
    'supplier.view', 'supplier.add', 'supplier.update', 'supplier.delete',
    'customer.view', 'customer.view_loyalty', 'customer.add', 'customer.update', 'customer.delete',
    'shift.view', 'shift.view_history', 'shift.open', 'shift.close', 'shift.reports', 'shift.cash_in', 'shift.cash_out',
    'reports.view_financial', 'reports.view_inventory', 'reports.view_intelligence', 'reports.export',
    'settings.view', 'users.view', 'users.manage', // Can manage staff
    'shift.view_expected_balance'
  ],

  pharmacist_manager: [
    // Operations Lead
    'dashboard.view',
    'inventory.view', 'inventory.add', 'inventory.update', 'inventory.adjust', 'inventory.approve', 'inventory.restock',
    'sale.create', 'sale.view_history', 'sale.view_details', 'sale.refund', 'sale.modify', 'sale.cancel', 'sale.discount', 'sale.checkout',
    'purchase.view', 'purchase.create', 'purchase.approve', 'purchase.reject', 'purchase.return',
    'supplier.view', 'supplier.add', 'supplier.update',
    'customer.view', 'customer.view_loyalty', 'customer.add', 'customer.update',
    'shift.view', 'shift.view_history', 'shift.open', 'shift.close', 'shift.reports', 'shift.cash_in', 'shift.cash_out',
    'reports.view_inventory', // No financial reports
    'users.view', // Can view staff but not manage accounts directly (unless given 'users.manage' specifically)
    'shift.view_expected_balance'
  ],

  pharmacist: [
    // Standard Pharmacist (Dispensing)
    'dashboard.view',
    'inventory.view', 'inventory.add', 'inventory.update', 'inventory.restock',
    'sale.create', 'sale.view_history', 'sale.view_details', 'sale.discount', 'sale.checkout', 'sale.refund',
    'purchase.view', 'purchase.create',
    'customer.view', 'customer.add', 'customer.update',
    'shift.view', 'shift.view_history', 'shift.open', 'shift.close', 'shift.reports', // Can open/close/history/reports
    'shift.cash_out', // Can Withdraw/Remove Cash
    // NO CASH IN
    // NO REPORTS
  ],

  inventory_officer: [
    // Stock Keeper (No Sales)
    'inventory.view', 'inventory.add', 'inventory.update', 'inventory.adjust', 'inventory.restock',
    'purchase.view', 'purchase.create', 'purchase.return',
    'supplier.view', 'supplier.add', 'supplier.update',
    'reports.view_inventory'
  ],

  assistant: [
    // Helper
    'inventory.view', 'inventory.restock',
    'sale.create', // Can create cart, maybe needs checkout approval? Giving create for now.
    'customer.view', 'customer.add'
  ],

  delivery_pharmacist: [
    // Home Care
    'sale.view_history', 'sale.view_details', 'sale.create', 'sale.checkout',
    'customer.view', 'customer.add', 'customer.update'
  ],

  // --- Sales Dept ---
  senior_cashier: [
    'dashboard.view',
    'inventory.view',
    'sale.create', 'sale.view_history', 'sale.view_details', 'sale.refund', 'sale.cancel', 'sale.discount', 'sale.checkout',
    'customer.view', 'customer.view_loyalty', 'customer.add', 'customer.update',
    'shift.view', 'shift.open', 'shift.close', 'shift.reports', 'shift.cash_in', 'shift.cash_out'
  ],
  
  cashier: [
    'dashboard.view',
    'inventory.view',
    'sale.create', 'sale.checkout', 'sale.refund',
    'customer.view', 'customer.add',
  ],

  // --- Other ---
  manager: [ // Generic Branch Manager (if used outside Pharmacy context)
    'inventory.view', 'inventory.approve',
    'sale.view_history', 'sale.view_details', 'sale.refund', 'sale.cancel',
    'shift.view', 'shift.open', 'shift.close', 'shift.reports', 'shift.cash_in', 'shift.cash_out',
    'reports.view_financial', 'reports.view_inventory', 'reports.export',
    'users.view',
    'shift.view_expected_balance'
  ],

  hr_manager: [
    'users.view', 'users.manage',
    'settings.view' // View settings but maybe not change them
  ],
  
  delivery: [
    'sale.view_history', 'sale.view_details', 'sale.view_assigned_only' // To check delivery orders
  ],
  
  officeboy: []
};

export const canPerformAction = (role: UserRole | undefined | string, action: PermissionAction): boolean => {
  if (!role) return false;
  // Fallback for string roles that might come from older data
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions ? permissions.includes(action) : false;
};
