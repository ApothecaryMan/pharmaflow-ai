# Implementation Plan: Phase 4 Unit Tests

## Goal

Implement tests for `expiryUtils`, `currency`, `settingsService`, `customerService`, and `useAuth`.

## Proposed Changes

### 1. Utility Tests

#### [NEW] [utils/expiryUtils.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/utils/expiryUtils.test.ts)

- Test valid/invalid inputs for `sanitizeExpiryInput`.
- Test status logic (valid, near-expiry, expired) for `checkExpiryStatus`.

#### [NEW] [utils/currency.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/utils/currency.test.ts)

- Test formatting numbers.

### 2. Service Tests

#### [NEW] [services/settings/settingsService.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/services/settings/settingsService.test.ts)

- Mock `storage`.
- Test `getAll` merges defaults.
- Test `set` saves to storage.

#### [NEW] [services/customers/customerService.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/services/customers/customerService.test.ts)

- Mock `storage` and `settingsService`.
- Test CRUD operations.
- Test loyalty points logic.

### 3. Hook Tests

#### [NEW] [hooks/useAuth.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/hooks/useAuth.test.ts)

- Use `renderHook` and `act` from `@testing-library/react`.
- Validate state transitions.

## Verification Plan

### Automated

- Run `npm run test` to verify all tests (Phases 1-4).
