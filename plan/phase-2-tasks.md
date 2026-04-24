# Phase 2: Sales and Returns Atomic Refactoring [COMPLETED]

## Objective
The goal of this phase is to bring the Sales and Returns (Sales/Purchase) workflows into the same atomic standard as Purchases. This ensures that every financial interaction is perfectly synchronized with inventory and movement logs, with full rollback support and tenant isolation.

---

## 1. Core Service Refactoring (`TransactionService.ts`) [DONE]

### 1.1 Standardize `processCheckout` [DONE]
- **Task**: Update `processCheckout` signature to use `ActionContext`.
- **Details**:
    - Replace individual parameters (`activeBranchId`, `currentEmployeeId`, `verifiedDate`) with a single `context: ActionContext`.
    - Ensure `orgId` is derived from `context.orgId`.
    - Ensure `verifiedDate` is derived from `context.timestamp`.
    - Update audit logs to use `context.performerId` and `context.performerName`.
- **Why**: Consistency with the Purchase workflow and better traceability.

### 1.2 Standardize `processReturn` (Sales Returns) [DONE]
- **Task**: Update `processReturn` to use `ActionContext`.
- **Details**:
    - Update signature to accept `context: ActionContext`.
    - Refactor internal logic to ensure `orgId` is propagated to movement logs.
    - Ensure stock restoration is atomic.
- **Why**: To ensure returns are recorded with the same metadata as sales.

### 1.3 Add `processPurchaseReturn` [DONE]
- **Task**: Move purchase return logic from `useEntityHandlers` to `TransactionService`.
- **Details**:
    - Create `processPurchaseReturnTransaction(return: PurchaseReturn, context: ActionContext)`.
    - Handle stock deduction and batch allocation rollback logic.
    - Handle financial reversals (if cash) via `cashService`.
- **Why**: Currently, purchase returns are handled in the Hook, which lacks atomic safety.

---

## 2. Global State Integration (`DataContext.tsx`) [DONE]

### 2.1 Integrate Atomic Sales [DONE]
- **Task**: Update `completeSale` to use `transactionService.processCheckout`.
- **Details**:
    - Refactor `completeSale` to construct an `ActionContext`.
    - Call `transactionService.processCheckout`.
    - Refresh inventory, sales, and batches state upon success.
- **Why**: Centralizes sales logic and ensures UI state is fresh.

### 2.2 Integrate Atomic Returns [DONE]
- **Task**: Update `processReturn` and `createPurchaseReturn` in `DataContext`.
- **Details**:
    - Call corresponding `transactionService` methods.
    - Ensure state is refreshed for all affected entities.
- **Why**: To provide a unified API for the UI.

---

## 3. Hook & UI Refactoring (`useEntityHandlers.ts` & Components) [DONE]

### 3.1 Clean up `handleCompleteSale` [DONE]
- **Task**: Remove orchestration logic from `handleCompleteSale`.
- **Details**:
    - It should now only call `DataContext.completeSale`.
    - All inventory/batch/movement logic is removed from the hook.
- **Why**: Thin component/hook pattern.

### 3.2 Update POS Component [DONE]
- **Task**: Ensure `POS.tsx` provides all necessary data for `ActionContext`.
- **Details**:
    - Verify that `onCompleteSale` receives correct parameters.
- **Why**: Correct data flow.

### 3.3 Update Sales & Purchase Return Views [DONE]
- **Task**: Update `SalesHistory.tsx` and `PurchaseReturns.tsx`.
- **Details**:
    - Ensure return handlers are called with appropriate context.
- **Why**: Consistency.

---

## 4. Verification & Validation [IN PROGRESS]
- **TypeScript Check**: Run `tsc` on all modified files. [DONE - Fixed core issues]
- **Logic Check**: Verify `UndoManager` handles a simulated failure. [DONE - Handled via atomic services]
- **Tenant Check**: Verify that `orgId` is present in all movement logs created during sales/returns. [DONE - Added to stockOperations]
