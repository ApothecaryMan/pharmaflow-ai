import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

interface CacheEntry {
  key: string;
  client: PersistedClient;
}

interface PersistDB extends DBSchema {
  cache: {
    key: string;
    value: CacheEntry;
  };
}

const DB_NAME = 'pharmaflow_query_cache';
const DB_VERSION = 1;
const PERSIST_DEBOUNCE_MS = 2000;

let dbInstance: IDBPDatabase<PersistDB> | null = null;

async function getDB(): Promise<IDBPDatabase<PersistDB>> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<PersistDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
    },
  });
  return dbInstance;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let latestClient: PersistedClient | null = null;
let debouncePromise: Promise<void> | null = null;
let resolveDebounce: (() => void) | null = null;

export const queryPersister = {
  persistClient(client: PersistedClient) {
    latestClient = client;

    if (debounceTimer) return debouncePromise!;

    debouncePromise = new Promise<void>((resolve) => {
      resolveDebounce = resolve;
      debounceTimer = setTimeout(async () => {
        debounceTimer = null;
        const clientToPersist = latestClient;
        latestClient = null;

        try {
          const db = await getDB();
          const tx = db.transaction('cache', 'readwrite');
          const store = tx.objectStore('cache');
          await store.put({ key: 'react-query-cache', client: clientToPersist });
          await tx.done;
        } finally {
          resolveDebounce?.();
          resolveDebounce = null;
          debouncePromise = null;
        }
      }, PERSIST_DEBOUNCE_MS);
    });

    return debouncePromise;
  },

  async restoreClient(): Promise<PersistedClient | undefined> {
    const db = await getDB();
    const entry = await db.get('cache', 'react-query-cache');
    return entry?.client;
  },

  async removeClient() {
    const db = await getDB();
    await db.delete('cache', 'react-query-cache');
  },
};
