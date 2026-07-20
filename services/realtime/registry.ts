import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { inventorySearchEngine } from '../search/drugSearchService';
import { queryKeys } from '../../lib/queryKeys';
import { queryClient } from '../../lib/queryClient';
import {
  patchListCache,
  patchDetailCache,
  patchDashboardStats,
  invalidateBranchScope,
  invalidateDashboard,
} from './patchers';
import { snakeToCamel } from '../core/mappers';

export interface PatcherEntry {
  table: string;
  events: ('*' | 'INSERT' | 'UPDATE' | 'DELETE')[];
  filter?: () => string;
  /** Each handler receives the raw Supabase realtime payload and the active branchId */
  handlers: ((payload: RealtimePostgresChangesPayload<any>, branchId: string) => void)[];
}
/**

 * Build the per-table registry.
 *
 * Each entry declares:
 *  - which DB table to watch
 *  - the Supabase Realtime filter expression (branch-scoped)
 *  - one or more handler functions that surgically update React Query caches
 *
 * Handlers are responsible for checking `branch_id` inside the payload.
 */
export function createRegistry(branchId: string, orgId: string): PatcherEntry[] {
  return [
    // ── Inventory / Drugs ──────────────────────────────────────────
    {
      table: 'drugs',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        // Patch the inventory list cache (immediate upsertOrRemove)
        patchListCache((bid: string) => queryKeys.inventory.all(bid), branchId),
        patchDetailCache((id: string) => queryKeys.inventory.detail(id)),
        // Also update the client-side search index
        (payload, currentBranchId) => {
          const recordBranchId = (payload.new as any)?.branch_id || (payload.old as any)?.branch_id;
          if (recordBranchId !== currentBranchId) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const mapped = snakeToCamel(payload.new as any) as any;
            inventorySearchEngine.queueUpdate(mapped);
          } else if (payload.eventType === 'DELETE') {
            inventorySearchEngine.removeItem((payload.old as any).id);
          }
        },
        invalidateDashboard(branchId),
      ],
    },

    // ── Stock Batches ───────────────────────────────────────────────
    {
      table: 'stock_batches',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        patchListCache((bid: string) => queryKeys.batches.all(bid), branchId),
        patchDetailCache((id: string) => queryKeys.batches.detail(id)),
        invalidateDashboard(branchId),
      ],
    },

    // ── Sales ───────────────────────────────────────────────────────
    {
      table: 'sales',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        patchListCache((bid: string) => queryKeys.sales.recent(bid), branchId),
        patchListCache((bid: string) => queryKeys.sales.today(bid), branchId),
        patchDetailCache((id: string) => queryKeys.sales.detail(id)),
        invalidateDashboard(branchId),
        patchDashboardStats(branchId),
      ],
    },

    // ── Returns ─────────────────────────────────────────────────────
    {
      table: 'returns',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        patchListCache((bid: string) => queryKeys.returns.sales(bid), branchId),
        invalidateDashboard(branchId),
      ],
    },

    // ── Purchases ───────────────────────────────────────────────────
    {
      table: 'purchases',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        patchListCache((bid: string) => queryKeys.purchases.all(bid), branchId),
        patchDetailCache((id: string) => queryKeys.purchases.detail(id)),
        invalidateDashboard(branchId),
      ],
    },

    // ── Customers ───────────────────────────────────────────────────
    {
      table: 'customers',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        patchListCache((bid: string) => queryKeys.customers.all(bid), branchId),
      ],
    },

    // ── Suppliers ───────────────────────────────────────────────────
    {
      table: 'suppliers',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        patchListCache((bid: string) => queryKeys.suppliers.all(bid), branchId),
      ],
    },

    // ── Employees ───────────────────────────────────────────────────
    {
      table: 'employees',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        patchListCache((bid: string) => queryKeys.employees.all(bid), branchId),
        patchListCache((oid: string) => queryKeys.employees.allByOrg(oid), orgId),
      ],
    },

    // ── Branches ────────────────────────────────────────────────────
    {
      table: 'branches',
      events: ['*'],
      filter: () => `org_id=eq.${orgId}`,
      handlers: [
        patchListCache((oid: string) => queryKeys.branches.all(oid), orgId),
      ],
    },

    // ── Shifts ──────────────────────────────────────────────────────
    {
      table: 'shifts',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        patchListCache((bid: string) => queryKeys.shifts.all(bid), branchId),
        patchDetailCache((id: string) => queryKeys.shifts.detail(id)),
      ],
    },

    // ── Expenses ────────────────────────────────────────────────────
    {
      table: 'expenses',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        // Expenses are filter-based queries (date range, category, payment method),
        // so invalidate all expense queries for this branch.
        invalidateBranchScope('expenses', branchId),
      ],
    },

    // ── Cash Transactions ───────────────────────────────────────────
    {
      table: 'cash_transactions',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        // Invalidate all cash-transaction queries for the current branch.
        // The query key includes branchId so invalidateBranchScope works.
        invalidateBranchScope('cashTransactions', branchId),
        // Also invalidate the parent shifts list so the open shift's
        // embedded transactions reflect the change.
        (payload, currentBranchId) => {
          const recordBranchId = (payload.new as any)?.branch_id || (payload.old as any)?.branch_id;
          if (recordBranchId !== currentBranchId) return;
          queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all(currentBranchId) });
        },
        // Patch the cash-transactions list cache for the affected shift.
        (payload, currentBranchId) => {
          const recordBranchId = (payload.new as any)?.branch_id || (payload.old as any)?.branch_id;
          if (recordBranchId !== currentBranchId) return;
          const shiftId = (payload.new as any)?.shift_id || (payload.old as any)?.shift_id;
          if (!shiftId) return;
          const queryKey = queryKeys.cashTransactions.byShift(shiftId, currentBranchId);
          queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
            if (!old) return old;
            if (payload.eventType === 'DELETE') {
              const oldId = (payload.old as any).id;
              return old.filter((item: any) => item.id !== oldId);
            }
            const mapped = snakeToCamel(payload.new as unknown as Record<string, unknown>) as any;
            const idx = old.findIndex((item: any) => item.id === mapped.id);
            if (idx > -1) {
              const copy = [...old];
              copy[idx] = { ...copy[idx], ...mapped };
              return copy;
            }
            return [...old, mapped];
          });
        },
      ],
    },
  ];
}
