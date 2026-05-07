# Research: POS Quantity Logic Fix

## Decision 1: Revert to Stable Batch Updates
- **Finding**: The "Global Redistribution" logic (FEFO) in `updateQuantity` was causing the cart to jump around and lose the user's manual batch selection.
- **Decision**: Update only the targeted `CartItem` in `updateQuantity`.
- **Rationale**: respects manual user intent while still allowing FEFO for *initial* additions via `addToCart`.

## Decision 2: Unified Stock Pool Validation
- **Finding**: Validation must be global to prevent over-selling.
- **Decision**: Use `inventory.filter(name/dosageForm)` to sum stock across all batches and all modes in the cart.
- **Rationale**: Ensures that 1 Pack + 1 Unit doesn't exceed 1.1 Packs worth of stock if only 1 Pack is available.

## Decision 3: UI-Backend Sync
- **Finding**: The `max` prop in `CartItemControls.tsx` was using a simplified formula that didn't match the `updateQuantity` logic.
- **Decision**: Export a shared `calculateMaxAvailable` helper from `stockOperations.ts`.
- **Rationale**: Single source of truth for quantity limits.
