import { type OrgRole } from './index';

/**
 * UserSession - Represents the currently logged in user and their context.
 * This is stored in localStorage and used for RBAC and multi-tenant isolation.
 */
export interface UserSession {
  /** Auth user ID (UUID) */
  userId?: string;
  
  /** Organization ID the user belongs to */
  orgId?: string;
  
  /** Role within the organization */
  orgRole?: string;
  
  /** Unique username */
  username: string;
  
  /** Linked employee ID (UUID) */
  employeeId?: string;
  
  /** Active branch ID (UUID) */
  branchId: string;
  
  /** Department classification */
  department: 'sales' | 'pharmacy' | 'marketing' | 'hr' | 'it' | 'logistics';
  
  /** System-wide functional role */
  role:
    | 'god'
    | 'admin'
    | 'pharmacist_owner'
    | 'pharmacist_manager'
    | 'pharmacist'
    | 'inventory_officer'
    | 'assistant'
    | 'hr_manager'
    | 'cashier'
    | 'senior_cashier'
    | 'delivery'
    | 'delivery_pharmacist'
    | 'officeboy'
    | 'manager';
}

/**
 * LoginAuditEntry - Records authentication events for security auditing.
 */
export interface LoginAuditEntry {
  /** Unique audit ID */
  id: string;
  
  /** ISO timestamp */
  timestamp: string;
  
  /** Username of the person involved */
  username: string;
  
  /** Role snapshot at time of event */
  role: string;
  
  /** Branch ID context */
  branchId: string;
  
  /** Type of auth event */
  action: 'login' | 'logout' | 'switch_user' | 'system_login' | 'system_logout' | 'switch_branch';
  
  /** Additional metadata */
  details?: string;
  
  /** Linked employee ID */
  employeeId?: string;
}
