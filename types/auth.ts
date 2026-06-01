import type { Employee } from './hr';

/** Organization role — determines access scope across all branches */
export type OrgRole = 'owner' | 'admin' | 'member';

/** Subscription plan tiers */
export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise';

/** Subscription billing status */
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'cancelled';

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
  
  /** Linked employee code (e.g. EMP-001) */
  employeeCode?: string;
  
  /** Active branch ID (UUID) */
  branchId: string;
  
  /** Department classification */
  department: 'sales' | 'pharmacy' | 'marketing' | 'hr' | 'it' | 'logistics';
  
  /** Display name of the employee */
  employeeName?: string;
  
  /** System-wide functional role */
  role:
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
    
  /** Flag to indicate if the user needs to select a workspace */
  needsWorkspaceSelection?: boolean;
  
  /** Available workspaces for this user */
  availableWorkspaces?: Employee[];
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

  /** Linked employee Code (e.g. EMP-001) */
  employeeCode?: string;

  /** Display name of the employee at time of action */
  employeeName?: string;
}

export interface IndividualRegistrationPayload {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
}

export interface OrgRegistrationPayload {
  orgName: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  branchName: string;
  branchAddress: string;
}
