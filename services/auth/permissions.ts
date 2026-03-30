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
export const permissionsService = {
  /**
   * Check if the current user can perform an action.
   * Logic:
   * 1. If Super User -> YES
   * 2. If Org Owner -> YES (for all actions)
   * 3. If Org Admin -> YES (for most, maybe restricted on settings)
   * 4. Otherwise -> Check branch-level role permissions
   */
  can(
    action: PermissionAction, 
    context?: { branchId?: string; role?: string; orgRole?: OrgRole }
  ): boolean {
    const session = authService.getCurrentUserSync();
    
    // Determine which roles to use (provided in context or from current session)
    const effectiveRole = context?.role || session?.role;
    const effectiveOrgRole = context?.orgRole || session?.orgRole;
    const effectiveUsername = session?.username; // Username only comes from session

    // 1. Super User check
    if (effectiveUsername === import.meta.env.VITE_SUPER_USER) {
      return true;
    }

    // 2. Org-level Role Overrides
    if (effectiveOrgRole === 'owner') {
      return true;
    }

    if (effectiveOrgRole === 'admin') {
      if (action.startsWith('users.') || action.startsWith('settings.') || action.startsWith('reports.')) {
        return true;
      }
    }

    // 3. Branch-level Scope check
    if (context?.branchId && session?.branchId !== context.branchId && effectiveOrgRole !== 'admin') {
      return false;
    }

    // 4. Standard Role Check
    return canPerformBaseAction(effectiveRole as UserRole, action);
  },

  /**
   * Get the effective role for the current session
   */
  getEffectiveRole(): UserRole | undefined {
    const session = authService.getCurrentUserSync();
    return session?.role as UserRole | undefined;
  },

  /**
   * Check if user is an Org Owner or Admin
   */
  isOrgAdmin(): boolean {
    const session = authService.getCurrentUserSync();
    return session?.orgRole === 'owner' || session?.orgRole === 'admin';
  },

  /**
   * Get all permissions for the current user
   */
  getAllPermissions(): PermissionAction[] {
    const session = authService.getCurrentUserSync();
    if (!session) return [];
    
    if (session.orgRole === 'owner' || session.username === import.meta.env.VITE_SUPER_USER) {
      // Return a special flag or list of all (though usually 'can' check is preferred)
      // For simplicity, return the keys from a complete mapping
      return Object.values(ROLE_PERMISSIONS).flat(); 
    }

    return ROLE_PERMISSIONS[session.role as UserRole] || [];
  }
};
