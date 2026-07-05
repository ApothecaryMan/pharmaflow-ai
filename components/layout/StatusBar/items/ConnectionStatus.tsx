import { memo, useMemo } from 'react';
import type React from 'react';
import { useNetworkStatus } from '@/hooks/common/useNetworkStatus';
import { StatusBarItem } from '../StatusBarItem';

interface ConnectionStatusProps {
  onlineText?: string;
  offlineText?: string;
  noInternetText?: string;
  checkingText?: string;
  goodText?: string;
  fairText?: string;
  poorText?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = memo(({
  onlineText = 'Online',
  offlineText = 'No Connection',
  noInternetText = 'No Internet',
  checkingText = 'Checking connection...',
  goodText = 'Good',
  fairText = 'Fair',
  poorText = 'Poor',
}) => {
  const { status, latency, checking } = useNetworkStatus();

  const itemStatus = useMemo(() => {
    if (status === 'offline-device') {
      return {
        icon: 'wifi_off',
        variant: 'error' as const,
        tooltip: offlineText,
        label: offlineText,
        pulse: true,
      };
    }

    if (status === 'offline-no-internet') {
      return {
        icon: 'wifi_find',
        variant: 'warning' as const,
        tooltip: noInternetText,
        label: noInternetText,
        pulse: true,
      };
    }

    if (checking) {
      return {
        icon: 'wifi',
        variant: 'default' as const,
        tooltip: checkingText,
        label: undefined,
        pulse: false,
      };
    }

    const isGood = latency === undefined || latency < 150;
    const isFair = latency !== undefined && latency >= 150 && latency < 400;
    const isPoor = latency !== undefined && latency >= 400;

    return {
      icon: isPoor ? 'wifi_1_bar' : isFair ? 'wifi_2_bar' : 'wifi',
      variant: isGood ? ('success' as const) : ('warning' as const),
      tooltip: `${onlineText}${latency !== undefined ? ` — ${latency}ms (${isGood ? goodText : isFair ? fairText : poorText})` : ''}`,
      label: undefined,
      pulse: isPoor,
    };
  }, [status, latency, checking, onlineText, offlineText, noInternetText, checkingText, goodText, fairText, poorText]);

  return (
    <StatusBarItem
      icon={itemStatus.icon}
      variant={itemStatus.variant}
      tooltip={itemStatus.tooltip}
      label={itemStatus.label}
      className={itemStatus.pulse ? 'motion-safe:animate-pulse opacity-80' : ''}
    />
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';

export default ConnectionStatus;
