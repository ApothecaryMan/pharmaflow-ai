import React, { useMemo } from 'react';
import { useSettings } from '../../../context';
import { useDynamicTickerData } from '../../../hooks/layout/useDynamicTickerData';
import { useShift } from '../../../hooks/sales/useShift';
import packageJson from '../../../package.json';
import { useData } from '../../../services';
import { AlertsAndAds } from '../../features/alerts/AlertsAndAds';
import { ConnectionStatus } from './items/ConnectionStatus';
import { DateTime } from './items/DateTime';
import { DynamicTicker } from './items/DynamicTicker';
import { NotificationBell } from './items/NotificationBell';
import { SettingsMenu } from './items/SettingsMenu';
import { QuickLogin } from './items/QuickLogin';
import { VersionInfo } from './items/VersionInfo';
import { StatusBarItem } from './StatusBarItem';

export interface StatusBarTranslations {
  ready: string;
  online: string;
  offline: string;
  version?: string;
  notifications?: string;
  noNotifications?: string;
  clearAll?: string;
  dismiss?: string;
  shiftOpen: string;
  shiftClosed: string;
  shiftSince: string;
  userLabel: string;
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
  quickLogin?: {
    login: string;
    username: string;
    password: string;
    newPassword: string;
    forgotPassword: string;
    notFound: string;
    resetSent: string;
    passwordUpdated: string;
    changeSuccess: string;
    biometricUnsupported: string;
    contactManager: string;
    passkeyTooltip: string;
  };
}

export interface StatusBarProps {
  t?: StatusBarTranslations;
  currentEmployeeId?: string | null;
  onSelectEmployee?: (id: string | null) => void;
  iconSize?: number | string;
  isRecoveringPassword?: boolean;
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
  userLabel: 'User',
  quickLogin: {
    login: 'Login',
    username: 'Username',
    password: 'Password',
    newPassword: 'New Password',
    forgotPassword: 'Forgot Password?',
    notFound: 'Not found',
    resetSent: 'Reset link sent to your email',
    passwordUpdated: 'Password updated successfully',
    changeSuccess: 'Password changed successfully',
    biometricUnsupported: 'Browser does not support Passkeys. Ensure you are on HTTPS.',
    contactManager: 'Contact manager to reset password',
    passkeyTooltip: 'Sign in with Passkey',
  },
  messages: {
    outOfStock: 'Out of Stock: {{name}} {{form}}',
    saleComplete: 'Sale completed: {{total}} L.E',
  },
};

// --- Helper sub-components for better hierarchy ---
const StatusBarSection: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex items-center h-full ${className}`}>{children}</div>
);

export const StatusBar: React.FC<StatusBarProps> = React.memo(
  ({ t = defaultTranslations, currentEmployeeId, onSelectEmployee, iconSize = 'var(--icon-base)', isRecoveringPassword }) => {
    // 1. Precise destructuring: Only listen to what we actually use
    const {
      language,
      showTicker,
      showTickerSales,
      showTickerInventory,
      showTickerCustomers,
      showTickerTopSeller,
    } = useSettings();

    const tickerData = useDynamicTickerData();
    const { employees, isLoading } = useData();
    const { currentShift, isLoading: isShiftLoading } = useShift();

    const isAR = language === 'AR';

    // 2. Smart Memoization: Prepare data outside JSX
    const currentEmployee = useMemo(() => 
      employees.find((e) => e.id === currentEmployeeId),
      [employees, currentEmployeeId]
    );

    const shiftTooltip = useMemo(() => {
      if (isShiftLoading) return isAR ? 'جاري التحميل...' : 'Loading shift...';
      if (!currentShift) return t.shiftClosed || 'Shift Closed';
      
      const openTime = new Date(currentShift.openTime);
      const now = new Date();
      const isSameDay = openTime.toDateString() === now.toDateString();
      const locale = isAR ? 'ar-EG' : 'en-US';

      const timeStr = openTime.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const label = t.shiftOpen || 'Shift Open';
      const since = t.shiftSince || 'Since';

      if (isSameDay) return `${label} ${since} ${timeStr}`;
      
      const dateStr = openTime.toLocaleDateString(isAR ? 'ar-EG' : 'en-GB', {
        day: 'numeric',
        month: 'short',
      });
      return `${label} ${since} ${dateStr} ${timeStr}`;
    }, [currentShift, isShiftLoading, t, isAR]);

    const tickerProps = useMemo(() => ({
      todaySales: t.ticker?.todaySales || 'Today',
      invoices: t.ticker?.invoices || 'Invoices',
      completed: t.ticker?.completed || 'Done',
      pending: t.ticker?.pending || 'Pending',
      lowStock: t.ticker?.lowStock || 'Low Stock',
      shortages: t.ticker?.shortages || 'Shortages',
      newCustomers: t.ticker?.newCustomers || 'New Customers',
      topSeller: t.ticker?.topSeller || 'Top Seller',
    }), [t.ticker]);

    const notificationTranslations = useMemo(() => ({
      notifications: t.notifications || 'Notifications',
      noNotifications: t.noNotifications || 'No notifications',
      clearAll: t.clearAll || 'Clear all',
      dismiss: t.dismiss || 'Dismiss',
      messages: t.messages,
    }), [t]);

    return (
      <div
        id="status-bar"
        dir="ltr"
        className="hidden md:flex items-center justify-between h-6 border-t shrink-0 select-none shadow-xs bg-(--bg-statusbar) border-(--border-primary)"
        style={{ '--status-icon-size': typeof iconSize === 'number' ? `${iconSize}px` : iconSize } as React.CSSProperties}
      >
        {/* Left Section: System & Time */}
        <StatusBarSection>
          <VersionInfo version={t.version} />
          {currentEmployeeId && <SettingsMenu />}
          <ConnectionStatus onlineText={t.online} offlineText={t.offline} />
          {currentEmployeeId && (
            <StatusBarItem
              icon={isShiftLoading ? 'sync' : (currentShift ? 'check_circle' : 'lock')}
              tooltip={shiftTooltip}
              variant={isShiftLoading ? 'default' : (currentShift ? 'success' : 'error')}
              className={isShiftLoading ? 'animate-spin-slow' : ''}
            />
          )}
          <DateTime hideIcon />
          <AlertsAndAds />
        </StatusBarSection>

        {/* Center Section: Flexible Spacer */}
        <div className="flex-1" />

        {/* Right Section: Interactive Items */}
        <StatusBarSection>
          {showTicker && (
            <DynamicTicker
              language={language}
              data={tickerData}
              showSales={showTickerSales}
              showInventory={showTickerInventory}
              showCustomers={showTickerCustomers}
              showTopSeller={showTickerTopSeller}
              t={tickerProps}
            />
          )}

          <QuickLogin
            userName={currentEmployee?.name}
            isLoading={isLoading}
            roleLabel={currentEmployee?.role}
            employees={employees}
            currentEmployeeId={currentEmployeeId}
            onSelectEmployee={onSelectEmployee}
            language={language}
            isRecoveringPassword={isRecoveringPassword}
            t={t.quickLogin}
          />

          <NotificationBell
            language={language}
            t={notificationTranslations}
          />
        </StatusBarSection>
      </div>
    );
  }
);

export default StatusBar;