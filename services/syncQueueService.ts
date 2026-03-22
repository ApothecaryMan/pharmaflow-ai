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
  branchId: string;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  lastError?: string;
}

export const DLQ_MAX_RETRIES = 3;

/**
 * Reads the active branchId from session storage.
 * Used as a fallback when callers don't provide branchId explicitly.
 */
const getActiveBranchId = (): string => {
  try {
    const raw = localStorage.getItem('branch_pilot_session');
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.branchId) return session.branchId;
    }
  } catch { /* ignore */ }
  // Secondary fallback: active branch setting
  try {
    const raw = localStorage.getItem('pharma_active_branch_id');
    if (raw) return raw;
  } catch { /* ignore */ }
  return 'UNKNOWN_BRANCH';
};

export const syncQueueService = {
  /**
   * Enqueue a new action for synchronization.
   * @param type - The type of sync action
   * @param payload - The action payload
   * @param branchId - Optional explicit branchId. If not provided, reads from active session.
   */
  async enqueue(type: SyncActionType, payload: any, branchId?: string): Promise<number> {
    const effectiveBranchId = branchId || getActiveBranchId();
    const action: SyncAction = {
      type,
      payload,
      branchId: effectiveBranchId,
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
            if (error) {
              action.lastError = error;
            }
          }

          // Important: Don't put it back in queue if we're moving it to DLQ
          if (status === 'failed' && action.retryCount >= DLQ_MAX_RETRIES) {
            resolve(); // Resolve this update, the DLQ move will happen asynchronously next
            syncQueueService.moveToDLQ(id).catch(console.error);
            return;
          }

          const updateRequest = store.put(action);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    });
  },

  /**
   * Move a failed action to the Dead Letter Queue (DLQ)
   */
  async moveToDLQ(id: number): Promise<void> {
    return runTransaction([STORES.SYNC_QUEUE, STORES.SYNC_DLQ], 'readwrite', (transaction) => {
      const queueStore = transaction.objectStore(STORES.SYNC_QUEUE);
      const dlqStore = transaction.objectStore(STORES.SYNC_DLQ);
      
      const getRequest = queueStore.get(id);

      return new Promise<void>((resolve, reject) => {
        getRequest.onsuccess = () => {
          const action = getRequest.result as SyncAction;
          if (!action) {
            reject(new Error('Action not found in queue to move to DLQ'));
            return;
          }

          const addRequest = dlqStore.add(action);
          addRequest.onsuccess = () => {
            const deleteRequest = queueStore.delete(id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          };
          addRequest.onerror = () => reject(addRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    });
  },

  /**
   * Load all actions from the DLQ
   */
  async getDLQActions(): Promise<SyncAction[]> {
    return runTransaction(STORES.SYNC_DLQ, 'readonly', (transaction) => {
      const store = transaction.objectStore(STORES.SYNC_DLQ);
      const request = store.getAll();

      return new Promise<SyncAction[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * Move an action from DLQ back to the active queue to retry
   */
  async retryDLQAction(id: number): Promise<void> {
    return runTransaction([STORES.SYNC_QUEUE, STORES.SYNC_DLQ], 'readwrite', (transaction) => {
      const queueStore = transaction.objectStore(STORES.SYNC_QUEUE);
      const dlqStore = transaction.objectStore(STORES.SYNC_DLQ);
      
      const getRequest = dlqStore.get(id);

      return new Promise<void>((resolve, reject) => {
        getRequest.onsuccess = () => {
          const action = getRequest.result as SyncAction;
          if (!action) {
            reject(new Error('Action not found in DLQ'));
            return;
          }

          action.status = 'pending';
          action.retryCount = 0; // Reset retries

          const addRequest = queueStore.add(action);
          addRequest.onsuccess = () => {
            const deleteRequest = dlqStore.delete(id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          };
          addRequest.onerror = () => reject(addRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    });
  },

  /**
   * Permanently delete an action from the DLQ
   */
  async clearDLQAction(id: number): Promise<void> {
    return runTransaction(STORES.SYNC_DLQ, 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORES.SYNC_DLQ);
      const request = store.delete(id);

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }
};
