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
const InternalRegistry: Record<string, any> = {
  Dashboard: Myna.Grid,
  Inventory: Myna.Box,
  Sales: Myna.Cart,
  Purchase: Myna.CreditCard,
  Customers: Myna.UsersGroup,
  Reports: Myna.FileCheck,
  Settings: Myna.CogFour,
  Organization: Myna.BuildingOne,
  Printer: Myna.Printer,
  Desktop: Myna.Monitor,
  Download: Myna.Download,
  Upload: Myna.Upload,
  Logout: Myna.Logout,
  Menu: Myna.Menu,
  ChevronDown: Myna.ChevronDown,
  Search: Myna.Search,
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
  ExpandMore: Myna.ChevronDown,
  Branch: Myna.GitBranch,
  Success: Myna.CheckCircle,
  Info: Myna.InfoCircle,
  Print: Myna.Printer,
  Store: Myna.BuildingOne,
  Edit: Myna.Pencil,
  description: Myna.FileText,
  prescriptions: Myna.FileText,
  payments: Myna.Dollar,
  finance: Myna.DollarCircle,
  verified: Myna.ShieldCheck,
  compliance: Myna.ShieldCheck,
  settings: Myna.CogFour,
  science: Myna.FlaskConical,
  test: Myna.FlaskConical,
  hr: Myna.User,
};

/**
 * Base Icon Component Factory
 */
const createIcon = (name: string) => {
  return (props: IconProps) => {
    const { active, ...otherProps } = props;
    let BaseIcon = InternalRegistry[name];
    
    if (!BaseIcon) {
      // Fallback to Myna direct lookup or Circle
      BaseIcon = (Myna as any)[name] || Myna.Circle;
    }

    if (active) {
      const solidName = `${BaseIcon.displayName || name}Solid`;
      const SolidIcon = (Myna as any)[solidName];
      if (SolidIcon) return <SolidIcon {...otherProps} />;
    }

    return <BaseIcon {...otherProps} />;
  };
};

// Static Exports to satisfy Rollup analysis
export const Dashboard = createIcon('Dashboard');
export const Inventory = createIcon('Inventory');
export const Sales = createIcon('Sales');
export const Customers = createIcon('Customers');
export const Reports = createIcon('Reports');
export const Settings = createIcon('Settings');
export const Organization = createIcon('Organization');
export const Printer = createIcon('Printer');
export const Desktop = createIcon('Desktop');
export const Download = createIcon('Download');
export const Upload = createIcon('Upload');
export const Logout = createIcon('Logout');
export const Menu = createIcon('Menu');
export const ChevronDown = createIcon('ChevronDown');
export const Search = createIcon('Search');
export const Print = createIcon('Print');
export const Edit = createIcon('Edit');
export const Store = createIcon('Store');
export const Prescriptions = createIcon('prescriptions');
export const Finance = createIcon('finance');
export const Compliance = createIcon('compliance');
export const Test = createIcon('test');

// Dynamic lookup helper
export const getIconByName = (name: string): React.FC<any> => {
  return createIcon(name);
};

// Legacy support
export const Icons: any = new Proxy(InternalRegistry, {
  get: (target, prop: string) => createIcon(prop)
});

export default Icons;
