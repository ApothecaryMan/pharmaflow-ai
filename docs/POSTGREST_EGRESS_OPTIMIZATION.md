# PostgREST Egress Optimization Plan

**Goal**: Reduce daily bandwidth consumption from **~2GB/day** to **~80-100MB/day** (improvement of **20-25x**)

**Principle**: Never query more data than the user actually sees on screen.

---

## Table of Contents

- [Current State](#current-state)
- [Verification Findings](#verification-findings)
- [Phase 1: Stop the Bleeding (60-70% savings)](#phase-1-stop-the-bleeding)
- [Phase 2: Remove Over-fetching from Query Hooks (20% savings)](#phase-2-remove-over-fetching-from-query-hooks)
- [Phase 3: Replace `select('*')` with Specific Columns (10% savings)](#phase-3-replace-select-with-specific-columns)
- [Phase 4: Optimize Realtime + Caching Strategy (5-10% savings)](#phase-4-optimize-realtime--caching-strategy)
- [Execution Order](#execution-order)
- [Impact Summary](#impact-summary)

---

## Current State

| Metric | Current | Target |
|--------|---------|--------|
| Initial load per page | ~5 MB | ~200 KB |
| Daily total | ~2 GB | ~80-100 MB |
| Round trips on dashboard | 4 full-table scans | 2 aggregate queries |

### Key Issues Identified

1. **Client-side fallbacks in financial service** — `isDev()` triggers 5 massive queries that fetch ALL sales + returns + expenses data when RPC calls fail
2. **`select('*')` across ~31 query sites** — 10 repositories fetch all columns when only a subset is needed
3. **Dashboard over-fetching** — pulls full inventory, 100 sales records, all batches for summary cards
4. **Unnecessary customer enrichment query** — `useCustomers` fetches 100 recent sales just to compute fields already stored in DB
5. **Client-side inventory filtering** — 5 methods (search, filter, getLowStock, getExpiringSoon, getStats) fetch ALL drugs first
6. **WidgetUpdateEmitter runs on web** — fetches 100 sales with items JSONB even outside Tauri
7. **Realtime over-invalidation** — sales/returns/purchases use full query invalidation instead of targeted cache updates

---

## Verification Findings

### Finding 1: Financial RPCs Exist ✅

All 4 financial RPCs are defined in migration files and have been iterated on:

| RPC | Migration File | Status |
|---|---|---|
| `compute_financial_summary_with_snapshots` | `20260528000000_financial_snapshots.sql:217` | ✅ Latest fix in `20260618000000_fix_returned_status_financials.sql` |
| `get_daily_financial_breakdown` | `20260528000000_financial_snapshots.sql:361` | ✅ Fixed ambiguity in `20260608100000_fix_daily_breakdown_ambiguous_day.sql` |
| `get_top_products_financial` | `20260528000000_financial_snapshots.sql:430` | ✅ Updated in `20260618000002_fix_financial_denominations.sql` |
| `get_category_financial_breakdown` | `20260528000000_financial_snapshots.sql:569` | ✅ Updated in `20260618000002_fix_financial_denominations.sql` |

**Decision**: Safe to remove client-side fallbacks and replace with `EMPTY_SUMMARY` return.

### Finding 2: Customer `total_purchases` Updated by DB Triggers ✅

Inside `process_checkout` RPC (`20260601000000_customer_sync_on_checkout.sql:171-176`):

```sql
UPDATE customers
SET total_purchases = COALESCE(total_purchases, 0) + v_total,
    points = COALESCE(points, 0) + v_earned_points,
    last_visit = NOW(),
    visit_count = COALESCE(visit_count, 0) + 1
```

Also properly reversed on return (`process_return`) and on cancellation (`process_cancellation`).

**Decision**: The `useRecentSales(100)` fetch in `useCustomersQuery.ts` is 100% redundant. Remove entirely.

### Finding 3: Dashboard RPCs

**Decision**: Use aggregate queries (COUNT, SUM with filters) directly — no new Supabase RPCs needed.

---

## Phase 1: Stop the Bleeding

**Savings**: ~60-70% (from ~2GB to ~600MB/day)

### 1.1 WidgetUpdateEmitter — Skip on Non-Tauri + Lighter Query

**Files**:
- `components/dashboard/WidgetUpdateEmitter.tsx`

**Problem**: `useRecentSales` is called unconditionally (line 10) even though Tauri `emit` calls are gated by `isTauri()` checks (lines 58, 63).

**Current**:
```typescript
// Line 10 — always runs
const { data: sales = [] } = useRecentSales(activeBranch?.id ?? '');
```

**Change**:
```typescript
// Line 10 — only fetch in Tauri
const { data: sales = [] } = isTauri()
  ? useRecentSales(activeBranch?.id ?? '')
  : { data: [] };
```

Or restructure with early return:
```typescript
export const WidgetUpdateEmitter = () => {
  if (!isTauri()) return null;
  // ... rest of hook calls
};
```

**Impact**: Saves ~1-2MB per initial load + eliminates periodic refetching on web.

**Risk**: None. No visible behavior change for web users.

---

### 1.2 Financial Fallbacks — Remove All Client-Side Fallbacks

**Files**:
- `services/financials/financialService.ts`

**Problem**: `isDev()` returns `true` in dev mode, triggering 4+ fallback queries that fetch ALL data when RPCs fail.

**Current pattern** (in 4 methods):
```typescript
if (error) {
  if (this.isDev()) {
    console.warn('RPC failed, running client fallback:', error);
    return this.fallbackFinancialSummary(start, end, branchId);
  }
  throw error;
}
```

**Change**: Replace all 4 fallback paths with `EMPTY_SUMMARY` or empty array return.

Methods affected:

| Method | Fallback | Current Size | Replacement |
|--------|----------|-------------|-------------|
| `getFinancialSummaryByDates` | `fallbackFinancialSummary` | Pulls ALL sales + items + returns + expenses | `return EMPTY_SUMMARY` |
| `getDailyBreakdown` | `fallbackDailyBreakdown` | Pulls ALL sales + returns totals | `return []` |
| `getTopProducts` | `fallbackTopProducts` | Pulls ALL sales with items + drug joins | `return []` |
| `getCategoryBreakdown` | `fallbackCategoryBreakdown` | Calls fallbackTopProducts(200) | `return []` |

Also remove the now-unused fallback methods and `handleFallbackError` if no other callers exist.

```typescript
async getFinancialSummaryByDates(start, end, branchId?): Promise<FinancialSummary> {
  try {
    const { data, error } = await supabase.rpc('compute_financial_summary_with_snapshots', {...});
    if (error) {
      console.error('[financial] RPC failed:', error.message);
      return EMPTY_SUMMARY;
    }
    // ... parse data
  } catch (err) {
    console.error('[financial] RPC error:', err);
    return EMPTY_SUMMARY;
  }
}
```

**Impact**: Saves ~800MB - 2.4GB/day (largest individual saving).

**Risk**: If RPCs are somehow unavailable, financial pages show zeros. RPCs are confirmed present in migrations.

---

### 1.3 Deduplicate Onboarding + Reinitialize Calls

**Files**:
- `hooks/auth/useOnboardingStatus.ts`
- `stores/authStore.ts`

**Problem**: `branchService.getAll()` and `authService.getCurrentUser()` are called in both `useOnboardingStatus` and `reinitialize` — duplicating round trips.

**Current overlap**:

| Call | useOnboardingStatus | reinitialize |
|------|-------------------|--------------|
| `authService.getCurrentUser()` | ✅ (with `force=true`) | ✅ |
| `orgService.getUserOrgs()` | ✅ | ❌ (uses stored orgId) |
| `branchService.getAll()` | ✅ | ✅ |
| `employeeService.getAll('ALL')` | ✅ | ❌ (uses repo getById) |

**Change**:

Option A — Module-level promise dedup:
```typescript
// useOnboardingStatus.ts
let cachedBranches: Branch[] | null = null;

const checkStatus = async () => {
  // ...
  if (!cachedBranches) {
    cachedBranches = await branchService.getAll(activeOrgId || undefined);
  }
  const branches = cachedBranches;
};
```

Option B — Skip `reinitialize` calls if authStore already has data:
```typescript
// authStore.ts — reinitialize
const existingBranches = get().branches;
if (existingBranches.length > 0 && defaultOrgId === get().activeOrgId) {
  // Skip branch fetch, use cached data
} else {
  const allBranches = await branchService.getAll(defaultOrgId);
}
```

**Impact**: Saves 2-3 round trips + ~30KB per initialization.

**Risk**: Low. Module-level cache lives for the page session — cleared on hard refresh.

---

## Phase 2: Remove Over-fetching from Query Hooks

**Savings**: ~20% (from ~600MB to ~200MB/day)

### 2.1 Dashboard — Replace Full-Table Queries with Aggregate Queries

**Files**:
- `components/dashboard/Dashboard.tsx`
- `hooks/queries/useDashboardQuery.ts` (new)

**Problem**: Dashboard fetches 4 complete datasets (lines 218-221):

```typescript
const { data: inventory = [] } = useInventory(activeBranchId);
const { data: sales = [] } = useRecentSales(activeBranchId);
const { data: purchases = [] } = usePurchases(activeBranchId);
const { data: batches = [] } = useBatches(activeBranchId);
```

Each is used to compute summary stats:

| Dataset Used For | What It Actually Needs |
|-----------------|----------------------|
| inventory → totalProducts, totalValue, lowStockCount | 4 aggregate numbers |
| sales → revenue, transactions, avgOrder | 3 aggregate numbers |
| purchases → recent purchases list | ~5 recent records |
| batches → expiringSoonCount | 1 count |

**Change**: Create `useDashboardQuery` hook that uses lightweight aggregate queries.

```typescript
// hooks/queries/useDashboardQuery.ts
export function useDashboardStats(branchId: string) {
  return useQuery({
    queryKey: ['dashboard', 'stats', branchId],
    queryFn: async () => {
      // Parallel aggregate queries — each returns ~100 bytes
      const [inventoryStats, salesToday, expiringCount, recentPurchases] = await Promise.all([
        // COUNT + SUM of inventory
        supabase.from('drugs').select('id, stock, public_price, min_stock')
          .eq('branch_id', branchId)
          .then(r => computeInventorySummary(r.data || [])),

        // Today's sales COUNT + SUM
        supabase.from('sales').select('total')
          .eq('branch_id', branchId)
          .eq('status', 'completed')
          .gte('date', todayStart)
          .lte('date', todayEnd)
          .then(r => ({
            revenue: r.data?.reduce((s, x) => s + (x.total || 0), 0) || 0,
            transactions: r.data?.length || 0,
          })),

        // COUNT expiring batches
        supabase.from('stock_batches').select('id', { count: 'exact', head: true })
          .eq('branch_id', branchId)
          .lte('expiry_date', thirtyDaysFromNow)
          .gt('quantity', 0)
          .then(r => r.count || 0),

        // Recent 5 purchases (lightweight)
        supabase.from('purchases').select('id, date, total, supplier_name')
          .eq('branch_id', branchId)
          .order('date', { ascending: false })
          .limit(5)
          .then(r => r.data || []),
      ]);

      return { inventoryStats, salesToday, expiringCount, recentPurchases };
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

**Impact**: Saves ~2-4MB per dashboard load. Dashboard renders 5-10x faster.

**Risk**: Medium. Changes the data source for dashboard cards — verify numbers match.

---

### 2.2 useCustomers — Remove Redundant Sales Fetch

**Files**:
- `hooks/queries/useCustomersQuery.ts`

**Problem**: `useCustomers` fetches 100 recent sales purely for client-side enrichment of fields already stored in the DB.

**Current** (`useCustomersQuery.ts:17-49`):
```typescript
const { data: rawCustomers = [] } = useRawCustomers(branchId);
const { data: sales = [] } = useRecentSales(branchId, 100); // ← REDUNDANT

const enrichedCustomers = useMemo(() => {
  return rawCustomers.map((customer: Customer) => {
    const customerSales = sales.filter(...);
    const totalPurchases = customerSales.reduce(...); // ← Already in DB
    const lastVisit = ...; // ← Already in DB
    return { ...customer, totalPurchases, lastVisit, visitCount };
  });
}, [rawCustomers, sales]);
```

**Change**:
```typescript
export function useCustomers(branchId: string, options?: { enabled?: boolean }) {
  return useRawCustomers(branchId, { enabled: options?.enabled });
  // totalPurchases, lastVisit, visitCount are already stored on customer record
  // customerRepository.mapFromDb reads them at lines 27-31
}
```

**Impact**: Saves ~500KB-1MB per Customers page load.

**Risk**: Very low. The enrichment is pure duplication of DB data.

---

### 2.3 Inventory Service — Server-Side Filtering

**Files**:
- `services/inventory/inventoryService.ts`
- `services/inventory/repositories/inventoryRepository.ts`

**Problem**: 5 methods in `inventoryService` call `getAll()` first, then filter on the client.

**Current methods to fix**:

| Method | Line | Current | Change |
|--------|------|---------|--------|
| `search()` | 57 | `getAll()` then `.filter()` | DB query with `ilike` + `limit(50)` |
| `filter()` | 69 | `getAll()` then multiple `.filter()` | Chain DB conditions |
| `getLowStock()` | 156 | `getAll()` then `.filter()` | DB query with `.lt('stock', threshold)` |
| `getExpiringSoon()` | 161 | `getAll()` then `.filter()` | DB query with `.lte('expiry_date', date)` |
| `getStats()` | 137 | `getAll()` then compute | DB aggregates (COUNT, SUM) |

**Example — search**:
```typescript
// New method in inventoryRepository
async search(query: string, branchId: string): Promise<Drug[]> {
  const { data, error } = await supabase
    .from('drugs')
    .select(LIST_COLUMNS)
    .eq('branch_id', branchId)
    .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
    .limit(50);
  if (error) throw error;
  return (data || []).map(d => this.mapFromDb(d));
}
```

**Example — getLowStock**:
```typescript
// New method in inventoryRepository
async getLowStock(threshold: number, branchId: string): Promise<Drug[]> {
  const { data, error } = await supabase
    .from('drugs')
    .select(LIST_COLUMNS)
    .eq('branch_id', branchId)
    .lt('stock', threshold)
    .gt('stock', 0)
    .limit(100);
  if (error) throw error;
  return (data || []).map(d => this.mapFromDb(d));
}
```

**Example — getStats**:
```typescript
async getStats(branchId: string): Promise<InventoryStats> {
  const [count, lowStockCount, expiringCount, outOfStockCount] = await Promise.all([
    supabase.from('drugs').select('*', { count: 'exact', head: true }).eq('branch_id', branchId),
    supabase.from('drugs').select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId).lt('stock', 10).gt('stock', 0),
    supabase.from('stock_batches').select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId).lte('expiry_date', thirtyDays).gt('quantity', 0),
    supabase.from('drugs').select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId).lte('stock', 0),
  ]);

  return {
    totalProducts: count.count || 0,
    lowStockCount: lowStockCount.count || 0,
    expiringSoonCount: expiringCount.count || 0,
    outOfStockCount: outOfStockCount.count || 0,
    totalValue: 0, // Can compute from a SUM query instead
  };
}
```

**Impact**: Saves ~500KB-2MB per search or filter operation. Faster first-time search.

**Risk**: Low. Search results may differ slightly (DB vs JS filtering), but DB filtering is more accurate.

---

## Phase 3: Replace `select('*')` with Specific Columns

**Savings**: ~10% (from ~200MB to ~150MB/day)

### Current `select('*')` Inventory

| Repository | `select('*')` Sites | Already Has Columns? | Columns To Add |
|-----------|---------------------|-------------------|----------------|
| `customerRepository.ts` | 5 (getAll, getById, getByPhone, getByCode, findByFilters) | ❌ | `CUSTOMER_LIST_COLUMNS`, `CUSTOMER_FULL_COLUMNS` |
| `cashRepository.ts` | 5 (getCurrentShift, getAllShifts, getShiftById, getTransactions, getAllTransactions) | ❌ | `SHIFT_LIST_COLUMNS`, `TX_LIST_COLUMNS` |
| `orgRepository.ts` | 5 (getById, getUserOrgs, getMembers, getMemberByUserId, getSubscription) | ❌ | `ORG_LIST_COLUMNS`, `ORG_MEMBER_COLUMNS`, `SUBSCRIPTION_COLUMNS` |
| `salesRepository.ts` | 2 (getById, findByFilters) | ✅ Uses `SALE_LIST_COLUMNS` for getAll/listPage | Use same for findByFilters; `SALE_FULL_COLUMNS` for getById |
| `employeeRepository.ts` | 4 (getById, getByAuthUserId, getByUsername, getByEmail) | ✅ Uses `BASE_COLUMNS` for getAll | Add `EMPLOYEE_LIST_COLUMNS` replacing `*` |
| `expenseRepository.ts` | 3 (getAll, getById, getSummary) | ❌ | `EXPENSE_LIST_COLUMNS` |
| `auditRepository.ts` | 2 (getLogs, getOrgLogs) | ❌ | `AUDIT_LIST_COLUMNS` |
| `sessionRepository.ts` | 1 (getActiveSessions) | ❌ | `SESSION_LIST_COLUMNS` |
| `branchRepository.ts` | 2 (getAll, getById) | ❌ | `BRANCH_LIST_COLUMNS` |
| `baseDomainService.ts` | 2 (getAll, getById) | ❌ | Override in each service |

### Total: ~31 `select('*')` sites across 10 repositories

### Pattern to Follow

Each repository should define constants like `inventoryRepository` already does:

```typescript
// Example: customerRepository.ts
const CUSTOMER_LIST_COLUMNS = [
  'id', 'org_id', 'branch_id', 'code', 'name', 'phone',
  'total_purchases', 'points', 'last_visit', 'vip', 'status',
].join(',');

const CUSTOMER_FULL_COLUMNS = [
  CUSTOMER_LIST_COLUMNS,
  'email', 'governorate', 'city', 'area', 'street_address',
  'insurance_provider', 'policy_number', 'chronic_conditions',
  'notes', 'registered_by', 'created_at',
].join(',');
```

Then use `LIST_COLUMNS` for list queries and `FULL_COLUMNS` for detail queries:

```typescript
async getAll(branchId: string): Promise<Customer[]> {
  return supabase.from('customers').select(CUSTOMER_LIST_COLUMNS)...
}

async getById(id: string): Promise<Customer | null> {
  return supabase.from('customers').select(CUSTOMER_FULL_COLUMNS)...
}
```

### Detailed Column Lists

#### customerRepository

```typescript
LIST: 'id, org_id, branch_id, code, name, phone, total_purchases, points, last_visit, vip, status'
FULL: 'id, org_id, branch_id, serial_id, code, name, phone, email, governorate, city, area, street_address, insurance_provider, policy_number, preferred_location, preferred_contact, chronic_conditions, total_purchases, points, last_visit, notes, status, vip, registered_by, created_at'
```

#### cashRepository (shifts)

```typescript
SHIFT_LIST: 'id, branch_id, org_id, status, open_time, close_time, opened_by, opening_balance, closing_balance, expected_balance, cash_sales, card_sales'
SHIFT_FULL: 'id, branch_id, org_id, branch_name, status, open_time, close_time, opened_by, closed_by, opening_balance, closing_balance, expected_balance, cash_in, cash_out, cash_sales, card_sales, returns, cash_purchases, cash_purchase_returns, notes'
```

#### cashRepository (transactions)

```typescript
TX_LIST: 'id, branch_id, shift_id, time, type, amount, reason, user_id'
TX_FULL: 'id, branch_id, org_id, shift_id, time, type, amount, reason, user_id, related_sale_id'
```

#### orgRepository (organizations)

```typescript
ORG_LIST: 'id, name, slug, owner_id, status, created_at, updated_at'
```

#### orgRepository (members)

```typescript
MEMBER_LIST: 'id, org_id, user_id, role, joined_at'
```

#### orgRepository (subscriptions)

```typescript
SUBSCRIPTION_LIST: 'id, org_id, plan, status, max_branches, max_employees, max_drugs, trial_ends_at, current_period_start, current_period_end'
```

#### employeeRepository

```typescript
EMPLOYEE_LIST: 'id, org_id, branch_id, employee_code, name, name_arabic, phone, email, position, department, role, start_date, status, end_date, salary, username, auth_user_id, photo, cover_style'
EMPLOYEE_FULL: 'id, org_id, branch_id, employee_code, name, name_arabic, phone, email, position, department, role, start_date, status, end_date, salary, notes, username, auth_user_id, password, biometric_credential_id, biometric_public_key, photo, cover_style, design_settings, national_id_card, national_id_card_back, main_syndicate_card, sub_syndicate_card'
```

#### expenseRepository

```typescript
EXPENSE_LIST: 'id, org_id, branch_id, amount, category, description, payment_method, recorded_at, approved, employee_id'
```

#### auditRepository

```typescript
AUDIT_LIST: 'id, timestamp, org_id, branch_id, actor_id, action, entity_type, entity_id, details, ip_address'
```

#### sessionRepository

```typescript
SESSION_LIST: 'id, user_id, org_id, branch_id, employee_id, employee_name, user_name, role, is_active, created_at, last_seen_at'
```

#### branchRepository

```typescript
BRANCH_LIST: 'id, org_id, code, name, status, phone, governorate, city, area'
BRANCH_FULL: 'id, org_id, code, name, phone, address, governorate, city, area, delivery_fee, monthly_sales_target, shift_start_time, latitude, longitude, status, print_settings, created_at, updated_at'
```

**Impact**: Reduces response payload size by ~20-40% per query. Zero negative impact.

**Risk**: None, as long as all columns required by `mapFromDb` are included.

---

## Phase 4: Optimize Realtime + Caching Strategy

**Savings**: ~5-10% (from ~150MB to ~80-100MB/day)

### 4.1 Realtime Invalidation — More Targeted

**Files**:
- `hooks/realtime/useRealtimeSync.ts`

**Current**: Sales/returns/purchases use full query invalidation (debounced at 500ms).

**Change**: Extend `upsertOrRemove` pattern (already used for drugs/stock_batches) to sales as well:

```typescript
.on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'sales', filter: `branch_id=eq.${activeBranchId}` },
  (payload: RealtimePostgresChangesPayload<Sale>) => {
    const updated = upsertOrRemove<Sale>(queryKeys.sales.recent(activeBranchId, 100), payload);
    if (!updated) {
      debouncedInvalidateSales();
    }
  }
)
```

Also increase debounce window:

| Current | New | Reason |
|---------|-----|--------|
| 500ms | 1500ms | Prevents invalidation storms during batch operations |
| Immediate on online recovery | 3000ms debounce | Avoid cascade refetches after reconnection |

### 4.2 Query Client Stale Times

**Files**:
- `lib/queryClient.ts`

**Current**:
```typescript
export const STALE_TIMES = {
  inventory: 5 * 60 * 1000,
  sales: 2 * 60 * 1000,
  purchases: 2 * 60 * 1000,
  // ...
};
```

**Change**:
```typescript
export const STALE_TIMES = {
  inventory: 5 * 60 * 1000,
  sales: 5 * 60 * 1000,        // Increased from 2min — realtime handles freshness
  purchases: 5 * 60 * 1000,    // Increased from 2min
  todaySales: 2 * 60 * 1000,   // Today's data needs more freshness
  employees: 60 * 60 * 1000,
  customers: 30 * 60 * 1000,
  branches: 60 * 60 * 1000,
  suppliers: 30 * 60 * 1000,
  batches: 5 * 60 * 1000,
  returns: 5 * 60 * 1000,
  org: 60 * 60 * 1000,
} as const;
```

### 4.3 useTodaySales StaleTime

**Files**:
- `hooks/queries/useSalesQuery.ts`

**Current** (line 20):
```typescript
staleTime: 30 * 1000,  // 30 seconds — too frequent
```

**Change**:
```typescript
staleTime: STALE_TIMES.todaySales,  // 2 minutes — sufficient with realtime
```

**Impact**: Reduces automatic refetches by 4x. Realtime compensates for freshness.

**Risk**: Data may be up to 2 minutes stale, mitigated by Realtime push updates.

---

## Execution Order

```
Phase 1.1 — WidgetUpdateEmitter (skip non-Tauri)         5 min
Phase 2.2 — useCustomers (remove useRecentSales)         10 min
Phase 1.2 — Financial fallbacks → EMPTY_SUMMARY          15 min
Phase 3   — select('*') → columns (31 sites)             40 min
Phase 4.2 — staleTime adjustments                         5 min
Phase 4.1 — Realtime debounce 500→1500ms                 10 min
Phase 2.3 — Server-side filtering (inventory)            20 min
Phase 1.3 — Deduplicate onboarding init                  10 min
Phase 2.1 — Dashboard aggregate queries                  45 min
```

### Total Estimated Time: ~2.5 hours

### Rationale for Ordering

1. **Phase 1.1 first** — Quickest win, no behavior change
2. **Phase 2.2 second** — Confirmed redundant via migration analysis, trivial change
3. **Phase 1.2 third** — RPCs confirmed present, fallback removal is safe
4. **Phase 3 mid-pack** — Mechanical work, 31 sites but well-defined pattern
5. **Phase 4 quick wins** — Simple config changes
6. **Phase 2.3 mid-pack** — Moderate effort per method
7. **Phase 1.3 late** — Module cache requires careful consideration
8. **Phase 2.1 last** — Largest change, highest risk — saved for after other phases deliver ~80% savings

---

## Impact Summary

```
┌────────────┬───────────────────┬──────────────────┬─────────────┬─────────────┐
│   Phase    │   Initial Load    │   Daily Usage     │  Savings    │   Risk      │
├────────────┼───────────────────┼──────────────────┼─────────────┼─────────────┤
│ Current    │      ~5 MB        │     ~2 GB        │     -       │     -       │
│ Phase 1    │      ~1 MB        │     ~600 MB      │    ~70%     │   Low       │
│ Phase 2    │     ~300 KB       │     ~200 MB      │    ~90%     │   Medium    │
│ Phase 3    │     ~200 KB       │     ~150 MB      │    ~93%     │   None      │
│ Phase 4    │     ~200 KB       │     ~80-100 MB   │   ~95-97%   │   Low       │
└────────────┴───────────────────┴──────────────────┴─────────────┴─────────────┘
```

### Performance Impact by Phase

| Change | Performance Impact | Explanation |
|--------|------------------|-------------|
| **Phase 1.1** WidgetUpdateEmitter skip non-Tauri | ✅ Positive | Removes unnecessary query on web — app opens faster |
| **Phase 1.2** Financial fallbacks → empty | ⚠️ Necessary | Returns zeros if RPCs fail (confirmed present) |
| **Phase 1.3** Deduplicate init | ✅ Positive | App opens 200-500ms faster (fewer round trips) |
| **Phase 2.1** Dashboard → aggregate queries | ✅ Strongly positive | Dashboard loads 5-10x faster (500 bytes vs 3MB) |
| **Phase 2.2** useCustomers → remove double fetch | ✅ Positive | Customers page loads faster |
| **Phase 2.3** Server-side filtering | 🟰 Neutral | Search speed similar — DB returns 20 items instead of 2000 |
| **Phase 3** select('*') → columns | ✅ Positive | Every response smaller + less client memory |
| **Phase 4.1** Realtime debounce 500→1500ms | ⚠️ Minimal | 1 second delay in cross-device sync — imperceptible |
| **Phase 4.2-3** staleTime increase | ⚠️ Minimal | Data may be 1-2 min older — compensated by realtime |

---

## Notes

- **Phase 1** changes no visible behavior — 100% safe
- **Phase 2** changes Dashboard data sources — verify numbers match after implementation
- **Phase 3** is mechanical replacement — safe, but ensure all `mapFromDb` columns are included
- **Phase 4** changes timing — monitor that data remains fresh enough
- **Phase 2.1** (Dashboard RPCs): Using lightweight aggregate queries with SELECT on specific columns + COUNT with `head: true` — no new Supabase RPCs needed
