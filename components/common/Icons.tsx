import * as Myna from '@mynaui/icons-react';
import type React from 'react';

export type IconProps = {
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  stroke?: number;
  active?: boolean;
};

// Custom Brand Icons
const BrandIcons = {
  Apple: ({ size = 24, className = '', color = 'currentColor' }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.415-2.09-3.623-2.324-4.39-2.376-2.065-.13-4.078 1.156-5.61 1.156zM15.5 3.831c.831-1.013 1.39-2.428 1.234-3.831-1.208.052-2.676.805-3.532 1.818-.767.896-1.403 2.338-1.221 3.714 1.35.104 2.69-.701 3.52-1.701z" />
    </svg>
  ),
  Windows: ({ size = 24, className = '' }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0078D4" className={className}>
      <path d="M1 1h10v10H1zM13 1h10v10H13zM1 13h10v10H1zM13 13h10v10H13z" />
    </svg>
  ),
  Android: ({ size = 24, className = '', color = 'currentColor' }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.022 3.503C15.698 8.3045 13.9167 7.892 12 7.892c-1.9167 0-3.698.4125-5.1371 1.0583l-2.022-3.503a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1925.3421 14.6575.05 18.736h23.9c-.2925-4.0785-2.6393-7.5435-6.0685-9.4146" />
    </svg>
  ),
  Linux: ({ size = 24, className = '', color = 'currentColor' }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
      <path d="M11.666 0c-3.111 0-5.833 2.766-5.833 6.16 0 2.223.778 4.226 2.055 5.567-1.112.56-2.5 1.545-3.333 2.92-1.333 2.197-.833 5.345 1.333 7.34 1.333 1.226 3.055 2.013 5.778 2.013s4.444-.787 5.778-2.013c2.166-1.995 2.666-5.143 1.333-7.34-.833-1.375-2.222-2.36-3.333-2.92 1.277-1.341 2.055-3.344 2.055-5.567 0-3.394-2.722-6.16-5.833-6.16zm-1.833 3.667c.722 0 1.333.642 1.333 1.432 0 .79-.611 1.433-1.333 1.433-.722 0-1.333-.643-1.333-1.433 0-.79.611-1.432 1.333-1.432zm3.667 0c.722 0 1.333.642 1.333 1.432 0 .79-.611 1.433-1.333 1.433-.722 0-1.333-.643-1.333-1.433 0-.79.611-1.432 1.333-1.432zm-2.055 4.646c.389 0 .666.29.666.657 0 .367-.278.658-.666.658-.39 0-.667-.291-.667-.658 0-.367.277-.657.667-.657z" />
    </svg>
  ),
  Edge: ({ size = 24, className = '' }: IconProps) => (
    <img 
      src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge.svg" 
      width={size} 
      height={size} 
      className={className} 
      alt="Edge" 
      style={{ objectFit: 'contain' }}
    />
  ),
  Chrome: ({ size = 24, className = '' }: IconProps) => (
    <img 
      src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome.svg" 
      width={size} 
      height={size} 
      className={className} 
      alt="Chrome" 
      style={{ objectFit: 'contain' }}
    />
  ),
  Safari: ({ size = 24, className = '' }: IconProps) => (
    <img 
      src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/safari/safari.svg" 
      width={size} 
      height={size} 
      className={className} 
      alt="Safari" 
      style={{ objectFit: 'contain' }}
    />
  ),
  Firefox: ({ size = 24, className = '' }: IconProps) => (
    <img 
      src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox.svg" 
      width={size} 
      height={size} 
      className={className} 
      alt="Firefox" 
      style={{ objectFit: 'contain' }}
    />
  )
};

// Internal Registry mapping common names to MynaUI components
const InternalRegistry: Record<string, any> = {
  ...BrandIcons,
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
  Mobile: Myna.Mobile,
  Smartphone: Myna.Mobile,
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

// Component cache to ensure component references are stable across renders
const componentCache: Record<string, React.FC<IconProps>> = {};

const getOrCreateIcon = (name: string): React.FC<IconProps> => {
  if (!componentCache[name]) {
    componentCache[name] = createIcon(name);
  }
  return componentCache[name];
};

// Dynamic lookup helper
export const getIconByName = (name: string): React.FC<any> => {
  return getOrCreateIcon(name);
};

// Legacy support
export const Icons: any = new Proxy(InternalRegistry, {
  get: (target, prop: string) => {
    if (typeof prop === 'symbol' || prop === 'then') {
      return (target as any)[prop];
    }
    return getOrCreateIcon(prop);
  },
});

export default Icons;
