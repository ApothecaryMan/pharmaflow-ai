# Spec: Fix POS Quantity Logic & Stock Linking

## Problem Description
The recent overhaul of the POS cart logic introduced a "Global Redistribution" mechanism for drug quantities. While intended to support automatic FEFO (First Expiry First Out), it created a disconnect between manual batch selection, dual-mode (Pack/Unit) consumption, and maximum stock clamping. Users are experiencing "locked" inputs or incorrect quantity limits when switching between modes or editing specific batches.

## Proposed Changes

### 1. Revert to Stable Item Updates
Instead of redistributing the entire drug quantity across all batches in the cart when a single item's quantity changes, we will return to a stable update model. 
- `updateQuantity` will update the specific `CartItem` (batch/mode pair) targeted by the user.
- Automatic batch splitting will still happen during `addToCart`, but once items are in the cart, their batch identity should remain stable unless explicitly changed by the user via the `switchBatch` feature.

### 2. Unified Stock Pool Validation
To prevent over-selling across multiple batches or modes, validation must be global for the drug.
- **Stock Constraint**: The sum of units used by ALL items of the same drug (regardless of batch or mode) must not exceed the total stock available in all batches.
- **Cross-Mode Logic**: Adding units to Batch A must correctly account for Packs already taken from Batch B.

### 3. Logic Refinement in `usePOSCart.ts`
- Modify `updateQuantity` to:
    1. Find the target item by ID and mode.
    2. Calculate the global stock pool for the parent drug.
    3. Validate the `delta` against the global pool using a refined `isStockConstraintMet` logic.
    4. Perform a surgical update on the `prev` cart array without wiping out other batches.

### 4. UI Alignment in `CartItemControls.tsx`
- The `max` prop for quantity inputs must be calculated using the global pool.
- `maxUnits = TotalDrugStock - OtherItemsUnitsInCart`.
- This ensures the UI "stops" the user exactly at the true physical limit of the pharmacy.

## Success Criteria
- [ ] Users can clear the quantity input (empty string) without the UI reverting or locking.
- [ ] Increasing quantity in Unit mode correctly reduces the available quantity in Pack mode for the SAME drug (across all batches).
- [ ] The "Maximum Limit Reached" toast shows the correct global limit.
- [ ] Switching batches manually doesn't break the quantity synchronization.
- [ ] No focus loss during typing.

## Verification Plan
- **Manual Test**: Add 1 Pack of a drug (10 units per pack). Try to add 1 unit. If total stock is 10, it should fail or clamp.
- **Edge Case**: Drug with multiple batches. Verify that updating one batch doesn't accidentally "reset" or "merge" other batches in the cart unless intended.
