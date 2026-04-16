import { UserRole as ImportedUserRole } from './permissions';

/**
 * Core Role Definitions (The Single Source of Truth)
 * Any change here automatically updates Types and Arrays across the system.
 */
const ROLE_DEFINITIONS = {
  pharmacist_owner: { 
    icon: 'license', 
    translationKey: 'pharmacist_owner',
    defaultLabelEN: 'Pharmacy Owner',
    defaultLabelAR: 'مالك الصيدلية'
  },
  admin: { 
    icon: 'shield_person', 
    translationKey: 'admin',
    defaultLabelEN: 'System Admin',
    defaultLabelAR: 'مدير النظام (Admin)'
  },
  pharmacist_manager: { 
    icon: 'medical_services', 
    translationKey: 'pharmacist_manager',
    defaultLabelEN: 'Pharmacist Manager',
    defaultLabelAR: 'صيدلي مدير'
  },
  pharmacist: { 
    icon: 'prescriptions', 
    translationKey: 'pharmacist',
    defaultLabelEN: 'Pharmacist',
    defaultLabelAR: 'صيدلي' 
  },
  inventory_officer: { 
    icon: 'inventory_2', 
    translationKey: 'inventory_officer',
    defaultLabelEN: 'Inventory Officer',
    defaultLabelAR: 'مسؤول مخزن'
  },
  assistant: { 
    icon: 'support_agent', 
    translationKey: 'assistant',
    defaultLabelEN: 'Assistant',
    defaultLabelAR: 'مساعد صيدلي'
  },
  hr_manager: { 
    icon: 'badge', 
    translationKey: 'hr_manager',
    defaultLabelEN: 'HR Manager',
    defaultLabelAR: 'مدير موارد بشرية'
  },
  cashier: { 
    icon: 'payments', 
    translationKey: 'cashier',
    defaultLabelEN: 'Cashier',
    defaultLabelAR: 'كاشير'
  },
  senior_cashier: { 
    icon: 'point_of_sale', 
    translationKey: 'senior_cashier',
    defaultLabelEN: 'Senior Cashier',
    defaultLabelAR: 'كاشير رئيسي'
  },
  delivery: { 
    icon: 'pedal_bike', 
    translationKey: 'delivery',
    defaultLabelEN: 'Delivery',
    defaultLabelAR: 'طيار'
  },
  delivery_pharmacist: { 
    icon: 'home_health', 
    translationKey: 'delivery_pharmacist',
    defaultLabelEN: 'Home-Care Pharmacist',
    defaultLabelAR: 'صيدلي رعاية منزلية'
  },
  officeboy: { 
    icon: 'coffee', 
    translationKey: 'officeboy',
    defaultLabelEN: 'Office Boy',
    defaultLabelAR: 'عامل بوفيه'
  },
  manager: { 
    icon: 'supervisor_account', 
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
  icon: string;
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
 * Utility: Get icon for a specific role
 */
export const getRoleIcon = (roleId?: string): string => {
  if (!roleId || !(roleId in ROLE_DEFINITIONS)) return 'person';
  return ROLE_DEFINITIONS[roleId as UserRole].icon;
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
