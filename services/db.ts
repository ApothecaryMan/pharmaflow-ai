/**
 * Database utility for managing IndexedDB connection and schema.
 * Part of Phase 1: Storage Layer upgrade.
 */

const DB_NAME = 'pharmaflow_db';
const DB_VERSION = 3;

export const STORES = {
  DRUGS: 'drugs',
  SYNC_QUEUE: 'sync_queue',
  SYNC_DLQ: 'sync_dlq',
  EMPLOYEES: 'employees',
} as const;

let db: IDBDatabase | null = null;

/**
 * Initialize and open the database
 */
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Drugs store
      if (!database.objectStoreNames.contains(STORES.DRUGS)) {
        const drugStore = database.createObjectStore(STORES.DRUGS, { keyPath: 'id' });
        drugStore.createIndex('barcode', 'barcode', { unique: false });
        drugStore.createIndex('name', 'name', { unique: false });
        drugStore.createIndex('genericName', 'genericName', { unique: false });
        drugStore.createIndex('category', 'category', { unique: false });
      }

      // Sync Queue store
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        database.createObjectStore(STORES.SYNC_QUEUE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
      }

      // Sync DLQ (Dead Letter Queue) store
      if (!database.objectStoreNames.contains(STORES.SYNC_DLQ)) {
        database.createObjectStore(STORES.SYNC_DLQ, { 
          keyPath: 'id', 
          autoIncrement: false // Preserve original Queue ID structure
        });
      }

      // Employees store
      if (!database.objectStoreNames.contains(STORES.EMPLOYEES)) {
        const employeeStore = database.createObjectStore(STORES.EMPLOYEES, { keyPath: 'id' });
        employeeStore.createIndex('username', 'username', { unique: true });
        employeeStore.createIndex('employeeCode', 'employeeCode', { unique: true });
        employeeStore.createIndex('branchId', 'branchId', { unique: false });
      }
    };
  });
};

/**
 * Run a transaction on one or more stores
 */
export const runTransaction = async <T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  callback: (transaction: IDBTransaction) => Promise<T> | T
): Promise<T> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, mode);
    
    transaction.oncomplete = () => {
      // Transaction completed successfully
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    try {
      const result = callback(transaction);
      if (result instanceof Promise) {
        result.then(resolve).catch(reject);
      } else {
        resolve(result);
      }
    } catch (err) {
      reject(err);
    }
  });
};
