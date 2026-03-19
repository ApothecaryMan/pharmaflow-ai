/**
 * Sync Engine - Coordinates background synchronization between local and remote.
 * "Sleeper" architecture: only activates when VITE_API_BASE_URL is set.
 */

import { apiClient, isApiConfigured } from '../api/client';
import { syncQueueService } from '../syncQueueService';
import { drugCacheService } from '../inventory/drugCacheService';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';

const SYNC_INTERVAL = 30000; // 30 seconds
const LAST_SYNC_KEY_PREFIX = 'pharma_last_sync_';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

class SyncEngine {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private onStatusChange: ((status: SyncStatus) => void) | null = null;
  private activeBranchId: string | null = null;

  /**
   * Start the sync loop if API is configured
   */
  public start(branchId: string, callback?: (status: SyncStatus) => void) {
    this.activeBranchId = branchId;
    if (callback) this.onStatusChange = callback;

    if (!isApiConfigured()) {
      console.log('📡 Sync Engine: Staying dormant (No API URL configured)');
      this.updateStatus('idle');
      return;
    }

    console.log(`📡 Sync Engine: Starting for branch ${branchId}...`);
    
    // Initial sync
    this.sync();

    // Setup periodic sync
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.sync(), SYNC_INTERVAL);

    // Listen for online/offline events
    window.removeEventListener('online', this.handleOnline);
    window.addEventListener('online', this.handleOnline);
    
    window.removeEventListener('offline', this.handleOffline);
    window.addEventListener('offline', this.handleOffline);

    if (!navigator.onLine) {
      this.updateStatus('offline');
    }
  }

  private handleOnline = () => {
    console.log('📡 Sync Engine: Back online, triggering sync');
    this.sync();
  };

  private handleOffline = () => {
    this.updateStatus('offline');
  };

  /**
   * Update the active branch without restarting the loop (if needed)
   */
  public updateBranch(branchId: string) {
    if (this.activeBranchId !== branchId) {
      console.log(`📡 Sync Engine: Switching context to branch ${branchId}`);
      this.activeBranchId = branchId;
      this.sync(); // Trigger immediate sync for new branch
    }
  }

  /**
   * Stop the sync loop
   */
  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  /**
   * Main sync orchidestrator
   */
  private async sync() {
    if (this.isProcessing || !navigator.onLine || !isApiConfigured() || !this.activeBranchId) return;

    this.isProcessing = true;
    this.updateStatus('syncing');

    try {
      // 1. Push: Process the sync queue
      await this.processQueue();

      // 2. Pull: Fetch updates from server
      await this.pullUpdates();

      this.updateStatus('idle');
    } catch (error) {
      console.error('📡 Sync Engine Error:', error);
      this.updateStatus('error');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Push pending actions to the server
   */
  private async processQueue() {
    if (!this.activeBranchId) return;
    const pendingActions = await syncQueueService.dequeueAll();
    // In multi-branch, we only push actions belonging to CURRENT branch 
    // OR actions without a branch (global items like DRUG cache updates)
    const branchActions = pendingActions.filter(a => !a.branchId || a.branchId === this.activeBranchId);
    
    if (branchActions.length === 0) return;

    console.log(`📡 Sync Engine: Pushing ${branchActions.length} actions for branch ${this.activeBranchId}...`);

    for (const action of branchActions) {
      try {
        if (!action.id) continue;

        // Mark as syncing in local DB
        await syncQueueService.updateStatus(action.id, 'syncing');

        // Call the API with branch context
        await apiClient.post('/sync/push', {
          ...action,
          branchId: this.activeBranchId
        });

        // Success: Clear from queue
        await syncQueueService.clear(action.id);
      } catch (err: any) {
        console.error(`📡 Sync Engine: Failed to push action ${action.id}`, err);
        if (action.id) {
          const errorMessage = err?.message || 'Unknown network error';
          await syncQueueService.updateStatus(action.id, 'failed', errorMessage);
          
          const isPermanentError = err?.status >= 400 && err?.status < 500;
          if (isPermanentError) {
            continue;
          } else {
            throw err;
          }
        }
      }
    }
  }

  /**
   * Get the current count of items in the Dead Letter Queue
   */
  public async getDLQCount(): Promise<number> {
    const dlqActions = await syncQueueService.getDLQActions();
    return dlqActions.length;
  }

  /**
   * Pull changes from the server
   */
  private async pullUpdates() {
    if (!this.activeBranchId) return;
    const syncKey = `${LAST_SYNC_KEY_PREFIX}${this.activeBranchId}`;
    const lastSync = storage.get<string>(syncKey, '1970-01-01T00:00:00.000Z');
    
    console.log(`📡 Sync Engine: Pulling updates for branch ${this.activeBranchId} since ${lastSync}...`);

    try {
      const response = await apiClient.get<{ 
        updates: any[], 
        timestamp: string 
      }>('/sync/pull', { 
        since: lastSync,
        branchId: this.activeBranchId 
      });

      if (response.status === 200 && response.data.updates.length > 0) {
        const { updates, timestamp } = response.data;
        
        console.log(`📡 Sync Engine: Received ${updates.length} updates for branch ${this.activeBranchId}`);

        // Apply updates locally
        for (const update of updates) {
          // Double Guard: Only apply if it belongs to this branch OR is global
          if (update.data?.branchId && update.data.branchId !== this.activeBranchId) {
            console.warn(`📡 Sync Engine: Skipped cross-branch update for ${update.type}`);
            continue;
          }

          switch (update.type) {
            case 'DRUG':
              await drugCacheService.upsert(update.data);
              break;
            case 'STOCK_BATCH':
              const allBatches = storage.get<any[]>(StorageKeys.STOCK_BATCHES, []);
              const updatedBatch = update.data;
              const bIndex = allBatches.findIndex(b => b.id === updatedBatch.id);
              if (bIndex !== -1) {
                allBatches[bIndex] = updatedBatch;
              } else {
                allBatches.push(updatedBatch);
              }
              storage.set(StorageKeys.STOCK_BATCHES, allBatches);
              break;
            case 'STOCK_MOVEMENT':
              const allMovements = storage.get<any[]>(StorageKeys.STOCK_MOVEMENTS, []);
              const newMovement = update.data;
              if (!allMovements.find(m => m.id === newMovement.id)) {
                allMovements.push(newMovement);
                storage.set(StorageKeys.STOCK_MOVEMENTS, allMovements);
              }
              break;
          }
        }

        // Update branch-specific last sync timestamp
        storage.set(syncKey, timestamp);
      }
    } catch (err) {
      console.error('📡 Sync Engine: Failed to pull updates', err);
    }
  }

  private updateStatus(status: SyncStatus) {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }
}

export const syncEngine = new SyncEngine();
