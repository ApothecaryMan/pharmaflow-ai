# Full Replication Plan — Final Edition

## Goal
Convert all cache updates from `invalidateQueries` (full refetch) to **Delta Patches** (optimistic cumulative updates) to achieve full realtime replication across devices without UI freezes or wasted bandwidth.

---

## 🟢 Section 1: Sales — Partially Done

### 1.1 `useSalesMutations.ts`

| Function | Current State | Required |
|----------|--------------|----------|
| `useCompleteSale` | `setQueryData` for inventory + 8 `invalidateQueries` (redundant — the `setQueryData` is immediately overwritten by the invalidation) | Remove redundant `invalidateQueries`, rely on `setQueryData` + Realtime Patcher |
| `useAddSale` | 4 `invalidateQueries` with zero `setQueryData` | Add `setQueryData` for sales lists (`sales.recent` + `sales.today`) |

### 1.2 `useSalesHandlers.ts`

| Function | Current State | Required |
|----------|--------------|----------|
| `handleUpdateSale` (cancellation) | Local state + 8 `invalidateQueries` | Replace `invalidateQueries` with `setQueryData` (hard part is done, just need cleanup) |
| `handleUpdateSale` (modification) | Local state + 5 `invalidateQueries` | Same |
| `handleUpdateSale` (delivery finalization) | 6 `invalidateQueries` | `setQueryData` to flip order status to `completed` immediately |

---

## 🟡 Section 2: Returns — Not Started

### 2.1 `useReturnsMutations.ts`

| Function | Current State | Required |
|----------|--------------|----------|
| `useProcessSalesReturn` | `setQueriesData(['sales'], ...)` + 7 `invalidateQueries` | Add `setQueryData` for inventory (restore quantities) + batches + dashboard |
| `useCreatePurchaseReturn` | 5 `invalidateQueries` with zero `setQueryData` | Add `setQueryData` for inventory + batches + purchase returns list |

---

## 🔴 Section 3: Purchases — Not Started

### 3.1 `usePurchaseMutations.ts`

| Function | Current State | Required |
|----------|--------------|----------|
| `useAddPurchase` | 2-4 `invalidateQueries` | `setQueryData` for inventory + batches if status is completed |
| `useApprovePurchase` | 5 `invalidateQueries` | `setQueryData` to merge purchase quantities into inventory/batches cache |
| `useMarkPurchaseReceived` | 5 `invalidateQueries` | Same as `useApprovePurchase` |
| `useRejectPurchase` | 5 `invalidateQueries` | `setQueryData` to update purchase status only (no inventory impact) |

---

## 🔴 Section 4: Inventory — Not Started

### 4.1 `useInventoryMutations.ts`

| Function | Current State | Required |
|----------|--------------|----------|
| `useAddProduct` | `invalidateQueries([inventory.all, batches.all])` | `setQueryData` to add item to cache + remove `invalidateQueries` |
| `useUpdateProduct` | `invalidateQueries([inventory.all, batches.all])` | `setQueryData` to update item in cache |
| `useDeleteProduct` | `invalidateQueries([inventory.all])` only (missing batches) | `setQueryData` to remove from cache + add `removeQueries` for batches |

### 4.2 `useInventoryHandlers.ts`

| Function | Current State | Required |
|----------|--------------|----------|
| `handleAddDrug` | Local state + `batchService.getAllBatches()` + 3 `invalidateQueries` | Remove `batchService.getAllBatches()`, rely on `setQueryData` + Realtime |
| `handleUpdateDrug` | Local state + 4 `invalidateQueries` | Same |
| `handleDeleteDrug` | Local state + `batchService.getAllBatches()` + 4 `invalidateQueries` | Same |
| `handleRestock` | `inventoryService.processStockAdjustment()` + 4 `invalidateQueries` | `setQueryData` for new quantity + batches |

---

## 🟠 Section 5: Customers & Suppliers

### 5.1 `useCustomerMutations.ts`

| Function | Current State | Required |
|----------|--------------|----------|
| `useAddCustomer` | `invalidateQueries([customers.all])` | `setQueryData` (Realtime Patcher `patchListCache` already exists ✅ for cross-device) |
| `useUpdateCustomer` | `invalidateQueries([customers.all])` | `setQueryData` to update customer data |
| `useDeleteCustomer` | `invalidateQueries([customers.all])` | `setQueryData` to remove from cache |

