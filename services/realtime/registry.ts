import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { inventorySearchEngine } from '../search/drugSearchService';
import { queryKeys } from '../../lib/queryKeys';
import { queryClient } from '../../lib/queryClient';
import {
  patchListCache,
  patchDetailCache,
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
export function createRegistry(branchId: string, _orgId: string): PatcherEntry[] {
  return [
    // ── Inventory / Drugs ──────────────────────────────────────────
    {
      table: 'drugs',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        // Patch the inventory list cache (immediate upsertOrRemove)
        patchListCache((bid: string) => queryKeys.inventory.all(bid), branchId),
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
        invalidateDashboard(branchId),
      ],
    },

    // ── Sales ───────────────────────────────────────────────────────
    {
      table: 'sales',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        // Invalidate all sales list queries for this branch
        invalidateBranchScope('sales', branchId),
        // Patch individual sale detail caches
        patchDetailCache((id: string) => queryKeys.sales.detail(id)),
        // Tentative dashboard invalidation — can be upgraded to delta later
        invalidateDashboard(branchId),
      ],
    },

    // ── Returns ─────────────────────────────────────────────────────
    {
      table: 'returns',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        invalidateBranchScope('returns', branchId),
        invalidateDashboard(branchId),
      ],
    },

    // ── Purchases ───────────────────────────────────────────────────
    {
      table: 'purchases',
      events: ['*'],
      filter: () => `branch_id=eq.${branchId}`,
      handlers: [
        invalidateBranchScope('purchases', branchId),
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
      ],
    },
  ];
}
