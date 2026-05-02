# Tasks: Batch & Grouping Refactor

## Phase 1: Setup & Contracts
- [ ] T001 Define `GroupedDrug` interface and `GroupingKey` type in `types/index.ts`
- [ ] T002 [P] Define the canonical grouping key strategy constant in `services/inventory/batchService.ts` — `barcode || (name + dosageForm + manufacturer)` — ensuring a single source of truth for all consumers

## Phase 2: Foundational (Service Layer Logic)
- [ ] T003 Implement `groupInventory(drugs, options?)` in `services/inventory/batchService.ts` using the canonical key from T002. Options: `{ byBranch?: boolean }`
- [ ] T004 [P] Implement `autoDistributeQuantities(totalPacks, totalUnits, batches, preferredBatchId?)` in `services/inventory/batchService.ts`
- [ ] T005 [P] Implement `findTargetBatch(group, currentCart, selectedBatchId?)` in `services/inventory/batchService.ts`
- [ ] T006 Move `isStockConstraintMet` from `components/sales/pos/utils/POSUtils.ts` to `utils/stockOperations.ts` and update all imports
- [ ] T007 [P] Move max-discount calculation logic from `components/sales/pos/CartItemControls.tsx` (lines 96-106) into `services/sales/pricingService.ts` as `calculateMaxDiscount(costPrice, publicPrice, itemMaxDiscount?)`
- [ ] T008 [P] Move stock display resolution logic (pack/unit conversion for display) from `components/sales/pos/POS.tsx` (lines 578-585) into `utils/stockOperations.ts` as `resolveDisplayStock(stock, unitsPerPack, mode)`

## Phase 3: [US1] Unified Inventory View
- [ ] T009 [US1] Refactor `groupedInventory` in `components/inventory/Inventory.tsx` (lines 321-358) to use `batchService.groupInventory`
- [ ] T010 [P] [US1] Update Inventory summary stats (`summaryStats` useMemo) to consume `GroupedDrug[]` from the service

## Phase 4: [US2] Intelligent Cart Allocation
- [ ] T011 [US2] Refactor `addGroupToCart` in `components/sales/pos/hooks/usePOSCart.ts` to use `batchService.findTargetBatch`
- [ ] T012 [P] [US2] Refactor `groupedDrugs` and `batchesMap` in `components/sales/pos/POS.tsx` (lines 346-410) to use `batchService.groupInventory`
- [ ] T013 [US2] Add pre-checkout stock re-validation in `components/sales/pos/hooks/usePOSCheckout.ts` — call `batchService.hasStock()` for each cart item before final submission to prevent double-deduction across terminals
- [ ] T014 [P] [US2] Update `CartItemQuantityControl` in `components/sales/pos/CartItemControls.tsx` to use `resolveDisplayStock` from `stockOperations.ts` and `calculateMaxDiscount` from `pricingService.ts`

## Phase 5: [US3] Manual Batch Override
- [ ] T015 [US3] Refactor `switchBatchWithAutoSplit` in `components/sales/pos/hooks/usePOSCart.ts` to use `batchService.autoDistributeQuantities` instead of inline inventory scan
- [ ] T016 [P] [US3] Update `SortableCartItem.tsx` `handleManualQty` (lines 205-242) to delegate clamping logic to `stockOperations.ts`

## Phase 6: Polish & Verification
- [ ] T017 Remove stale `isStockConstraintMet` export from `components/sales/pos/utils/POSUtils.ts` and verify no dead imports remain
- [ ] T018 Verify grouped inventory view correctly aggregates stock for the active branch
- [ ] T019 Run `npm test && npm run lint` to ensure no regression

## Dependencies
- Phase 2 has no external dependencies (pure logic)
- US1, US2, US3 all depend on Phase 2 (Foundational Logic)
- US3 depends on US2 (Cart allocation logic)
- T013 (pre-checkout validation) depends on T005 (findTargetBatch) and T006 (hasStock availability)

## Parallel Execution
- T004, T005, T007, T008 can be done in parallel after T003
- T010 can be done in parallel with T009
- T012, T014 can be done in parallel with T011
- T016 can be done in parallel with T015
