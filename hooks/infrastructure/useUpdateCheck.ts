import { useCallback, useEffect, useRef, useState } from 'react';
import packageJson from '../../package.json';
import { check as checkTauriUpdate } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { isTauri } from '../../utils/platform';

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  notes?: {
    AR: string;
    EN: string;
  };
  forceUpdate?: boolean;
}

// Minimum time between checks (5 minutes) to prevent spam
const CHECK_COOLDOWN_MS = 5 * 60 * 1000;

export const useUpdateCheck = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReadyToRestart, setIsReadyToRestart] = useState(false);

  const isCheckingRef = useRef(false);
  const lastCheckRef = useRef(0);
  const currentVersion = packageJson.version;
  const isTauriEnv = isTauri();

  const checkForUpdates = useCallback(async (force = false) => {
    // Cooldown: skip if checked recently (unless forced)
    const now = Date.now();
    if (!force && now - lastCheckRef.current < CHECK_COOLDOWN_MS) return;
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;
    lastCheckRef.current = now;
    setIsChecking(true);

    try {
      if (isTauriEnv) {
        // Tauri Desktop Updater
        const tauriUpdate = await checkTauriUpdate();
        if (tauriUpdate) {
          setUpdateInfo({
            version: tauriUpdate.version,
            notes: {
              AR: tauriUpdate.body || 'تحديث جديد متوفر للبرنامج',
              EN: tauriUpdate.body || 'New desktop app update available',
            },
          });
          setHasUpdate(true);
          setIsDownloading(true);

          // Silent download in background
          await tauriUpdate.downloadAndInstall();
          setIsDownloading(false);
          setIsReadyToRestart(true);
        } else {
          setHasUpdate(false);
        }
      } else {
        // Web Browser Updater
        const response = await fetch(`/version.json?t=${now}`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Failed to fetch version info');

        const data: UpdateInfo = await response.json();

        if (data.version !== currentVersion) {
          setUpdateInfo(data);
          setHasUpdate(true);
        } else {
          setHasUpdate(false);
        }
      }
    } catch (error) {
      console.error('[UpdateCheck] Error checking for updates:', error);
      setIsDownloading(false);
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, [isTauriEnv, currentVersion]);

  useEffect(() => {
    // 1. Check once on mount
    checkForUpdates(true);

    // 2. Check when user returns to tab (visibility change)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    };

    // 3. Check when device comes back online
    const onOnline = () => checkForUpdates();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
    };
  }, [checkForUpdates]);

  const performUpdate = useCallback(async () => {
    if (isTauriEnv) {
      if (!isReadyToRestart) return;
      try {
        await relaunch();
      } catch (e) {
        console.error('[Update] Relaunch failed:', e);
      }
      return;
    }

    // Web Fallback
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch (e) {
        console.warn('[Update] Failed to unregister SW:', e);
      }
    }

    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      } catch (e) {
        console.warn('[Update] Failed to clear caches:', e);
      }
    }

    const url = new URL(window.location.href);
    url.searchParams.set('update', Date.now().toString());
    window.location.href = url.toString();
  }, [isTauriEnv, isReadyToRestart]);

  return {
    hasUpdate,
    updateInfo,
    isChecking,
    isDownloading,
    isReadyToRestart,
    checkForUpdates,
    performUpdate,
    currentVersion,
  };
};

