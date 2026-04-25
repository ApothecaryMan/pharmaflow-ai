import { authService } from './authService';
import { 
  PermissionAction, 
  ROLE_PERMISSIONS, 
  UserRole, 
  canPerformAction as canPerformBaseAction 
} from '../../config/permissions';
import { OrgRole } from '../../types';

/**
 * Permissions Service - Enhanced with Organization-level awareness.
 * Integrates OrgRole (Owner/Admin/Member) with UserRole (Pharmacist/Cashier/etc).
 */
export interface PermissionsService {
  can(action: PermissionAction, context?: { branchId?: string; role?: string; orgRole?: OrgRole }): boolean;
  verify(action: PermissionAction, context?: { branchId?: string }): void;
  getEffectiveRole(): UserRole | undefined;
  isOrgAdmin(): boolean;
  isManager(): boolean;
  getAllPermissions(): PermissionAction[];
}

class PermissionsServiceImpl implements PermissionsService {
  /**
   * Check if the current user can perform an action.
   * Logic:
   * 1. If Org Owner -> YES (for all actions)
   * 2. If Org Admin -> YES (for most, maybe restricted on settings)
   * 3. Otherwise -> Check branch-level role permissions
   */
  can(
    action: PermissionAction, 
    context?: { branchId?: string; role?: string; orgRole?: OrgRole }
  ): boolean {
    const session = authService.getCurrentUserSync();
    
    // Determine which roles to use (provided in context or from current session)
    const effectiveRole = context?.role || session?.role;
    const effectiveOrgRole = context?.orgRole || session?.orgRole;

    // 1. Org-level Role Overrides
    if (effectiveOrgRole === 'owner') {
      return true;
    }

    if (effectiveOrgRole === 'admin') {
      if (action.startsWith('users.') || action.startsWith('settings.') || action.startsWith('reports.')) {
        return true;
      }
    }

    // 2. Branch-level Scope check
    if (context?.branchId && session?.branchId !== context.branchId && effectiveOrgRole !== 'admin') {
      return false;
    }

    // 3. Standard Role Check
    return canPerformBaseAction(effectiveRole as UserRole, action);
  }

  /**
   * Verifies an action and throws an error if unauthorized.
   */
  verify(action: PermissionAction, context?: { branchId?: string }): void {
    if (!this.can(action, context)) {
      throw new Error(`Unauthorized: Access denied for ${action}`);
    }
  }

  /**
   * Get the effective role for the current session
   */
  getEffectiveRole(): UserRole | undefined {
    const session = authService.getCurrentUserSync();
    return session?.role as UserRole | undefined;
  }

  /**
   * Check if user is an Org Owner or Admin
   */
  isOrgAdmin(): boolean {
    const session = authService.getCurrentUserSync();
    return session?.orgRole === 'owner' || session?.orgRole === 'admin';
  }

  /**
   * Check if user has manager-level privileges
   */
  isManager(): boolean {
    const session = authService.getCurrentUserSync();
    const role = session?.role;
    return (
      session?.orgRole === 'owner' || 
      session?.orgRole === 'admin' || 
      role === 'manager' || 
      role === 'pharmacist_manager' ||
      role === 'admin'
    );
  }

  /**
   * Get all permissions for the current user
   */
  getAllPermissions(): PermissionAction[] {
    const session = authService.getCurrentUserSync();
    if (!session) return [];
    
    if (session.orgRole === 'owner') {
      return Object.values(ROLE_PERMISSIONS).flat() as PermissionAction[]; 
    }

    return (ROLE_PERMISSIONS[session.role as UserRole] || []) as PermissionAction[];
  }
}

export const permissionsService = new PermissionsServiceImpl();
