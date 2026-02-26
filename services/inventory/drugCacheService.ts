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
   * Bulk save drugs (used for migration or heavy updates)
   */
  async saveAll(drugs: Drug[]): Promise<void> {
    return runTransaction(STORES.DRUGS, 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORES.DRUGS);
      
      // Clear existing records first to ensure consistency during bulk save
      store.clear();

      for (const drug of drugs) {
        store.add(drug);
      }

      return Promise.resolve();
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
  }
};
