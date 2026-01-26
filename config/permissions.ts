export type UserRole = 'admin' | 'manager' | 'pharmacist' | 'cashier' | 'senior_cashier' | 'delivery' | 'officeboy';

export type PermissionAction = 
  // Inventory
  | 'inventory.view'
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
  
  // Purchases
  | 'purchase.view'
  | 'purchase.create'
  | 'purchase.approve'
  | 'purchase.reject'
  
  // Suppliers
  | 'supplier.view'
  | 'supplier.add'
  | 'supplier.update'
  | 'supplier.delete'
  
  // Customers
  | 'customer.view'
  | 'customer.add'
  | 'customer.update'
  | 'customer.delete'
  
  // Shifts
  | 'shift.view'
  | 'shift.open'
  | 'shift.close'
  | 'shift.reports' // View X/Z reports
  
  // Reports & Dashboard
  | 'reports.view_financial'
  | 'reports.view_inventory'
  | 'reports.export'
  
  // Settings & Users
  | 'settings.view'
  | 'settings.update'
  | 'users.view'
  | 'users.manage' // Add/Edit/Delete employees
  | 'backup.manage';

const ALL_PERMISSIONS: PermissionAction[] = [
  'inventory.view', 'inventory.add', 'inventory.update', 'inventory.delete', 'inventory.adjust', 'inventory.approve',
  'sale.create', 'sale.view_history', 'sale.view_details', 'sale.refund', 'sale.modify', 'sale.cancel', 'sale.discount', 'sale.checkout',
  'purchase.view', 'purchase.create', 'purchase.approve', 'purchase.reject',
  'supplier.view', 'supplier.add', 'supplier.update', 'supplier.delete',
  'customer.view', 'customer.add', 'customer.update', 'customer.delete',
  'shift.view', 'shift.open', 'shift.close', 'shift.reports',
  'reports.view_financial', 'reports.view_inventory', 'reports.export',
  'settings.view', 'settings.update', 'users.view', 'users.manage', 'backup.manage',
  'inventory.restock'
];

export const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  admin: [...ALL_PERMISSIONS],
  
  manager: [
    'inventory.view', 'inventory.add', 'inventory.update', 'inventory.delete', 'inventory.adjust', 'inventory.approve',
    'sale.create', 'sale.view_history', 'sale.view_details', 'sale.refund', 'sale.modify', 'sale.cancel', 'sale.discount', 'sale.checkout',
    'purchase.view', 'purchase.create', 'purchase.approve', 'purchase.reject',
    'supplier.view', 'supplier.add', 'supplier.update', 'supplier.delete',
    'customer.view', 'customer.add', 'customer.update', 'customer.delete',
    'shift.view', 'shift.open', 'shift.close', 'shift.reports',
    'reports.view_financial', 'reports.view_inventory', 'reports.export',
    'settings.view', 'users.view' // Manager can view but not manage users/settings deeply
  , 'inventory.restock'],
  
  pharmacist: [
    'inventory.view', 'inventory.add', 'inventory.update', 'inventory.adjust',
    'sale.create', 'sale.view_history', 'sale.view_details', 'sale.discount', 'sale.checkout',
    'purchase.view', 'purchase.create',
    'supplier.view', 'supplier.add',
    'customer.view', 'customer.add', 'customer.update',
    'reports.view_inventory',
    'inventory.restock'
  ],
  
  senior_cashier: [
    'inventory.view',
    'sale.create', 'sale.view_history', 'sale.view_details', 'sale.refund', 'sale.cancel', 'sale.discount', 'sale.checkout',
    'customer.view', 'customer.add', 'customer.update',
    'shift.view', 'shift.open', 'shift.close', 'shift.reports'
  ],
  
  cashier: [
    'inventory.view',
    'sale.create', 'sale.checkout',
    'customer.view', 'customer.add',
    'shift.view'
  ],
  
  delivery: [
    'sale.view_history', 'sale.view_details' // To check delivery orders
  ],
  
  officeboy: []
};

export const canPerformAction = (role: UserRole | undefined | string, action: PermissionAction): boolean => {
  if (!role) return false;
  // Fallback for string roles that might come from older data
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions ? permissions.includes(action) : false;
};
