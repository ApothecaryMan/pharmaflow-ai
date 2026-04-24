# Refactoring Plan: Inventory & Batch Tracking (FEFO)

## 1. Current State (Gaps)

- The link between a `Batch` and its parent `Drug` is purely via `drugId`. However, many replenishment functions (`handleRestock`, `StockAdjustment`) still pass the whole `Drug` object.
- This creates "uninformed" updates where the stock count is incremented but the FEFO (First Expiry First Out) queue is not properly updated because the handler was thinking in "bulk" instead of "batches".

## 2. Infrastructure Changes

- **Pure ID Logic:** Handlers like `handleRestock(id, qty)` must look up the inventory item themselves using the GUID to ensure they are working with the latest state.
- **Batch Isolation:** The `Batch` entity should be the "Source of Truth" for usable stock. The `drug.stock` field should be treated as a secondary, cached sum of all its batches.

## 3. Implementation Steps

1. **Unify Stock Handlers:** Transition away from `setInventory` direct calls in the UI. Instead, use a centralized `inventoryService.updateStock(drugId, delta)` that internally handles batch allocation.
2. **GUID Stability:** Ensure `drug.internalCode` is treated as a searchable metadata, while `drug.id` (GUID) remains the immutable database key.
3. **Movement Tracking:** Every time a stock change occurs, record a `StockMovement` entry using `idGenerator.generateSync('movement')` and link it via `drugId` and `batchId`.

## 4. Expected Outcome

- Elimination of "Negative Stock" or "Phantom Stock" bugs during concurrent sales.
- Perfectly accurate Expiry Date tracking (the system always knows the exact batch being sold).
- Cleaner, more modular code in `useEntityHandlers.ts`.
