import React from 'react';
import { useStatusBar } from './StatusBarContext';
import { ConnectionStatus } from './items/ConnectionStatus';
import { NotificationBell } from './items/NotificationBell';
import { AnnouncementBanner } from './items/AnnouncementBanner';
import { VersionInfo } from './items/VersionInfo';
import { StatusBarItem } from './StatusBarItem';
import { DateTime } from './items/DateTime';
import { UserInfo } from './items/UserInfo';
import { SettingsMenu } from './items/SettingsMenu';
import { useShift } from '../../../hooks/useShift';

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
}

import { Employee, ThemeColor, Language } from '../../../types';

export interface StatusBarProps {
  theme?: string;
  language?: 'EN' | 'AR';
  t?: StatusBarTranslations;
  employees?: Employee[];
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

export const StatusBar: React.FC<StatusBarProps> = ({
  theme = 'blue',
  language = 'EN',
  t = defaultTranslations,
  employees = [],
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
   *    We removed `gap-2` from sections to allow items to flush against each other.
   *    Spacing is strictly handled by the internal padding of `StatusBarItem` (px-2.5).
   * 
   * 3. THREE-SECTION LAYOUT:
   *    - Left: Connection & System Status
   *    - Center: Announcements (Flex grow)
   *    - Right: Notifications, Time, Version
   */
  const { state } = useStatusBar();

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
      // [CONTAINER]: Fixed h-6 (24px), Flexbox for layout, No padding (items handle their own)
      className="hidden md:flex items-center justify-between h-6 border-t shrink-0 select-none shadow-sm"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Left Section */}
      <div className="flex items-center h-full">
        {/* Version - Moved to start */}
        <VersionInfo version={t.version} />

        {/* Settings - Moved here after Version Info */}
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

        {/* Date Time - Moved here */}
        <DateTime hideIcon={true} />
      </div>

      {/* Center Section - Announcements */}
      <AnnouncementBanner />

      {/* Right Section */}
      <div className="flex items-center h-full">
        {/* User Info (Employee Selector) */}
        <UserInfo // Keep static user info for now, but enabled selection
            userName={employees.find(e => e.id === currentEmployeeId)?.name || (language === 'AR' ? 'المستخدم' : 'User')}
            userRole={(() => {
              const emp = employees.find(e => e.id === currentEmployeeId);
              if (!emp) return undefined;
              // Simple translation map for roles could be here or handled in UserInfo. 
              // For now passing the role value. UserInfo seems to display it directly.
              return emp.role; 
            })()}
            employees={employees}
            currentEmployeeId={currentEmployeeId}
            onSelectEmployee={onSelectEmployee}
            language={language}
        />

        {/* Settings - Added as requested, distinct icon from Navbar */}
        {/* Settings - Moved to left section */}

        {/* Notifications - Moved to end (Rightmost) */}
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
};

export default StatusBar;
