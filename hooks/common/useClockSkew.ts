import { useCallback, useEffect, useState } from 'react';
import { StorageKeys } from '../../config/storageKeys';
import { storage } from '../../utils/storage';

const CLOCK_SKEW_THRESHOLD = 5 * 60 * 1000;

export function useClockSkew() {
  const [hasClockSkew, setHasClockSkew] = useState<boolean>(() => {
    const storedOffset = storage.get<string | number | null>(StorageKeys.TIME_OFFSET, null);
    if (storedOffset !== null) {
      const offset = typeof storedOffset === 'number' ? storedOffset : parseInt(storedOffset, 10);
      return Number.isNaN(offset) ? false : Math.abs(offset) > CLOCK_SKEW_THRESHOLD;
    }
    return false;
  });

  const [offset, setOffset] = useState<number>(0);

  const handleClockSkew = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    setHasClockSkew(true);
    setOffset(typeof detail === 'number' ? detail : 0);
  }, []);

  useEffect(() => {
    window.addEventListener('pharma_clock_skew', handleClockSkew);
    return () => window.removeEventListener('pharma_clock_skew', handleClockSkew);
  }, [handleClockSkew]);

  const dismiss = useCallback(() => {
    setHasClockSkew(false);
  }, []);

  return { hasClockSkew, offset, dismiss };
}
