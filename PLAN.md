# Performance Optimization Plan — pharmaflow-ai

## Problem Statement

The application downloads ~6 MB of PostgREST data on every page load/refresh. Three root causes:

1. **Duplicate requests** — Components fetch the same data independently via `useEffect` + direct service calls instead of sharing React Query hooks (110+ duplicate calls → ~12 MB wasted)
2. **Eager root-level fetching** — Data for ALL features is fetched at app mount regardless of which page the user visits or their permissions (Catalog, Shifts, Employees, Realtime subscriptions)
3. **Over-fetching** — Queries request every column even when only a subset is needed

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ DONE | Implemented and verified |
| 🔜 IN PROGRESS | Implementation started |
| 📋 PLANNED | Not yet started |
| ❌ SKIPPED | Deemed unnecessary |

---

## Phase A: Request Deduplication — Service-Level (✅ DONE)

**Pattern:** Singleton promise to prevent concurrent in-flight duplicate requests. Concurrent calls share one network request.

### Files Modified

| File | Method | What Changed |
|---|---|---|
| `services/auth/authService.ts:25` | `getCurrentUser()` | Added `_getCurrentUserPromise` — concurrent calls share one promise |
| `services/hr/employeeService.ts:18` | `getAll()` | Added `_getAllPromises` Map — keyed by `branchId\|orgId`, cleaned up in `finally` |
| `services/org/branchService.ts:19` | `getAll()` | Added `_getAllPromises` Map — keyed by `orgId`, cleaned up in `finally` |
| `services/org/orgService.ts:11` | `getUserOrgs()` | Added `_getUserOrgsPromises` Map — keyed by `userId`, cleaned up in `finally` |

### Impact

- Concurrent `getCurrentUser()` calls (22 → 1 network request)
- Concurrent `employeeService.getAll()` calls (11 → 1)
- Concurrent `branchService.getAll()` calls (12+ → 1)
- Concurrent `orgService.getUserOrgs()` calls (13+ → 1)

---

## Phase B: React Query Hook Migration (✅ DONE)

### Files Modified

| Component | Before | After |
|---|---|---|
| `components/hr/EmployeeList.tsx` | 2 `useEffect`s: `authService.getCurrentUser()` + `employeeService.getAll('ALL')` | `authService.getCurrentUserSync()` init + `useAllEmployees()` hook |
| `components/settings/ActiveSessionsPage.tsx` | `employeeService.getAll()` in `useEffect` + `sessionRepository.getActiveSessions()` in `useEffect` + `useState` | `useAllEmployees()` + `useActiveSessions()` hooks with realtime invalidation via `queryClient` |
| `components/settings/BranchSettings.tsx` | `loadData()` `useCallback` + `useEffect` calling `branchService.getAll()` + `employeeService.getAll()` | `useBranches()` + `useAllEmployees()` hooks; `queryClient.invalidateQueries` on save/delete |

### New Files Created

| File | Purpose |
|---|---|
| `hooks/queries/useSessionsQuery.ts` | `useActiveSessions(userId?)` — 30s stale, 60s refetch interval |
| `lib/queryKeys.ts` (modified) | Added `sessions.active` key + `prefixes.sessions` for invalidation |

### Query Keys Added

```typescript
// lib/queryKeys.ts
employees: {
  all: (branchId: string) => ['employees', branchId] as const,     // existing
  allByOrg: (orgId: string) => ['employees', 'org', orgId] as const, // NEW
},
sessions: {                                                          // NEW
  active: (userId?: string) => ['sessions', 'active', userId] as const,
},
prefixes: {
  sessions: ['sessions'] as const,                                   // NEW
}
```

### Other Changes

| File | Change |
|---|---|
| `services/auth/repositories/sessionRepository.ts` | Added `employee_name`, `user_name`, `role` to `UserActiveSession` interface (were missing from type, causing TS errors after strict typing) |
| `hooks/auth/useAuth.ts` | Increased remote logout polling interval from 15s → 30s (halves background `user_active_sessions` queries) |

---

## Phase C: Permission-Aware & Lazy Data Fetching (📋 PLANNED)

**Core Problem:** The app fetches domain data at the root level for ALL authenticated users, even when:

