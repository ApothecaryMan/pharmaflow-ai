# Read-Only Offline Mode Refactor

This document outlines the proposed changes to transition the application from an Offline-First (Write-Heavy) approach to a strictly Read-Only Offline Mode, preventing race conditions and negative stock issues.

## 1. Network Status Utility & Hook

**File:** `src/hooks/useNetworkStatus.ts`
(You can also place `isOnline()` in a utility file like `src/utils/network.ts` if preferred, but placing it together here is convenient for React apps).

```typescript
import { useState, useEffect } from 'react';

// Centralised function that can be imported anywhere
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

// React hook for UI components to reactively show statuses
export function useNetworkStatus() {
  const [online, setOnline] = useState<boolean>(isOnline());

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline: online };
}
```

---

## 2. Refactored `syncQueueService.ts`

**File:** `src/services/syncQueueService.ts`

We strip out the Dead Letter Queue (DLQ) logic entirely and add an active network check before queueing any operational writes.

```typescript
import { STORES, runTransaction } from './db';
import { isOnline } from '../hooks/useNetworkStatus';

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

const getActiveBranchId = (): string => {
  try {
    const raw = localStorage.getItem('branch_pilot_session');
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.branchId) return session.branchId;
    }
  } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem('pharma_active_branch_id');
    if (raw) return raw;
  } catch { /* ignore */ }
  return 'UNKNOWN_BRANCH';
};

export const syncQueueService = {
  /**
   * Enqueue a new action for synchronization.
   * BLOCKS WRITE OPERATIONS IF OFFLINE.
   */
  async enqueue(type: SyncActionType, payload: any, branchId?: string): Promise<number> {
    // 1. Enforce strict network check
    if (!isOnline()) {
      throw new Error("Operations cannot be processed without an internet connection. Please check your network.");
    }

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
   * Update the status of an action
   * DLQ Fallback has been removed. Failed actions must be handled synchronously / via UI alerts.
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

          const updateRequest = store.put(action);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    });
  }
};
```

---

## 3. Example POS UI Integration

**File:** `src/pages/POSPage.tsx` (Example Component)

```tsx
import React, { useState } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
// import { syncQueueService } from '../services/syncQueueService'; 

export default function POSPage() {
  const { isOnline } = useNetworkStatus();
  const [cart, setCart] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCheckout = async () => {
    // UI Level Network Check (Graceful fallback)
    if (!isOnline) {
      setErrorMsg("Sales cannot be processed without an internet connection. Please check your network.");
      return;
    }

    try {
      // Example integration: syncQueueService will also throw internally if offline
      // await syncQueueService.enqueue('SALE', { items: cart });
      alert("Sale Processed Successfully!");
      setCart([]);
      setErrorMsg('');
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="pos-container p-4">
      {/* Offline Warning Banner */}
      {!isOnline && (
        <div className="bg-red-500 text-white p-3 mb-4 rounded-md text-center font-bold">
          ⚠️ You are currently offline. Processing new sales is disabled until connection is restored.
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-100 text-red-700 p-3 mb-4 rounded-md">
          {errorMsg}
        </div>
      )}

      <h2>Point of Sale</h2>
      
      {/* Checkout Button: Disabled when offline */}
      <button 
        onClick={handleCheckout} 
        disabled={!isOnline || cart.length === 0}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Complete Sale
      </button>
    </div>
  );
}
```
