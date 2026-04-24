# Phase 4 Tasks: Tenant Isolation & Runtime Verification

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked

---

## Task 1: Audit Inventory Service Tenant Scoping
**File**: `services/inventory/inventoryService.ts`
**Estimate**: 30 min
**Depends on**: Nothing

- [ ] List every public method in `inventoryService`
- [ ] For each method, verify:
  - [ ] `branchId` is a required parameter (not optional)
  - [ ] Every `supabase.from('drugs').select(...)` includes `.eq('branch_id', branchId)`
  - [ ] Every `supabase.from('drugs').insert(...)` includes `branch_id` in the payload
  - [ ] Every `supabase.from('drugs').update(...)` includes `.eq('branch_id', branchId)`
  - [ ] Every `supabase.from('drugs').delete(...)` includes `.eq('branch_id', branchId)`
- [ ] Fix any methods missing tenant filters
- [ ] Document findings in a checklist

**Verification**: `tsc --noEmit`. Read inventory with a wrong branchId — expect empty array.

---

## Task 2: Audit Sales Service Tenant Scoping
**File**: `services/sales/salesService.ts`
**Estimate**: 25 min
**Depends on**: Nothing

- [ ] List every public method in `salesService`
- [ ] Verify every read/write includes `branch_id` filter
- [ ] Verify every `insert` includes `branch_id` in payload
- [ ] Fix any gaps

**Verification**: `salesService.getAll('WRONG-BRANCH')` returns empty array.

---

## Task 3: Audit Purchase Service Tenant Scoping
**File**: `services/purchases/purchaseService.ts`
**Estimate**: 20 min
**Depends on**: Nothing

- [ ] Same audit as Tasks 1-2 for purchase service
- [ ] Check `getById`, `getAll`, `create`, `update`, `delete`
- [ ] Fix any gaps

**Verification**: Same pattern.

---

## Task 4: Audit Return Service Tenant Scoping
**File**: `services/returns/returnService.ts`
**Estimate**: 20 min
**Depends on**: Nothing

- [ ] Audit `createReturn`, `createPurchaseReturn`, `getAll`, etc.
- [ ] Ensure returns are linked to correct branch
- [ ] Fix any gaps

**Verification**: Same pattern.

---

## Task 5: Audit Customer & Supplier Services
**Files**: `services/customers/customerService.ts`, `services/suppliers/supplierService.ts`
**Estimate**: 20 min
**Depends on**: Nothing

- [ ] Audit both services for branch scoping
- [ ] Customers and suppliers may be org-level (shared across branches) — verify this is intentional
- [ ] If branch-scoped: ensure filters exist
- [ ] If org-scoped: ensure `org_id` filter exists instead

**Verification**: Same pattern.

---

## Task 6: Audit Employee Service Tenant Scoping
**File**: `services/hr/employeeService.ts`
**Estimate**: 20 min
**Depends on**: Nothing

- [ ] Employees can be branch-scoped OR org-scoped (getAll with 'ALL')
- [ ] Verify `getAll(branchId)` filters by branch when branchId ≠ 'ALL'
- [ ] Verify `getAll('ALL')` filters by `org_id` instead
- [ ] Ensure `create` always includes `branchId`
- [ ] Ensure `update` is scoped

**Verification**: Same pattern.

---

## Task 7: Audit Cash/Shift Service Tenant Scoping
**File**: `services/cash/cashService.ts`
**Estimate**: 15 min
**Depends on**: Nothing

- [ ] Verify all shift reads filter by `branchId`
- [ ] Verify shift creation includes `branchId`
- [ ] Verify transactions within a shift inherit the shift's `branchId`

**Verification**: Same pattern.

---

## Task 8: Audit Local Storage Key Scoping
**Files**: `utils/storage.ts`, `config/storageKeys.ts`
**Estimate**: 30 min
**Depends on**: Nothing

- [ ] List every key in `StorageKeys`
- [ ] Categorize each as:
  - **Global** (settings, theme, language) — no scoping needed
  - **Branch-specific** (inventory, sales, shifts, batches) — must include `branchId`