- The user never navigates to the page that needs that data
- The user lacks the permission to access that page
- A smaller, page-scoped fetch would suffice

### C1. Permission Gates on Queries

Add `enabled` prop accepting a permission check to every query hook that is called from layout-level components.

**Pattern:**

```typescript
// hooks/queries/useEmployeesQuery.ts
export function useEmployees(branchId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.employees.all(branchId),
    queryFn: () => employeeService.getAll(branchId) as Promise<Employee[]>,
    enabled: !!branchId && (options?.enabled ?? true),
    staleTime: 30 * 60 * 1000,
  });
}
```

**Files to modify:**

| File | Line | Current | Fix |
|---|---|---|---|
| `components/layout/MainLayout.tsx` | 130 | `useEmployees(activeBranchId)` | `useEmployees(activeBranchId, { enabled: canViewUsers })` |
| `components/layout/StatusBar/StatusBar.tsx` | 152 | `useEmployees(activeBranchId)` | Same — only fetch if user has HR permission |
| `components/layout/MobileNavigation.tsx` | 567 | `useInventory(branchKey)` | Only fetch if user has inventory permission |
| `hooks/queries/useEmployeesQuery.ts` | — | Hard `enabled: !!branchId` | Accept `enabled` option |
| `hooks/queries/useInventoryQuery.ts` | — | Same | Accept `enabled` option |
| `hooks/queries/useCustomersQuery.ts` | — | Same | Accept `enabled` option |
| `hooks/queries/useSalesQuery.ts` | — | Same | Accept `enabled` option |
| `hooks/queries/usePurchasesQuery.ts` | — | Same | Accept `enabled` option |

### C2. Move CatalogProvider Out of Root (📋 PLANNED)

**Problem:** `CatalogContext.tsx` wraps ALL authenticated users in `App.tsx:354` and syncs the full `global_drugs` catalog on mount. This is only needed by POS and Inventory pages.

**Fix:** Move `<CatalogProvider>` from `App.tsx` into only the page components that need drug search:

```tsx
// Before (App.tsx:354)
<CatalogProvider>{finalContent}</CatalogProvider>

// After — wrap only POS and Inventory pages
// In POS.tsx and Inventory.tsx (or their layout wrapper):
<CatalogProvider>
  <PageContent />
</CatalogProvider>
```

**Files to modify:**

| File | Change |
|---|---|
| `App.tsx` | Remove `<CatalogProvider>` wrapper |
| `components/sales/pos/POS.tsx` | Wrap root with `<CatalogProvider>` |
| `components/inventory/Inventory.tsx` | Wrap root with `<CatalogProvider>` (or a shared layout) |

### C3. Lazy ShiftProvider (📋 PLANNED)

**Problem:** `ShiftProvider` wraps the entire app in `index.tsx:44` and fetches all shifts + transactions on mount.

**Fix:** Move `ShiftProvider` from `index.tsx` to only wrap routes that need shift data (POS, Dashboard, ShiftHistory).

```tsx
// Before (index.tsx)
<QueryProvider>
  <ShiftProvider>
    <App />
  </ShiftProvider>
</QueryProvider>

// After (index.tsx)
<QueryProvider>
  <App />
</QueryProvider>

// In pages that need shifts (e.g., POS.tsx)
<ShiftProvider>
  <POSContent />
</ShiftProvider>
```

**Files to modify:**

| File | Change |
|---|---|
| `index.tsx` | Remove `<ShiftProvider>` |
| `components/sales/pos/POS.tsx` | Add `<ShiftProvider>` wrapper |
| `components/dashboard/Dashboard.tsx` | Add `<ShiftProvider>` wrapper |
| `components/sales/ShiftHistory.tsx` | Add `<ShiftProvider>` wrapper |
| `components/layout/StatusBar/StatusBar.tsx` | Direct calls to `useShift()` will break — need to check if StatusBar actually needs shift data |

**⚠️ Risk:** `StatusBar.tsx` and `PageRouter.tsx` also call `useShift()`. These components exist at the layout level. If we move `ShiftProvider` out of root, these calls will fail. Need to either:
- Keep `ShiftProvider` at root but make its internal fetch lazy (only fetch when component is visible)
- Or provide shift data through a different mechanism for StatusBar

