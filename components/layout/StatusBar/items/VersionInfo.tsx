import React from 'react';
import { StatusBarItem } from '../StatusBarItem';

interface VersionInfoProps {
  version?: string;
  onClick?: () => void;
  tooltip?: string;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({
  version = 'v1.0.0',
  onClick,
  tooltip,
}) => {
  return (
    <StatusBarItem
      icon="info"
      label={version}
      tooltip={tooltip || version}
      onClick={onClick}
      variant="default"
    />
  );
};

export default VersionInfo;
