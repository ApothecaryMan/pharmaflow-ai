# Phase 3 Tasks: Audit Trail & Service Integration

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked

---

## Task 1: Create Audit Action Constants
**File**: `config/auditActions.ts` (NEW)
**Estimate**: 15 min
**Depends on**: Nothing

- [ ] Create `config/auditActions.ts`
- [ ] Define `AuditActions` const object with all entity.verb patterns:
  - `sale.*` — create, void, return
  - `purchase.*` — create, complete, return
  - `inventory.*` — adjust, receive, deduct, restore, transfer
  - `shift.*` — open, close, cash_in, cash_out
  - `auth.*` — login, logout, failed
  - `employee.*` — create, update, delete
  - `supplier.*` — create, update, delete
  - `customer.*` — create, update, delete
- [ ] Export `AuditAction` type derived from the const values
- [ ] Export `AuditSeverity` type: `'info' | 'warning' | 'critical'`

**Verification**: File compiles. Imported in `auditService.ts` without errors.

---

## Task 2: Extend AuditEntry Interface
**File**: `services/auditService.ts`
**Estimate**: 10 min
**Depends on**: Task 1

- [ ] Add `severity?: AuditSeverity` field to `AuditEntry`
- [ ] Add `metadata?: Record<string, any>` field to `AuditEntry`
- [ ] Update `mapAuditToDb` to include `severity` and `metadata` in the DB payload
- [ ] Update `mapDbToAudit` to read `severity` and `metadata` from DB response
- [ ] Update `auditService.log()` signature to accept `severity` and `metadata`

**Verification**: `tsc --noEmit` passes. Existing callers still work (fields are optional).

---

## Task 3: Add `logBatch` Method
**File**: `services/auditService.ts`
**Estimate**: 20 min
**Depends on**: Task 2

- [ ] Add `logBatch(entries: Omit<AuditEntry, 'id' | 'timestamp'>[])` to `auditService`
- [ ] Generate `id` + `timestamp` for each entry
- [ ] Single `supabase.from('audit_logs').insert(...)` call for all entries
- [ ] Fallback: append all to local storage (cap at 2000 entries)
- [ ] On Supabase failure: queue entries in `syncQueueService` for retry
- [ ] Add error handling that **never** throws (log warning to console only)

**Verification**: Call `logBatch` with 5 test entries. Check local storage contains them.

---

## Task 4: Enrich `processCheckout` Audit Trail
**File**: `services/transactions/transactionService.ts`
**Estimate**: 30 min
**Depends on**: Task 1, Task 2, Task 3

- [ ] Import `AuditActions` from `config/auditActions`
- [ ] Replace string literal `'sale.complete'` with `AuditActions.SALE_CREATE`
- [ ] After batch allocation loop, call `auditService.logBatch()` with one `inventory.deduct` entry per allocated item containing:
  - `entityId`: drug ID
  - `metadata`: `{ qty, batchId, remainingStock, batchExpiry }`
  - `severity`: `'warning'` if `remainingStock < reorderLevel`, else `'info'`
- [ ] After cash/shift transaction recording, log `AuditActions.SHIFT_TRANSACTION` with amount and payment method
- [ ] Update the final `sale.create` audit entry to include `metadata`: `{ saleId, total, itemCount, paymentMethod }`

**Verification**: Process a test checkout. Check audit logs contain 1 `sale.create` + N `inventory.deduct` + 1 `shift.transaction`.

---

## Task 5: Enrich `processReturn` Audit Trail
**File**: `services/transactions/transactionService.ts`
**Estimate**: 25 min
**Depends on**: Task 1, Task 2, Task 3

- [ ] Replace string literal `'sale.return'` with `AuditActions.SALE_RETURN`
- [ ] After stock restoration, call `auditService.logBatch()` with one `inventory.restore` entry per returned item containing:
  - `metadata`: `{ qty, drugId, restoredToBatchId }`
