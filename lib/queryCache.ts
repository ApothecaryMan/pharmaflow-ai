import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { PersistedClient } from '@tanstack/react-query-persist-client';

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

export const queryPersister = {
  async persistClient(client: PersistedClient) {
    const db = await getDB();
    const tx = db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    await store.put({ key: 'react-query-cache', client });
    await tx.done;
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
