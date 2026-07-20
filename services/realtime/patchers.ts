import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { queryClient } from '../../lib/queryClient';
import { snakeToCamel } from '../core/mappers';

/**
 * Convert a raw Supabase Realtime payload record (snake_case keys)
 * into the camelCase shape that our React Query caches expect.
 */
function mapPayloadRecord<T>(raw: Record<string, unknown>): T {
  return snakeToCamel(raw) as unknown as T;
}

/**
 * Patch a flat list cache (e.g. `['inventory', branchId]`) when a row
 * matching the current branch is inserted, updated, or deleted.
 * Only patches if the payload's `branch_id` matches the active branch.
 *
 * Incoming data from Supabase Realtime arrives in snake_case.
 * We convert it to camelCase before merging into the cache so the
 * UI reads the correct property names (e.g. `cashSales` not `cash_sales`).
 */
export function patchListCache<T extends { id: string }>(
  queryKeyFactory: (branchId: string) => readonly unknown[],
  currentBranchId: string,
): (payload: RealtimePostgresChangesPayload<T>) => void {
  return (payload: RealtimePostgresChangesPayload<T>) => {
    const recordBranchId = (payload.new as any)?.branch_id || (payload.old as any)?.branch_id;
    if (recordBranchId !== currentBranchId) return;

    const queryKey = queryKeyFactory(currentBranchId);
    queryClient.setQueryData(queryKey, (old: T[] | undefined) => {
      if (!old) return old;

      if (payload.eventType === 'DELETE') {
        const oldId = (payload.old as { id: string }).id;
        return old.filter((item) => item.id !== oldId);
      }

      // Convert the incoming snake_case record to camelCase
      const mapped = mapPayloadRecord<T>(payload.new as unknown as Record<string, unknown>);

      const idx = old.findIndex((item) => item.id === mapped.id);
      if (idx > -1) {
        const copy = [...old];
        // Merge the mapped record on top of the existing cached item
        // so any fields not included in the Realtime payload are preserved
        copy[idx] = { ...copy[idx], ...mapped };
        return copy;
      }
      return [...old, mapped];
    });
  };
}

/**
 * Patch a detail/singleton cache (e.g. `['sale', saleId]`) when the
 * corresponding row is inserted, updated, or deleted.
 * On DELETE the detail cache entry is removed entirely.
 *
 * Converts incoming snake_case keys to camelCase before merging.
 */
export function patchDetailCache<T extends { id: string }>(
  queryKeyFactory: (id: string) => readonly unknown[],
): (payload: RealtimePostgresChangesPayload<T>) => void {
  return (payload: RealtimePostgresChangesPayload<T>) => {
    if (payload.eventType === 'DELETE') {
      const id = (payload.old as { id: string }).id;
      queryClient.removeQueries({ queryKey: queryKeyFactory(id), exact: true });
      return;
    }

    const mapped = mapPayloadRecord<T>(payload.new as unknown as Record<string, unknown>);
    const queryKey = queryKeyFactory(mapped.id);
    queryClient.setQueryData(queryKey, (old: T | undefined) => {
      if (!old) return old;
      return { ...old, ...mapped };
    });
  };
}

/**
 * Invalidate all queries whose first key element equals `prefix` and
 * whose key contains `currentBranchId`.
 * This mirrors the old `invalidateBranchQueries` helper.
 */
export function invalidateBranchScope(
  prefix: string,
  currentBranchId: string,
): () => void {
  return () => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === prefix && query.queryKey.includes(currentBranchId),
    });
  };
}

/**
 * Tentatively invalidate the dashboard aggregate query.
 * Can be upgraded to a delta-patching strategy later.
 */
export function invalidateDashboard(
  currentBranchId: string,
): () => void {
  return () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', currentBranchId] });
  };
}

/**
 * Patch a paged list cache (e.g. `['sales', 'recent', branchId]`) shaped as
 * `{ rows: T[], count: number }` when a row matching the current branch is
 * inserted, updated, or deleted.
 *
 * - INSERT: prepends the item to `rows` and increments `count`.
 * - UPDATE: merges into the matching row in `rows` (count unchanged).
 * - DELETE: removes the item from `rows` and decrements `count`.
 *
 * Guards by `branch_id` matching `currentBranchId`.
 * Converts incoming snake_case keys to camelCase before merging.
 */
export function patchPagedListCache<T extends { id: string }>(
  queryKeyFactory: (branchId: string) => readonly unknown[],
  currentBranchId: string,
): (payload: RealtimePostgresChangesPayload<T>) => void {
  return (payload: RealtimePostgresChangesPayload<T>) => {
    const recordBranchId = (payload.new as any)?.branch_id || (payload.old as any)?.branch_id;
    if (recordBranchId !== currentBranchId) return;

    const queryKey = queryKeyFactory(currentBranchId);
    queryClient.setQueryData(queryKey, (old: { rows: T[]; count: number } | undefined) => {
      if (!old) return old;

      if (payload.eventType === 'DELETE') {
        const oldId = (payload.old as { id: string }).id;
        return {
          rows: old.rows.filter((item) => item.id !== oldId),
          count: old.count - 1,
        };
      }

      const mapped = mapPayloadRecord<T>(payload.new as unknown as Record<string, unknown>);

      const idx = old.rows.findIndex((item) => item.id === mapped.id);
      if (idx > -1) {
        const copy = [...old.rows];
        copy[idx] = { ...copy[idx], ...mapped };
        return { rows: copy, count: old.count };
      }
      return { rows: [mapped, ...old.rows], count: old.count + 1 };
    });
  };
}

/**
 * Patch the dashboard aggregate stats cache (`['dashboard', 'stats', branchId]`)
 * by cumulatively adding or subtracting `total`, `profit`, and `cost` from
 * sales payloads.
 *
 * This is a lightweight delta — it accepts minor drift risk and works best
 * when combined with periodic full invalidations.
 */
export function patchDashboardStats(
  branchId: string,
): (payload: RealtimePostgresChangesPayload<any>) => void {
  return (payload: RealtimePostgresChangesPayload<any>) => {
    const queryKey = ['dashboard', 'stats', branchId] as const;
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;

      if (payload.eventType === 'INSERT') {
        const mapped = mapPayloadRecord<{ total: number; profit: number; cost: number }>(
          payload.new as unknown as Record<string, unknown>,
        );
        return {
          ...old,
          total: (old.total || 0) + (mapped.total || 0),
          profit: (old.profit || 0) + (mapped.profit || 0),
          cost: (old.cost || 0) + (mapped.cost || 0),
        };
      }

      if (payload.eventType === 'DELETE') {
        const mapped = mapPayloadRecord<{ total: number; profit: number; cost: number }>(
          payload.old as unknown as Record<string, unknown>,
        );
        return {
          ...old,
          total: (old.total || 0) - (mapped.total || 0),
          profit: (old.profit || 0) - (mapped.profit || 0),
          cost: (old.cost || 0) - (mapped.cost || 0),
        };
      }

      return old;
    });
  };
}
