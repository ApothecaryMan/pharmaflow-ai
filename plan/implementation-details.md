# Implementation Details: Step-by-Step Refactor

This document provides a low-level, technical breakdown of the architectural overhaul.

## Step 1: Standardizing the Performer Context
**File:** `types/actions.ts`
- **Action:** Define the `ActionContext` interface.
- **Why?** To stop the "ID vs Name" confusion. We will always capture both at the entry point (Hook) but services will primarily use IDs for relations and Names only for audit text.
- **SSOT Check:** This becomes the ONLY source for operation metadata.

## Step 2: The Coordinator Expansion
**File:** `services/transactions/transactionService.ts`
- **Action:** Add `completePurchaseTransaction(purchaseId: string, context: ActionContext)`.
- **Logic Sequence:**
  1. Initialize `UndoManager`.
  2. Call `purchaseService.approve` (updates status + inventory).
  3. Register rollback for inventory if finance fails.
  4. IF `purchase.paymentMethod === 'cash'`:
     - Check `context.shiftId`. Throw if missing.
     - Call `financeService.addTransaction`.
  5. Call `auditService.log` using `context`.
- **Why?** To ensure that a purchase isn't "completed" in inventory without being "paid for" in the shift records.

## Step 3: DataContext Integration
**File:** `services/DataContext.tsx`
- **Action:** Refactor `approvePurchase` action.
- **Old Logic:** Called `purchaseService.approve` then manually updated state.
- **New Logic:** 
  1. Call `transactionService.completePurchaseTransaction`.
  2. Refresh relevant states (inventory, purchases, transactions) from services.
- **Why?** To ensure the React state is a direct reflection of the atomic service result.

## Step 4: Hook De-cluttering (The Surgical Strike)
**File:** `hooks/useEntityHandlers.ts`
- **Target:** `handleCompletePurchase`, `handleReturn`, `handleDeleteProduct`.
- **Action:** 
  - Delete manual calls to `stockMovementService.logMovement`.
  - Delete manual calls to `addTransaction`.
  - Delete manual calls to `auditService.log`.
  - Replace with a single call to the `DataContext` action, passing a freshly constructed `ActionContext`.
- **Example Construct:**
  ```typescript
  const context: ActionContext = {
    performerId: currentEmployeeId,
    performerName: employee?.name,
    branchId: activeBranchId,
    shiftId: currentShift?.id,
    orgId: activeOrgId
  };
  await approvePurchase(id, context);
  ```

## Step 5: Utility Sanitization
**File:** `utils/stockOperations.ts`
- **Action:** Remove direct side-effects. This file should contain pure functions for calculations (e.g., `resolveUnits`) only.
- **Why?** Side-effects in utilities are "hidden" and violate Karpathy Rule 1 (Don't assume/hide logic).

## Step 6: Verification & Testing
- **Manual Test:** Complete a cash purchase. Verify inventory changed AND a transaction appeared in the current shift.
- **Audit Check:** Check the `AuditLog` table. Ensure the `userId` column contains the UUID and the `details` contains the name.
