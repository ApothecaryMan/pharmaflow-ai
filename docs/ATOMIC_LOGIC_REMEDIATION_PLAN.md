# Atomic Logic Remediation Plan

## Goal

Move every high-risk business operation that changes money, inventory, permissions, attendance, or tenant-scoped data into server-side Supabase RPCs with atomic behavior. The client should send user intent and display results, not become the source of truth for critical business rules.

## Current Direction

The project already uses Supabase RPCs for several critical flows:

- `process_checkout`
- `process_cancellation`
- `process_order_modification`
- `process_return`
- `process_purchase_receipt`
- `record_expense`
- `log_attendance_event`
- `accept_employment_request`

That direction is correct. The remaining risk comes from fallback paths, direct client-side orchestration, local permission checks, and report fallbacks that can produce inaccurate business results.

## P0: Blockers Before Further Business Logic Work

### 1. Make purchase receipt fail closed

Files:

- `services/purchases/purchaseService.ts`
- Supabase migrations defining `process_purchase_receipt`

Current behavior:

- `markAsReceived` calls `process_purchase_receipt`.

### 2. Purchase Orders
- [x] Create atomic `process_purchase_receipt` RPC.
  - Updates inventory correctly
  - Processes cash deduction
  - Sets stock context and applies `atomic_increment_shift`
- [x] Update `purchaseService` to use new RPC and pass down `shiftId`.
- [x] Refactor `transactionService.processPurchaseTransaction` to remove client-side cash mutations.

### 3. Purchase Returns
- [x] Create atomic `process_purchase_return` RPC.
  - Decrements inventory correctly
  - Adds refund amount to cash drawer via `atomic_increment_shift`
- [x] Refactor `transactionService.processPurchaseReturnTransaction` to remove client-side cash.
- [x] Pass down `shiftId` via `DataContext`.

### 4. Delivery Orders
- [x] Create atomic `finalize_delivery_order` RPC.
  - Adds sales cash and updates sale status correctly.
- [x] Update `hooks/sales/useSalesHandlers.ts` to call `transactionService.processDeliveryFinalization`.
- [x] Implement `processDeliveryFinalization` in `transactionService.ts`.

### 2. Make `process_purchase_receipt` the only receipt write path

Change:

- The RPC should receive the minimum necessary payload, preferably:
  - `purchaseId`
  - `performerId`
  - `performerName`
- The RPC should read purchase items from the database instead of trusting full client-supplied item payloads.

Server-side responsibilities:

- Validate the purchase exists.
- Validate the purchase is not already received or completed.
- Validate the authenticated user can act in the purchase org and branch.
- Insert or merge `stock_batches`.
- Recalculate or update product cost fields and expiry fields.
- Insert `stock_movements`.
- Update purchase status and receiver metadata.
- Write audit data where applicable.

Reason:

The server must be the source of truth for receipt data. Client payloads can be stale, incomplete, or tampered with.

## P0.5: Client-Side Dead Code Cleanup (Completed 2026-06-19)

### Completed: Remove dead `stockOperations.ts` imports

The following files had `import * as stockOps from '…/stockOperations'` but never called any function from it. All 7 dead imports removed:

- `services/transactions/transactionService.ts` — checkout/cancellation/return/modification all use RPCs now.
- `components/sales/pos/POS.tsx` — delegates to hooks; stockOps never called directly.
- `components/sales/pos/DeliveryOrdersModal.tsx` — uses `resolveUnits`/`resolvePrice` from `stockUtils` directly.
- `components/layout/MobileNavigation.tsx` — uses `resolvePrice` from `stockUtils` directly.
- `components/mobile/MobileMedicineSearch.tsx` — uses `convertToPacks` from `stockUtils` directly.
- `utils/loyaltyPoints.ts` — uses `resolvePrice` from `stockUtils` directly.
- `utils/validation.ts` — uses `resolveUnits` from `stockUtils` directly.

### Completed: Remove dead functions from `stockOperations.ts`

Four functions that mutated batches from the client were confirmed dead (no production callers) and removed:

| Function | Superseded By |
|---|---|
| `deductStock` | `process_checkout` RPC |
| `returnStock` | `process_cancellation` / `process_return` RPCs |
| `deductStockSimple` | `process_purchase_return` RPC |
| `deductFromBatch` | `process_stock_adjustment` RPC |

