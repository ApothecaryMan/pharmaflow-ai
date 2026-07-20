/**
 * Legacy realtime sync — superseded by useRealtimeDispatcher (Phase 1+).
 *
 * This hook is kept as a no-op for backward compatibility during the
 * transition period. All table subscriptions have been moved to the
 * central realtime dispatcher (services/realtime/useRealtimeDispatcher.ts)
 * which handles a single org-scoped channel with per-table patchers.
 *
 * The online-recovery logic has been merged into the dispatcher.
 *
 * TODO: Remove this file and its imports after Phase 5 verification.
 */

export const useRealtimeSync = (_props: { activeBranchId: string }) => {
  // No-op: all realtime subscriptions live in useRealtimeDispatcher.
};
