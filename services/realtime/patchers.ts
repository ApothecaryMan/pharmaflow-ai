import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { queryClient } from '../../lib/queryClient';

/**
 * Patch a flat list cache (e.g. `['inventory', branchId]`) when a row
 * matching the current branch is inserted, updated, or deleted.
 * Only patches if the payload's `branch_id` matches the active branch.
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

      const idx = old.findIndex((item) => item.id === payload.new.id);
      if (idx > -1) {
        const copy = [...old];
        copy[idx] = { ...copy[idx], ...(payload.new as unknown as T) };
        return copy;
      }
      return [...old, payload.new as unknown as T];
    });
  };
}

/**
 * Patch a detail/singleton cache (e.g. `['sale', saleId]`) when the
 * corresponding row is inserted, updated, or deleted.
 * On DELETE the detail cache entry is removed entirely.
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

    const queryKey = queryKeyFactory(payload.new.id);
    queryClient.setQueryData(queryKey, (old: T | undefined) => {
      if (!old) return old;
      return { ...old, ...(payload.new as unknown as T) };
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
