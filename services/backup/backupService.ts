/**
 * Backup Service - Handles full application data export and import.
 * Captures both localStorage (pharma_ keys) and IndexedDB stores.
 */

import { STORES, runTransaction } from '../db';

interface BackupData {
  version: string;
  timestamp: string;
  localStorage: Record<string, any>;
  indexedDB: {
    [key: string]: any[];
  };
}

const BACKUP_VERSION = '2.0.0';

/** Stores that should NOT be restored — they contain ephemeral/transient data */
const SKIP_RESTORE_STORES = new Set<string>([STORES.SYNC_QUEUE]);

export const backupService = {
  /**
   * Export all application data to a JSON file
   */
  async exportBackup(): Promise<void> {
    const backup: BackupData = {
      version: BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      localStorage: {},
      indexedDB: {},
    };

    const relevantPrefixes = ['pharma', 'pos', 'receipt', 'pharmaflow'];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && relevantPrefixes.some(p => key.startsWith(p))) {
        try {
          const value = localStorage.getItem(key);
          backup.localStorage[key] = value ? JSON.parse(value) : null;
        } catch (e) {
          // Fallback for non-JSON strings
          backup.localStorage[key] = localStorage.getItem(key);
        }
      }
    }

    // 2. Capture IndexedDB
    const storeNames = Object.values(STORES);
    for (const storeName of storeNames) {
      const data = await runTransaction(storeName, 'readonly', (transaction) => {
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        return new Promise<any[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
      backup.indexedDB[storeName] = data;
    }

    // 3. Trigger Download (compact JSON to reduce file size)
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    
    link.href = url;
    link.download = `pharmaflow_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Import application data from a JSON file
   */
  async importBackup(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const backup: BackupData = JSON.parse(content);

          // Validation
          if (!backup.version || !backup.localStorage || !backup.indexedDB) {
            throw new Error('Invalid backup file format');
          }

          // Version mismatch warning (does not block the restore)
          if (backup.version !== BACKUP_VERSION) {
            console.warn(`[Backup] Version mismatch: file=${backup.version}, app=${BACKUP_VERSION}. Proceeding with caution.`);
          }

          // 1. Clear Current localStorage (all relevant prefixes)
          const relevantPrefixes = ['pharma', 'pos', 'receipt', 'pharmaflow'];
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && relevantPrefixes.some(p => key.startsWith(p))) keysToRemove.push(key);
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));

          // 2. Restore localStorage
          Object.entries(backup.localStorage).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
          });

          // 3. Restore IndexedDB
          for (const [storeName, data] of Object.entries(backup.indexedDB)) {
            // Skip ephemeral stores (sync_queue contains stale mutations)
            if (SKIP_RESTORE_STORES.has(storeName)) {
              console.log(`[Backup] Skipping restore of ephemeral store: ${storeName}`);
              continue;
            }

            await runTransaction(storeName, 'readwrite', (transaction) => {
              // Guard: skip if store doesn't exist in current DB schema
              if (!transaction.db.objectStoreNames.contains(storeName)) {
                console.warn(`[Backup] Store "${storeName}" not found in DB. Skipping.`);
                return Promise.resolve();
              }

              const store = transaction.objectStore(storeName);

              return new Promise<void>((res, rej) => {
                const clearReq = store.clear();
                clearReq.onsuccess = () => {
                  for (const item of data) {
                    store.add(item);
                  }
                  res();
                };
                clearReq.onerror = () => rej(clearReq.error);
              });
            });
          }

          // Reload first, resolve is irrelevant after reload
          window.location.reload();
          resolve(true);
        } catch (err) {
          console.error('Backup Import Failed:', err);
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  }
};
