import type React from 'react';
import packageJson from '../../../../package.json';
import { StatusBarItem } from '../StatusBarItem';

interface VersionInfoProps {
  version?: string;
  onClick?: () => void;
  tooltip?: string;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({
  version = `v${packageJson.version}`,
  onClick,
  tooltip,
}) => {
  return (
    <StatusBarItem
      icon='info'
      label={version}
      tooltip={tooltip || version}
      onClick={onClick}
      variant='default'
    />
  );
};

export default VersionInfo;
