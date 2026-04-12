# Tasks: Interactive Theme-Aware Information Cards

**Feature**: [Interactive Theme-Aware Information Cards](./spec.md)
**Status**: Pending

## Implementation Strategy

We will implement a reusable `InteractiveCard` component first, followed by its integration into the `ShiftHistory` summary section. Delivery will be incremental, starting with the basic paging functionality (MVP).

## Tasks

### Phase 1: Setup

- [x] T001 Initialize component directory and boilerplate for `components/common/InteractiveCard.tsx`
- [x] T021 [RE] Implement grid-based sizing stability logic to maintain max dimensions in `components/common/InteractiveCard.tsx`
- [x] T022 [RE] Ensure `AnimatePresence` works correctly with fixed height layout in `components/common/InteractiveCard.tsx`
- [x] T023 Verify stable sizing in `ShiftHistory.tsx` with varying content lengths
- [x] T024 [EC] Implement state synchronization and out-of-bounds safety in `components/common/InteractiveCard.tsx`
- [x] T025 [EC] Detect RTL mode and adjust animation directions in `components/common/InteractiveCard.tsx`
- [x] T026 [EC] Add ARIA roles and accessibility enhancements in `components/common/InteractiveCard.tsx`
- [x] T027 [EC] Comprehensive interaction audit (rapid clicks, edge drags)
- [x] T018 [RE] Link `AnimatePresence` transitions to swipe axis (X/Y) in `components/common/InteractiveCard.tsx`
- [x] T019 [RE] Implement `onWheel` scroll listener for page navigation in `components/common/InteractiveCard.tsx`
- [x] T020 [RE] Update CSS classes to remove `cursor-grab` on hover and only show on active press in `components/common/InteractiveCard.tsx`
- [x] T017 Verify swipe functionality on mouse and touchpad in `ShiftHistory.tsx`
- [x] T006 [P] [US2] Implement navigation dots UI with absolute positioning in `components/common/InteractiveCard.tsx`
- [x] T007 [US2] Add click handlers to dots for page navigation in `components/common/InteractiveCard.tsx`

### Phase 5: User Story 3 - Automatic Contextual Theme Switching

- [x] T008 [US3] Implement dynamic theme classes based on `activePage` metadata in `components/common/InteractiveCard.tsx`
- [x] T009 [US3] Add CSS transitions for theme color changes in `components/common/InteractiveCard.tsx`

### Phase 6: Integration & Polish

- [x] T010 [P] Refactor `ShiftHistory.tsx` to use `InteractiveCard` for summary stats in `components/sales/ShiftHistory.tsx`
- [x] T011 [US1] Add a second data page to the `ShiftHistory` cards (e.g., secondary metrics) in `components/sales/ShiftHistory.tsx`
- [x] T012 Perform final visual polish and accessibility check for the interactive dots

## Dependencies

- All User Stories depend on T002 and T003 (Foundational).
- US2 and US3 can be developed in parallel after US1 core logic is stable.
- Integration (Phase 6) depends on all User Stories.
