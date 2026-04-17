# CRUD Audit Report - Zinc (PharmaFlow)

This report documents the findings of a comprehensive CRUD audit of the Zinc frontend codebase, focusing on entity management, persistence patterns, and architectural consistency.

## Overview
Zinc uses a **hybrid persistence model**:
- **Remote**: Supabase (PostgreSQL) as the source of truth.
- **Local**: IndexedDB (for sharded/large data) and LocalStorage (for small/config data) for offline-first resilience.
- **Orchestration**: `App.tsx` and `useEntityHandlers.ts` act as the logic hub, distributing handlers via the `PageRouter`.

---

## Entity Audit Matrix

| Entity | Service | Storage Mechanism | Operations (C/R/U/D) | Responsible Components |
| :--- | :--- | :--- | :--- | :--- |
| **Drug** | `inventoryService` | Supabase + IDB (Offline Cache) | **C**: AddProduct form<br>**R**: Inventory list, POS lookup<br>**U**: Modal edit, Stock Adjustment<br>**D**: Soft delete button | `Inventory.tsx`, `AddProduct.tsx` |
| **Supplier** | `supplierService` | Supabase + LocalStorage | **C**: New Supplier form<br>**R**: History list, Purchase dropdown<br>**U**: Modal edit<br>**D**: Delete | `SupplierManagement.tsx` |
| **Customer** | `customerService` | Supabase + IDB | **C**: Kiosk/Add form, POS Quick-add<br>**R**: Management list, Profile modal<br>**U**: Points update (via Sales), Modal edit<br>**D**: Delete | `CustomerManagement.tsx`, `POS.tsx` |
| **Sale** | `salesService` | IDB (Daily Shards) + Supabase | **C**: POS Checkout<br>**R**: Sales History, Day closure<br>**U**: Return processing<br>**D**: N/A (Immutable) | `POS.tsx`, `SalesHistory.tsx` |
| **Purchase** | `purchaseService` | Supabase + IDB | **C**: Cart confirm (Pending stage)<br>**R**: History list, Approve queue<br>**U**: Approval (Inventory sync)<br>**D**: Reject | `Purchases.tsx`, `PurchaseApprove.tsx` |
| **Return** | `returnService` | Supabase + IDB | **C**: Process Return (Sales/Purchase)<br>**R**: History list<br>**U**: N/A<br>**D**: N/A | `ReturnHistory.tsx`, `PurchaseReturns.tsx` |
| **Employee** | `employeeService` | Supabase + LocalStorage | **C**: Add Employee form (Hashed PW)<br>**R**: List (Local/Global views)<br>**U**: Profile/Role update<br>**D**: Delete | `EmployeeList.tsx` |
| **Shift** | `cashService` | Supabase + LocalStorage | **C**: Open Shift<br>**R**: History, Statistics<br>**U**: Close Shift (Calculate Variance)<br>**D**: N/A | `ShiftHistory.tsx`, `POS.tsx` |

---

## Architectural Gaps & Issues

### 1. Logic Duplication
- **ID/Code Generation**: `Customer` and `Drug` entities generate "CUST-" or "DRUG-" codes inside the UI components. This should be moved to `employeeService` or `idGenerator.ts`.
- **Barcode Validation**: Regular expressions for barcode format are scattered. Need a shared `validationService`.
- **Location Data**: Governorates/Cities/Areas logic is repeated in `Supplier` and `Customer` forms.

### 2. Persistence Inconsistencies
- **Sync Priority**: Some entities (Sales) use `syncQueueService` with high priority, while others (Suppliers) might bypass the queue entirely in certain flows.
- **Atomic Operations**: `transactionService` handles multi-table updates (Stock + Sale + Batch) using a custom `rollback` mechanism because Supabase JS client doesn't support distributed transactions for offline batching.

### 3. Verification & UI States
- **Loading Skeletons**: Managed globally but sometimes overridden by local component loaders, causing "double flashes".
- **Error Handling**: `useAlert` is used consistently, but some background sync failures are silenty logged to console without user-facing retry options (Ref: `BUG-P4`).

---

## Priority Recommendations

1. **Centralize Entity Factory**: [COMPLETED] Move all ID/Code generation logic into a `factory` layer within each service.
2. **Standardize Sync Queue**: [COMPLETED] Ensure all `update` and `delete` operations pass through `syncQueueService` to prevent data loss in flaky network conditions.
3. **Refactor Location Logic**: [COMPLETED] Created a shared `LocationSelector` component and integrated it into Branches, Customers, and Suppliers.
4. **Harden Transaction Rollbacks**: [COMPLETED] Implemented a structured `UndoManager` in `transactionService.ts` for atomic rollbacks across inventory and sales.

---
**Audit Completed by Agentic AI**
**Date: 2026-04-17**