Imports trimmed: removed `StockBatch`, `assertStockSufficient`, `money`, `convertToPacks`, `resolveDisplayStock`, `resolvePrice` — no longer needed by remaining functions.

### Completed: Migrate `handleRestock` and `handleUpdateDrug`

- `addStock` and `adjustStock` functions were removed from `stockOperations.ts`.
- `useInventoryHandlers.handleRestock` and `handleUpdateDrug` now call the `process_stock_adjustment` RPC directly via `inventoryService.processStockAdjustment`.
- Client-side batch mutations for manual stock additions and edits are completely eliminated.

### Completed: Full Elimination of `stockOperations.ts`

- `logInitialStock` was merged directly into `useInventoryHandlers.ts` using the atomic `stockMovementService`.
- `isStockConstraintMet` was moved to `stockUtils.ts`.
- The file `utils/stockOperations.ts` has been deleted entirely.
- Client-side batch mutations for POS and inventory are completely eliminated.

## P1: Atomic Inventory

### 3. Add a server-side stock adjustment RPC

Proposed RPC:

- `process_stock_adjustment(p_payload jsonb)`

Implementation status:

- Started in `20260619000002_atomic_stock_adjustment.sql`.
- `StockAdjustment` approval and manager-save paths now call the RPC instead of mutating batches from the client.
- Pending non-manager adjustments are still logged as pending movements and are applied only when approved.
- `ExpiryManagement` damage and supplier-return actions now use the same locked RPC path instead of direct client batch mutation.
- Purchase supplier returns now use `process_purchase_return` to insert the return document, insert items, and deduct FEFO stock atomically.

Current client paths:

- `inventoryService.updateStock`
- `inventoryService.updateStockBulk`
- `batchService.createBatch`
- `batchService.allocateStock`
- `batchRepository.atomicIncrement`

Change:

- Move manual stock adjustment orchestration to Supabase.
- The client sends the adjustment request, reason, target product or batch, performer, and branch context.
- The RPC performs the full mutation.

Server-side responsibilities:

- Validate `auth.uid()`.
- Validate org and branch access.
- Validate inventory permission.
- For positive adjustments, create or merge a batch.
- For negative adjustments, allocate stock server-side using FEFO rules.
- Insert `stock_movements`.
- Recalculate or synchronize product stock.
- Record performer and reason.
- Reject the full operation if any step fails.

Reason:

Batch changes, product stock, and movement history are one business operation. Running them as separate client-side calls risks partial state.

Atomic requirement:

- If stock is decremented but movement insert fails, the decrement must roll back.
- If a batch merge succeeds but product sync fails, the merge must roll back.
- If permissions fail, no mutation should occur.

### 4. Restrict direct batch mutation from client business flows

Files:

- `services/inventory/batchService.ts`
- `services/inventory/repositories/batchRepository.ts`
- `services/inventory/inventoryService.ts`

Change:

- Keep low-level batch helpers only for reads or internal use.
- Do not expose direct batch mutation as the main path for business flows.
- Use RPCs for purchase receipt, checkout, returns, and manual adjustments.

Reason:

`atomic_increment_batch` is a useful primitive, but a business operation needs more than an atomic quantity update. It also needs permission checks, movement history, audit data, and consistency with product-level stock.

## P2: Atomic Cash And Shift Logic

### 5. Add `open_shift` RPC

Proposed RPC:

- `open_shift(p_payload jsonb)`

Current client path:

- `cashService.openShift`
- `cashRepository.insertShift`

Server-side responsibilities:

- Validate `shift.open` permission.
- Validate org and branch access.
- Check that no open shift already exists for the branch.
- Insert the shift.
- Optionally insert an opening cash transaction.
- Write audit data where applicable.

Reason:

Checking for an existing open shift and then inserting a new one from the client can race when multiple devices act at the same time.

Atomic requirement:

- Two devices attempting to open the same branch shift at the same time should result in one success and one clear failure.

### 6. Add `close_shift` RPC

Proposed RPC:

- `close_shift(p_payload jsonb)`

Current client path:

- `cashService.closeShift`
- `cashRepository.updateShift`

Server-side responsibilities:

