import { branchService } from '../branchService';
import { salesService } from '../sales/salesService';
import { inventoryService } from '../inventory/inventoryService';
import { employeeService } from '../hr/employeeService';
import { orgService } from './orgService';

export interface OrgMetrics {
  totalSales: number;
  totalRevenue: number;
  todayRevenue: number;
  totalBranches: number;
  activeStaffCount: number;
  totalInventoryValue: number;
  lastUpdated: string; // ISO String
}

export interface OrgData {
  metrics: OrgMetrics;
  branches: any[];
  employees: any[];
  managers: any[];
  staff: any[];
}

const DB_NAME = 'PharmaFlow_OrgDB';
const STORE_NAME = 'OrgMetricsCache';
const DB_VERSION = 1;

/**
 * Lightweight Native IndexedDB Wrapper for caching aggregated metrics
 */
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'orgId' });
      }
    };
  });
};

const cacheMetrics = async (orgId: string, metrics: OrgMetrics): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ orgId, ...metrics });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to cache org metrics in IndexedDB', error);
  }
};

export const getCachedMetrics = async (orgId: string): Promise<OrgMetrics | null> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(orgId);

      request.onsuccess = () => resolve(request.result ? (request.result as OrgMetrics) : null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to get cached org metrics', error);
    return null;
  }
};

/**
 * Aggregates heavy multibranch metrics without completely freezing the UI
 * by yielding to the event loop optionally, or doing it asynchronously.
 */
export const aggregateOrgMetrics = async (orgId: string, bypassCache = false): Promise<OrgMetrics> => {
  if (!bypassCache) {
    const cached = await getCachedMetrics(orgId);
    if (cached) {
      const lastUpdate = new Date(cached.lastUpdated).getTime();
      const now = new Date().getTime();
      const fiveMinutes = 5 * 60 * 1000;

      // If cache is fresh (less than 5 mins old), use it
      if (now - lastUpdate < fiveMinutes) {
        return cached;
      }
      
      // If stale, return cached but trigger background refresh
      setTimeout(() => calculateAndCacheMetrics(orgId), 100);
      return cached;
    }
  }

  return calculateAndCacheMetrics(orgId);
};

const calculateAndCacheMetrics = async (orgId: string): Promise<OrgMetrics> => {
  const branches = await branchService.getAll(orgId);
  
  let totalSales = 0;
  let totalRevenue = 0;
  let todayRevenue = 0;
  let totalInventoryValue = 0;
  
  const today = new Date().toISOString().split('T')[0];

  // Fetch 'all' from sales and inventory once.
  // Use try-catch for individual heavy fetches to prevent total failure
  let allSales: any[] = [];
  let allInventory: any[] = [];

  try {
    allSales = await salesService.getAll('all');
  } catch (err) {
    console.error('Failed to fetch sales for org metrics:', err);
  }

  try {
    allInventory = await inventoryService.getAllBranches();
  } catch (err) {
    console.error('Failed to fetch inventory for org metrics:', err);
  }

  // Group data by branchId for O(1) lookups in the loop
  const salesByBranch: Record<string, any[]> = {};
  const inventoryByBranch: Record<string, any[]> = {};

  for (const s of allSales) {
    if (s.branchId) {
      if (!salesByBranch[s.branchId]) salesByBranch[s.branchId] = [];
      salesByBranch[s.branchId].push(s);
    }
  }

  for (const i of allInventory) {
    if (i.branchId) {
      if (!inventoryByBranch[i.branchId]) inventoryByBranch[i.branchId] = [];
      inventoryByBranch[i.branchId].push(i);
    }
  }

  for (const branch of branches) {
    const branchSales = salesByBranch[branch.id] || [];
    totalSales += branchSales.length;
    totalRevenue += branchSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    
    // Today's sales
    const branchTodaySales = branchSales.filter(s => s.date && s.date.startsWith(today));
    todayRevenue += branchTodaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);

    const branchInventory = inventoryByBranch[branch.id] || [];
    totalInventoryValue += branchInventory.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || item.stock || 0)), 0);
  }

  // Active staff count (real count of employees across all org branches)
  const allEmployees = await employeeService.getAll('ALL');
  const branchIds = new Set(branches.map(b => b.id));
  const activeStaffCount = allEmployees.filter(e => e.branchId && branchIds.has(e.branchId)).length;

  const metrics: OrgMetrics = {
    totalSales,
    totalRevenue,
    todayRevenue,
    totalBranches: branches.length,
    activeStaffCount,
    totalInventoryValue,
    lastUpdated: new Date().toISOString()
  };

  await cacheMetrics(orgId, metrics);
  return metrics;
};

/**
 * Aggregates all data for the Organization Management Page
 */
export const orgAggregationService = {
  aggregateOrgMetrics,
  aggregateOrgData: async (orgId: string): Promise<OrgData> => {
    // 1. Fetch metrics (forced bypass cache once to clear old mock data)
    const metrics = await aggregateOrgMetrics(orgId, true);
    
    // 2. Fetch branches for this org
    const branches = await branchService.getAll(orgId);
    const branchIds = new Set(branches.map(b => b.id));
    
    // 3. Fetch all employees and filter by those belonging to the org's branches
    const allEmployees = await employeeService.getAll('ALL');
    const branchEmployees = allEmployees.filter(e => e.branchId && branchIds.has(e.branchId));
    
    // 4. Fetch org members to get their roles (owner/admin/member)
    const members = await orgService.getMembers(orgId);
    const memberRoleMap: Record<string, string> = {};
    for (const m of members) {
      memberRoleMap[m.userId] = m.role;
    }
    
    // 5. Merge roles and split into Managers (has account) and Staff (no account)
    const allMappedEmployees = branchEmployees.map(e => ({
      ...e,
      orgRole: e.userId ? memberRoleMap[e.userId] : undefined
    }));

    const managers = allMappedEmployees.filter(e => !!e.userId);
    const staff = allMappedEmployees.filter(e => !e.userId);
    
    return {
      metrics,
      branches,
      employees: allMappedEmployees, // Keep original for backward compatibility
      managers,
      staff
    };
  }
};
