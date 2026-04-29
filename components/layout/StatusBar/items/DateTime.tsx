import React, { useEffect, useState, useMemo } from 'react';
import { useSettings } from '../../../../context/SettingsContext';
import { useStatusBar } from '../StatusBarContext';
import { StatusBarItem } from '../StatusBarItem';

interface DateTimeProps {
  format?: 'date' | 'time' | 'datetime';
  showSeconds?: boolean;
  use24Hour?: boolean;
  locale?: string;
  hideIcon?: boolean;
}

export const DateTime: React.FC<DateTimeProps> = ({
  format = 'datetime',
  showSeconds = false,
  use24Hour = false,
  locale: manualLocale,
  hideIcon = false,
}) => {
  const { textLocale } = useSettings();
  const locale = manualLocale || textLocale;
  const { getVerifiedDate, state } = useStatusBar();
  const [now, setNow] = useState(getVerifiedDate());

  useEffect(() => {
    const timer = setInterval(() => setNow(getVerifiedDate()), showSeconds ? 1000 : 60000);
    return () => clearInterval(timer);
  }, [showSeconds, getVerifiedDate]);

  const displayLabel = useMemo(() => {
    const dateOpts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const timeOpts: Intl.DateTimeFormatOptions = {
      hour: '2-digit', minute: '2-digit',
      ...(showSeconds && { second: '2-digit' }),
      hour12: !use24Hour,
    };

    if (format === 'date') return now.toLocaleDateString(locale, dateOpts);
    if (format === 'time') return now.toLocaleTimeString(locale, timeOpts);
    return `${now.toLocaleDateString(locale, dateOpts)} ${now.toLocaleTimeString(locale, timeOpts)}`;
  }, [now, locale, format, showSeconds, use24Hour]);

  const status = useMemo(() => {
    const isVerified = state.isOnline && state.timeSynced;
    const isTrusted = !state.isOnline && state.timeSynced;

    return {
      icon: isVerified ? 'verified' : isTrusted ? 'verified_user' : 'schedule',
      variant: (isVerified ? 'success' : isTrusted ? 'warning' : 'error') as 'success' | 'warning' | 'error',
      tooltip: isVerified 
        ? 'Exact time from server' 
        : isTrusted 
          ? `Offline Mode (Time Verified) • Last synced: ${state.lastSyncTime ? new Date(state.lastSyncTime).toLocaleTimeString() : 'Unknown'}`
          : 'Unverified Device Time'
    };
  }, [state.isOnline, state.timeSynced, state.lastSyncTime]);

  return (
    <StatusBarItem
      icon={hideIcon ? undefined : (format === 'date' ? 'calendar_today' : status.icon)}
      label={displayLabel}
      variant={status.variant}
      tooltip={status.tooltip}
    />
  );
};

export default DateTime;
