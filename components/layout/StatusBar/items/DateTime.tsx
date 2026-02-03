import type React from 'react';
import { useEffect, useState } from 'react';
import { useStatusBar } from '../StatusBarContext';
import { StatusBarItem } from '../StatusBarItem';

interface DateTimeProps {
  /** Date format: 'date', 'time', 'datetime' */
  format?: 'date' | 'time' | 'datetime';
  /** Whether to show seconds in time */
  showSeconds?: boolean;
  /** Whether to use 24-hour format */
  use24Hour?: boolean;
  /** Locale for formatting */
  locale?: string;
  /** Whether to hide the icon */
  hideIcon?: boolean;
}

/*
 * DATE TIME COMPONENT
 * -------------------
 * Visualizes the Verified Time system.
 *
 * - Green Check: Online + Synced (Verified)
 * - Orange Check/Shield: Offline + Synced Offset (Trusted)
 * - Red Warning: Unverified System Time
 */
export const DateTime: React.FC<DateTimeProps> = ({
  format = 'datetime',
  showSeconds = false,
  use24Hour = false,
  locale = 'en-US',
  hideIcon = false,
}) => {
  const { getVerifiedDate, state } = useStatusBar();
  const [now, setNow] = useState(getVerifiedDate());

  useEffect(() => {
    const interval = setInterval(
      () => {
        setNow(getVerifiedDate());
      },
      showSeconds ? 1000 : 60000
    );

    return () => clearInterval(interval);
  }, [showSeconds, getVerifiedDate]);

  const formatDate = () => {
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds && { second: '2-digit' }),
      hour12: !use24Hour,
    };

    switch (format) {
      case 'date':
        return now.toLocaleDateString(locale, dateOptions);
      case 'time':
        return now.toLocaleTimeString(locale, timeOptions);
      case 'datetime':
      default:
        return `${now.toLocaleDateString(locale, dateOptions)} ${now.toLocaleTimeString(locale, timeOptions)}`;
    }
  };

  const getIcon = () => {
    switch (format) {
      case 'date':
        return 'calendar_today';
      case 'time':
      case 'datetime':
      default:
        // Online & Synced = Verified (Green)
        if (state.isOnline && state.timeSynced) return 'verified';
        // Offline & Synced = Trusted (Orange)
        if (!state.isOnline && state.timeSynced) return 'verified_user';
        // Unverified = Warning (Red)
        return 'schedule';
    }
  };

  const getStatusColor = () => {
    if (state.isOnline && state.timeSynced) return 'success';
    if (!state.isOnline && state.timeSynced) return 'warning'; // Orange/Yellow for offline but verified
    return 'error'; // Red for unverified
  };

  const getTooltip = () => {
    if (state.isOnline && state.timeSynced) return '✅ Exact time from server';
    if (!state.isOnline && state.timeSynced) {
      const lastSync = state.lastSyncTime
        ? new Date(state.lastSyncTime).toLocaleTimeString()
        : 'Unknown';
      return `⚠️ Offline Mode (Time Verified) • Last synced: ${lastSync}`;
    }
    return '❌ Unverified Device Time';
  };

  return (
    <StatusBarItem
      icon={hideIcon ? undefined : getIcon()}
      label={formatDate()}
      variant={getStatusColor()}
      tooltip={getTooltip()}
    />
  );
};

export default DateTime;
