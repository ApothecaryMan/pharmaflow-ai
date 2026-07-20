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

export interface PatcherEntry {
  table: string;
  events: ('*' | 'INSERT' | 'UPDATE' | 'DELETE')[];
  filter: (orgId: string) => string;
  /** Each handler receives the raw Supabase realtime payload and the active branchId */
  handlers: ((payload: RealtimePostgresChangesPayload<any>, branchId: string) => void)[];
}

/**
 * Build the per-table registry.
 *
 * Each entry declares:
 *  - which DB table to watch
 *  - the Supabase Realtime filter expression (org-scoped)
 *  - one or more handler functions that surgically update React Query caches
 *
 * Handlers are responsible for checking `branch_id` inside the payload
 * so that we can share a single org-scoped channel across all branches.
 */
export function createRegistry(branchId: string, _orgId: string): PatcherEntry[] {
  return [
    // ── Inventory / Drugs ──────────────────────────────────────────
    {
      table: 'drugs',
      events: ['*'],
      filter: (oid: string) => `org_id=eq.${oid}`,
      handlers: [
        // Patch the inventory list cache (immediate upsertOrRemove)
        patchListCache((bid: string) => queryKeys.inventory.all(bid), branchId),
        // Also update the client-side search index
        (payload, currentBranchId) => {
          const recordBranchId = payload.new?.branch_id || payload.old?.branch_id;
          if (recordBranchId !== currentBranchId) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            inventorySearchEngine.queueUpdate(payload.new);
          } else if (payload.eventType === 'DELETE') {
            inventorySearchEngine.removeItem(payload.old.id);
          }
        },
      ],
    },

    // ── Stock Batches ───────────────────────────────────────────────
    {
      table: 'stock_batches',
      events: ['*'],
      filter: (oid: string) => `org_id=eq.${oid}`,
      handlers: [
        patchListCache((bid: string) => queryKeys.batches.all(bid), branchId),
      ],
    },

    // ── Sales ───────────────────────────────────────────────────────
    {
      table: 'sales',
      events: ['*'],
      filter: (oid: string) => `org_id=eq.${oid}`,
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
      filter: (oid: string) => `org_id=eq.${oid}`,
      handlers: [
        invalidateBranchScope('returns', branchId),
      ],
    },

    // ── Purchases ───────────────────────────────────────────────────
    {
      table: 'purchases',
      events: ['*'],
      filter: (oid: string) => `org_id=eq.${oid}`,
      handlers: [
        invalidateBranchScope('purchases', branchId),
        patchDetailCache((id: string) => queryKeys.purchases.detail(id)),
      ],
    },

    // ── Shifts ──────────────────────────────────────────────────────
    {
      table: 'shifts',
      events: ['*'],
      filter: (oid: string) => `org_id=eq.${oid}`,
      handlers: [
        patchListCache((bid: string) => queryKeys.shifts.all(bid), branchId),
        patchDetailCache((id: string) => queryKeys.shifts.detail(id)),
      ],
    },

    // ── Expenses ────────────────────────────────────────────────────
    {
      table: 'expenses',
      events: ['*'],
      filter: (oid: string) => `org_id=eq.${oid}`,
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
      filter: (oid: string) => `org_id=eq.${oid}`,
      handlers: [
        // Invalidate all cash-transaction queries for the current branch.
        // The query key includes branchId so invalidateBranchScope works.
        invalidateBranchScope('cashTransactions', branchId),
        // Also invalidate the parent shifts list so the open shift's
        // embedded transactions reflect the change.
        (payload, currentBranchId) => {
          const recordBranchId = payload.new?.branch_id || payload.old?.branch_id;
          if (recordBranchId !== currentBranchId) return;
          queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all(currentBranchId) });
        },
      ],
    },
  ];
}
