/**
 * Drug Cache Service - Handles drug-specific operations in IndexedDB.
 * Part of Phase 1: Storage Layer upgrade.
 */

import { STORES, runTransaction } from '../db';
import type { Drug } from '../../types';

export const drugCacheService = {
  /**
   * Load all drugs from IndexedDB
   */
  async loadAll(): Promise<Drug[]> {
    return runTransaction(STORES.DRUGS, 'readonly', (transaction) => {
      const store = transaction.objectStore(STORES.DRUGS);
      const request = store.getAll();

      return new Promise<Drug[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * Load drugs filtered by branchId using the IndexedDB index (V4+)
   */
  async loadByBranch(branchId: string): Promise<Drug[]> {
    return runTransaction(STORES.DRUGS, 'readonly', (transaction) => {
      const store = transaction.objectStore(STORES.DRUGS);
      const index = store.index('branchId');
      const request = index.getAll(branchId);

      return new Promise<Drug[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * Bulk save drugs for a specific branch.
   * SAFE: Only deletes existing records for THIS branch before inserting new data.
   * Other branches' data is preserved.
   */
  async saveAll(drugs: Drug[], branchId?: string): Promise<void> {
    return runTransaction(STORES.DRUGS, 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORES.DRUGS);

      if (branchId) {
        // Branch-aware: Delete only this branch's drugs, then insert new ones
        const index = store.index('branchId');
        const cursorRequest = index.openKeyCursor(branchId);

        return new Promise<void>((resolve, reject) => {
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
              store.delete(cursor.primaryKey);
              cursor.continue();
            } else {
              // All branch-specific records deleted; now insert the new batch
              for (const drug of drugs) {
                store.put(drug);
              }
              resolve();
            }
          };
          cursorRequest.onerror = () => reject(cursorRequest.error);
        });
      } else {
        // Legacy fallback: upsert all (no clear!)
        for (const drug of drugs) {
          store.put(drug);
        }
        return Promise.resolve();
      }
    });
  },

  /**
   * Add or update a single drug record (Differential Write)
   */
  async upsert(drug: Drug): Promise<void> {
    return runTransaction(STORES.DRUGS, 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORES.DRUGS);
      const request = store.put(drug);

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * Remove a single drug record
   */
  async remove(id: string): Promise<void> {
    return runTransaction(STORES.DRUGS, 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORES.DRUGS);
      const request = store.delete(id);

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * Get drug by ID
   */
  async getById(id: string): Promise<Drug | null> {
    return runTransaction(STORES.DRUGS, 'readonly', (transaction) => {
      const store = transaction.objectStore(STORES.DRUGS);
      const request = store.get(id);

      return new Promise<Drug | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * Bulk update stock quantities in a single IndexedDB transaction.
   * Reads each drug by ID, applies the delta, and writes back — all in one transaction.
   */
  async updateStockBulk(mutations: { id: string; quantity: number }[]): Promise<void> {
    if (mutations.length === 0) return;

    return runTransaction(STORES.DRUGS, 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORES.DRUGS);

      return new Promise<void>((resolve, reject) => {
        let completed = 0;
        const total = mutations.length;

        const checkDone = () => {
          completed++;
          if (completed === total) resolve();
        };

        for (const mutation of mutations) {
          const getReq = store.get(mutation.id);
          getReq.onsuccess = () => {
            const drug = getReq.result as Drug | undefined;
            if (drug) {
              // BUG-S2: Prevent negative stock in persistence layer\n              drug.stock = Math.max(0, (drug.stock || 0) + mutation.quantity);
              const putReq = store.put(drug);
              putReq.onsuccess = checkDone;
              putReq.onerror = () => reject(putReq.error);
            } else {
              checkDone();
            }
          };
          getReq.onerror = () => reject(getReq.error);
        }
      });
    });
  }
};
