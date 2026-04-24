/**
 * Action Context - Unified metadata for business operations.
 * This object ensures a Single Source of Truth (SSOT) for who performed an action,
 * where, and when, eliminating inconsistencies between different services.
 */
export interface ActionContext {
  /** The UUID of the employee performing the action */
  performerId: string;
  
  /** The human-readable name of the performer (for display/audit logs) */
  performerName: string;
  
  /** The UUID of the branch where the action is taking place */
  branchId: string;
  
  /** The UUID of the current active shift (Required for any cash-related transactions) */
  shiftId?: string;
  
  /** The UUID of the organization */
  orgId?: string;
  
  /** ISO timestamp of when the action was initiated in the UI */
  timestamp: string;
  
  /** Optional reason for the action (used in adjustments or manual logs) */
  reason?: string;
}
