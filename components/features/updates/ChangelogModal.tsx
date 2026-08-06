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

  // Parse notes into a heading + list of bullet points.
  const lines = notes
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const introLine =
    lines.find(
      (l) => l.includes("What's new in this version") || l.includes('ما الجديد في هذه النسخة')
    ) || lines[0];
  const bullets = lines.filter(
    (l) => l.startsWith('•') || l.startsWith('• ') || l.startsWith('\u2022')
  );

  const headingWithVersion =
    language === 'AR'
      ? `ما الجديد في هذه النسخة (v${displayedVersion})؟`
      : `What's new in this version (v${displayedVersion})?`;
  const heading = introLine ? headingWithVersion : '';

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
        <div dir={language === 'AR' ? 'rtl' : 'ltr'} className='flex flex-col gap-1.5 py-1'>
          {heading && (
            <h3
              className='mb-3 flex items-center text-xl !font-["GraphicSansFont"] tracking-tight leading-normal'
              style={{
                fontFeatureSettings:
                  '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1',
              }}
            >
              <span className='relative'>
                <span
                  aria-hidden='true'
                  className='absolute inset-x-[-8px] inset-y-[-3px] origin-center -rotate-[0.5deg] rounded-lg bg-gradient-to-r from-emerald-400/45 via-amber-300/55 to-sky-400/45 blur-[1px]'
                  style={{
                    clipPath:
                      'polygon(2% 0%, 98% 4%, 100% 40%, 96% 100%, 60% 96%, 30% 100%, 0% 92%, 2% 45%)',
                    animation: 'changelog-highlight 2.4s ease-in-out infinite',
                  }}
                />
                <span className='relative'>{heading}</span>
              </span>
            </h3>
          )}

          {bullets.length > 0 ? (
            <ul className='flex flex-col gap-2.5'>
              {bullets.map((bullet, i) => (
                <li key={`${i}-${bullet}`} className='flex items-start gap-2.5 leading-snug'>
                  <span className='mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'>
                    <svg
                      className='h-2.5 w-2.5'
                      viewBox='0 0 16 16'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      aria-hidden='true'
                    >
                      <path d='M3 8.5 6.5 12 13 4' />
                    </svg>
                  </span>
                  <span className='text-sm'>{bullet.replace(/^•\s*/, '')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-sm leading-relaxed'>{notes}</p>
          )}
        </div>
      </Modal>
    </ContextMenuProvider>
  );
};

export default ChangelogModal;
