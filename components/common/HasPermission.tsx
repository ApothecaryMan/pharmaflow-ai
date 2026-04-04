import React from 'react';
import { PermissionAction } from '../../config/permissions';
import { permissionsService } from '../../services/auth/permissions';
import { OrgRole } from '../../types';

interface HasPermissionProps {
  /** The action to check permission for */
  action: PermissionAction;
  /** Optional branch context */
  branchId?: string;
  /** Optional role override (for lists) */
  role?: string;
  /** Optional org role override (for lists) */
  orgRole?: OrgRole;
  /** Content to show if permission is granted */
  children: React.ReactNode;
  /** Optional fallback content if permission is denied */
  fallback?: React.ReactNode;
}

/**
 * HasPermission - A wrapper component to gate UI elements based on roles and permissions.
 * Supports organization-level overrides (Owners/Admins).
 */
export const HasPermission: React.FC<HasPermissionProps> = ({
  action,
  branchId,
  role,
  orgRole,
  children,
  fallback = null,
}) => {
  const hasAccess = permissionsService.can(action, { branchId, role, orgRole });

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
