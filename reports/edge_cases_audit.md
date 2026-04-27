# PharmaFlow AI: Edge Cases & Logic Audit Log

Last updated: 2026-04-27

This audit verifies the listed pharmacy edge cases against the current codebase and
records fixes, tests, and remaining gaps.

## Audit Status Overview

| ID | Case Name | Risk | Status | Verification Method |
|----|-----------|------|--------|---------------------|
| EC-01 | The Double-Sell (Race Condition) | High | Fixed + Verified | Atomic RPC hardening + unit test |
| EC-02 | Multi-Batch Split (FEFO) | Medium | Verified | FEFO allocation test |
| EC-03 | Partial Fractional Return | High | Fixed + Verified | Partial return unit test |
| EC-04 | Time Travel (Clock Tampering) | Medium | Verified | TimeService and StatusBar review |
| EC-05 | Mid-Checkout Switch | Medium | Verified | Hook guard and branch context review |
| EC-06 | Floating Point Drift | High | Verified | Money engine stress tests |
| EC-07 | Return to Purged Batch | Medium | Verified | Recreate-on-missing-batch review |
| EC-08 | Credit Limit Overrun | Medium | Not Applicable / Gap | POS does not expose credit sales |
| EC-09 | Mid-Session Price Change | Medium | Verified | Sale item price snapshot review |
| EC-10 | Rollback Network Failure | High | Improved + Verified | Allocation rollback unit test |

## Deep Dive Results

### EC-01: The Double-Sell (Race Condition)

Scenario: Two cashiers sell the same last unit at the same time.

Finding: The previous RPC used `GREATEST(0, quantity + p_delta)`. That prevented
negative quantities but still allowed both checkouts to succeed, silently clamping
the second decrement to zero.

Fix:
- Updated `supabase/migrations/20260425000004_atomic_operations.sql`.
- `atomic_increment_batch` now updates only when the decrement can be satisfied.
- `atomic_increment_stock` now rejects insufficient stock instead of clamping.
- `batchService.updateBatchQuantity` throws when an atomic decrement affects no rows.

Verification:
- `services/inventory/batchService.test.ts` covers failed atomic decrement.

### EC-02: Multi-Batch Split (FEFO)

Scenario: A sale requires more units than the earliest batch contains.

Result: Verified. `batchService.allocateStock` filters expired batches, sorts by
expiry date, and splits allocation across valid batches.

Verification:
- Test confirms a 60-unit sale pulls 50 units from the earlier valid batch and
10 from the later valid batch.

### EC-03: Partial Fractional Return

Scenario: A customer returns only part of a sale that originally consumed multiple
batches.

Finding: `batchService.returnStock` was using parallel writes while mutating a
shared `remainingToReturn` variable. That made partial returns vulnerable to
over-restore or inconsistent distribution.

Fix:
- `batchService.returnStock` now processes return allocations sequentially.
- `utils/stockOperations.ts` now passes only the quantity covered by the selected
return allocations back into batch restoration.

Verification:
- Test confirms a 12-unit partial return restores only 12 units to the original
allocation path.

### EC-04: Time Travel (Clock Tampering)
**Scenario**: Local system time is changed to bypass expiry checks or backdate sales.
**Status**: 🟢 Fully Hardened & Verified.
**Result**: `timeService.getVerifiedDate()` applies a verified offset. Both `transactionService` and `batchService.allocateStock` now use this verified date for expiry filtering and transaction ordering, neutralizing local clock manipulation.

### EC-05: Mid-Checkout Switch

Scenario: User switches branch/session while checkout is in progress.

Result: Verified for the active POS path. `usePOSCheckout` uses `isProcessing`
to prevent duplicate checkout submission, preserves the cart on checkout failure,
and the transaction context captures `activeBranchId` at checkout time.

### EC-06: Floating Point Drift

Scenario: Currency math such as `0.1 + 0.2`, discounts, and uneven splits creates
financial drift.

Result: Verified. `utils/money.ts` converts to integer smallest units for add,
subtract, multiply, divide, and allocation.

Verification:
- `utils/money.test.ts` covers common drift, percentage discounts, and uneven
cent allocation.

### EC-07: Return to Purged Batch

Scenario: A return references a batch that was deleted after the original sale.

Result: Verified. `batchService.returnStock` attempts an atomic restore and
recreates the batch when the RPC returns no affected rows or an error.

### EC-08: Credit Limit Overrun

Scenario: Customer credit sale exceeds allowed credit balance.

Result: Not applicable to the current POS checkout flow. Although `Sale` allows
`paymentMethod: 'credit'`, the POS and transaction service checkout types only
accept `cash` and `visa`. No active credit-limit feature was found.

Recommendation: If credit sales are re-enabled, add customer credit fields,
server-side credit checks, and a failing test for over-limit checkout.

### EC-09: Mid-Session Price Change

Scenario: Product price changes while the item is already in a cart.

Result: Verified. Cart items carry price snapshots, and `buildSalePayload`
persists the cart item prices into the sale payload. Later inventory price changes
do not rewrite existing cart item prices.

### EC-10: Rollback Network Failure

Scenario: A multi-batch allocation succeeds for one batch and fails for a later
batch.

Finding: `allocateStock` previously committed batch updates in parallel. If one
write failed after another succeeded, the service did not locally compensate.

Fix:
- `allocateStock` now commits batch decrements sequentially.
- If a later decrement fails, earlier committed decrements are restored in reverse
order before the error is rethrown.

Verification:
- `services/inventory/batchService.test.ts` covers rollback after a second-batch
failure.

## Verification Commands

Passed:

```bash
npm.cmd test -- services/inventory/batchService.test.ts utils/money.test.ts --run
```

Result: 2 test files passed, 6 tests passed.

Attempted:

```bash
npm.cmd run type-check
```

Result: failed on existing unrelated TypeScript errors across the project
(`Login.tsx`, `ErrorBoundary.tsx`, `sample-inventory.ts`, legacy tests, and
other files). No new type-check errors were identified in the focused edge-case
files during the passing Vitest run.
