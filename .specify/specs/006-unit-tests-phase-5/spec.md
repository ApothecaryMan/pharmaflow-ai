# Specification: Phase 5 Unit Tests (Suppliers & Core UI)

## 1. Goal

Expand test coverage to include `supplierService`, `inventoryService` (core product logic), and critical UI feedback components (`Modal`, `Toast`).

## 2. Technical Requirements

### 2.1. Services

- **Suppliers**: `services/suppliers/supplierService.ts`
  - Verify CRUD operations (create, update, delete).
  - Verify search and filter logic.
- **Inventory Service**: `services/inventory/inventoryService.ts`
  - Verify filtering by stock level (low stock, etc.).
  - Verify `updateStock` logic.

### 2.2. UI Components

- **Modal**: `components/common/Modal.tsx`
  - Verify it renders when `isOpen=true` and doesn't when `false`.
  - Verify `onClose` callback triggers on close button click.
  - Verify children rendering.
- **Toast**: `components/common/Toast.tsx`
  - Verify message rendering.
  - Verify `onClose` is called after duration (using fake timers).

## 3. Acceptance Criteria

- [ ] `services/suppliers/supplierService.test.ts` created.
- [ ] `services/inventory/inventoryService.test.ts` created.
- [ ] `components/common/Modal.test.tsx` created.
- [ ] `components/common/Toast.test.tsx` created.
- [ ] All new tests pass.
