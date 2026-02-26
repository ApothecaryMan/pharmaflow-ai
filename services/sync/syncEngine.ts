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
      } catch (err) {
        console.error(`📡 Sync Engine: Failed to push action ${action.id}`, err);
        if (action.id) {
          await syncQueueService.updateStatus(action.id, 'failed');
        }
        // Stop processing the queue on first failure to maintain order
        throw err;
      }
    }
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

        // Apply updates locally (Example: Inventory updates)
        for (const update of updates) {
          if (update.type === 'DRUG') {
            await drugCacheService.upsert(update.data);
          }
          // Add more handlers for other entities here
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
