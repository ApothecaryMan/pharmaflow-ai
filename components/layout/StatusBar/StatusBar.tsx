import React from 'react';
import { useStatusBar } from './StatusBarContext';
import { ConnectionStatus } from './items/ConnectionStatus';
import { NotificationBell } from './items/NotificationBell';
import { AnnouncementBanner } from './items/AnnouncementBanner';
import { VersionInfo } from './items/VersionInfo';
import { StatusBarItem } from './StatusBarItem';
import { DateTime } from './items/DateTime';
import { UserInfo } from './items/UserInfo';

export interface StatusBarTranslations {
  ready: string;
  online: string;
  offline: string;
  version: string;
  notifications?: string;
  noNotifications?: string;
  clearAll?: string;
}

export interface StatusBarProps {
  theme?: string;
  language?: 'EN' | 'AR';
  t?: StatusBarTranslations;
  employees?: { id: string; name: string; employeeCode: string }[];
  currentEmployeeId?: string | null;
  onSelectEmployee?: (id: string) => void;
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
      // [CONTAINER]: Fixed h-6 (24px), Flexbox for layout, No padding (items handle their own)
      className="hidden md:flex items-center justify-between h-6 border-t shrink-0 select-none shadow-sm"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Left Section */}
      <div className="flex items-center h-full">
        {/* Connection Status */}
        <ConnectionStatus
          onlineText={t.online}
          offlineText={t.offline}
        />

        {/* Ready Status */}
        <StatusBarItem
          icon="check_circle"
          label={t.ready}
          variant="success"
        />
      </div>

      {/* Center Section - Announcements */}
      <AnnouncementBanner />

      {/* Right Section */}
      <div className="flex items-center h-full">
        {/* Notifications */}
        <NotificationBell
          t={{
            notifications: t.notifications || 'Notifications',
            noNotifications: t.noNotifications || 'No notifications',
            clearAll: t.clearAll || 'Clear all',
          }}
        />

        {/* Date Time */}
        <DateTime />

        {/* User Info (Employee Selector) */}
        <UserInfo // Keep static user info for now, but enabled selection
            userName={employees.find(e => e.id === currentEmployeeId)?.name || (language === 'AR' ? 'المستخدم' : 'User')}
            userRole={language === 'AR' ? 'صيدلي' : 'Pharmacist'}
            employees={employees}
            currentEmployeeId={currentEmployeeId}
            onSelectEmployee={onSelectEmployee}
            language={language}
        />

        {/* Version */}
        <VersionInfo version={t.version} />
      </div>
    </div>
  );
};

export default StatusBar;