- [ ] Add time-since-sale check: if return > 72 hours after original sale, set `severity: 'warning'`
- [ ] After refund recording, log `AuditActions.SHIFT_TRANSACTION` with refund amount

**Verification**: Process a test return. Check audit logs contain `sale.return` + `inventory.restore` entries.

---

## Task 6: Enrich `processPurchaseTransaction` Audit Trail
**File**: `services/transactions/transactionService.ts`
**Estimate**: 20 min
**Depends on**: Task 1, Task 2

- [ ] Replace string literal `'purchase.complete'` with `AuditActions.PURCHASE_COMPLETE`
- [ ] After inventory updates, call `auditService.logBatch()` with `inventory.receive` entries
  - `metadata`: `{ qty, drugId, batchId, costPrice }`
- [ ] If received qty ≠ ordered qty for any item, set `severity: 'warning'`

**Verification**: Complete a test purchase. Check audit logs contain `purchase.complete` + `inventory.receive` entries.

---

## Task 7: Enrich `processPurchaseReturnTransaction` Audit Trail
**File**: `services/transactions/transactionService.ts`
**Estimate**: 15 min
**Depends on**: Task 1, Task 2

- [ ] Replace string literal `'purchase.return'` with `AuditActions.PURCHASE_RETURN`
- [ ] Add `inventory.deduct` entries for returned goods
- [ ] Include `metadata`: `{ qty, drugId, refundAmount }`

**Verification**: Process a purchase return. Check audit logs.

---

## Task 8: Wire Shift Lifecycle
**File**: `hooks/useShift.tsx`
**Estimate**: 20 min
**Depends on**: Task 1, Task 2

- [ ] Import `auditService` and `AuditActions`
- [ ] In `startShift()`: log `AuditActions.SHIFT_OPEN` with `{ openingBalance, employeeName }`
- [ ] In `endShift()`: log `AuditActions.SHIFT_CLOSE` with `{ closingBalance, expectedBalance, variance, employeeName }`
- [ ] If variance (closing - expected) > ±50 EGP: `severity: 'warning'`
- [ ] If variance > ±500 EGP: `severity: 'critical'`

**Verification**: Open and close a shift. Check 2 audit entries with correct severity.

---

## Task 9: Wire Cash Operations
**File**: `services/cash/cashService.ts`
**Estimate**: 15 min
**Depends on**: Task 1, Task 2

- [ ] Import `auditService` and `AuditActions`
- [ ] In `addTransaction()`: log `SHIFT_CASH_IN` or `SHIFT_CASH_OUT` based on type
- [ ] Include `metadata`: `{ amount, reason, shiftId }`
- [ ] If `amount > 5000`: `severity: 'warning'`

**Verification**: Add a cash-in transaction. Check audit log.

---

## Task 10: Clean Up Legacy Inline Audit Calls
**File**: `hooks/useEntityHandlers.ts`
**Estimate**: 20 min
**Depends on**: Tasks 4-9

- [ ] Search for all `auditService.log()` calls inside `useEntityHandlers.ts`
- [ ] Remove any that duplicate what `transactionService` now handles
- [ ] Keep only UI-specific audit calls (e.g., `employee.create`, `supplier.delete`) that are NOT routed through `transactionService`
- [ ] Update remaining calls to use `AuditActions` constants instead of string literals

**Verification**: `tsc --noEmit` passes. No duplicate audit entries when processing a sale.

---

## Task 11: Final Verification
**Estimate**: 15 min
**Depends on**: All above

- [ ] Run `tsc --noEmit` — 0 new errors
- [ ] Manually process: 1 sale, 1 return, 1 purchase, 1 purchase return
- [ ] Check `auditService.getLogs()` returns entries with:
  - Correct `action` names (from `AuditActions`)
  - Populated `severity` field
  - Populated `metadata` with relevant data
  - Correct `branchId` and `userId`
- [ ] Confirm no audit failure blocks the primary operation (test with Supabase disconnected)
- [ ] Mark Phase 3 as COMPLETED

---

## Estimated Total: ~3.5 hours
