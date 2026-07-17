# Performance Optimization Plan

## Bandwidth Breakdown (from Supabase project inspector)

| Category | Upload | Download |
|---|---|---|
| PostgREST | 53.5% (58.94 KB) | **99.1% (6 MB)** |
| Realtime | 40.6% (44.78 KB) | 0.4% (27.6 KB) |
| Auth | 5.9% (6.45 KB) | 0.4% (26.04 KB) |
| Functions | 0.0% (0 B) | 0.0% (0 B) |

**Primary target:** PostgREST download — 6 MB per page load.

---

## 1. Stop Over-Fetching — Narrow Column Selections

**Problem:** Several queries request every column in a table when only a subset is needed.

| Query | Current columns | Fix | Est. reduction |
|---|---|---|---|
| `inventoryRepository.getAll()` | 27 columns including `description`, `notes`, `item_rank` | Drop unused columns for list views | ~40% |
| `salesRepository.listPage()` | 37 columns (`SALE_LIST_COLUMNS`) | Lightweight list vs full detail selects | ~50% |
| `employeeRepository.getAll()` | Includes `biometric_credential_id`, `biometric_public_key`, `password`, `photo`, `design_settings`, `notes`, `username`, `auth_user_id` | Drop columns not used in list/dropdowns | ~60% |
| `returnsRepository` | `'*, items:return_items(*)'` | Explicit column projection | ~40% |

**Files:**
- `services/inventory/inventoryRepository.ts`
- `services/sales/salesRepository.ts`
- `services/employees/employeeRepository.ts`
- `services/returns/` — all files

---

## 2. Audit `select=` Per `useQuery`

**Problem:** The PostgREST URLs contain every column name encoded in the query string. Many components only use a fraction of the fetched data.

**Action:** Walk each `useQuery` call and ensure the `supabase.from().select()` matches only columns rendered by the consuming component or derived values.

**Files:** `hooks/queries/*.ts`, `services/*/*Repository.ts`

---

## 3. Fix Broad Cache Invalidation

**Problem:** Every mutation invalidates entire query prefixes:

```typescript
// Every sale completion blows away ALL inventory & sales caches
queryClient.invalidateQueries({ queryKey: ['inventory'] });
queryClient.invalidateQueries({ queryKey: ['sales'] });
queryClient.invalidateQueries({ queryKey: ['batches'] });
```

**Fix:** Scope invalidation to the relevant branch/org:

```typescript
queryClient.invalidateQueries({ queryKey: ['inventory', currentBranchId] });
```

**Files:** `hooks/queries/` — all mutation hooks (`useCompleteSale`, `useCreatePurchase`, etc.)

---

## 4. Increase Stale Times for Low-Churn Data

| Current stale time | Data | Recommended |
|---|---|---|
| 30 min | `employees` | 60 min |
| 10 min | `customers` / `suppliers` | 30 min |
| 5 min | `branches` | 60 min |
| 2 min | `purchases` / `sales` (non-realtime) | 5 min |

**File:** `lib/queryClient.ts`

---

## 5. Aggregate Financial Queries Server-Side

**Problem:** `fallbackFinancialSummary()` runs 3 parallel heavy queries with joins over date ranges, fetching raw rows to aggregate client-side.

**Action:** Create a PostgREST view or DB function that returns pre-aggregated financial summaries. Cuts data from thousands of rows to a single row.

**Files:**
- `services/financial/financialService.ts`
- New Supabase migration

---

## 6. Paginate Large Lists

**Problem:** `useEmployees()`, `useCustomers()`, `useRawInventory()` fetch all rows. Employee query alone returned 2 MB.

**Action:** Convert list components to paginated queries (`range()` + `count: 'exact'`), following the existing `salesRepository.listPage()` pattern.

**New hooks needed:**
- `useEmployeePage(branchId, page, pageSize, filters?)`
- `useCustomerPage(branchId, page, pageSize, filters?)`
- `useInventoryPage(branchId, page, pageSize, filters?)`

**Files:** `hooks/queries/`, `services/*/`

---

## 7. Enable HTTP Caching Headers

**Problem:** No `stale-while-revalidate` or `Cache-Control`. Every page load re-fetches from scratch.

**Action:** For read-only endpoints, use Supabase `Prefer: headers-only` HEAD requests to check freshness before full fetches. Evaluate Supabase project-level cache configuration.

---

## 8. CSV Header Deduplication (Polish)

**Problem:** When `valueLabel === "Calls"`, the CSV produces `Endpoint,Method,Calls,Calls,Avg Duration (ms),Errors`.

**Fix:** Skip valueLabel column in header if it matches `"Calls"`.

**File:** `components/performance/PerformanceMetrics.tsx:metricsCsv()`

---

## Priority & Effort

| # | Task | Impact | Effort |
|---|---|---|---|
| **1** | Narrow column selects | 🔴 High | Small |
| **3** | Fix broad cache invalidation | 🔴 High | Medium |
| **6** | Paginate employees, customers, inventory | 🔴 High | Medium |
| **2** | Audit select= per useQuery | 🟡 Medium | Medium |
| **4** | Bump stale times | 🟡 Medium | Small |
| **5** | Server-side financial aggregation | 🟡 Medium | Large |
| **7** | HTTP caching headers | 🟢 Low | Small |
| **8** | CSV header dedup | 🟢 Low | Trivial |
