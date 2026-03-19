/**
 * Sync Engine - Coordinates background synchronization between local and remote.
 * "Sleeper" architecture: only activates when VITE_API_BASE_URL is set.
 */

import { apiClient, isApiConfigured } from '../api/client';
import { syncQueueService } from '../syncQueueService';
import { drugCacheService } from '../inventory/drugCacheService';
import { storage } from '../../utils/storage';

const SYNC_INTERVAL = 30000; // 30 seconds
const LAST_SYNC_KEY = 'pharma_last_sync_timestamp';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

class SyncEngine {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private onStatusChange: ((status: SyncStatus) => void) | null = null;

  /**
   * Start the sync loop if API is configured
   */
  public start(callback?: (status: SyncStatus) => void) {
    if (callback) this.onStatusChange = callback;

    if (!isApiConfigured()) {
      console.log('📡 Sync Engine: Staying dormant (No API URL configured)');
      this.updateStatus('idle');
      return;
    }

    console.log('📡 Sync Engine: Starting...');
    
    // Initial sync
    this.sync();

    // Setup periodic sync
    this.timer = setInterval(() => this.sync(), SYNC_INTERVAL);

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('📡 Sync Engine: Back online, triggering sync');
      this.sync();
    });
    
    window.addEventListener('offline', () => {
      this.updateStatus('offline');
    });

    if (!navigator.onLine) {
      this.updateStatus('offline');
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
  }

  /**
   * Main sync orchidestrator
   */
  private async sync() {
    if (this.isProcessing || !navigator.onLine || !isApiConfigured()) return;

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
    const pendingActions = await syncQueueService.dequeueAll();
    if (pendingActions.length === 0) return;

    console.log(`📡 Sync Engine: Pushing ${pendingActions.length} actions...`);

    for (const action of pendingActions) {
      try {
        if (!action.id) continue;

        // Mark as syncing in local DB
        await syncQueueService.updateStatus(action.id, 'syncing');

        // Call the API
        // Endpoint structure depends on backend implementation, 
        // using a generic /sync/push here.
        await apiClient.post('/sync/push', action);

        // Success: Clear from queue
        await syncQueueService.clear(action.id);
      } catch (err: any) {
        console.error(`📡 Sync Engine: Failed to push action ${action.id}`, err);
        if (action.id) {
          const errorMessage = err?.message || 'Unknown network error';
          await syncQueueService.updateStatus(action.id, 'failed', errorMessage);
          
          // Determine if error is permanent (4xx) or transient (5xx, network)
          const isPermanentError = err?.status >= 400 && err?.status < 500;
          
          if (isPermanentError) {
            console.log(`📡 Sync Engine: Permanent error detected for action ${action.id}. Skipping to next action.`);
            // Continue processing the rest of the queue
            continue;
          } else {
            console.log(`📡 Sync Engine: Transient error detected for action ${action.id}. Stopping queue to maintain order.`);
            // Stop processing on transient/network failure
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
    const lastSync = storage.get<string>(LAST_SYNC_KEY, '1970-01-01T00:00:00.000Z');
    
    console.log(`📡 Sync Engine: Pulling updates since ${lastSync}...`);

    try {
      // Using generic /sync/pull endpoint
      const response = await apiClient.get<{ 
        updates: any[], 
        timestamp: string 
      }>('/sync/pull', { since: lastSync });

      if (response.status === 200 && response.data.updates.length > 0) {
        const { updates, timestamp } = response.data;
        
        console.log(`📡 Sync Engine: Received ${updates.length} updates`);

        // Apply updates locally
        for (const update of updates) {
          switch (update.type) {
            case 'DRUG':
              await drugCacheService.upsert(update.data);
              break;
            case 'STOCK_BATCH':
              // Update local batches from server
              const allBatches = storage.get<any[]>('pharma_stock_batches', []);
              const updatedBatch = update.data;
              const index = allBatches.findIndex(b => b.id === updatedBatch.id);
              if (index !== -1) {
                allBatches[index] = updatedBatch;
              } else {
                allBatches.push(updatedBatch);
              }
              storage.set('pharma_stock_batches', allBatches);
              break;
            case 'STOCK_MOVEMENT':
              // Update local movements from server
              const allMovements = storage.get<any[]>('pharma_stock_movements', []);
              const newMovement = update.data;
              if (!allMovements.find(m => m.id === newMovement.id)) {
                allMovements.push(newMovement);
                storage.set('pharma_stock_movements', allMovements);
              }
              break;
          }
        }

        // Update last sync timestamp
        storage.set(LAST_SYNC_KEY, timestamp);
      }
    } catch (err) {
      console.error('📡 Sync Engine: Failed to pull updates', err);
      // Don't throw here as push might have succeeded
    }
  }

  private updateStatus(status: SyncStatus) {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }
}

export const syncEngine = new SyncEngine();
