# Project Progress & Test Coverage Report

This document tracks the current implementation status of unit tests across the codebase, as requested.

**Legend:**

- [x] **Verified**: Unit tests implemented. `(N tests)` indicates the number of passing tests.
- [ ] **Pending**: No unit tests found.

---

## 📂 Services (`src/services`)

### 🔐 Auth

- [x] `auth/hashUtils.ts` (4 tests)
- [x] `auth/authService.ts` (6 tests)

### 📦 Inventory

- [x] `inventory/batchService.ts` (5 tests)
- [x] `inventory/inventoryService.ts` (4 tests)

### 💰 Sales & Purchases

- [x] `sales/salesService.ts` (4 tests)
- [x] `purchases/purchaseService.ts` (5 tests)

### 👥 Others (Pending)

- [x] `customers/customerService.ts` (4 tests)
- [x] `suppliers/supplierService.ts` (3 tests)
- [x] `settings/settingsService.ts` (3 tests)
- [x] `timeService.ts` (4 tests)
- [ ] `geminiService.ts`

---

## 📂 Utilities (`src/utils`)

- [x] `idGenerator.ts` (2 tests)
- [x] `storage.ts` (4 tests)
- [x] `expiryUtils.ts` (12 tests)
- [x] `inventory.ts` (10 tests)
- [x] `currency.ts` (3 tests)
- [x] `searchUtils.ts` (7 tests)
- [x] `qzPrinter.ts` (4 tests)

---

## 📂 UI Components (`src/components/common`)

### Forms & Inputs

- [x] `SmartInputs.tsx` (2 tests)
- [x] `Switch.tsx` (1 test)
- [x] `SegmentedControl.tsx` (2 tests)
- [ ] `FloatingInput.tsx`
- [ ] `SearchInput.tsx`
- [ ] `DatePicker.tsx`

### Interface Elements

- [x] `Modal.tsx` (4 tests)
- [x] `ContextMenu.tsx` (4 tests)
- [ ] `FilterDropdown.tsx`
- [ ] `ChartWidget.tsx`
- [ ] `DataTable.tsx`
- [x] `TanStackTable.tsx` (4 tests)

---

## 📂 Hooks (`src/hooks`)

_(No tests implemented yet)_

- [x] `useAuth.ts` (4 tests)
- [ ] `useEntityHandlers.ts`
- [ ] `useTheme.ts`
- [ ] `useNavigation.ts`
- [x] `usePrinter.ts` (2 tests)

---

## 📂 Components (`src/components`)

### Auth

- [x] `auth/Login.tsx` (5 tests)
- [ ] `auth/auth.tsx`

### Status Bar

- [ ]

## 📊 Summary

- **Total Tests Passed:** 101 ✅
- **Critical Logic Covered:** Authentication (Logic & Ends with UI), Inventory, Sales, Purchases, Storage, Customers, Suppliers, Settings, UI (Modal/Toast), Expiry.
- **Next Initial Focus:** Remaining UI components (`DataTable`, `ChartWidget`).
