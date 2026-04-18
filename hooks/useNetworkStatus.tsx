import { useState, useEffect } from 'react';
import { checkRealConnectivity, NetworkResult } from '@/utils/network';

export function useNetworkStatus(): { isOnline: boolean; latency: number | undefined; checking: boolean } {
  const [networkInfo, setNetworkInfo] = useState<NetworkResult>({ online: true, latency: undefined });
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    const checkStatus = async () => {
      const result = await checkRealConnectivity();
      if (isMounted) {
        setNetworkInfo(result);
        setChecking(false);
      }
    };

    // Initial check
    checkStatus();

    // Setup polling every 10 seconds
    pollInterval = setInterval(checkStatus, 10000);

    const handleWindowEvents = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setNetworkInfo({ online: false, latency: undefined });
      } else {
        if (isMounted) setChecking(true);
        checkStatus();
      }
    };

    window.addEventListener('online', handleWindowEvents);
    window.addEventListener('offline', handleWindowEvents);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('online', handleWindowEvents);
      window.removeEventListener('offline', handleWindowEvents);
    };
  }, []);

  return { 
    isOnline: networkInfo.online, 
    latency: networkInfo.latency, 
    checking 
  };
}