### 5.2 `useSupplierMutations.ts`

| Function | Current State | Required |
|----------|--------------|----------|
| `useAddSupplier` | `invalidateQueries([suppliers.all])` | `setQueryData` (Realtime Patcher exists ✅) |
| `useUpdateSupplier` | `invalidateQueries([suppliers.all])` | `setQueryData` |
| `useDeleteSupplier` | `invalidateQueries([suppliers.all])` | `setQueryData` |

---

## 🔴 Section 6: Employees, Branches & Org

### 6.1 `useEmployeeMutations.ts`

| Function | Current State | Required |
|----------|--------------|----------|
| `useAddEmployee` | `invalidateQueries([employees.all, employees.allByOrg])` | `setQueryData` + **Add Realtime subscription for employees table** (does not exist yet) |
| `useUpdateEmployee` | `invalidateQueries([employees.all, employees.allByOrg])` | Same |
| `useDeleteEmployee` | `invalidateQueries([employees.all, employees.allByOrg])` | Same |

### 6.2 Tables with Zero Realtime Subscription

| Table | Affected Files | Required |
|-------|---------------|----------|
| `employees` | `useEmployeeMutations.ts`, `EmployeeDashboard.tsx`, `BranchSettings.tsx` | Add `patchListCache` to Registry |
| `branches` | `useBranchesQuery.ts`, `BranchSettings.tsx`, `authStore.ts` | Add `patchListCache` to Registry |
| `org` | `useOrgQuery.ts`, `OrgSettings.tsx` | Add Realtime subscription |
| `achievements` | `useAchievementsQuery.ts` (presumed) | Add Realtime subscription (low priority) |
| `audit` | `useAuditQuery.ts` | Add Realtime subscription (low priority) |

---

## 🔴 Section 7: Expenses & Cash Register

### 7.1 `useExpenses.ts`

| Function | Current State | Required |
|----------|--------------|----------|
| `recordExpense` | `invalidateExpenses()` (predicate) + shifts + cashTransactions | Difficult due to filter-based queries. **Solution:** `setQueryData` for shifts/cashTransactions only, leave `invalidateExpenses` for now |
| `deleteExpense` | `invalidateExpenses()` only | Same as above |

### 7.2 `useCashRegister.ts` (in `components/sales/`)

| Function | Current State | Required |
|----------|--------------|----------|
| `handleOpenShift` | Via `startShift()` → `refreshShifts()` → `invalidateQueries([shifts.all])` | `setQueryData` to add new shift to cache |
| `handleCloseShift` | Via `endShift()` → `refreshShifts()` → `invalidateQueries([shifts.all])` | `setQueryData` to update shift status |
| `handleCashTransaction` (cash-out) | `expenseService.recordExpense()` + `refreshShifts()` + `invalidateQueries([cashTx])` | `setQueryData` to add transaction |
| `handleCashTransaction` (cash-in) | Via `addTransaction()` → `refreshShifts()` | `setQueryData` directly |

### 7.3 `useShift.tsx` (in `hooks/sales/`)

| Function | Current State | Required |
|----------|--------------|----------|
| `refreshShifts` | `invalidateQueries([shifts.all])` | `setQueryData` instead of `invalidateQueries` |
| `addTransaction` | `refreshShifts()` + `invalidateQueries([cashTx])` | `setQueryData` to add transaction directly |

---

## 🔴 Section 8: Realtime Infrastructure

### 8.1 `services/realtime/patchers.ts`

| Function | Current State | Required |
|----------|--------------|----------|
| `patchListCache<T>` | Works for flat arrays only (`T[]`) | **New:** Create `patchPagedListCache<T>` that supports `{ rows: T[], count: number }` |
| `patchDetailCache<T>` | Works for detail keys | No change needed |
| `invalidateBranchScope(prefix)` | Works (but does full refetch) | No change for now (will be phased out) |
| `invalidateDashboard(branchId)` | Full refetch | **New:** Create `patchDashboardStats` |
| **New:** `patchPagedListCache` | Doesn't exist | **Create it** to support paged queries (`sales.recent`, `sales.today`, `purchases.all`, `returns.sales`, `returns.purchases`) |

