import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useAlert, useSettings } from '../../../../context';
import { useUpdateCheck } from '../../../../hooks/infrastructure/useUpdateCheck';
import { TRANSLATIONS } from '../../../../i18n/translations';
import packageJson from '../../../../package.json';
import { Tooltip } from '../../../common/Tooltip';
import { StatusBarItem } from '../StatusBarItem';

interface VersionInfoProps {
  version?: string;
  onClick?: () => void;
  tooltip?: string;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({
  version = `v${packageJson.version}`,
  onClick,
}) => {
  const { hasUpdate, updateInfo, isDownloading, isReadyToRestart, performUpdate } = useUpdateCheck();
  const { language } = useSettings();
  const t = TRANSLATIONS[language]?.updater;
  const notes = updateInfo?.notes;
  const langKey = language === 'AR' ? 'AR' : 'EN';
  const { info: showInfoToast } = useAlert();
  const prevReadyRef = useRef(isReadyToRestart);

  useEffect(() => {
    if (isReadyToRestart && !prevReadyRef.current) {
      showInfoToast(
        t?.updateAvailableMsg?.replace('{{version}}', updateInfo?.version || '') ||
          `Update v${updateInfo?.version} ready — restart to apply`,
        t?.updateAvailableTitle || 'Update Ready'
      );
    }
    prevReadyRef.current = isReadyToRestart;
  }, [isReadyToRestart, updateInfo?.version, showInfoToast, t]);

  const getButtonText = () => {
    if (isDownloading) {
      return t?.downloading || 'Downloading in background...';
    }
    if (isReadyToRestart) {
      return t?.restartNow || 'Restart Now';
    }
    return t?.updateNow || 'Update Now';
  };

  const updateContent = useMemo(() =>
    hasUpdate && updateInfo ? (
      <div className='flex flex-col gap-2 p-1 min-w-[200px]'>
        <div className='flex items-center justify-between border-b border-(--border-divider) pb-1.5 mb-1'>
          <span className='font-bold text-[11px] text-emerald-500'>
            {t?.updateAvailableTitle || 'New Update Available!'}
          </span>
          <span className='text-[10px] opacity-60'>v{updateInfo.version}</span>
        </div>

        <p className='text-[10px] leading-relaxed opacity-90 whitespace-normal'>
          {notes?.[langKey] || t?.updateAvailableMsg?.replace('{{version}}', updateInfo.version) || `Version ${updateInfo.version}`}
        </p>

        <div className='flex gap-2 mt-1'>
          <button
            onClick={(e) => {
              e.stopPropagation();
              performUpdate();
            }}
            disabled={isDownloading}
            className='flex-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 rounded text-[10px] font-semibold transition-colors cursor-pointer'
            type='button'
          >
            {getButtonText()}
          </button>
        </div>
      </div>
    ) : (
      <span>
        {t?.appVersion || 'App Version'}: {version}
      </span>
    ),
  [hasUpdate, updateInfo, isDownloading, isReadyToRestart, performUpdate, t, langKey, version]);

  return (
    <Tooltip
      content={updateContent}
      delay={200}
      position='top'
      className='h-full'
      triggerClassName='h-full'
    >
      <StatusBarItem
        icon={hasUpdate ? 'update' : 'info'}
        label={version}
        tooltip='' // Handled by Tooltip wrapper
        onClick={onClick}
        variant={hasUpdate ? 'success' : 'default'}
        className={hasUpdate ? 'animate-pulse' : ''}
      />
    </Tooltip>
  );
};

export default VersionInfo;
