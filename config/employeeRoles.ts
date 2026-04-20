/**
 * Core Role Definitions (The Single Source of Truth)
 */
const ROLE_DEFINITIONS = {

  pharmacist_owner: { 
    translationKey: 'pharmacist_owner',
    defaultLabelEN: 'Pharmacy Owner',
    defaultLabelAR: 'مالك الصيدلية'
  },
  admin: { 
    translationKey: 'admin',
    defaultLabelEN: 'System Admin',
    defaultLabelAR: 'System Admin'
  },
  pharmacist_manager: { 
    translationKey: 'pharmacist_manager',
    defaultLabelEN: 'Pharmacist Manager',
    defaultLabelAR: 'صيدلي مدير'
  },
  pharmacist: { 
    translationKey: 'pharmacist',
    defaultLabelEN: 'Pharmacist',
    defaultLabelAR: 'صيدلي' 
  },
  inventory_officer: { 
    translationKey: 'inventory_officer',
    defaultLabelEN: 'Inventory Officer',
    defaultLabelAR: 'مسؤول مخزن'
  },
  assistant: { 
    translationKey: 'assistant',
    defaultLabelEN: 'Assistant',
    defaultLabelAR: 'مساعد صيدلي'
  },
  hr_manager: { 
    translationKey: 'hr_manager',
    defaultLabelEN: 'HR Manager',
    defaultLabelAR: 'مدير موارد بشرية'
  },
  cashier: { 
    translationKey: 'cashier',
    defaultLabelEN: 'Cashier',
    defaultLabelAR: 'كاشير'
  },
  senior_cashier: { 
    translationKey: 'senior_cashier',
    defaultLabelEN: 'Senior Cashier',
    defaultLabelAR: 'كاشير رئيسي'
  },
  delivery: { 
    translationKey: 'delivery',
    defaultLabelEN: 'Delivery',
    defaultLabelAR: 'طيار'
  },
  delivery_pharmacist: { 
    translationKey: 'delivery_pharmacist',
    defaultLabelEN: 'Home-Care Pharmacist',
    defaultLabelAR: 'صيدلي رعاية منزلية'
  },
  officeboy: { 
    translationKey: 'officeboy',
    defaultLabelEN: 'Office Boy',
    defaultLabelAR: 'عامل بوفيه'
  },
  manager: { 
    translationKey: 'manager',
    defaultLabelEN: 'General Manager',
    defaultLabelAR: 'مدير عام'
  },
} as const;

/**
 * Derived Types & Constants
 */
export type UserRole = keyof typeof ROLE_DEFINITIONS;

export interface SystemRoleConfig {
  id: UserRole;
  translationKey: string;
  defaultLabelEN: string;
  defaultLabelAR: string;
}

/**
 * Array export for UI iteration (Derived)
 */
export const SYSTEM_ROLES: SystemRoleConfig[] = Object.entries(ROLE_DEFINITIONS).map(
  ([id, config]) => ({
    id: id as UserRole,
    ...config
  })
);

/**
 * Mapping of departments to valid functional roles
 */
export const DEPARTMENT_ROLES: Record<string, UserRole[]> = {
  pharmacy: [
    'pharmacist_owner',
    'pharmacist_manager',
    'pharmacist',
    'assistant',
    'inventory_officer',
    'senior_cashier',
    'officeboy',
  ],
  sales: ['cashier', 'senior_cashier'],
  marketing: ['manager', 'officeboy'],
  hr: ['hr_manager'],
  it: ['admin'],
  logistics: ['delivery', 'delivery_pharmacist'],
};

/**
 * Utility: Get typed translation label
 */
export const getRoleLabel = (roleId: string, tRoles: any): string => {
  if (roleId in tRoles) return tRoles[roleId as keyof typeof tRoles];
  
  // Fallback to config labels if i18n key missing
  const config = ROLE_DEFINITIONS[roleId as UserRole];
  return config ? config.defaultLabelEN : roleId;
};

/**
 * Utility: Get list of roles for a department
 */
export const getRolesForDepartment = (departmentId: string): SystemRoleConfig[] => {
  const validRoleIds = DEPARTMENT_ROLES[departmentId] || [];
  return SYSTEM_ROLES.filter(r => validRoleIds.includes(r.id));
};
