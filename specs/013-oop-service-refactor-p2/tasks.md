# Tasks: OOP Service Refactor - Phase 2

## Feature Information
- **Feature**: OOP Service Refactor - Phase 2
- **Spec**: [spec.md](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/specs/013-oop-service-refactor-p2/spec.md)
- **Plan**: [plan.md](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/specs/013-oop-service-refactor-p2/plan.md)
- **Branch**: `013-oop-service-refactor-p2`

## Phase 1: Setup
- [ ] T001 Sync i18n keys for refactor in [i18n/translations.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/i18n/translations.ts)

## Phase 2: Foundational
- [x] T002 Implement `BaseEntityService` in [services/core/BaseEntityService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/core/BaseEntityService.ts)
- [ ] T003 Enhance `BaseReportService` with `getAggregates` in [services/core/BaseReportService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/core/BaseReportService.ts)
- [ ] T004 [P] Refactor `permissionsService` into `PermissionsServiceImpl` class in [services/auth/permissions.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/auth/permissions.ts)

## Phase 3: User Story 1 - Consistent Entity Management (Priority: P1)
**Goal**: Standardize search and filtering for customers and suppliers.
**Independent Test**: Perform identical search and filtering operations on both Customer and Supplier lists.

- [x] T005 [P] [US1] Implement `CustomerServiceImpl` extending `BaseEntityService` in [services/customers/customerService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/customers/customerService.ts)
- [ ] T006 [P] [US1] Implement `SupplierServiceImpl` extending `BaseEntityService` in [services/suppliers/supplierService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/suppliers/supplierService.ts)
- [ ] T007 [US1] Update `CustomerManagement` UI to use new search/filter methods in [components/customers/CustomerManagement.tsx](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/customers/CustomerManagement.tsx)
- [ ] T008 [US1] Update `SuppliersList` UI to use new search/filter methods in [components/purchases/SuppliersList.tsx](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/purchases/SuppliersList.tsx)

## Phase 4: User Story 2 - Actionable Business Analytics (Priority: P2)
**Goal**: Provide aggregated sales and purchase data via analytics dashboard.
**Independent Test**: Verify that the dashboard displays accurate top products and revenue charts.

- [ ] T009 [P] [US2] Implement `SalesServiceImpl` with analytics methods in [services/sales/salesService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/sales/salesService.ts)
- [ ] T010 [P] [US2] Implement `PurchaseServiceImpl` with analytics methods in [services/purchases/purchaseService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/purchases/purchaseService.ts)
- [ ] T011 [US2] Update `IntelligenceDashboard` to use new analytics methods in [pages/IntelligenceDashboard.tsx](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/pages/IntelligenceDashboard.tsx)

## Phase 5: User Story 3 - Automated Inventory Reception (Priority: P2)
**Goal**: Automatically create inventory batches upon purchase reception.
**Independent Test**: Change purchase status to "received" and verify batch creation in inventory.

- [ ] T012 [US3] Implement auto-batch creation logic in `PurchaseServiceImpl.updateStatus` in [services/purchases/purchaseService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/purchases/purchaseService.ts)
- [ ] T013 [US3] Ensure inventory batch consistency and linking in [services/inventory/inventoryService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/inventory/inventoryService.ts)

## Phase 6: User Story 4 - Secure Profile and Access Control (Priority: P3)
**Goal**: Enable secure profile updates and centralized permission checks.
**Independent Test**: Update profile information and verify that unauthorized actions are blocked.

- [ ] T014 [US4] Implement `updateProfile` in `EmployeeServiceImpl` in [services/hr/employeeService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/hr/employeeService.ts)
- [ ] T015 [US4] Update profile UI to use new `updateProfile` method in [components/hr/EmployeeProfile.tsx](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/hr/EmployeeProfile.tsx)
- [x] T016 [US4] Integrate centralized permissions checks in `BaseDomainService` in [services/core/BaseDomainService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/core/BaseDomainService.ts)

## Phase 7: Polish & Optimization
- [ ] T017 End-to-end workflow verification: Purchase -> Receive -> Sell -> Return
- [ ] T018 Performance audit of OOP abstractions in high-frequency operations

## Dependencies
- US1, US2, US3, US4 all depend on Phase 2 (Foundational).
- US2 depends on enhancements in US1/US2 services.

## Parallel Execution Examples
- **US1 & US2**: Customer/Supplier refactoring can happen in parallel with Sales/Purchase refactoring as they touch different services.
- **US4**: Profile management and core permissions refactor can be done independently of US1/US2.

## Implementation Strategy
- **MVP**: Complete US1 first to establish the pattern for the new `BaseEntityService`.
- **Incremental Delivery**: Deliver US1, then US2, followed by US3/US4.
