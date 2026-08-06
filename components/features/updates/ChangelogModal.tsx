import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CURRENT_APP_VERSION } from '../../../config/storageKeys';
import { useSettings } from '../../../context';
import { TRANSLATIONS } from '../../../i18n/translations';
import { useAuthStore } from '../../../stores/authStore';
import { ContextMenuProvider } from '../../common/ContextMenu';
import { Modal } from '../../common/Modal';
import {
  CHANGELOG_ACTIVATE_EVENT,
  type ChangelogActivateDetail,
  compareVersions,
  markChangelogSeen,
} from './changelogEvents';

interface ChangelogEntry {
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

  const [shouldShow, setShouldShow] = useState(false);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(null);
  const [latestEntry, setLatestEntry] = useState<ChangelogEntry | null>(null);

  const loadLatestEntry = useCallback(async (): Promise<ChangelogEntry | null> => {
    let payload: (ChangelogEntry & { history?: ChangelogEntry[] }) | null = null;
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) payload = (await res.json()) as ChangelogEntry & { history?: ChangelogEntry[] };
    } catch (e) {
      console.error('[Changelog] Failed to fetch version info:', e);
    }

    return payload?.version
      ? {
          version: payload.version,
          releaseDate: payload.releaseDate,
          notes: payload.notes,
        }
      : {
          version: CURRENT_APP_VERSION,
          releaseDate: payload?.releaseDate,
          notes: payload?.notes,
        };
  }, []);

  // Activation is event-driven only: a real session boundary (login / switch)
  // or a forced manual open. Never fires on a mid-shift refresh.
  useEffect(() => {
    const onActivate = (e: Event) => {
      const detail = (e as CustomEvent<ChangelogActivateDetail>).detail;
      if (!detail?.employeeId) return;
      const { employeeId, force } = detail;
      const lastSeen =
        detail.lastSeenChangelogVersion ??
        useAuthStore.getState().currentEmployee?.lastSeenChangelogVersion;

      if (!force && !lastSeen) {
        // Brand-new employee (never seen any changelog): stamp silently.
        void markChangelogSeen(employeeId, CURRENT_APP_VERSION);
        return;
      }
      if (!force && lastSeen && compareVersions(CURRENT_APP_VERSION, lastSeen) !== 'newer') {
        return;
      }

      setActiveEmployeeId(employeeId);
      void (async () => {
        const entry = await loadLatestEntry();
        if (!entry) return;
        setLatestEntry(entry);
        setShouldShow(true);
      })();
    };

    window.addEventListener(CHANGELOG_ACTIVATE_EVENT, onActivate);
    return () => window.removeEventListener(CHANGELOG_ACTIVATE_EVENT, onActivate);
  }, [loadLatestEntry]);

  const handleClose = useCallback(() => {
    if (activeEmployeeId) void markChangelogSeen(activeEmployeeId, CURRENT_APP_VERSION);
    setShouldShow(false);
    setActiveEmployeeId(null);
  }, [activeEmployeeId]);

  return (
    <ContextMenuProvider enableGlassEffect={false}>
      <Modal
        isOpen={shouldShow}
        onClose={handleClose}
        title={t?.changelogTitle || (language === 'AR' ? 'ما الجديد؟' : "What's new?")}
        icon='auto_awesome'
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
        <div dir={language === 'AR' ? 'rtl' : 'ltr'} className='max-h-[60vh] overflow-y-auto py-1'>
          {latestEntry && <VersionBlock entry={latestEntry} />}
        </div>
      </Modal>
    </ContextMenuProvider>
  );
};

interface VersionBlockProps {
  entry: ChangelogEntry;
}

const VersionBlock: React.FC<VersionBlockProps> = ({ entry }) => {
  const { language } = useSettings();
  const t = TRANSLATIONS[language]?.updater;
  const langKey = language === 'AR' ? 'AR' : 'EN';

  const notesRaw = entry.notes?.[langKey] || '';

  const headingText =
    language === 'AR'
      ? `ما الجديد في هذه النسخة (v${entry.version})؟`
      : `What's new in this version (v${entry.version})?`;

  const parsed = useMemo(() => {
    const lines = notesRaw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const introLine =
      lines.find(
        (l) => l.includes("What's new in this version") || l.includes('ما الجديد في هذه النسخة')
      ) || lines[0];
    const bullets = lines.filter((l) => l.startsWith('•'));
    return { introLine, bullets };
  }, [notesRaw]);

  const mainNotes =
    parsed.bullets.length > 0
      ? notesRaw
      : notesRaw ||
        t?.changelogFallback ||
        (language === 'AR'
          ? 'تحسينات عامة وتحديثات في استقرار النظام.'
          : 'General improvements and system stability updates.');

  return (
    <div>
      <div className='mb-2 flex items-baseline gap-2'>
        <h3
          className='flex items-center text-xl !font-["GraphicSansFont"] tracking-tight leading-normal'
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
            <span className='relative'>{headingText}</span>
          </span>
        </h3>
        {entry.releaseDate && <span className='text-xs opacity-50'>{entry.releaseDate}</span>}
      </div>

      {parsed.bullets.length > 0 ? (
        <ul className='flex flex-col gap-2.5'>
          {parsed.bullets.map((bullet, i) => (
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
        <p className='text-sm leading-relaxed'>{mainNotes}</p>
      )}
    </div>
  );
};

export default ChangelogModal;
