import type React from 'react';
import { useEffect, useState } from 'react';
import { CURRENT_APP_VERSION, StorageKeys } from '../../../config/storageKeys';
import { useSettings } from '../../../context';
import { TRANSLATIONS } from '../../../i18n/translations';
import { ContextMenuProvider } from '../../common/ContextMenu';
import { Modal } from '../../common/Modal';

interface ChangelogNote {
  version: string;
  releaseDate?: string;
  notes?: {
    AR: string;
    EN: string;
  };
}

export const ChangelogModal: React.FC = () => {
  const { language } = useSettings();
  const t = TRANSLATIONS[language]?.updater;
  const [versionInfo, setVersionInfo] = useState<ChangelogNote | null>(null);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const seen = localStorage.getItem(StorageKeys.CHANGELOG_SEEN);

    // Brand-new install (no marker ever set): stamp silently, never show.
    if (!seen) {
      localStorage.setItem(StorageKeys.CHANGELOG_SEEN, CURRENT_APP_VERSION);
      return;
    }

    // Already viewed this exact version this cycle.
    if (seen === CURRENT_APP_VERSION) return;

    // Upgrade detected (seen an older version): fetch notes, then show.
    (async () => {
      let info: ChangelogNote | null = null;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) info = (await res.json()) as ChangelogNote;
      } catch (e) {
        console.error('[Changelog] Failed to fetch version info:', e);
      }

      if (cancelled) return;
      setVersionInfo(info);
      setShouldShow(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = () => {
    localStorage.setItem(StorageKeys.CHANGELOG_SEEN, CURRENT_APP_VERSION);
    setShouldShow(false);
  };

  const langKey = language === 'AR' ? 'AR' : 'EN';
  const displayedVersion = versionInfo?.version || CURRENT_APP_VERSION;
  const notes =
    versionInfo?.notes?.[langKey] ||
    t?.changelogFallback ||
    (language === 'AR'
      ? 'تحسينات عامة وتحديثات في استقرار النظام.'
      : 'General improvements and system stability updates.');
  const releaseDate = versionInfo?.releaseDate;

  return (
    <ContextMenuProvider enableGlassEffect={false}>
      <Modal
        isOpen={shouldShow}
        onClose={handleClose}
        title={t?.changelogTitle || (language === 'AR' ? 'ما الجديد؟' : "What's new?")}
        subtitle={`v${displayedVersion}${releaseDate ? ` • ${releaseDate}` : ''}`}
        icon='campaign'
        size='lg'
        preventSidebar
        closeOnBackdropClick
        backdropStyle={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
        zIndex={60}
        footer={
          <button
            type='button'
            onClick={handleClose}
            className='w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-sm font-semibold transition-colors cursor-pointer'
          >
            {t?.changelogGotIt || (language === 'AR' ? 'ممتاز' : 'Got it')}
          </button>
        }
      >
        <div
          dir={language === 'AR' ? 'rtl' : 'ltr'}
          className='text-sm leading-relaxed whitespace-pre-line text-center py-2'
        >
          {notes}
        </div>
      </Modal>
    </ContextMenuProvider>
  );
};

export default ChangelogModal;
