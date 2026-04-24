# OOP Service Refactor Plan

This document outlines the strategy for refactoring the service layer to use Object-Oriented Programming (OOP) principles, inheriting from centralized base classes to reduce redundancy and improve maintainability.

## Core Architecture

- **BaseReportService**: Handles common filtering (dates, branches), Supabase queries, and mapping for history-based services.
- **BaseDomainService** (To be created): Handles common CRUD operations, offline storage management, and sync queue integration for entity-based services.

---

## 1. Inventory Service (`services/inventory/inventoryService.ts`)
**Goal**: Refactor to a class-based structure for managing drug entities.

- [ ] Define `InventoryServiceImpl` class.
- [ ] Implement CRUD methods (get, create, update, delete).
- [ ] Centralize stock calculation logic.
- [ ] **Surgical Change**: Keep existing `inventoryService` export instance.
- [ ] **Verification**: Ensure `useData` and `Inventory` components still load drugs correctly.

## 2. Sales Service (`services/sales/salesService.ts`)
**Goal**: Refactor to extend `BaseReportService` for sales history and analytics.

- [ ] Define `SalesServiceImpl` extending `BaseReportService`.
- [ ] Implement `logSale` with transaction support.
- [ ] Add specific analytics methods (top products, daily revenue).
- [ ] **Verification**: Ensure sales are recorded in Supabase and local storage simultaneously.

## 3. Purchases Service (`services/purchases/purchaseService.ts`)
**Goal**: Refactor to extend `BaseReportService` for supply chain tracking.

- [ ] Define `PurchaseServiceImpl` extending `BaseReportService`.
- [ ] Implement `logPurchase` and `updateStatus` (received/pending).
- [ ] Link with `InventoryService` for automatic stock updates.
- [ ] **Verification**: Verify that stock increases when a purchase is marked as 'received'.

## 4. HR / Employee Service (`services/hr/employeeService.ts`)
**Goal**: Centralize employee management and session context.

- [ ] Define `EmployeeServiceImpl`.
- [ ] Move permission checking logic to `PermissionsService` but keep helper methods here.
- [ ] Implement employee profile updates.
- [ ] **Verification**: Ensure login and role-based access still function correctly.

## 5. Customers & Suppliers Services
**Goal**: Standardize entity management for external partners.

- [ ] Create a `BaseEntityService` for simple CRUD entities.
- [ ] Refactor `CustomerService` and `SupplierService` to extend `BaseEntityService`.
- [ ] **Verification**: Ensure autocomplete in sales/purchases still finds records.

---

## Karpathy Guidelines Implementation
- **Surgical Changes**: We only touch the implementation of the services. Interfaces and export names remain identical to prevent breaking the UI.
- **Simplicity First**: We won't add "generic" methods that aren't currently needed.
- **Think Before Coding**: Before each refactor, we will verify the specific mapping of database columns (e.g., `org_id` vs `branch_id`).
