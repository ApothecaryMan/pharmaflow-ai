# Implementation Plan: Phase 7 Unit Tests

## Goal

Implement tests for `authService`, `timeService`, `searchUtils`, and `inventoryUtils`.

## Proposed Changes

### 1. Service Tests

#### [NEW] [services/auth/authService.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/services/auth/authService.test.ts)

- Test `login` with valid/invalid credentials.
- Test `hasSession` and `logout`.
- Mock `sessionStorage`.

#### [NEW] [services/timeService.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/services/timeService.test.ts)

- Test date formatting functions.

### 2. Utility Tests

#### [NEW] [utils/searchUtils.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/utils/searchUtils.test.ts)

- Test search filtering logic.

#### [NEW] [utils/inventory.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/utils/inventory.test.ts)

- Test inventory helper functions.

## Verification Plan

### Automated

- Run `npm run test`
