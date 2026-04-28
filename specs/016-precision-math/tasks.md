# Tasks: Precision Financial Math

## Phase 1: Setup & Data Model
- [ ] T001 [P] Add `unitPrice` and `unitCostPrice` to `Drug` interface in `services/inventory/types.ts`
- [ ] T002 Create migration `20260425000006_add_unit_pricing.sql` to add integer columns to `drugs` table
- [ ] T003 [P] Update `idGenerator` and `storage.ts` to ensure consistency before math changes

## Phase 2: Core Foundation (Money Engine)
- [ ] T004 Upgrade `utils/money.ts` with `allocate(total, ratios)` method (Largest Remainder Method)
- [ ] T005 [P] Implement `scaledMultiply(amount, factor)` in `utils/money.ts` with Round Half Up logic
- [ ] T006 [P] Create `services/sales/pricingService.ts` to centralize tax and discount logic

## Phase 3: [US1] Accurate Sales Returns
- [ ] T007 [US1] Refactor `services/sales/salesService.ts` to use `money.allocate` for partial returns
- [ ] T008 [US1] Update `services/transactions/transactionService.ts` with precise balance validations
- [ ] T009 [P] [US1] Refactor `components/sales/ReturnModal.tsx` to use the new `pricingService` logic

## Phase 4: [US2] Correct POS Totals
- [ ] T010 [P] [US2] Update `components/sales/pos/hooks/usePOSCart.ts` to resolve `unitPrice` from drug entity
- [ ] T011 [US2] Refactor `components/sales/pos/hooks/usePOSCheckout.ts` to use `money` engine for grand totals
- [ ] T012 [P] [US2] Ensure `components/sales/pos/POS.tsx` displays precise Piastre-to-EGP formatting

## Phase 5: [US3] Manual Unit Pricing
- [ ] T013 [P] [US3] Update `components/purchases/Purchases.tsx` to support manual `unitCostPrice` entry
- [ ] T014 [US3] Update Inventory modals to allow manual override of `unitPrice`
- [ ] T015 [P] [US3] Integrate `pricingService` into `services/purchases/purchaseService.ts`

## Phase 6: Polish & Verification
- [ ] T016 Create `src/scratch/test-precision-final.ts` to simulate 10,000 complex transactions
- [ ] T017 [P] Perform global cleanup: Replace `toFixed(2)` and `Math.round` in all financial services
- [ ] T018 Run full regression on "exceeding balance" return scenarios

## Dependencies
- US1 depends on Phase 2 (Money Engine)
- US2 depends on Phase 2 and US1
- US3 depends on Phase 1 (Data Model)
