import * as Myna from '@mynaui/icons-react';
import React from 'react';

/**
 * Icons Registry - Smart Dynamic Version
 */

export type IconProps = Myna.MynaIconsProps;

// Define base Icons for static usage
export const Icons = {
  Menu: Myna.List,
  Grid: Myna.Grid,
  ChevronDown: Myna.ChevronDown,
  ChevronUp: Myna.ChevronUp,
  ChevronLeft: Myna.ChevronLeft,
  ChevronRight: Myna.ChevronRight,
  ExpandMore: Myna.ChevronDown,
  ExpandLess: Myna.ChevronUp,
  Add: Myna.Plus,
  Remove: Myna.Minus,
  Edit: Myna.Pencil,
  Delete: Myna.Trash,
  Save: Myna.Save,
  Search: Myna.Search,
  Download: Myna.Download,
  Upload: Myna.Upload,
  Print: Myna.Printer,
  Copy: Myna.Copy,
  ExternalLink: Myna.ExternalLink,
  Share: Myna.Share,
  Link: Myna.Link,
  Lock: Myna.Lock,
  LockOpen: Myna.LockOpen,
  User: Myna.User,
  Logout: Myna.Logout,
  Pin: Myna.Pin,
  Key: Myna.Key,
  Shield: Myna.Shield,
  Settings: Myna.Config,
  Translate: Myna.Globe,
  Palette: Myna.Paint,
  Code: Myna.Code,
  Eye: Myna.Eye,
  EyeOff: Myna.EyeOff,
  Store: Myna.BuildingOne,
  Branch: Myna.MapPin,
  Organization: Myna.Building,
  Inventory: Myna.Package,
  Sales: Myna.Cart,
  Analytics: Myna.ChartLine,
  Medical: Myna.BriefcaseMedical,
  Customer: Myna.Users,
  Employee: Myna.UsersGroup,
  Truck: Myna.Truck,
  Wallet: Myna.DollarCircle,
  Briefcase: Myna.Briefcase,
  CreditCard: Myna.CreditCard,
  Percent: Myna.Percentage,
  History: Myna.Refresh,
  Repeat: Myna.Repeat,
  Refresh: Myna.Refresh,
  Circle: Myna.Circle,
  Info: Myna.InfoCircle,
  Success: Myna.CheckCircle,
  Warning: Myna.DangerCircle,
  Error: Myna.XCircle,
  Loading: Myna.SpinnerOne,
  Help: Myna.QuestionCircle,
  Calendar: Myna.Calendar,
  Clock: Myna.ClockCircle,
  Tag: Myna.Tag,
  Notification: Myna.Bell,
  Mail: Myna.Mail,
  Message: Myna.Message,
  Heart: Myna.Heart,
  Star: Myna.Star,
  School: Myna.BookOpen,
  Layers: Myna.LayersThree,
};

/**
 * Smart Mapping: Material Symbol Name -> Myna Icon Key
 */
const ICON_MAP: Record<string, keyof typeof Myna> = {
  // Navigation
  'dashboard': 'Grid',
  'dashboard_customize': 'Grid',
  'menu': 'List',
  'home': 'Home',
  
  // Inventory
  'inventory': 'Package',
  'inventory_2': 'Package',
  'package': 'Package',
  'package_2': 'Package',
  'box': 'Package',
  'category': 'Grid',
  'reorder': 'Package',
  'layers': 'LayersThree',
  
  // Sales & Business
  'sales': 'Cart',
  'point_of_sale': 'Cart',
  'shopping_cart': 'Cart',
  'shopping_basket': 'Cart',
  'cart': 'Cart',
  'pos': 'Cart',
  'payments': 'DollarCircle',
  'receipt': 'FileText',
  'receipt_long': 'FileText',
  'monetization_on': 'DollarCircle',
  'attach_money': 'DollarCircle',
  'store': 'BuildingOne',
  'storefront': 'BuildingOne',
  'business': 'Building',
  'purchases': 'Cart', // Fallback for purchases module if needed
  
  // Analytics
  'analytics': 'ChartLine',
  'monitoring': 'ChartLine',
  'timeline': 'ChartLine',
  'show_chart': 'ChartLine',
  'trending_up': 'ChartLine',
  'trending_down': 'ChartLine',
  'assessment': 'ChartLine',
  
  // People
  'people': 'Users',
  'person': 'User',
  'group': 'UsersGroup',
  'badge': 'UsersGroup',
  'supervisor_account': 'UsersGroup',
  'manage_accounts': 'Config',
  
  // Actions
  'add': 'Plus',
  'remove': 'Minus',
  'edit': 'Pencil',
  'delete': 'Trash',
  'save': 'Save',
  'search': 'Search',
  'print': 'Printer',
  'share': 'Share',
  'refresh': 'Refresh',
  'sync': 'Refresh',
  'history': 'Refresh',
  
  // Status & UI
  'settings': 'Config',
  'notifications': 'Bell',
  'lock': 'Lock',
  'lock_open': 'LockOpen',
  'info': 'InfoCircle',
  'check_circle': 'CheckCircle',
  'warning': 'DangerCircle',
  'error': 'XCircle',
  'help': 'QuestionCircle',
  'visibility': 'Eye',
  'visibility_off': 'EyeOff',
  'calendar_today': 'Calendar',
  'schedule': 'ClockCircle',
  'mail': 'Mail',
  'sms': 'Message',
  'star': 'Star',
  'favorite': 'Heart',
  'palette': 'Paint',
  'translate': 'Globe',
  'code': 'Code',
  'logout': 'Logout',
};

/**
 * getIconByName - The Smart Way
 */
export const getIconByName = (name: string, isSolid = false): React.FC<IconProps> => {
  // 1. Handle Legacy Fallbacks (Wifi, Fingerprint)
  if (name.startsWith('wifi') || name.startsWith('network_wifi') || name === 'fingerprint') {
    return (props: IconProps) => (
      <span 
        className={`material-symbols-rounded ${props.className || ''}`} 
        style={{ fontSize: props.size || 'inherit', ...props.style }}
      >
        {name}
      </span>
    );
  }

  // 2. Resolve Myna Key
  const mynaKey = ICON_MAP[name] || 'InfoCircle';
  
  // 3. Try to find Solid version if requested
  if (isSolid) {
    const solidKey = `${mynaKey}Solid` as keyof typeof Myna;
    if (Myna[solidKey]) {
      return Myna[solidKey] as React.FC<IconProps>;
    }
  }

  // 4. Fallback to Regular version
  return (Myna[mynaKey] || Myna.InfoCircle) as React.FC<IconProps>;
};

export default Icons;
