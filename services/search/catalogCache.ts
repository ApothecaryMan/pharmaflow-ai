import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface DrugCatalogItem {
  id: string;
  nameAr?: string;
  nameEn: string;
  barcode?: string;
  activeSubstance?: string;
  category?: string;
  publicPrice: number;
  manufacturer?: string;
  genericName?: string[];
  updatedAt: string;
}

interface CatalogDB extends DBSchema {
  drugs: {
    key: string;
    value: DrugCatalogItem;
    indexes: {
      by_barcode: string;
      by_active_substance: string;
      by_price: number;
      by_updated_at: string;
    };
  };
  meta: {
    key: string;
    value: { key: string; last_sync: string; total_count: number };
  };
}

const DB_NAME = 'pharmaflow_catalog';
const DB_VERSION = 1;

export async function openCatalogDB(): Promise<IDBPDatabase<CatalogDB>> {
  return openDB<CatalogDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('drugs', { keyPath: 'id' });
      store.createIndex('by_barcode', 'barcode', { unique: false });
      store.createIndex('by_active_substance', 'activeSubstance', { unique: false });
      store.createIndex('by_price', 'publicPrice', { unique: false });
      store.createIndex('by_updated_at', 'updatedAt', { unique: false });

      db.createObjectStore('meta', { keyPath: 'key' });
    }
  });
}

/**
 * Save full catalog or updates to IndexedDB (Batch Write)
 */
export async function saveCatalogToDB(
  db: IDBPDatabase<CatalogDB>,
  drugs: DrugCatalogItem[]
): Promise<void> {
  const tx = db.transaction(['drugs', 'meta'], 'readwrite');
  const store = tx.objectStore('drugs');
  const metaStore = tx.objectStore('meta');

  await Promise.all([
    ...drugs.map(d => store.put(d)),
    metaStore.put({
      key: 'catalog_meta',
      last_sync: new Date().toISOString(),
      total_count: drugs.length // Note: This might need adjustment if doing delta updates
    })
  ]);
  
  await tx.done;
}

/**
 * Load full catalog from IndexedDB
 */
export async function loadCatalogFromDB(
  db: IDBPDatabase<CatalogDB>
): Promise<DrugCatalogItem[]> {
  return db.getAll('drugs');
}

/**
 * Get Last Sync Time for Delta Updates
 */
export async function getLastSyncTime(
  db: IDBPDatabase<CatalogDB>
): Promise<string | null> {
  const meta = await db.get('meta', 'catalog_meta');
  return meta?.last_sync ?? null;
}
