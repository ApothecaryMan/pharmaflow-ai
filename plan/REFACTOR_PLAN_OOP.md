# OOP Service Refactor Plan

This document outlines the strategy for refactoring the service layer to use Object-Oriented Programming (OOP) principles, inheriting from centralized base classes to reduce redundancy and improve maintainability.

## Core Architecture

- **BaseReportService**: Handles common filtering (dates, branches), Supabase queries, and mapping for history-based services.
- **BaseDomainService** (To be created): Handles common CRUD operations, offline storage management, and sync queue integration for entity-based services.

---

## 1. Inventory Service (`services/inventory/inventoryService.ts`)
**Goal**: Refactor to a class-based structure for managing drug entities.

- [x] Define `InventoryServiceImpl` class.
- [x] Implement CRUD methods (get, create, update, delete).
- [x] Centralize stock calculation logic.
- [x] **Surgical Change**: Keep existing `inventoryService` export instance.
- [x] **Verification**: Ensure `useData` and `Inventory` components still load drugs correctly.

## 2. Sales Service (`services/sales/salesService.ts`)
**Goal**: Refactor to extend `BaseReportService` for sales history and analytics.

- [x] Define `SalesServiceImpl` (extends `BaseDomainService`).
- [ ] Refactor to extend `BaseReportService` for history/analytics (Moved to Phase 2).
- [ ] Implement `logSale` with transaction support (Moved to Phase 2).
- [ ] Add specific analytics methods (top products, daily revenue) (Moved to Phase 2).
- [x] **Verification**: Ensure sales are recorded in Supabase and local storage simultaneously.

## 3. Purchases Service (`services/purchases/purchaseService.ts`)
**Goal**: Refactor to extend `BaseReportService` for supply chain tracking.

- [x] Define `PurchaseServiceImpl` (extends `BaseDomainService`).
- [ ] Refactor to extend `BaseReportService` for supply chain tracking (Moved to Phase 2).
- [ ] Implement `logPurchase` and `updateStatus` (received/pending) (Moved to Phase 2).
- [x] Link with `InventoryService` for automatic stock updates (via `transactionService`).
- [x] **Verification**: Verify that stock increases when a purchase is marked as 'received'.

## 4. HR / Employee Service (`services/hr/employeeService.ts`)
**Goal**: Centralize employee management and session context.

- [x] Define `EmployeeServiceImpl` (extends `BaseDomainService`).
- [x] Move permission checking logic to `PermissionsService`.
- [x] Implement employee profile updates.
- [x] **Verification**: Ensure login and role-based access still function correctly.

## 5. Customers & Suppliers Services
**Goal**: Standardize entity management for external partners.

- [x] Refactor `CustomerService` and `SupplierService` to classes.
- [ ] Create a `BaseEntityService` for standardization (Moved to Phase 2).
- [x] **Verification**: Ensure autocomplete in sales/purchases still finds records.

---

## 6. Service Stabilization (Completed April 2026)
**Goal**: Resolve logic errors and type mismatches in the transaction layer.

- [x] **Transaction Service**: Fixed `serialId` mapping, `purchaseService` call signatures, and `CashTransaction` property names (`relatedSaleId`).
- [x] **Return Service**: Fixed `currentEmployeeId` detection and stock check logic (switched to `batchService.getTotalStock`).
- [x] **Type Safety**: De-duplicated `OrderModification` types and moved organization-level roles to `auth.ts`.
- [x] **ID Generation**: Unified `idGenerator` usage across services with async/await support.

---

## Karpathy Guidelines Implementation
- **Surgical Changes**: We only touch the implementation of the services. Interfaces and export names remain identical to prevent breaking the UI.
- **Simplicity First**: We won't add "generic" methods that aren't currently needed.
- **Think Before Coding**: Before each refactor, we will verify the specific mapping of database columns (e.g., `org_id` vs `branch_id`).
