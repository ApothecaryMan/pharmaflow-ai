import React from 'react';
import * as Myna from '@mynaui/icons-react';

export type IconProps = {
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  stroke?: number;
  active?: boolean;
};

// Internal Registry mapping common names to MynaUI components
// Cleaned up to remove duplicates and consolidate aliases
const InternalRegistry: Record<string, any> = {
  // Core App Components
  Dashboard: Myna.Grid,
  Inventory: Myna.Box,
  Sales: Myna.Cart,
  Purchase: Myna.CreditCard,
  Customers: Myna.UsersGroup,
  Reports: Myna.FileCheck,
  Settings: Myna.CogFour,
  Organization: Myna.BuildingOne,
  Printer: Myna.Printer,
  Download: Myna.Download,
  Upload: Myna.Upload,
  Logout: Myna.Logout,
  Menu: Myna.Menu,
  ChevronDown: Myna.ChevronDown,
  Search: Myna.Search,
  
  // Feature IDs & Aliases (Consolidated)
  dashboard_customize: Myna.Grid,
  package_2: Myna.Box,
  point_of_sale: Myna.Cart,
  receipt_long: Myna.FileText,
  shopping_cart_checkout: Myna.CartCheck,
  group: Myna.UsersGroup,
  bar_chart: Myna.FileCheck,
  badge: Myna.User,
  manage_accounts: Myna.UserSettings,
  business: Myna.BuildingOne,
  branches: Myna.GitBranch,
  printer_settings: Myna.Printer,
  administration: Myna.Cog,
  branch_settings: Myna.GitBranch,
  
  // Legacy & Navbar Aliases
  ExpandMore: Myna.ChevronDown,
  Branch: Myna.GitBranch,
  Success: Myna.CheckCircle,
  Info: Myna.InfoCircle,
  Print: Myna.Printer,
  Store: Myna.BuildingOne,
  Edit: Myna.Pencil,
};

/**
 * Icons Registry Proxy
 * Automatically switches to Solid version if active prop is true
 */
export const Icons: any = new Proxy(InternalRegistry, {
  get: (target, prop: string) => {
    return (props: IconProps) => {
      const { active, ...otherProps } = props;
      
      // Find the base icon
      let BaseIcon = target[prop];
      if (!BaseIcon) {
        const foundKey = Object.keys(target).find(k => k.toLowerCase() === prop.toLowerCase());
        BaseIcon = foundKey ? target[foundKey] : (Myna as any)[prop];
      }
      
      if (!BaseIcon) BaseIcon = Myna.Circle || (() => null);

      // If active, try to find the Solid version
      if (active) {
        const solidName = `${BaseIcon.displayName || prop}Solid`;
        const SolidIcon = (Myna as any)[solidName];
        if (SolidIcon) return <SolidIcon {...otherProps} />;
      }

      return <BaseIcon {...otherProps} />;
    };
  }
});

export const getIconByName = (name: string): React.FC<any> => {
  return (props: any) => {
    const Icon = Icons[name];
    return <Icon {...props} />;
  };
};

// Direct Exports for common usage
export const {
  Dashboard, Inventory, Sales, Customers, Reports, Settings,
  Logout, Organization, Printer, Download, Upload, Menu,
  ChevronDown, Search, Print, Edit, Store
} = Icons;

export default Icons;
