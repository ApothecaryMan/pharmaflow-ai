import React from 'react';
import { useStatusBar } from './StatusBarContext';
import { ConnectionStatus } from './items/ConnectionStatus';
import { NotificationBell } from './items/NotificationBell';
// import { AnnouncementBanner } from './items/AnnouncementBanner';
import { AlertsAndAds } from '../../features/alerts/AlertsAndAds';
import { VersionInfo } from './items/VersionInfo';
import { StatusBarItem } from './StatusBarItem';
import { DateTime } from './items/DateTime';
import { UserInfo } from './items/UserInfo';
import { SettingsMenu } from './items/SettingsMenu';
import { DynamicTicker } from './items/DynamicTicker';
import { useShift } from '../../../hooks/useShift';
import { useDynamicTickerData } from '../../../hooks/useDynamicTickerData';
import { useData } from '../../../services';
import { useSettings } from '../../../context';
import packageJson from '../../../package.json';

export interface StatusBarTranslations {
  ready: string;
  online: string;
  offline: string;
  version?: string;
  notifications?: string;
  noNotifications?: string;
  clearAll?: string;
  dismiss?: string;
  shiftOpen?: string;
  shiftClosed?: string;
  shiftSince?: string;
  messages?: {
    outOfStock?: string;
    saleComplete?: string;
    [key: string]: string | undefined;
  };
  ticker?: {
    todaySales?: string;
    invoices?: string;
    completed?: string;
    pending?: string;
    lowStock?: string;
    shortages?: string;
    newCustomers?: string;
    topSeller?: string;
  };
}

import { ThemeColor, Language } from '../../../types';
import { UserRole } from '../../../config/permissions';

export interface StatusBarProps {
  t?: StatusBarTranslations;
  currentEmployeeId?: string | null;
  userRole?: UserRole;
  onSelectEmployee?: (id: string) => void;
}

const defaultTranslations: StatusBarTranslations = {
  ready: 'Ready',
  online: 'Online',
  offline: 'Offline',
  version: `v${packageJson.version}`,
  notifications: 'Notifications',
  noNotifications: 'No notifications',
  clearAll: 'Clear all',
  dismiss: 'Dismiss',
  shiftOpen: 'Shift Open',
  shiftClosed: 'Shift Closed',
  shiftSince: 'Since',
  messages: {
    outOfStock: 'Out of Stock: {{name}} {{form}}',
    saleComplete: 'Sale completed: {{total}} L.E',
  },
};

