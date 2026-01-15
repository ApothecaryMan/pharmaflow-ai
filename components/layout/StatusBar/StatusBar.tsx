import React, { useState } from 'react';
import { useStatusBar } from './StatusBarContext';
import { ConnectionStatus } from './items/ConnectionStatus';
import { NotificationBell } from './items/NotificationBell';
import { AnnouncementBanner } from './items/AnnouncementBanner';
import { VersionInfo } from './items/VersionInfo';
import { StatusBarItem } from './StatusBarItem';
import { DateTime } from './items/DateTime';
import { UserInfo } from './items/UserInfo';
import { SettingsMenu } from './items/SettingsMenu';
import { DynamicTicker } from './items/DynamicTicker';
import { useShift } from '../../../hooks/useShift';
import { useDynamicTickerData } from '../../../hooks/useDynamicTickerData';
import { useData } from '../../../services';

export interface StatusBarTranslations {
  ready: string;
  online: string;
  offline: string;
  version: string;
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

export interface StatusBarProps {
  theme?: string;
  language?: 'EN' | 'AR';
  t?: StatusBarTranslations;
  currentEmployeeId?: string | null;
  onSelectEmployee?: (id: string) => void;
  // Settings Props (migrated from Navbar)
  darkMode?: boolean;
  setDarkMode?: (mode: boolean) => void;
  currentTheme?: ThemeColor;
  setTheme?: (theme: ThemeColor) => void;
  availableThemes?: ThemeColor[];
  setLanguage?: (lang: Language) => void;
  availableLanguages?: { code: Language; label: string }[];
  textTransform?: 'normal' | 'uppercase';
  setTextTransform?: (transform: 'normal' | 'uppercase') => void;
  hideInactiveModules?: boolean;
  setHideInactiveModules?: (hide: boolean) => void;
  navStyle?: 1 | 2 | 3;
  setNavStyle?: (style: 1 | 2 | 3) => void;
  developerMode?: boolean;
  setDeveloperMode?: (mode: boolean) => void;
  dropdownBlur?: boolean;
  setDropdownBlur?: (blur: boolean) => void;
}

const defaultTranslations: StatusBarTranslations = {
  ready: 'Ready',
  online: 'Online',
  offline: 'Offline',
  version: 'v1.0.0',
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
  theme = 'blue',
  language = 'EN',
  t = defaultTranslations,
  currentEmployeeId,
  onSelectEmployee,
  // Settings Props
  darkMode = false,
  setDarkMode,
  currentTheme,
  setTheme,
  availableThemes = [],
  setLanguage,
  availableLanguages = [],
  textTransform = 'normal',
  setTextTransform,
  hideInactiveModules,
  setHideInactiveModules,
  navStyle,
  setNavStyle,
  developerMode,
  setDeveloperMode,
  dropdownBlur,
  setDropdownBlur,
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

  // --- Real-time Data ---
  const tickerData = useDynamicTickerData();
  const { employees } = useData();

  // --- Shift Status Logic ---
  const { currentShift } = useShift();

  // --- Ticker Visibility Settings ---
  const [showTicker, setShowTicker] = useState(true);
  const [showTickerSales, setShowTickerSales] = useState(true);
  const [showTickerInventory, setShowTickerInventory] = useState(true);
  const [showTickerCustomers, setShowTickerCustomers] = useState(true);
  const [showTickerTopSeller, setShowTickerTopSeller] = useState(true);
  
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

        {currentTheme && setTheme && setDarkMode && setLanguage && setTextTransform && (
          <SettingsMenu 
            language={language}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            currentTheme={currentTheme}
            setTheme={setTheme}
            availableThemes={availableThemes}
            setLanguage={setLanguage}
            availableLanguages={availableLanguages}
            textTransform={textTransform}
            setTextTransform={setTextTransform}
            hideInactiveModules={hideInactiveModules}
            setHideInactiveModules={setHideInactiveModules}
            navStyle={navStyle}
            setNavStyle={setNavStyle}
            developerMode={developerMode}
            setDeveloperMode={setDeveloperMode}
            dropdownBlur={dropdownBlur}
            setDropdownBlur={setDropdownBlur}
            // Status Bar Settings
            showTicker={showTicker}
            setShowTicker={setShowTicker}
            showTickerSales={showTickerSales}
            setShowTickerSales={setShowTickerSales}
            showTickerInventory={showTickerInventory}
            setShowTickerInventory={setShowTickerInventory}
            showTickerCustomers={showTickerCustomers}
            setShowTickerCustomers={setShowTickerCustomers}
            showTickerTopSeller={showTickerTopSeller}
            setShowTickerTopSeller={setShowTickerTopSeller}
          />
        )}

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
      </div>

      {/* Center Section - Announcements */}
      <AnnouncementBanner />

      {/* Right Section */}
      <div className="flex items-center h-full">
        {/* Dynamic Ticker - Rotating Stats */}
        {showTicker && (
          <DynamicTicker
            language={language}
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
            userName={employees.find(e => e.id === currentEmployeeId)?.name || (language === 'AR' ? 'المستخدم' : 'User')}
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
