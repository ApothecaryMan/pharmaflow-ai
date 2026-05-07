# Tasks: Fix POS Quantity Logic & Stock Linking

**Input**: Design documents from `/specs/018-batch-grouping-refactor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Setup

- [x] T001 Create feature branch and documentation structure

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T002 [P] Refactor `isStockConstraintMet` in `src/utils/stockOperations.ts` to support global drug lookups across all batches.

## Phase 3: User Story 1 - Stable Cart Updates & Global Stock (Priority: P1) 🎯 MVP

**Goal**: Restore manual batch selection stability and implement correct cross-mode stock validation.

**Independent Test**: Add 1 Pack of a drug. Verify that updating its quantity doesn't wipe out other batches of the same drug in the cart. Verify that adding units correctly reduces the available packs based on total stock.

### Implementation for User Story 1

- [x] T003 [US1] Modify `updateQuantity` in `src/components/sales/pos/hooks/usePOSCart.ts` to remove the redistribution logic and restore surgical item updates.
- [x] T004 [US1] Implement global stock pool calculation in `updateQuantity` to handle cross-batch/mode limits.
- [x] T005 [US1] Integrate `t` translations for stock limit error messages in `src/components/sales/pos/hooks/usePOSCart.ts`.

## Phase 4: User Story 2 - UI Alignment (Priority: P1)

**Goal**: Ensure the UI quantity inputs accurately reflect the global stock limit.

**Independent Test**: In the POS sidebar, the number in the quantity input should be clamped at the global maximum, accounting for other cart items of the same drug.

### Implementation for User Story 2

- [x] T006 [P] [US2] Update `CartItemControls.tsx` to use the global stock pool for the `max` prop calculation in both Pack and Unit inputs in `src/components/sales/pos/CartItemControls.tsx`.
- [x] T007 [US2] Update `handleQtyChange` in `src/components/sales/pos/CartItemControls.tsx` to correctly clamp values to the global max.

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T008 [P] Run `npm test` and verify POS behavior manually across desktop and mobile views.
- [ ] T009 [P] Update `walkthrough.md` with screenshots of the fixed quantity interaction.
- [ ] T010 [P] Run `npm run type-check` to ensure no regression in type safety.

---

## Dependencies & Execution Order

- **Phase 2 (Foundational)**: MUST complete before Phase 3.
- **Phase 3 (US1)**: Core logic fix.
- **Phase 4 (US2)**: Depends on Phase 3 logic but can be worked on in parallel once the formula is defined.
- **Phase 5 (Polish)**: Final verification.