- Validate `shift.close` permission.
- Read the shift and all relevant transactions from the database.
- Calculate expected balance on the server.
- Store closing balance, expected balance, close time, closer, and notes.
- Reject closure if the shift is missing or already closed.
- Write audit data where applicable.

Reason:

Expected balance is financial data. It should not be calculated from client-held state or trusted from a client payload.

Atomic requirement:

- Shift closure and final balance calculation must be one server-side operation.

### 7. Keep cash totals and cash transactions together

Current behavior:

- Some flows use atomic RPCs.
- `cashService.addTransaction` inserts a cash transaction, then calls `atomic_increment_shift`.

Change:

- For financial business operations, insert the cash transaction and update shift totals inside the same domain RPC.
- This applies to sales, returns, expenses, cash purchases, purchase returns, cash in, and cash out.

Reason:

A cash transaction without a matching shift total, or a shift total without a matching transaction, creates financial drift.

Atomic requirement:

- Transaction insert and shift total update must commit or roll back together.

### 7.5 Add `delete_expense` RPC

Proposed RPC:

- `delete_expense(p_payload jsonb)`

Current client path:

- `expenseService.deleteExpense`
- `expenseRepository.delete`

Server-side responsibilities:

- Validate `expense.delete` permissions and access.
- Delete the expense record.
- Delete the associated `cash_transaction` record atomically.
- Revert the `shifts` table totals atomically.

Reason:

Directly deleting an expense from the client via `.delete()` leaves the cash drawer and `cash_transactions` table out of sync.

Atomic requirement:

- Expense deletion must refund the shift cash totals simultaneously.

### 7.6 Atomic Delivery Finalization

Current client path:

- `salesService.update` (to set `status = 'completed'`)
- `transactionService.addTransaction` (to record the payment in the shift)

Server-side responsibilities:

- Create a `finalize_delivery_order(p_payload jsonb)` RPC or update `process_order_modification`.
- Update the sale status to `completed`.
- Insert the `cash_transaction` and update shift totals atomically if `shiftId` is provided.

Reason:

Completing a delivery sale currently updates the sales table directly and then separately records cash. If the second request fails, the sale is closed but the drawer is short.

## P3: Server-Side Authorization

### 8. Treat client permission checks as UI-only

Files:

- `services/auth/permissionsService.ts`
- `context/DataContext/useDataActions.ts`
- UI components using `permissionsService.can`

Current behavior:

- The client hides controls and sometimes modifies payloads based on `permissionsService.can`.
- Example: cost fields are removed from inventory updates when the user cannot view financial reports.

Change:

- Keep `permissionsService.can` for rendering and UX.
- Add authorization checks inside every sensitive RPC.
- Verify RLS policies for direct table writes that remain available.

Reason:

Client-side permission checks can be bypassed. They are not a security boundary.

Server-side checks should validate:

- Authenticated user ID.
- Organization membership.
- Branch access.
- Effective role or permission.
- Whether the requested action is allowed for that user.

### 9. Tighten RLS around direct writes

Tables to review first:

- `drugs`
- `stock_batches`
- `stock_movements`
- `purchases`
- `purchase_items`
- `shifts`
- `cash_transactions`
- `employees`
- `branches`
- `expenses`

Change:

- Confirm direct insert, update, delete, and upsert policies are not broader than intended.
- Prefer RPC-only writes for sensitive domain operations.

Reason:

The repository layer still contains direct Supabase writes. If any of those writes remain reachable, RLS must enforce the real security model.

### 10. Replace branch settings password as a security boundary

File:

- `components/common/SecureGate.tsx`

Current behavior:

- The gate compares user input to `VITE_BRANCH_SETTINGS_PASS`.

Change:

- Treat this as a convenience UI lock only, or replace protected actions with server-side permission checks or challenge validation.

Reason:

Any `VITE_*` environment value is bundled into the frontend and cannot be treated as secret.

## P4: Financial Report Accuracy

### 11. Disable estimated financial fallback in production

File:

- `services/financials/financialService.ts`

Current behavior:

- Financial report methods call RPCs first.
- If an RPC fails, client-side fallback logic calculates report values.
- Some fallback values are estimates, including return COGS and category grouping.

Change:

