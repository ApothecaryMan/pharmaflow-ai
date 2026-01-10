import React from 'react';
import { StatusBarItem } from '../StatusBarItem';
import { useStatusBar } from '../StatusBarContext';

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
      label={state.isOnline ? onlineText : offlineText}
      variant={state.isOnline ? 'success' : 'error'}
      tooltip={state.isOnline ? onlineText : offlineText}
    />
  );
};

export default ConnectionStatus;
