import React from 'react';
import { UserRole } from '../../config/employeeRoles';
import { OrgRole } from '../../types';

interface RoleIconProps {
  role: UserRole | OrgRole | string;
  className?: string;
  classNameOverride?: string;
  style?: React.CSSProperties;
}

/**
 * Centralized mapping of Roles to Material Symbols.
 * This ensures that UI concerns are separated from Business Logic.
 */
const ROLE_ICON_MAP: Record<string, string> = {
  // Employee Roles
  pharmacist_owner: 'license',
  admin: 'shield_person',
  pharmacist_manager: 'medical_services',
  pharmacist: 'prescriptions',
  inventory_officer: 'inventory_2',
  assistant: 'support_agent',
  hr_manager: 'badge',
  cashier: 'payments',
  senior_cashier: 'point_of_sale',
  delivery: 'pedal_bike',
  delivery_pharmacist: 'home_health',
  officeboy: 'coffee',
  manager: 'supervisor_account',
  
  // Organization Roles
  owner: 'stars',
  // admin: 'shield_person', // Shared with employee role
  member: 'person',
};

export const RoleIcon: React.FC<RoleIconProps> = ({ 
  role, 
  className = 'material-symbols-rounded',
  classNameOverride,
  style 
}) => {
  const iconName = ROLE_ICON_MAP[role] || 'person';
  
  return (
    <span 
      className={classNameOverride || className} 
      style={style}
    >
      {iconName}
    </span>
  );
};
