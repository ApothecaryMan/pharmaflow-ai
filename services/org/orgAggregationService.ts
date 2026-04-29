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
 * Computes metrics from pre-fetched data — ZERO additional network requests.
 * Separated from data fetching so it can be reused without re-fetching.
 */
const computeMetrics = (
  branches: any[],
  allSales: any[],
  allInventory: any[],
  allEmployees: any[]
): OrgMetrics => {
  let totalSales = 0;
  let totalRevenue = 0;
  let todayRevenue = 0;
  let totalInventoryValue = 0;

  const today = new Date().toISOString().split('T')[0];

  // Group data by branchId for O(1) lookups
  const salesByBranch: Record<string, any[]> = {};
  const inventoryByBranch: Record<string, any[]> = {};

  for (const s of allSales) {
    if (s.branchId) {
      (salesByBranch[s.branchId] ??= []).push(s);
    }
  }

  for (const i of allInventory) {
    if (i.branchId) {
      (inventoryByBranch[i.branchId] ??= []).push(i);
    }
  }

  const branchIds = new Set(branches.map(b => b.id));

  for (const branch of branches) {
    const branchSales = salesByBranch[branch.id] || [];
    totalSales += branchSales.length;
    totalRevenue += branchSales.reduce((sum, sale) => sum + (sale.total || 0), 0);

    const branchTodaySales = branchSales.filter(s => s.date && s.date.startsWith(today));
    todayRevenue += branchTodaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);

    const branchInventory = inventoryByBranch[branch.id] || [];
    totalInventoryValue += branchInventory.reduce((sum, item) => sum + ((item.publicPrice || 0) * (item.quantity || item.stock || 0)), 0);
  }

  const activeStaffCount = allEmployees.filter(e => e.branchId && branchIds.has(e.branchId)).length;

  return {
    totalSales,
    totalRevenue,
    todayRevenue,
    totalBranches: branches.length,
    activeStaffCount,
    totalInventoryValue,
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Standalone metrics fetcher (used by components that only need metrics, not full org data).
 * Uses stale-while-revalidate: returns cached metrics instantly, refreshes in background.
 */
export const aggregateOrgMetrics = async (orgId: string, bypassCache = false): Promise<OrgMetrics> => {
  if (!bypassCache) {
    const cached = await getCachedMetrics(orgId);
    if (cached) {
      const lastUpdate = new Date(cached.lastUpdated).getTime();
      const now = new Date().getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - lastUpdate < fiveMinutes) {
        return cached;
      }

      // Stale: return cached instantly, refresh in background
      setTimeout(() => fetchAndComputeMetrics(orgId), 100);
      return cached;
    }
  }

  return fetchAndComputeMetrics(orgId);
};

/** Internal: fetch raw data + compute + cache. Only called when cache misses. */
const fetchAndComputeMetrics = async (orgId: string): Promise<OrgMetrics> => {
  const [branches, allSales, allInventory, allEmployees] = await Promise.all([
    branchService.getAll(orgId),
    salesService.getAll('all').catch(() => [] as any[]),
    inventoryService.getAllBranches().catch(() => [] as any[]),
    employeeService.getAll('ALL'),
  ]);

  const metrics = computeMetrics(branches, allSales, allInventory, allEmployees);
  await cacheMetrics(orgId, metrics);
  return metrics;
};

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MAIN ENTRY POINT — Organization Management Page
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Single-fetch architecture:
 * 1. ONE Promise.all fetches everything (branches, employees, sales, inventory, members)
 * 2. Metrics are COMPUTED from already-fetched data — zero extra network calls
 * 3. Cached metrics shown instantly; fresh data replaces them when ready
 *
 * Scaling: Even with 50 branches × 1000 sales each, the network round-trips
 * are capped at exactly 5 parallel requests. All computation is client-side O(n).
 */
export const orgAggregationService = {
  aggregateOrgMetrics,
  aggregateOrgData: async (orgId: string): Promise<OrgData> => {
    // ┌──────────────────────────────────────────────┐
    // │  SINGLE parallel fetch — everything at once  │
    // └──────────────────────────────────────────────┘
    const [branches, allEmployees, members, allSales, allInventory] = await Promise.all([
      branchService.getAll(orgId),
      employeeService.getAll('ALL'),
      orgService.getMembers(orgId),
      salesService.getAll('all').catch(() => [] as any[]),
      inventoryService.getAllBranches().catch(() => [] as any[]),
    ]);

    // Compute metrics from already-fetched data — NO extra network calls
    const metrics = computeMetrics(branches, allSales, allInventory, allEmployees);

    // Cache for future stale-while-revalidate (fire-and-forget)
    cacheMetrics(orgId, metrics).catch(() => {});

    // Build org-role lookup
    const branchIds = new Set(branches.map(b => b.id));
    const branchEmployees = allEmployees.filter(e => e.branchId && branchIds.has(e.branchId));

    const memberRoleMap: Record<string, string> = {};
    for (const m of members) {
      memberRoleMap[m.userId] = m.role;
    }

    // Merge roles and split into Managers (has account) and Staff (no account)
    const allMappedEmployees = branchEmployees.map(e => ({
      ...e,
      orgRole: e.userId ? memberRoleMap[e.userId] : undefined
    }));

    return {
      metrics,
      branches,
      employees: allMappedEmployees,
      managers: allMappedEmployees.filter(e => !!e.userId),
      staff: allMappedEmployees.filter(e => !e.userId),
    };
  }
};
