# Phase 4: Tenant Isolation & Runtime Verification

## Status: NOT STARTED
## Depends On: Phase 3 (Audit Trail)

---

## Objective

Prove that PharmaFlow's multi-tenant architecture is airtight. Every data read/write must be
scoped to the correct `orgId` + `branchId`. This phase performs a systematic audit of every
service method, every Supabase query, and every storage key to guarantee data isolation.
Additionally, we verify the runtime behavior of the full transaction lifecycle under realistic
conditions.

---

## Scope

### Areas of Concern

| Area | Risk | Verification Method |
|------|------|---------------------|
| Supabase Queries | Missing `.eq('branch_id', ...)` filter | Code audit of every `.from().select()` |
| Local Storage | Keys not scoped to branch | Audit all `StorageKeys` usage |
| Service Methods | Missing `branchId` parameter | Check every public method signature |
| RLS Policies | Supabase policies not enforced | Query with wrong org token |
| Cross-Branch Leak | Employee in Branch A sees Branch B data | End-to-end scenario test |
| Transaction Integrity | Checkout fails mid-way; stock is wrong | Simulated failure test |
| Concurrency | Two sales on same item at the same time | Race condition test |

### Files Primarily Affected

| Layer | File | Check |
|-------|------|-------|
| Service | `services/inventory/inventoryService.ts` | All reads scoped to branch |
| Service | `services/sales/salesService.ts` | All reads scoped to branch |
| Service | `services/purchases/purchaseService.ts` | All reads scoped to branch |
| Service | `services/returns/returnService.ts` | All reads scoped to branch |
| Service | `services/customers/customerService.ts` | All reads scoped to branch |
| Service | `services/suppliers/supplierService.ts` | All reads scoped to branch |
| Service | `services/hr/employeeService.ts` | Reads scoped to branch OR org |
| Service | `services/cash/cashService.ts` | Shift data scoped to branch |
| Service | `services/branchService.ts` | Branch access scoped to org |
| Util | `utils/storage.ts` | Ensure sharded key scheme |
| Util | `utils/stockOperations.ts` | All ops receive and use branchId |
| Hook | `hooks/useEntityHandlers.ts` | Context always contains branchId |
| DB | `supabase/migrations/*.sql` | RLS policies on every table |

---

## Architecture Decisions

### 1. Storage Key Scoping Standard

All local storage keys that hold branch-specific data must follow the pattern:
```
${KEY}_${branchId}
```

Example: `inventory_BRANCH-001`, `shifts_BRANCH-001`

Global keys (settings, theme) do NOT need scoping.

### 2. Service Method Contract

Every service method that reads or writes tenant data must:
1. Accept `branchId` as a required parameter (not optional).
2. Include `branchId` in every Supabase query filter.
3. Include `branchId` in every local storage key.

### 3. RLS as Defense in Depth

Even though the application layer filters by `branchId`, Supabase RLS policies serve as
the last line of defense. Every table with tenant data must have an RLS policy that
restricts access based on the JWT `org_id` claim.

### 4. Transaction Integrity Model

The `UndoManager` pattern established in Phase 2 must be verified to correctly roll back
partial operations. We test this by:
1. Injecting a deliberate failure after stock deduction but before sale creation.
2. Verifying that stock is restored to its original value.
3. Verifying that no orphaned audit entries exist.

---

## Verification Scenarios

### Scenario A: Tenant Isolation
1. Set up two branches (Branch A, Branch B) under the same org.
2. Log in as Branch A employee.
3. Verify that `inventoryService.getAll('BRANCH-A')` returns ONLY Branch A items.
4. Verify that `salesService.getAll('BRANCH-A')` returns ONLY Branch A sales.
5. Attempt to read Branch B data directly — must return empty.

### Scenario B: Transaction Rollback
1. Start a checkout with 3 items.
2. After the 2nd item's stock is deducted, simulate a failure.
3. Verify that both items' stock is restored.
4. Verify that no partial sale record exists.

### Scenario C: Concurrency
1. Create a product with stock = 5.
2. Simultaneously fire two checkouts, each buying 3.
3. Expected: One succeeds, one fails with "insufficient stock".
4. Final stock = 2 (not -1).

### Scenario D: Shift Integrity
1. Open a shift with 1000 EGP opening balance.
2. Process 3 sales (cash), 1 return (cash), 1 cash-out.
3. Close shift.
4. Verify `expectedBalance` matches the sum of all transactions.
5. Verify all transactions have correct `branchId`.

---

## Success Criteria

1. Every Supabase `select`/`insert`/`update`/`delete` in services includes a tenant filter.
2. Every local storage key for tenant data includes branch scoping.
3. Scenario A passes — no cross-branch data leakage.
4. Scenario B passes — full rollback on partial failure.
5. Scenario C — concurrent operations don't corrupt stock.
6. Scenario D — shift math is always correct.
7. `tsc --noEmit` passes with 0 new errors.
