import React, { useMemo } from 'react';
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

  const status = useMemo(() => {
    if (!isOnline) {
      return { 
        icon: 'wifi_off', 
        variant: 'error' as const, 
        tooltip: offlineText, 
        pulse: true 
      };
    }

    if (checking) {
      return { 
        icon: 'wifi', 
        variant: 'default' as const, 
        tooltip: 'Checking connection...', 
        pulse: false 
      };
    }

    // Determine quality based on latency
    const isGood = latency === undefined || latency < 150;
    const isFair = latency !== undefined && latency >= 150 && latency < 400;
    const isPoor = latency !== undefined && latency >= 400;

    return {
      icon: isPoor ? 'network_wifi_1_bar' : isFair ? 'network_wifi_2_bar' : 'wifi',
      variant: isGood ? 'success' as const : 'warning' as const,
      tooltip: `${onlineText}${latency !== undefined ? ` - ${latency}ms (${isGood ? 'Good' : isFair ? 'Fair' : 'Poor'})` : ''}`,
      pulse: isPoor
    };
  }, [isOnline, latency, checking, onlineText, offlineText]);

  return (
    <StatusBarItem
      icon={status.icon}
      variant={status.variant}
      tooltip={status.tooltip}
      className={status.pulse ? 'animate-pulse opacity-80' : ''}
    />
  );
};

export default ConnectionStatus;
