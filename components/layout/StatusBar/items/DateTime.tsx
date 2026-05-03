import React, { useEffect, useState, useMemo } from 'react';
import { useSettings } from '../../../../context/SettingsContext';
import { useStatusBar } from '../StatusBarContext';
import { StatusBarItem } from '../StatusBarItem';
import { 
  formatLocalizedDateTime, 
  DATE_OPTS_SHORT, 
  getTimeOpts, 
  getCombinedDateTimeOpts 
} from '../../../../utils/dateFormatter';

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
  const { numeralLocale } = useSettings();
  const locale = manualLocale || numeralLocale;
  const { getVerifiedDate, state } = useStatusBar();
  const [now, setNow] = useState(getVerifiedDate());

  useEffect(() => {
    const timer = setInterval(() => setNow(getVerifiedDate()), showSeconds ? 1000 : 60000);
    return () => clearInterval(timer);
  }, [showSeconds, getVerifiedDate]);

  const timeOpts = useMemo(() => getTimeOpts(showSeconds, use24Hour), [showSeconds, use24Hour]);
  const combinedOpts = useMemo(() => getCombinedDateTimeOpts(showSeconds, use24Hour), [showSeconds, use24Hour]);

  const displayLabel = useMemo(() => {
    return formatLocalizedDateTime(
      now, 
      locale, 
      format === 'date' ? DATE_OPTS_SHORT : format === 'time' ? timeOpts : combinedOpts,
      format
    );
  }, [now, locale, format, timeOpts, combinedOpts]);

  const status = useMemo(() => {
    const isVerified = state.isOnline && state.timeSynced;
    const isTrusted = !state.isOnline && state.timeSynced;

    return {
      icon: isVerified ? 'verified' : isTrusted ? 'verified_user' : 'schedule',
      variant: (isVerified ? 'success' : isTrusted ? 'warning' : 'error') as 'success' | 'warning' | 'error',
      tooltip: isVerified 
        ? 'Exact time from server' 
        : isTrusted 
          ? `Offline Mode (Time Verified) • Last synced: ${state.lastSyncTime ? formatLocalizedDateTime(state.lastSyncTime, locale, timeOpts, 'time') : 'Unknown'}`
          : 'Unverified Device Time'
    };
  }, [state.isOnline, state.timeSynced, state.lastSyncTime, locale, timeOpts]);

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
