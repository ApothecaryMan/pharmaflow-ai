/**
 * Sync Queue Service - Manages offline actions in IndexedDB.
 * Part of Phase 1: Storage Layer upgrade (Foundation for Phase 2).
 */

import { STORES, runTransaction } from './db';

export type SyncActionType = 
  | 'SALE' 
  | 'RETURN' 
  | 'PURCHASE' 
  | 'STOCK_ADJUSTMENT'
  | 'SALE_TRANSACTION'
  | 'RETURN_TRANSACTION'
  | 'PURCHASE_TRANSACTION'
  | 'PURCHASE_RETURN_TRANSACTION'
  | 'DRUG'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'STOCK_BATCH_UPDATE'
  | 'STOCK_MOVEMENT_LOG';

export interface SyncAction {
  id?: number;
  type: SyncActionType;
  payload: any;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

export const syncQueueService = {
  /**
   * Enqueue a new action for synchronization
   */
  async enqueue(type: SyncActionType, payload: any): Promise<number> {
    const action: SyncAction = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };

    return runTransaction(STORES.SYNC_QUEUE, 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.add(action);

      return new Promise<number>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * Load all pending synchronization actions
   */
  async dequeueAll(): Promise<SyncAction[]> {
    return runTransaction(STORES.SYNC_QUEUE, 'readonly', (transaction) => {
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.getAll();

      return new Promise<SyncAction[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * Remove a successfully synchronized action from the queue
   */
  async clear(id: number): Promise<void> {
    return runTransaction(STORES.SYNC_QUEUE, 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.delete(id);

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * Update the status of an action (e.g., mark as 'syncing' or 'failed')
   */
  async updateStatus(id: number, status: SyncAction['status'], error?: string): Promise<void> {
    return runTransaction(STORES.SYNC_QUEUE, 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const getRequest = store.get(id);

      return new Promise<void>((resolve, reject) => {
        getRequest.onsuccess = () => {
          const action = getRequest.result as SyncAction;
          if (!action) {
            reject(new Error('Action not found in queue'));
            return;
          }

          action.status = status;
          if (status === 'failed') {
            action.retryCount += 1;
          }

          const updateRequest = store.put(action);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    });
  }
};