export const StatusBar: React.FC<StatusBarProps> = React.memo(({
  t = defaultTranslations,
  currentEmployeeId,
  userRole,
  onSelectEmployee,
}) => {
  /* 
   * STATUS BAR ARCHITECTURE GUIDE
   * =============================
   * 
   * 1. CONTAINER FIXED HEIGHT:
   *    The bar is strictly locked to `h-6` (24px).
   *    All chidren must inherit this height to ensure perfect vertical alignment.
   * 
   * 2. NO GAPS STRATEGY:
   *    We removed `gap-2` from items to allow items to flush against each other.
   *    Spacing is strictly handled by the internal padding of `StatusBarItem` (px-2.5).
   * 
   * 3. THREE-SECTION LAYOUT:
   *    - Left: Connection & System Status
   *    - Center: Announcements (Flex grow)
   *    - Right: Notifications, Time, Version
   */
  const { state } = useStatusBar();

  // --- Settings from Context ---
  /**
   * ARCHITECTURE NOTE:
   * StatusBar is decoupled from configuration state. It only accepts functional props (t, userRole, etc.).
   * Global settings are accessed via the `useSettings` hook to keep the component interface lean.
   */
  const {
    language,
    theme: currentTheme,
    setTheme,
    darkMode,
    setDarkMode,
    setLanguage,
    availableThemes,
    availableLanguages,
    textTransform,
    setTextTransform,
    hideInactiveModules,
    setHideInactiveModules,
    navStyle,
    setNavStyle,
    developerMode,
    setDeveloperMode,
    dropdownBlur,
    setDropdownBlur,
    sidebarBlur,
    setSidebarBlur,
    menuBlur,
    setMenuBlur,
    tooltipBlur,
    setTooltipBlur,
    showTicker,
    setShowTicker,
    showTickerSales,
    setShowTickerSales,
    showTickerInventory,
    setShowTickerInventory,
    showTickerCustomers,
    setShowTickerCustomers,
    showTickerTopSeller,
    setShowTickerTopSeller,
    fontFamilyEN,
    setFontFamilyEN,
    fontFamilyAR,
    setFontFamilyAR,
  } = useSettings();

  // --- Real-time Data ---
  const tickerData = useDynamicTickerData();
  const { employees, isLoading } = useData();

  // --- Shift Status Logic ---
  const { currentShift } = useShift();
  
  const getShiftTooltip = (): string => {
    if (!currentShift) {
      return t.shiftClosed || 'Shift Closed';
    }
    
    const openTime = new Date(currentShift.openTime);
    const now = new Date();
    const isSameDay = openTime.toDateString() === now.toDateString();
    
    const timeStr = openTime.toLocaleTimeString(language === 'AR' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    
    if (isSameDay) {
      return `${t.shiftOpen || 'Shift Open'} ${t.shiftSince || 'Since'} ${timeStr}`;
    } else {
      const dateStr = openTime.toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-GB', {
        day: 'numeric',
        month: 'short',
      });
      return `${t.shiftOpen || 'Shift Open'} ${t.shiftSince || 'Since'} ${dateStr} ${timeStr}`;
    }
  };

  return (
    <div
      dir="ltr"
      className="hidden md:flex items-center justify-between h-6 border-t shrink-0 select-none shadow-sm"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Left Section */}
      <div className="flex items-center h-full">
        {/* Version Info */}
        <VersionInfo version={t.version} />

        {/* Settings Menu */}
        <SettingsMenu 
          userRole={userRole}
         />

        {/* Connection Status */}
        <ConnectionStatus
          onlineText={t.online}
          offlineText={t.offline}
        />

        {/* Shift Status */}
        <StatusBarItem
          icon={currentShift ? 'check_circle' : 'lock'}
          tooltip={getShiftTooltip()}
          variant={currentShift ? 'success' : 'error'}
        />

        {/* Date Time */}
        <DateTime hideIcon={true} />

        {/* Alerts & Ads (Next to Time) */}
        <AlertsAndAds />
      </div>

      {/* Center Spacer (Visible only if needed, currently empty as we moved Ads) */}
      <div className="flex-1" />

      {/* Right Section */}
      <div className="flex items-center h-full">
        {/* Dynamic Ticker - Rotating Stats */}
        {showTicker && (
          <DynamicTicker
            language={language}
            userRole={userRole}
            data={tickerData}
            showSales={showTickerSales}
            showInventory={showTickerInventory}
            showCustomers={showTickerCustomers}
            showTopSeller={showTickerTopSeller}
            t={t.ticker ? {
              todaySales: t.ticker.todaySales || 'Today',
              invoices: t.ticker.invoices || 'Invoices',
              completed: t.ticker.completed || 'Done',
              pending: t.ticker.pending || 'Pending',
              lowStock: t.ticker.lowStock || 'Low Stock',
              shortages: t.ticker.shortages || 'Shortages',
              newCustomers: t.ticker.newCustomers || 'New Customers',
              topSeller: t.ticker.topSeller || 'Top Seller',
            } : undefined}
          />
        )}

        {/* User Info (Employee Selector) */}
        <UserInfo
            userName={isLoading && currentEmployeeId ? '...' : (employees.find(e => e.id === currentEmployeeId)?.name || (language === 'AR' ? 'المستخدم' : 'User'))}
            userRole={employees.find(e => e.id === currentEmployeeId)?.role}
            employees={employees}
            currentEmployeeId={currentEmployeeId}
            onSelectEmployee={onSelectEmployee}
            language={language}
        />

        {/* Notifications */}
        <NotificationBell
          language={language}
          t={{
            notifications: t.notifications || 'Notifications',
            noNotifications: t.noNotifications || 'No notifications',
            clearAll: t.clearAll || 'Clear all',
            dismiss: t.dismiss || 'Dismiss',
            messages: t.messages,
          }}
        />
      </div>
    </div>
  );
});

export default StatusBar;
