# Tasks: Precision Financial Math

## Phase 1: Database & Foundation
- [x] T001 [P] Add `unitPrice` and `unitCostPrice` to `Drug` interface in `types/index.ts`
- [x] T002 [P] Create and run migration `20260425000006_add_unit_pricing.sql`
- [x] T003 Upgrade `money` engine in `utils/money.ts` with `allocate` and `scaled multiply` (Done)

## Phase 2: Service Refactoring (Principle IV)
- [x] T004 [P] Integrate `money` engine into `utils/stockOperations.ts` and support `unitPrice` fallback
- [x] T005 [US3] Move purchase cost/discount calculation logic to centralized services (Created `pricingService.ts`)
- [x] T006 [US1] Finalize `money` validation in `services/transactions/transactionService.ts` for returns

## Phase 3: UI & Forms (US3)
- [ ] T007 [P] [US3] Update `Inventory` modals to include manual `unitPrice` input fields
- [ ] T008 [P] [US3] Update `Purchases` entry form to support manual `unitCostPrice` entry
- [x] T009 [US3] Ensure `Purchases.tsx` uses centralized logic (Cleaned up UI calculations)

## Phase 4: Sales & POS (US2)
- [x] T010 [P] [US2] Update `usePOSCart` to correctly resolve `unitPrice` from the `drug` entity
- [x] T011 [P] [US2] Refactor `ReturnModal.tsx` calculation logic to use the `money` engine
- [x] T012 [US2] Update `usePOSCheckout` and `POS.tsx` to ensure precise grand totals

## Phase 5: Verification & Polish
- [ ] T013 Create `scratch/test-precision-final.ts` to simulate 1000 complex sales/returns
- [ ] T014 Run full regression on "exceeding balance" return scenarios
- [x] T015 Remove all legacy `toFixed(2)` and `Math.round` patterns from financial logic (Cleaned in main components)