### C4. Lazy Realtime Subscriptions (📋 PLANNED)

**Problem:** `useRealtimeSync()` in `AuthenticatedContent.tsx` subscribes to Postgres changes for ALL tables (drugs, batches, sales, returns, purchases) for every authenticated user. Each subscription maintains a WebSocket connection and triggers cache invalidations.

**Fix:** Move realtime subscriptions into the page components that need them, or subscribe only when the relevant queries are active.

**Files to modify:**

| File | Change |
|---|---|
| `components/layout/AuthenticatedContent.tsx` | Remove `useRealtimeSync()` |
| `components/dashboard/Dashboard.tsx` | Add `useRealtimeSync({ sales: true, inventory: true })` |
| `components/inventory/Inventory.tsx` | Add `useRealtimeSync({ inventory: true, batches: true })` |
| `components/sales/pos/POS.tsx` | Add `useRealtimeSync({ sales: true })` |

**Alternative approach:** Modify `useRealtimeSync()` to accept a scope parameter and only subscribe to tables relevant to the current page.

### C5. Page-Level Employee Data (📋 PLANNED)

**Problem:** `MainLayout.tsx:130` fetches employees for the active branch for ALL authenticated users. This data is only needed by HR pages, StatusBar user mentions, and permission checks.

**Fix:** Fetch employees in the pages that need them, not in the layout shell. For StatusBar, fetch only the current employee (not all employees).

**Files to modify:**

| File | Change |
|---|---|
| `components/layout/MainLayout.tsx` | Remove `useEmployees()` call |
| `components/layout/StatusBar/StatusBar.tsx` | Replace `useEmployees()` with `authService.getCurrentUserSync()` or a focused query for just the current employee |
| `components/hr/EmployeeList.tsx` | Already uses `useEmployees()` — no change needed |
| `components/hr/StaffOverview.tsx` | Already fetches its own data — verify |

### C6. Disable `refetchOnWindowFocus` for Heavy Queries (📋 PLANNED)

**Problem:** `queryClient.ts:21` sets `refetchOnWindowFocus: true` globally. When the user switches tabs and returns, ALL active queries refetch — including heavy ones like employees, inventory, and catalog.

**Fix:** Set `refetchOnWindowFocus: false` globally and enable it per-query for lightweight/time-sensitive data.

```typescript
// lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIMES.inventory,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,     // changed from true
      refetchOnReconnect: false,       // changed from true
      retry: 2,
    },
  },
});
```

For time-sensitive queries, override per-hook:
```typescript
export function useActiveSessions(userId?: string) {
  return useQuery({
    queryKey: queryKeys.sessions.active(userId),
    queryFn: () => sessionRepository.getActiveSessions(userId),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,        // override for sessions
  });
}
```

### C7. Move `authStore.reinitialize()` Out of App Mount (📋 PLANNED)

**Problem:** `App.tsx:248-252` calls `authStore.getState().reinitialize()` which fetches org, branches, and employee data on every app mount. This runs for ALL authenticated users.

**Fix:** 
- Call `reinitialize()` lazily — only when the user navigates to a page that needs org/branch context
- Or check if data is already cached before re-fetching

```typescript
// Before (App.tsx)
useEffect(() => {
  if (authState.isAuthenticated && !isAuthChecking && !isLoggingOut) {
    authStore.getState().reinitialize();
  }
}, [authState.isAuthenticated, isAuthChecking, isLoggingOut]);

// After — add a guard
useEffect(() => {
  if (authState.isAuthenticated && !isAuthChecking && !isLoggingOut) {
    const existingOrg = useAuthStore.getState().activeOrgId;
    if (!existingOrg) {   // Only fetch if not already hydrated
      authStore.getState().reinitialize();
    }
  }
}, [authState.isAuthenticated, isAuthChecking, isLoggingOut]);
```

---

## Phase D: Column-Level Over-Fetching (📋 PLANNED)

Documented in `performance-optimization-plan.md`. Key items:

