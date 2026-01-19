# Specification: Phase 7 Unit Tests (Time, Search, & Auth Service)

## 1. Goal

Fill the remaining gaps in the Service & Utility layers.

## 2. Technical Requirements

### 2.1. Services

- **Auth Service**: `services/auth/authService.ts`
  - Verify `login` (simulated delay, credential check).
  - Verify `getCurrentUser` (session storage).
  - Verify `logout`.

- **Time Service**: `services/timeService.ts`
  - Verify formatting logic.
  - Verify shift time calculations if present.

### 2.2. Utilities

- **Search Utils**: `utils/searchUtils.ts`
  - Verify search logic (fuzzy matching if applicable).
- **Inventory Utils**: `utils/inventory.ts`
  - Verify helper functions.

## 3. Acceptance Criteria

- [ ] `services/auth/authService.test.ts` created.
- [ ] `services/timeService.test.ts` created.
- [ ] `utils/searchUtils.test.ts` created.
- [ ] `utils/inventoryUtils.test.ts` created.
- [ ] All new tests pass.
