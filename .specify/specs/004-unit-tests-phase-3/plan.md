# Implementation Plan: Phase 3 Unit Tests

## Goal

Implement unit tests for `salesService` and `purchaseService`.

## Proposed Changes

### 1. Sales Service Tests

#### [NEW] [services/sales/salesService.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/services/sales/salesService.test.ts)

- **Mocks**:
  - `utils/storage`: Spy on `get`/`set`.
  - `services/settings/settingsService`: Mock `getAll` to return `{ branchCode: 'MAIN' }`.
  - `utils/idGenerator`: Mock `generate` to return 'SALE-123'.
- **Tests**:
  - Create Sale -> Checks if branchCode is applied.
  - Get Stats -> Input mock data, check revenue calculation.

### 2. Purchase Service Tests

#### [NEW] [services/purchases/purchaseService.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/services/purchases/purchaseService.test.ts)

- **Mocks**: `storage`, `settingsService`.
- **Tests**:
  - Create Purchase -> Checks status is 'pending'.
  - Approve Purchase -> Checks status update.
  - Reject Purchase -> Checks status update.

## Verification Plan

### Automated

- Run `npm run test` to verify all tests (existing + new).
