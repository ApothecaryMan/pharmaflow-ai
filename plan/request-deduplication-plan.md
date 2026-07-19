# Request Deduplication Plan

## Problem

On app open/refresh, many components mount simultaneously and each independently fetches the same data via `useEffect` + direct service calls — bypassing React Query. This generates N+1 duplicate network requests.

### Current Duplicate Call Count (per page load)

| Endpoint | Duplicate Calls | Approx Data Downloaded |
|---|---|---|
| `/rest/v1/employees` | 11 | ~4.4 MB (400 KB × 11) |
| `/rest/v1/branches` | 12+ | ~1.2 MB |
| `/rest/v1/organizations` | 13+ | ~1.3 MB |
| `/rest/v1/org_members` | 11+ | ~1.1 MB |
| `/rest/v1/user_active_sessions` | 40+ | ~4 MB |
| `/auth/v1/user` | 22 | ~0.5 MB |
| **Total** | **~110+** | **~12 MB** |

## Root Cause

React Query (`@tanstack/react-query` v5) is fully set up with IndexedDB persistence and query hooks exist, but **components call services directly** in `useEffect` + `useState` instead of using the hooks:

```tsx
// ❌ Bypasses React Query — no deduplication
useEffect(() => {
  employeeService.getAll().then(setEmployees);
}, []);

// ✅ React Query deduplicates — 11 components → 1 network request
const { data: employees } = useEmployees(branchId);
```

React Query only deduplicates when components share the same **query key** and the query function is managed by React Query. Direct `useEffect` calls create separate state per component.

---

## Phase 1: Migrate to Existing Query Hooks (Highest Impact)

### 1.1 Employee List — `components/hr/EmployeeList.tsx`

**Problem:** Fetches `employeeService.getAll('ALL')` in `useEffect` for global view, plus `authService.getCurrentUser()` in another `useEffect`.

**Fix:**
- Use `useEmployees(branchId)` for the main list
- Use `useEmployees('ALL')` for the global view (create query key variant or use a separate hook if needed)
- Read current user from context/useAuth instead of direct call

### 1.2 Branch Settings — `components/settings/BranchSettings.tsx`

**Problem:** Fetches `branchService.getAll()` + `employeeService.getAll()` in `useCallback` + `useEffect`.

**Fix:**
- Replace with `useBranches(orgId)` + `useEmployees(branchId)`

### 1.3 Organization Members — multiple files

**Problem:** Direct calls to `orgMembersService` / `orgService` in multiple components.

**Fix:**
- Use `useOrgMembers(orgId)` hook from `hooks/queries/useOrgQuery.ts`

### 1.4 Org Detail — `components/layout/Navbar.tsx`

**Problem:** Fetches `orgService.getUserOrgs()` in `useEffect`.

**Fix:**
- Use `useActiveOrg(orgId)` from existing hook

---

## Phase 2: Create Missing Query Hooks

### 2.1 Active Sessions — `useActiveSessions()`

**New file:** `hooks/queries/useSessionsQuery.ts`

**Problem:** Called directly 40+ times in `ActiveSessionsPage.tsx` via `sessionRepository.getActiveSessions()`.

**Fix:**
- Create `useActiveSessions(userId)` hook with `staleTime: 30s` (sessions change frequently)
- Replace direct calls in `ActiveSessionsPage.tsx`

### 2.2 Login Audit History — `useLoginAudit()`

**New file:** `hooks/queries/useAuditQuery.ts`

**Problem:** Called directly in `LoginAuditList.tsx` via `authService.getLoginHistory()`.

**Fix:**
- Create `useLoginAudit(branchIds)` hook with `staleTime: 2min`
- Replace direct call

### 2.3 Procurement Items — `useProcurementItems()`

**New file:** `hooks/queries/useProcurementQuery.ts`

**Problem:** Called directly in `ShortagesPage.tsx` via `intelligenceService.getProcurementItems()`.

**Fix:**
- Create `useProcurementItems(branchId)` hook
- Replace direct call

### 2.4 Org Aggregation — `useOrgAggregation()`

**New file:** `hooks/queries/useOrgAggregationQuery.ts`

**Problem:** Called directly in `OrganizationManagementPage.tsx`.

**Fix:**
- Create `useOrgAggregation(orgId)` hook
- Replace direct call

