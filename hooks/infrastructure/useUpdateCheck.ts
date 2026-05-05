import { useState, useEffect, useCallback } from 'react';
import packageJson from '../../package.json';

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  notes: {
    AR: string;
    EN: string;
  };
  forceUpdate: boolean;
}

export const useUpdateCheck = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const currentVersion = packageJson.version;

  const checkForUpdates = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      // Fetch the version.json from public folder (works in both dev and prod)
      const response = await fetch('/version.json?t=' + Date.now(), {
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Failed to fetch version info');
      
      const data: UpdateInfo = await response.json();
      
      // Basic semantic version comparison (assuming standard 2.012 format)
      // For more complex versions, a library like 'semver' would be better
      if (data.version !== currentVersion) {
        setUpdateInfo(data);
        setHasUpdate(true);
      } else {
        setHasUpdate(false);
      }
    } catch (error) {
      console.error('[UpdateCheck] Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  }, [currentVersion, isChecking]);

  useEffect(() => {
    // Initial check
    checkForUpdates();
    
    // Check every 10 minutes
    const interval = setInterval(checkForUpdates, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdates]);

  const performUpdate = useCallback(async () => {
    // 1. Unregister Service Workers to ensure fresh assets
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

    // 2. Clear Caches if possible
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

    // 3. Hard reload with cache-busting timestamp using robust URL API
    const url = new URL(window.location.href);
    url.searchParams.set('update', Date.now().toString());
    window.location.href = url.toString();
  }, []);


  return {
    hasUpdate,
    updateInfo,
    isChecking,
    checkForUpdates,
    performUpdate,
    currentVersion
  };
};
