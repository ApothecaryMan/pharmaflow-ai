/**
 * Branch Migration Utility
 * 
 * Ensures all existing data without a branchId is stamped with the default branch ID.
 * This is crucial for backward compatibility during the transition to multi-branch.
 */

import { StorageKeys } from '../config/storageKeys';
import { storage } from '../utils/storage';
import { getAllShardKeys } from '../utils/sharding';

const getLegacyDefaultBranchId = (): string => {
  const { branchService } =  require('./branchService'); 
  const branches = branchService.getAll();
  return branches.length > 0 ? branches[0].id : 'branch_main';
};

const DEFAULT_BRANCH_ID = 'branch_main'; // Keep as key, but logic will use first available branch

export const branchMigration = {
  /**
   * Run all migrations
   */
  async runAll(): Promise<void> {
    console.log('Starting branch migration...');
    
    const branches = storage.get<any[]>(StorageKeys.BRANCHES, []);
    const targetBranchId = branches.length > 0 ? branches[0].id : DEFAULT_BRANCH_ID;

    this.migrateInventory(targetBranchId);
    this.migrateSales(targetBranchId);
    this.migrateCustomers(targetBranchId);
    this.migrateEmployees(targetBranchId);
    this.migrateSuppliers(targetBranchId);
    this.migratePurchases(targetBranchId);
    this.migrateReturns(targetBranchId);
    this.migrateBatches(targetBranchId);
    this.migrateShifts(targetBranchId);
    
    console.log(`Branch migration completed using target ID: ${targetBranchId}`);
  },

  migrateInventory(targetId: string): void {
    const items = storage.get<any[]>(StorageKeys.INVENTORY, []);
    let modified = false;
    items.forEach(item => {
      if (!item.branchId || item.branchId === 'branch_main') {
        item.branchId = targetId;
        modified = true;
      }
    });
    if (modified) storage.set(StorageKeys.INVENTORY, items);
  },

  migrateSales(targetId: string): void {
    const keys = getAllShardKeys(StorageKeys.SALES);
    keys.forEach(key => {
      const sales = storage.get<any[]>(key, []);
      let modified = false;
      sales.forEach(sale => {
        if (!sale.branchId || sale.branchId === 'branch_main') {
          sale.branchId = targetId;
          modified = true;
        }
      });
      if (modified) storage.set(key, sales);
    });
  },

  migrateCustomers(targetId: string): void {
    const items = storage.get<any[]>(StorageKeys.CUSTOMERS, []);
    let modified = false;
    items.forEach(item => {
      if (!item.branchId || item.branchId === 'branch_main') {
        item.branchId = targetId;
        modified = true;
      }
    });
    if (modified) storage.set(StorageKeys.CUSTOMERS, items);
  },

  migrateEmployees(targetId: string): void {
    const items = storage.get<any[]>(StorageKeys.EMPLOYEES, []);
    let modified = false;
    items.forEach(item => {
      if (!item.branchId || item.branchId === 'branch_main') {
        item.branchId = targetId;
        modified = true;
      }
    });
    if (modified) storage.set(StorageKeys.EMPLOYEES, items);
  },

  migrateSuppliers(targetId: string): void {
    const items = storage.get<any[]>(StorageKeys.SUPPLIERS, []);
    let modified = false;
    items.forEach(item => {
      if (!item.branchId || item.branchId === 'branch_main') {
        item.branchId = targetId;
        modified = true;
      }
    });
    if (modified) storage.set(StorageKeys.SUPPLIERS, items);
  },

  migratePurchases(targetId: string): void {
    const items = storage.get<any[]>(StorageKeys.PURCHASES, []);
    let modified = false;
    items.forEach(item => {
      if (!item.branchId || item.branchId === 'branch_main') {
        item.branchId = targetId;
        modified = true;
      }
    });
    if (modified) storage.set(StorageKeys.PURCHASES, items);
  },

  migrateReturns(targetId: string): void {
    // Sales Returns
    const sRet = storage.get<any[]>(StorageKeys.RETURNS, []);
    let sModified = false;
    sRet.forEach(r => {
      if (!r.branchId || r.branchId === 'branch_main') {
        r.branchId = targetId;
        sModified = true;
      }
    });
    if (sModified) storage.set(StorageKeys.RETURNS, sRet);

    // Purchase Returns
    const pRet = storage.get<any[]>(StorageKeys.PURCHASE_RETURNS, []);
    let pModified = false;
    pRet.forEach(r => {
      if (!r.branchId || r.branchId === 'branch_main') {
        r.branchId = targetId;
        pModified = true;
      }
    });
    if (pModified) storage.set(StorageKeys.PURCHASE_RETURNS, pRet);
  },

  migrateBatches(targetId: string): void {
    const items = storage.get<any[]>(StorageKeys.STOCK_BATCHES, []);
    let modified = false;
    items.forEach(item => {
      if (!item.branchId || item.branchId === 'branch_main') {
        item.branchId = targetId;
        modified = true;
      }
    });
    if (modified) storage.set(StorageKeys.STOCK_BATCHES, items);
  },

  migrateShifts(targetId: string): void {
    const keys = getAllShardKeys(StorageKeys.SHIFTS);
    keys.forEach(key => {
      const shifts = storage.get<any[]>(key, []);
      let modified = false;
      shifts.forEach(shift => {
        if (!shift.branchId || shift.branchId === 'branch_main') {
          shift.branchId = targetId;
          modified = true;
        }
      });
      if (modified) storage.set(key, shifts);
    });
  }
};
