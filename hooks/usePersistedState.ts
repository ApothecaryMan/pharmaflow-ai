import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import type { StorageKeys } from '../config/storageKeys';
import { storage } from '../utils/storage';

/**
 * A hook that syncs state with localStorage.
 *
 * @param key The storage key from StorageKeys enum (or string)
 * @param initialValue The initial value if nothing is in storage
 * @returns [state, setState] pair, same as useState
 */
export function usePersistedState<T>(
  key: StorageKeys | string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // Initialize state from storage
  const [state, setState] = useState<T>(() => {
    return storage.get(key, initialValue);
  });

  // Sync state changes to storage
  useEffect(() => {
    storage.set(key, state);
  }, [key, state]);

  // Optional: Listen for external changes (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // If the key matches and there is a new value
      if (e.key === key && e.newValue) {
        try {
          // Check if value is actually different to avoid infinite loops
          const currentJSON = JSON.stringify(state);
          if (e.newValue === currentJSON) return;

          const newValue = JSON.parse(e.newValue);
          setState(newValue);
        } catch (err) {
          console.error('Failed to parse storage update for', key);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, state]);

  return [state, setState];
}
