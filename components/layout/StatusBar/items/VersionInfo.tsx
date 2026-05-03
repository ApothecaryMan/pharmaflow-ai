import React from 'react';
import packageJson from '../../../../package.json';
import { StatusBarItem } from '../StatusBarItem';
import { useUpdateCheck } from '../../../../hooks/infrastructure/useUpdateCheck';
import { Tooltip } from '../../../common/Tooltip';
import { useSettings } from '../../../../context';
import { TRANSLATIONS } from '../../../../i18n/translations';

interface VersionInfoProps {
  version?: string;
  onClick?: () => void;
  tooltip?: string;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({
  version = `v${packageJson.version}`,
  onClick,
}) => {
  const { hasUpdate, updateInfo, performUpdate } = useUpdateCheck();
  const { language } = useSettings();
  const t = TRANSLATIONS[language];

  const updateContent = hasUpdate && updateInfo ? (
    <div className="flex flex-col gap-2 p-1 min-w-[200px]">
      <div className="flex items-center justify-between border-b border-(--border-divider) pb-1.5 mb-1">
        <span className="font-bold text-[11px] text-green-500">
          {language === 'AR' ? 'تحديث جديد متاح!' : 'New Update Available!'}
        </span>
        <span className="text-[10px] opacity-60">v{updateInfo.version}</span>
      </div>
      
      <p className="text-[10px] leading-relaxed opacity-90 whitespace-normal">
        {language === 'AR' ? updateInfo.notes.AR : updateInfo.notes.EN}
      </p>

      <div className="flex gap-2 mt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            performUpdate();
          }}
          className="flex-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-[10px] font-medium transition-colors cursor-pointer"
        >
          {language === 'AR' ? 'تحديث الآن' : 'Update Now'}
        </button>
      </div>
    </div>
  ) : (
    <span>{language === 'AR' ? 'نسخة النظام' : 'App Version'}: {version}</span>
  );

  return (
    <Tooltip content={updateContent} delay={200} position="top">
      <StatusBarItem
        icon={hasUpdate ? "zap" : "info"}
        label={version}
        tooltip="" // Handled by Tooltip wrapper
        onClick={onClick}
        variant={hasUpdate ? "success" : "default"}
        className={hasUpdate ? "animate-pulse" : ""}
      />
    </Tooltip>
  );
};

export default VersionInfo;
