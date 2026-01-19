# Specification: Phase 3 Unit Tests (Sales & Purchases)

## 1. Goal

Implement unit tests for the core transaction services: Sales and Purchases. These services handle money and stock movement, so their logic must be verified.

## 2. Technical Requirements

### 2.1. Sales Service (`services/sales/salesService.ts`)

- **Dependencies**: Mock `storage`, `settingsService`, `idGenerator`.
- **Test Scenarios**:
  - `create`: Should generate ID and assign current Branch Code.
  - `getStats`: Should correctly calculate total revenue and average transaction value.
  - `filter`: Should correctly filter by date range and minimum amount.

### 2.2. Purchase Service (`services/purchases/purchaseService.ts`)

- **Dependencies**: Mock `storage`, `settingsService`.
- **Test Scenarios**:
  - `create`: Should initialize with status 'pending'.
  - `approve`: Should update status to 'completed' and set approval date.
  - `getStats`: Should calculate pending orders count correctly.

## 3. Acceptance Criteria

- [ ] `services/sales/salesService.test.ts` created.
- [ ] `services/purchases/purchaseService.test.ts` created.
- [ ] All new tests pass.