- In production, fail clearly when financial report RPCs fail.
- In development, fallback may remain available for debugging if it is clearly marked as estimated.
- The UI should show that report data is unavailable instead of showing estimated values as final financial truth.

Reason:

An unavailable financial report is safer than an inaccurate financial report.

### 12. Keep report definitions server-side

RPCs to treat as source of truth:

- `compute_financial_summary_with_snapshots`
- `get_daily_financial_breakdown`
- `get_top_products_financial`
- `get_category_financial_breakdown`

Change:

- Avoid duplicating report business definitions in the client.
- Keep revenue, returns, COGS, expenses, margin, and category definitions in database functions.

Reason:

Financial definitions drift when the same report is implemented in both TypeScript and SQL.

## P5: Client State And Data Flow Cleanup

### 13. Treat local storage as untrusted UX state

Files:

- `utils/storage.ts`
- `services/settings/settingsService.ts`
- `services/auth/authService.ts`
- `context/DataContext/useDataActions.ts`

Current behavior:

- `activeBranchId`, `orgId`, settings, and session context are stored locally.

Change:

- Keep local storage for UX and navigation state.
- Do not trust local values for authorization or tenant isolation.
- Sensitive RPCs should verify branch and org access from authenticated database state.

Reason:

Local storage can be edited by the user or become stale across sessions.

### 14. Reduce sensitive write paths in `useDataActions`

File:

- `context/DataContext/useDataActions.ts`

Change:

- Route sensitive mutations through dedicated RPC-backed service methods.
- Keep direct state updates for optimistic UI only after the server mutation succeeds.

Suggested service boundaries:

- `purchaseReceiptService`
- `stockAdjustmentService`
- `shiftService`
- `cashTransactionService`

Reason:

Centralizing critical writes makes the system easier to audit and reduces accidental bypasses.

## Recommended Implementation Order

1. Remove the purchase receipt legacy fallback and make failures explicit.
2. Verify and harden `process_purchase_receipt`.
3. Add `process_stock_adjustment`.
4. Move manual stock adjustment UI to the new RPC.
5. Add `open_shift`.
6. Add `close_shift`.
7. Move cash register and shift hooks to the shift RPCs.
8. Add permission checks inside sensitive RPCs.
9. Review and tighten RLS for sensitive direct writes.
10. Disable estimated financial fallbacks in production.
11. Treat `SecureGate` as UX-only or replace it with server-side authorization.
12. Simplify `useDataActions` so sensitive writes go through RPC-backed services.

## Required Regression Tests

### Purchase Receipt

- Successful receipt writes purchase status, stock batches, movements, and product pricing.
- RPC failure leaves purchase, batches, movements, and product data unchanged.
- Duplicate receipt attempt is rejected or idempotently returns the existing received state.
- Unauthorized user cannot receive a purchase.

### Stock Adjustment

- Positive adjustment creates or merges a batch and records movement.
- Negative adjustment allocates from available batches using FEFO.
- Insufficient stock rejects the whole operation.
- Movement failure rolls back batch mutation.
- Unauthorized user cannot adjust stock.

### Shift Open And Close

- Only one open shift can exist for a branch.
- Concurrent open attempts produce one success.
- Close shift calculates expected balance from database transactions.
- Closed shifts cannot be closed again.
- Unauthorized user cannot open or close a shift.

### Cash Transactions

- Cash transaction insert and shift total update commit together.
- If shift total update fails, no cash transaction remains.
- Sale, return, expense, purchase, and purchase return flows update cash state consistently.

### Financial Reports

- Report RPC success returns authoritative values.
- Report RPC failure in production does not display estimated values as final.
- Report fallback, if kept in development, is clearly marked as estimated.

### Authorization And Tenant Isolation

- User cannot mutate data outside their organization.
- User cannot mutate data outside allowed branch scope.
- Client-side changes to local storage do not grant extra access.
- Client-side permission bypass does not bypass server-side checks.

## Completion Criteria

The remediation is complete when:

- Critical write flows are RPC-only.
- Fallbacks do not write sensitive data from the client.
- Server-side authorization protects every sensitive mutation.
- Financial reports do not silently fall back to estimated production values.
- RLS blocks unintended direct writes.
- Regression tests cover rollback, concurrency, authorization, and tenant boundaries.
