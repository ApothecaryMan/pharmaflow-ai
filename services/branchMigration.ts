/**
 * Branch Migration Utility
 * 
 * Ensures all existing data without a branchId is stamped with the default branch ID.
 * This is crucial for backward compatibility during the transition to multi-branch.
 */

import { StorageKeys } from '../config/storageKeys';
import { storage } from '../utils/storage';
import { getAllShardKeys } from '../utils/sharding';

const DEFAULT_BRANCH_ID = 'branch_main';

export const branchMigration = {
  /**
   * Run all migrations
   */
  async runAll(): Promise<void> {
    console.log('Starting branch migration...');
    
    this.migrateInventory();
    this.migrateSales();
    this.migrateCustomers();
    this.migrateEmployees();
    this.migrateSuppliers();
    this.migratePurchases();
    this.migrateReturns();
    this.migrateBatches();
    
    console.log('Branch migration completed.');
  },

  migrateInventory(): void {
    const items = storage.get<any[]>(StorageKeys.INVENTORY, []);
    let modified = false;
    items.forEach(item => {
      if (!item.branchId) {
        item.branchId = DEFAULT_BRANCH_ID;
        modified = true;
      }
    });
    if (modified) storage.set(StorageKeys.INVENTORY, items);
  },

  migrateSales(): void {
    const keys = getAllShardKeys(StorageKeys.SALES);
    keys.forEach(key => {
      const sales = storage.get<any[]>(key, []);
      let modified = false;
      sales.forEach(sale => {
        if (!sale.branchId) {
          sale.branchId = DEFAULT_BRANCH_ID;
          modified = true;
        }
      });
      if (modified) storage.set(key, sales);
    });
  },

  migrateCustomers(): void {
    const items = storage.get<any[]>(StorageKeys.CUSTOMERS, []);
    let modified = false;
    items.forEach(item => {
      if (!item.branchId) {
        item.branchId = DEFAULT_BRANCH_ID;
        modified = true;
      }
    });
    if (modified) storage.set(StorageKeys.CUSTOMERS, items);
  },

  migrateEmployees(): void {
    const items = storage.get<any[]>(StorageKeys.EMPLOYEES, []);
    let modified = false;
    items.forEach(item => {
      if (!item.branchId) {
        item.branchId = DEFAULT_BRANCH_ID;
        modified = true;
      }
    });
    if (modified) storage.set(StorageKeys.EMPLOYEES, items);
  },

  migrateSuppliers(): void {
    const items = storage.get<any[]>(StorageKeys.SUPPLIERS, []);
    let modified = false;
    items.forEach(item => {
      if (!item.branchId) {
        item.branchId = DEFAULT_BRANCH_ID;
        modified = true;
      }
    });
    if (modified) storage.set(StorageKeys.SUPPLIERS, items);
  },

  migratePurchases(): void {
    const items = storage.get<any[]>(StorageKeys.PURCHASES, []);
    let modified = false;
    items.forEach(item => {
      if (!item.branchId) {
        item.branchId = DEFAULT_BRANCH_ID;
        modified = true;
      }
    });
    if (modified) storage.set(StorageKeys.PURCHASES, items);
  },

  migrateReturns(): void {
    // Sales Returns
    const sRet = storage.get<any[]>(StorageKeys.RETURNS, []);
    let sModified = false;
    sRet.forEach(r => {
      if (!r.branchId) {
        r.branchId = DEFAULT_BRANCH_ID;
        sModified = true;
      }
    });
    if (sModified) storage.set(StorageKeys.RETURNS, sRet);

    // Purchase Returns
    const pRet = storage.get<any[]>(StorageKeys.PURCHASE_RETURNS, []);
    let pModified = false;
    pRet.forEach(r => {
      if (!r.branchId) {
        r.branchId = DEFAULT_BRANCH_ID;
        pModified = true;
      }
    });
    if (pModified) storage.set(StorageKeys.PURCHASE_RETURNS, pRet);
  },

  migrateBatches(): void {
    const items = storage.get<any[]>(StorageKeys.STOCK_BATCHES, []);
    let modified = false;
    items.forEach(item => {
      if (!item.branchId) {
        item.branchId = DEFAULT_BRANCH_ID;
        modified = true;
      }
    });
    if (modified) storage.set(StorageKeys.STOCK_BATCHES, items);
  }
};
