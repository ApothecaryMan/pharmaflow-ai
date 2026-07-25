# Session Logic Review & Remediation

## Original Weaknesses (W1–W6)

- **W1** – `AuthenticatedContent` had no reconnection guard after offline periods.
- **W2** – `EmployeePortalProfile` refetched all sessions on every DB change (no delta).
- **W3** – `ActiveSessionsPage` didn't recover after offline periods.
- **W4** – `ActiveSessionsPage` refetched all sessions on every change (no delta).
- **W5** – `useAuth` remote-logout detection via Supabase broadcast was not resilient to WebSocket disconnect.
- **W6** – `useAuth` relied on `getCurrentUser()` for auth check; acceptably cached.

## Remediation Plan

### Step 1 — Shared hook `useRealtimeChannel`

- File: `hooks/infrastructure/useRealtimeChannel.ts`
- Accepts `channelName: string | null` (null = skip subscribe)
- Accepts `setupChannel(ch: RealtimeChannel) => void` ref for callbacks
- Accepts `options.onReconnected` callback ref
- Handles subscribe, unsubscribe on channel change, exponential backoff
- Uses `mountedRef` to prevent state updates after unmount
- Uses refs for callbacks to avoid infinite re-subscribes

### Step 2 — Update components

| Component | W | Changes |
|-----------|---|---------|
| `AuthenticatedContent` | W1 | Moved session channel to `useRealtimeChannel`; reconnect checks `employee_id` + `is_active`; combined broadcast + postgres_changes on single channel |
| `EmployeePortalProfile` | W2 | Wrapped with `useRealtimeChannel`; uses `payload.new` delta instead of full refetch |
| `ActiveSessionsPage` | W3/W4 | Wrapped with `useRealtimeChannel`; `onReconnected` invalidates React Query cache |
| `useAuth` | W5 | Removed own channel; relies on `AuthenticatedContent`'s shared channel + polling + storage events |

### Step 3 — Bug: Duplicate Supabase channel topics

- `useAuth` and `AuthenticatedContent` both used `session-${sessionId}` as channel topic
- Supabase `RealtimeClient.channel()` (line 469-482) reuses existing channels by topic
- Second caller's `.on()` after `.subscribe()` throws "cannot add postgres_changes callbacks after subscribe()"
- **Fix**: `useAuth` channel removed; both broadcast events (`remote-employee-logout`, `remote-logout-named`) and all postgres_changes filters handled in `AuthenticatedContent`'s single channel instance

## Final Architecture

```
sessionRepository._broadcastEvent("session-{id}")
  →  AuthenticatedContent (useRealtimeChannel "session-{id}")
      ├── broadcast "remote-employee-logout"  → setCurrentEmployeeId(null)
      ├── broadcast "remote-logout-named"     → handleLogout("remote")
      ├── postgres_changes employee_id=null   → setCurrentEmployeeId(null)
      ├── postgres_changes is_active=false    → handleLogout("remote")
      └── onReconnected DB check              → handleLogout or POS lock

useAuth (no realtime channel)
  ├── Fallback polling every 15s              → handleLogout("remote")
  └── onAuthStateChange(SIGNED_OUT)           → setIsAuthenticated(false)
```

No two components share the same Supabase channel topic.
