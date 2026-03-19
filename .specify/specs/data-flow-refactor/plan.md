# Implementation Plan: Data Flow & Integrity Refactor

**Feature Name**: `data-flow-refactor`  
**Spec Reference**: [spec.md](./spec.md)

## Architecture Changes

### 1. New Service: `TransactionCoordinator`
- **Location**: `services/transactions/transactionService.ts`
- **Responsibility**: Orchestrate updates across multiple services (Sales, Inventory, Batches, Shifts).
- **Logic**: Use a `try-catch` block with explicit manual rollback steps for each operation.

### 2. Computed Inventory
- **Location**: `hooks/useComputedInventory.ts` or within `DataContext.tsx`.
- **Logic**: Instead of relying on a mirror `stock` property in the `Drug` object for every update, derive the displayed stock from the sum of associated `StockBatch` items.

### 3. Service Layer Enforcement
- Update `inventoryService` and `salesService` to support partial updates and better validation.
- Standardize on `IndexedDB` (via `drugCacheService`) as the primary write target.

---

## Implementation Steps

### Phase 1: Core Logic & Services
- [ ] Create `services/transactions/transactionService.ts` with `processCheckout` method. <!-- id: 100 -->
- [ ] Refactor `inventoryService.updateStockBulk` to be more robust. <!-- id: 101 -->
- [ ] Implement `batchService.allocateStockBulk` improvements for atomic behavior. <!-- id: 102 -->

### Phase 2: React Hook Refactoring
- [ ] Refactor `useEntityHandlers.ts`: Replace manual logic in `handleCompleteSale` with calls to `transactionService`. <!-- id: 103 -->
- [ ] Implement `useComputedInventory` hook to derive stock levels dynamically. <!-- id: 104 -->
- [ ] Update `DataContext.tsx` to use the computed inventory logic. <!-- id: 105 -->

### Phase 3: Verification & Polish
- [ ] Verify "Cancel Sale" logic and stock return consistency. <!-- id: 106 -->
- [ ] Verify "Stock Adjustment" impacts on both Batches and Drug.stock. <!-- id: 107 -->
- [ ] Run end-to-end POS testing to ensure zero lag. <!-- id: 108 -->

## Verification Plan

### Automated
- `npm test` (if unit tests exist for services).
- Manual simulation of storage failures to test rollback.

### Visual
- Check POS cart deduction speed.
- Verify inventory table shows correct "Sum of Batches" as stock.
