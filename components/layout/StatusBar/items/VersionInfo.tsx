import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAlert, useSettings } from '../../../../context';
import { useUpdateCheck } from '../../../../hooks/infrastructure/useUpdateCheck';
import { TRANSLATIONS } from '../../../../i18n/translations';
import packageJson from '../../../../package.json';
import { useAuthStore } from '../../../../stores/authStore';
import { Tooltip } from '../../../common/Tooltip';
import { hasUnseenChangelog, openChangelog } from '../../../features/updates/changelogEvents';
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
  const { hasUpdate, updateInfo, isDownloading, isReadyToRestart, performUpdate } =
    useUpdateCheck();
  const { language } = useSettings();
  const t = TRANSLATIONS[language]?.updater;
  const notes = updateInfo?.notes;
  const langKey = language === 'AR' ? 'AR' : 'EN';
  const { info: showInfoToast } = useAlert();
  const prevReadyRef = useRef(isReadyToRestart);

  // Non-intrusive "unseen changelog" badge. Derived from the store so it stays
  // in sync when the employee loads at boot or marks a version as seen.
  const currentEmployee = useAuthStore((s) => s.currentEmployee);
  const hasUnseen = hasUnseenChangelog(currentEmployee);

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

  const getButtonText = useCallback(() => {
    if (isDownloading) {
      return t?.downloading || 'Downloading in background...';
    }
    if (isReadyToRestart) {
      return t?.restartNow || 'Restart Now';
    }
    return t?.updateNow || 'Update Now';
  }, [isDownloading, isReadyToRestart, t]);

  const updateContent = useMemo(
    () =>
      hasUpdate && updateInfo ? (
        <div className='flex flex-col gap-2 p-1 min-w-[200px]'>
          <div className='flex items-center justify-between border-b border-(--border-divider) pb-1.5 mb-1'>
            <span className='font-bold text-[11px] text-emerald-500'>
              {t?.updateAvailableTitle || 'New Update Available!'}
            </span>
            <span className='text-[10px] opacity-60'>v{updateInfo.version}</span>
          </div>

          <p className='text-[10px] leading-relaxed opacity-90 whitespace-normal'>
            {notes?.[langKey] ||
              t?.updateAvailableMsg?.replace('{{version}}', updateInfo.version) ||
              `Version ${updateInfo.version}`}
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
    [hasUpdate, updateInfo, isDownloading, performUpdate, getButtonText, t, langKey, version, notes]
  );

  const activeVariant = hasUpdate ? 'success' : hasUnseen ? 'warning' : 'default';

  return (
    <Tooltip
      content={updateContent}
      delay={200}
      position='top'
      className='h-full'
      triggerClassName='h-full'
    >
      <StatusBarItem
        icon={hasUpdate ? 'update' : hasUnseen ? 'event_available' : 'info'}
        label={version}
        tooltip='' // Handled by Tooltip wrapper
        onClick={() => {
          // Manual click always opens the changelog history; fall back to the provided handler.
          openChangelog();
          onClick?.();
        }}
        variant={activeVariant}
        className={hasUpdate ? 'animate-pulse' : ''}
      >
        {hasUnseen && !hasUpdate && (
          <span
            className='absolute top-1 right-1.5 h-2 w-2 rounded-full bg-amber-400 animate-pulse'
            role='img'
            aria-label={t?.appVersion || 'unseen changelog'}
          />
        )}
      </StatusBarItem>
    </Tooltip>
  );
};

export default VersionInfo;