- [ ] For each branch-specific key, search codebase for usage
- [ ] Verify every `storage.get(KEY)` and `storage.set(KEY)` uses the scoped variant
- [ ] Fix any unscoped branch-specific keys
- [ ] Document the categorization

**Verification**: Switch branches in the app. Verify data changes when branch changes.

---

## Task 9: Audit stockOperations Utility
**File**: `utils/stockOperations.ts`
**Estimate**: 15 min
**Depends on**: Nothing

- [ ] Every function in `stockOperations` must receive `branchId`
- [ ] Verify it's passed through to `inventoryService` and `stockMovementService`
- [ ] Verify movement logs include `branchId`

**Verification**: Process a stock adjustment. Check movement log has correct `branchId`.

---

## Task 10: Audit useEntityHandlers Context Propagation
**File**: `hooks/useEntityHandlers.ts`
**Estimate**: 25 min
**Depends on**: Nothing

- [ ] Every handler that calls a service must construct an `ActionContext`
- [ ] Verify `ActionContext` always includes:
  - [ ] `branchId` from `useData().activeBranchId`
  - [ ] `orgId` from settings or org service
  - [ ] `performerId` from current employee
  - [ ] `timestamp` from `getVerifiedDate()`
  - [ ] `shiftId` from current shift (when applicable)
- [ ] No handler should pass `undefined` for `branchId`

**Verification**: Set a breakpoint in a handler. Check context object has all fields populated.

---

## Task 11: Transaction Rollback Test
**Estimate**: 30 min
**Depends on**: Tasks 1-10

- [ ] Create a test function that calls `processCheckout` with a mock inventory
- [ ] After 2nd item allocation, inject a thrown error
- [ ] Verify `undoManager.undoAll()` is called
- [ ] Verify inventory is restored to pre-checkout levels
- [ ] Verify no sale record exists in `salesService`
- [ ] Verify no orphaned stock movements exist
- [ ] Document the test scenario and result

**Verification**: Manual or scripted test. Stock levels match pre-operation snapshot.

---

## Task 12: Shift Math Integrity Test
**Estimate**: 20 min
**Depends on**: Task 7

- [ ] Open a shift with known opening balance (e.g., 1000 EGP)
- [ ] Process: 3 cash sales, 1 card sale, 1 return, 1 cash-out
- [ ] Close shift
- [ ] Verify `expectedBalance` = opening + cashSales + cashIn - cashOut - returns
- [ ] Verify `closingBalance` (user-entered) is compared against `expectedBalance`
- [ ] Verify all transactions in the shift have matching `branchId`

**Verification**: Math matches. Audit log shows all transactions.

---

## Task 13: Supabase RLS Policy Audit
**File**: `supabase/migrations/*.sql`
**Estimate**: 30 min
**Depends on**: Nothing

- [ ] List every table in the schema
- [ ] For each table with tenant data, verify:
  - [ ] RLS is enabled: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
  - [ ] SELECT policy filters by `org_id` from JWT
  - [ ] INSERT policy ensures `org_id` matches JWT
  - [ ] UPDATE policy ensures `org_id` matches JWT
  - [ ] DELETE policy ensures `org_id` matches JWT
- [ ] Document any tables missing RLS
- [ ] Write migration to add missing policies

**Verification**: Query Supabase with a different org's JWT. Expect 0 rows.

---

## Task 14: Final Cross-Branch Leak Test
**Estimate**: 20 min
**Depends on**: All above

- [ ] Set `activeBranchId` to Branch A
- [ ] Load dashboard — verify only Branch A data shown
- [ ] Switch to Branch B via branch selector
- [ ] Verify dashboard now shows only Branch B data
- [ ] Verify inventory, sales, customers all refreshed for Branch B
- [ ] Go back to Branch A — verify data is restored correctly
- [ ] Check no Branch B data leaked into Branch A's local storage keys

**Verification**: Visual inspection + storage key audit.

---

## Task 15: Final Summary & Phase Completion
**Estimate**: 15 min
**Depends on**: All above

- [ ] Run `tsc --noEmit` — 0 new errors
- [ ] Document all findings in a summary report
- [ ] List any remaining risks or deferred items
- [ ] Mark Phase 4 as COMPLETED

---

## Estimated Total: ~5.5 hours
