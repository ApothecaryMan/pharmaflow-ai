import type React from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus.tsx';
import { StatusBarItem } from '../StatusBarItem';

interface ConnectionStatusProps {
  onlineText?: string;
  offlineText?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  onlineText = 'Online',
  offlineText = 'Offline',
}) => {
  const { isOnline, latency, checking } = useNetworkStatus();

  let icon = 'wifi_off';
  let variant: 'success' | 'warning' | 'error' | 'default' = 'error';
  let tooltip = offlineText;

  if (checking && isOnline) {
    icon = 'wifi';
    variant = 'default';
    tooltip = 'Checking connection...';
  } else if (isOnline) {
    if (latency !== undefined) {
      if (latency < 150) {
        icon = 'wifi';
        variant = 'success';
        tooltip = `${onlineText} - ${latency}ms (Good)`;
      } else if (latency < 400) {
        icon = 'network_wifi_2_bar';
        variant = 'warning';
        tooltip = `${onlineText} - ${latency}ms (Fair)`;
      } else {
        icon = 'network_wifi_1_bar';
        variant = 'warning';
        tooltip = `${onlineText} - ${latency}ms (Poor)`;
      }
    } else {
      icon = 'wifi';
      variant = 'success';
      tooltip = onlineText;
    }
  }

  // Use base classes but optionally pulse if offline or connection is poor.
  // Using animate-pulse conditionally makes it feel very dynamic.
  const isPoorOrOffline = !isOnline || (isOnline && (latency || 0) >= 400 && !checking);

  return (
    <StatusBarItem
      icon={icon}
      variant={variant}
      tooltip={tooltip}
      className={isPoorOrOffline ? 'animate-pulse opacity-80' : ''}
    />
  );
};

export default ConnectionStatus;
