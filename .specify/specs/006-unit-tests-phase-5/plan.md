# Implementation Plan: Phase 5 Unit Tests

## Goal

Implement tests for `supplierService`, `inventoryService`, `Modal`, and `Toast`.

## Proposed Changes

### 1. Service Tests

#### [NEW] [services/suppliers/supplierService.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/services/suppliers/supplierService.test.ts)

- Mock `storage`.
- Test `create`, `search`, `delete`.

#### [NEW] [services/inventory/inventoryService.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/services/inventory/inventoryService.test.ts)

- Mock `storage`.
- Test `filter` (low stock, expiry).
- Test `updateStock`.

### 2. UI Component Tests

#### [NEW] [components/common/Modal.test.tsx](file:///d:/Projects/HTML/pharmaflow-ai/components/common/Modal.test.tsx)

- Test rendering with `isOpen` prop.
- Test `onClose` interaction.
- Note: Modal uses `ReactDOM.createPortal`. Test environment (`jsdom`) supports this, but might need standard setup.

#### [NEW] [components/common/Toast.test.tsx](file:///d:/Projects/HTML/pharmaflow-ai/components/common/Toast.test.tsx)

- Test message display.
- Test auto-close using `vi.useFakeTimers()`.

## Verification Plan

### Automated

- Run `npm run test` to verify all tests (Phases 1-5).
