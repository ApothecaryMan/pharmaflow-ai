# Specification: Phase 2 Unit Tests (Services & UI)

## 1. Goal

Expand unit test coverage to include critical business logic (Authentication, Inventory) and commonly used UI components.

## 2. Technical Requirements

### 2.1. Service Logic

- **Authentication**: `services/auth/hashUtils.ts`
  - Verify SHA-256 hasing works.
  - Verify password verification returns correct boolean.
- **Inventory**: `services/inventory/batchService.ts`
  - Verify `allocateStock` follows FEFO (First Expiry First Out).
  - Verify `updateBatchQuantity` handles negatives and removal.
  - Mock `idGenerator` and `storage` dependencies.

### 2.2. UI Components

- **SegmentedControl**: `components/common/SegmentedControl.tsx`
  - Verify correct option is active.
  - Verify `onChange` callback is fired.
- **Switch**: `components/common/Switch.tsx`
  - Verify toggling state.

## 3. Acceptance Criteria

- [ ] new test files created in `services/` and `components/common/`.
- [ ] `npm run test` passes with all new tests.
- [ ] FEFO logic verified for BatchService.
