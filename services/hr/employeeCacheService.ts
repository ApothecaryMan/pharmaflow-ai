/**
 * Employee Cache Service - Handles employee-specific operations in IndexedDB.
 * Part of Phase 1: Storage Layer upgrade.
 */

import { STORES, runTransaction } from '../db';
import type { Employee } from '../../types';

export const employeeCacheService = {
  /**
   * Load all employees from IndexedDB
   */
  async loadAll(): Promise<Employee[]> {
    return runTransaction(STORES.EMPLOYEES, 'readonly', (transaction) => {
      const store = transaction.objectStore(STORES.EMPLOYEES);
      const request = store.getAll();

      return new Promise<Employee[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * Bulk save employees (used for migration or heavy updates)
   */
  async saveAll(employees: Employee[]): Promise<void> {
    return runTransaction(STORES.EMPLOYEES, 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORES.EMPLOYEES);
      
      // Clear existing records first to ensure consistency during bulk save
      store.clear();

      for (const employee of employees) {
        store.add(employee);
      }

      return Promise.resolve();
    });
  },

  /**
   * Add or update a single employee record (Differential Write)
   */
  async upsert(employee: Employee): Promise<void> {
    return runTransaction(STORES.EMPLOYEES, 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORES.EMPLOYEES);
      const request = store.put(employee);

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * Remove a single employee record
   */
  async remove(id: string): Promise<void> {
    return runTransaction(STORES.EMPLOYEES, 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORES.EMPLOYEES);
      const request = store.delete(id);

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * Get employee by ID
   */
  async getById(id: string): Promise<Employee | null> {
    return runTransaction(STORES.EMPLOYEES, 'readonly', (transaction) => {
      const store = transaction.objectStore(STORES.EMPLOYEES);
      const request = store.get(id);

      return new Promise<Employee | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  },
};
