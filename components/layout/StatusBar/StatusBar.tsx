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

export interface StatusBarTranslations {
  ready: string;
  online: string;
  offline: string;
  version: string;
  notifications?: string;
  noNotifications?: string;
  clearAll?: string;
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
}

const defaultTranslations: StatusBarTranslations = {
  ready: 'Ready',
  online: 'Online',
  offline: 'Offline',
  version: 'v1.0.0',
  notifications: 'Notifications',
  noNotifications: 'No notifications',
  clearAll: 'Clear all',
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

        {/* Connection Status */}
        <ConnectionStatus
          onlineText={t.online}
          offlineText={t.offline}
        />

        {/* Ready Status */}
        <StatusBarItem
          icon="check_circle"
          tooltip={t.ready}
          variant="success"
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
          />
        )}

        {/* Notifications - Moved to end (Rightmost) */}
        <NotificationBell
          t={{
            notifications: t.notifications || 'Notifications',
            noNotifications: t.noNotifications || 'No notifications',
            clearAll: t.clearAll || 'Clear all',
          }}
        />
      </div>
    </div>
  );
};

export default StatusBar;
