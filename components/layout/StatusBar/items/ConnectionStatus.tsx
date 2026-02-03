import type React from 'react';
import { useStatusBar } from '../StatusBarContext';
import { StatusBarItem } from '../StatusBarItem';

interface ConnectionStatusProps {
  onlineText?: string;
  offlineText?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  onlineText = 'Online',
  offlineText = 'Offline',
}) => {
  const { state } = useStatusBar();

  return (
    <StatusBarItem
      icon={state.isOnline ? 'wifi' : 'wifi_off'}
      variant={state.isOnline ? 'success' : 'error'}
      tooltip={state.isOnline ? onlineText : offlineText}
    />
  );
};

export default ConnectionStatus;
