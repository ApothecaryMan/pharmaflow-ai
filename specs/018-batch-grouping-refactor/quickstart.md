# Quickstart: POS Quantity Fix

## Overview
This feature fixes the "Locked Input" and "Broken Batch Link" issues in the POS sidebar.

## Key Files
1. `components/sales/pos/hooks/usePOSCart.ts`: `updateQuantity` logic.
2. `components/sales/pos/CartItemControls.tsx`: UI input and `max` clamping.
3. `utils/stockOperations.ts`: `isStockConstraintMet` helper.

## Verification
1. Open POS.
2. Add a drug with 2 batches and a pack/unit toggle.
3. Verify that editing one batch doesn't affect the other's batch selection.
4. Verify that total quantity cannot exceed total stock.
