# Implementation Plan: Phase 2 Unit Tests

## Goal

Implement unit tests for `hashUtils`, `batchService`, `SegmentedControl`, and `Switch`.

## Proposed Changes

### 1. Service Tests

#### [NEW] [services/auth/hashUtils.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/services/auth/hashUtils.test.ts)

- Test `hashPassword` returns a string.
- Test `verifyPassword` returns true for correct match, false otherwise.

#### [NEW] [services/inventory/batchService.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/services/inventory/batchService.test.ts)

- **Mocks**: Need to mock `utils/storage` to prevent writing to real localStorage.
- Test `createBatch` adds to storage.
- Test `allocateStock` picks oldest batch first (FEFO).
- Test `allocateStock` returns null if insufficient.

### 2. UI Component Tests

#### [NEW] [components/common/SegmentedControl.test.tsx](file:///d:/Projects/HTML/pharmaflow-ai/components/common/SegmentedControl.test.tsx)

- Render with options.
- Click option -> spy on `onChange`.

#### [NEW] [components/common/Switch.test.tsx](file:///d:/Projects/HTML/pharmaflow-ai/components/common/Switch.test.tsx)

- Render active/inactive.
- Click -> spy on `onChange`.

## Verification Plan

### Automated

- Run `npm run test` using existing Vitest setup.