---

## Phase 3: Service-Level Singleton Promise Deduplication

For service methods called from event handlers (where React Query lifecycle doesn't apply), add in-flight request deduplication:

### Pattern

```typescript
let _pendingPromise: Promise<T> | null = null;

async getAll(...args): Promise<T> {
  if (_pendingPromise) return _pendingPromise;
  _pendingPromise = this._executeGetAll(...args);
  try { return await _pendingPromise; }
  finally { _pendingPromise = null; }
}
```

### Services to Patch

| Service | Method | Reason |
|---|---|---|
| `services/auth/authService.ts` | `getCurrentUser()` | Called by 22 mount points + auth state listener |
| `services/hr/employeeService.ts` | `getAll()` | Called by 11 components + event handlers |
| `services/org/branchService.ts` | `getAll()` | Called by 12+ components |
| `services/org/orgService.ts` | `getUserOrgs()` | Called by navbar + settings |

---

## Phase 4: Fix Auth Duplication

### 4.1 Stabilize `useAuth` Effect

In `hooks/auth/useAuth.ts`, the main `useEffect` has `[setView, handleLogout]` deps. The effect calls `authService.getCurrentUser()` which triggers a full Supabase session sync. While these deps are stable via React, ensure the effect truly runs only once by confirming no parent re-creates `setView` on re-render.

**Fix:** Add a `useRef` guard to skip re-execution:

```typescript
const initialMount = useRef(true);
useEffect(() => {
  if (!initialMount.current) return;
  initialMount.current = false;
  // ... existing auth check logic
}, []);
```

### 4.2 Remove Unnecessary `authService.getCurrentUserSync()` Calls

Replace 15+ direct calls across components with one source of truth:

| File | Current Pattern | Fix |
|---|---|---|
| `Navbar.tsx` | `authService.getCurrentUserSync()` | Read from authStore |
| `NavUserActions.tsx` | `authService.getCurrentUserSync()` | Read from authStore |
| `StatusBar.tsx` | `authService.getCurrentUserSync()` | Read from authStore |
| `EmployeeDashboard.tsx` | `authService.getCurrentUserSync()` | Read from authStore |
| `CustomerManagement.tsx` | `authService.getCurrentUserSync()` | Read from authStore |
| `Purchases.tsx` | `authService.getCurrentUserSync()` | Read from authStore |

### 4.3 Fix Session Registration Duplication

`authService.getCurrentUser()` → `syncSessionWithDatabase()` → `sessionRepository.registerSession()`. This happens on every auth check. The session registration should be throttled to once per session, not on every page load.

**Fix:** Check if `ACTIVE_SESSION_ID` already exists in storage before registering.

---

## Phase 5: Reduce Polling Overhead

### 5.1 Session Heartbeat Polling

`useAuth.ts` sets up a 15-second polling interval that queries `user_active_sessions`. This generates continuous background traffic.

**Fix:**
- Increase interval to 60s
- Only poll when the tab is visible (use `document.visibilityState`)
- Stop polling on unmount

### 5.2 Realtime Channel Usage

Multiple components subscribe to Postgres changes via `supabase.channel()`. Each subscription creates a WebSocket connection.

**Fix:**
- Share a single connection via a subscription manager
- Use React Query's built-in refetch instead of realtime for non-critical data

---

## Execution Priority

| Order | Phase | Effort | Impact | Est. Bandwidth Saved |
|---|---|---|---|---|
| 1 | Phase 1 (Existing hooks) | Low | High | ~6 MB |
| 2 | Phase 3 (Promise dedup) | Low | High | ~3 MB |
| 3 | Phase 2 (New hooks) | Medium | Medium | ~4 MB |
| 4 | Phase 4 (Auth cleanup) | Medium | Medium | ~0.5 MB |
| 5 | Phase 5 (Polling) | Low | Low | Ongoing |

**Total estimated bandwidth reduction:** ~12 MB → ~1 MB per page load

---

## Key Principles

1. **React Query is the single source of truth** — no `useState` + `useEffect` for server data
2. **Same query key = same network request** — React Query deduplicates by query key
3. **Service methods should be idempotent** — parallel calls return the same promise
4. **Auth state flows down** — one sync point, propagated via context/store