| Repository | Current | Fix | Est. Reduction |
|---|---|---|---|
| `services/inventory/inventoryRepository.ts` | 27 columns | Drop `description`, `notes`, `item_rank` for list views | ~40% |
| `services/sales/salesRepository.ts` | 37 columns (`SALE_LIST_COLUMNS`) | Lightweight list vs full detail selects | ~50% |
| `services/hr/repositories/employeeRepository.ts` | Includes `biometric_credential_id`, `biometric_public_key`, `password`, `photo`, `design_settings`, `notes`, `username`, `auth_user_id` | Drop unused columns in list queries | ~60% |

---

## Phase E: Fix Broad Cache Invalidation (📋 PLANNED)

**Problem:** Mutations invalidate entire query prefixes, blowing away ALL caches for that domain:

```typescript
// Every sale completion:
queryClient.invalidateQueries({ queryKey: ['inventory'] });  // 💥 ALL branches
queryClient.invalidateQueries({ queryKey: ['sales'] });       // 💥 ALL branches
queryClient.invalidateQueries({ queryKey: ['batches'] });     // 💥 ALL branches
```

**Fix:** Scope invalidation to the relevant branch/org:

```typescript
queryClient.invalidateQueries({ queryKey: ['inventory', currentBranchId] });
```

**Files to modify:** All mutation hooks in `hooks/mutations/`:
- `useInventoryMutations.ts`
- `useSalesMutations.ts`
- `usePurchaseMutations.ts`
- `useCustomerMutations.ts`
- `useEmployeeMutations.ts`
- `useReturnsMutations.ts`
- `useSupplierMutations.ts`

---

## Phase F: Increase Stale Times (📋 PLANNED)

| Data | Current | Recommended |
|---|---|---|
| `employees` | 30 min | 60 min |
| `customers` / `suppliers` | 10 min | 30 min |
| `branches` | 5 min (via global default) | 60 min |
| `purchases` / `sales` (non-realtime) | 2 min | 5 min |

**File:** `lib/queryClient.ts`

---

## Phase G: Paginate Large Lists (📋 PLANNED)

**Problem:** `useEmployees()`, `useCustomers()`, `useRawInventory()` fetch ALL rows. Employee query alone returns ~2 MB.

**Action:** Convert list components to paginated queries following the existing `salesRepository.listPage()` pattern.

**New hooks needed:**
- `useEmployeePage(branchId, page, pageSize, filters?)`
- `useCustomerPage(branchId, page, pageSize, filters?)`
- `useInventoryPage(branchId, page, pageSize, filters?)`

**Files:** `hooks/queries/`, `services/*/`

---

## Execution Priority

| Order | Phase | Effort | Impact | Est. Bandwidth Saved |
|---|---|---|---|---|
| 1 | **A** — Promise dedup (✅ DONE) | Low | High | ~3 MB |
| 2 | **B** — Hook migration (✅ DONE) | Medium | High | ~6 MB |
| 3 | **C1** — Permission gates on queries | Medium | High | ~2 MB |
| 4 | **C6** — Disable `refetchOnWindowFocus` | Small | Medium | Ongoing |
| 5 | **D** — Column-level over-fetching | Small | High | ~2 MB |
| 6 | **E** — Fix cache invalidation scope | Medium | Medium | Prevents cache loss |
| 7 | **C2** — Lazy CatalogProvider | Medium | Medium | ~1 MB first load |
| 8 | **F** — Increase stale times | Small | Medium | Reduces refetches |
| 9 | **G** — Paginate large lists | Large | High | ~3 MB |
| 10 | **C3/C4/C5/C7** — Remaining lazy loading | Large | Medium | ~1 MB |

---

## How to Verify

For each change, verify using:

1. **React Query DevTools** — Open browser devtools → React Query tab. Observe that:
   - Query keys are unique per data scope
   - ` observersCount` > 1 for shared queries (proves deduplication)
   - No duplicate network requests in the "Query details" panel

2. **Supabase Project Inspector** — Navigate to your Supabase dashboard → Project Settings → API → Usage. Compare:
   - Total bandwidth before vs after
   - Request count per endpoint

3. **Network Tab** — Open browser devtools → Network tab → filter by `rest/v1`. Look for:
   - No duplicate URLs in flight simultaneously
   - Only 1 request per query key

4. **Build verification:**
```bash
npx tsc --noEmit --skipLibCheck
npx vite build
```