### 8.2 `services/realtime/registry.ts`

| Table | Current State | Improvement Required |
|-------|--------------|---------------------|
| `drugs` | `patchListCache(inventory.all)` ✅ | Add `patchDetailCache(inventory.detail)` for `['drug', drugId]` |
| `stock_batches` | `patchListCache(batches.all)` ✅ | Add `patchDetailCache(batches.detail)` for `['batch', batchId]` |
| `sales` | `invalidateBranchScope('sales')` + `patchDetailCache(sales.detail)` | Replace `invalidateBranchScope` with `patchPagedListCache` |
| `returns` | `invalidateBranchScope('returns')` only | Add `patchPagedListCache` |
| `purchases` | `invalidateBranchScope('purchases')` + `patchDetailCache(purchases.detail)` | Replace `invalidateBranchScope` with `patchPagedListCache` |
| `employees` | **Missing** ❌ | **Add** `patchListCache(employees.all)` + `employees.allByOrg` |
| `branches` | **Missing** ❌ | **Add** `patchListCache(branches.all)` |
| `org` | **Missing** ❌ | **Add** appropriate subscription |
| `achievements` | **Missing** ❌ | **Add** (low priority) |
| `audit` | **Missing** ❌ | **Add** (low priority) |
| `expenses` | `invalidateBranchScope('expenses')` only | Hard to improve due to filter queries |
| `cash_transactions` | `invalidateBranchScope('cashTransactions')` + shifts | Add `patchListCache` |

### 8.3 `services/realtime/useRealtimeDispatcher.ts`

| Feature | Current State | Required |
|---------|--------------|----------|
| Online recovery | Full cache reload (12 prefixes) | Optimize to only fetch missed data based on `updated_at` |

---

## 🔴 Section 9: Dashboard

### 9.1 `useDashboardQuery.ts`

| Current State | Problem | Proposed Solution |
|--------------|---------|------------------|
| `useQuery(['dashboard', 'stats', branchId], ...)` — invalidated in 14+ places | Every sale/purchase/return clears the cache and refetches the RPC | **Recommended approach:** Create a `dashboard_summary` DB table updated via `DB TRIGGER` after every transaction, then subscribe to it via Realtime. This prevents drift better than `patchDashboardStats`. |

Temporary alternative: Create `patchDashboardStats` in patchers.ts that cumulatively adds invoice values to cached stats, accepting minor drift risk.

---

## 📋 Final Priority Table

| Priority | Section | Rationale |
|----------|---------|-----------|
| 1 🥇 | Purchases | Biggest inventory impact — every purchase triggers 5 invalidations |
| 2 🥇 | Inventory Mutations | Directly affects UX when adding/editing products |
| 3 🥇 | Delivery Finalization | Affects order status sync across devices |
| 4 🥈 | Returns | Restoring inventory without full reload |
| 5 🥈 | Expenses & Cash | Financial transaction sync |
| 6 🥈 | Customers & Suppliers | Simple — `patchListCache` already exists |
| 7 🥉 | Employees & Branches | New Realtime subscriptions needed |
| 8 🥉 | Realtime Infrastructure (paged list patcher) | Enables sales/purchases list optimization |
| 9 🥉 | Dashboard | Complex — needs dedicated table or cumulative approach |

---

## ✅ Definition of Done

- [ ] Zero `invalidateQueries` in any mutation's `onSuccess` (exception: expenses and dashboard until a root solution is ready)
- [ ] All mutations use `setQueryData` for optimistic updates
- [ ] All core tables (`employees`, `branches`) are in the Realtime Registry
- [ ] `patchPagedListCache` exists and supports `{ rows, count }`
- [ ] Detail patchers exist for inventory and batches
- [ ] Dashboard uses either a `dashboard_summary` table with Realtime, or `patchDashboardStats`
- [ ] Online recovery is selective instead of full reload
- [ ] No `setQueryData` is immediately followed by `invalidateQueries` on the same key (redundant)
