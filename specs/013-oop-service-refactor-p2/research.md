# Research: OOP Service Refactor - Phase 2

## Decisions & Findings

### 1. BaseEntityService Implementation
- **Decision**: Create `BaseEntityService<T>` inheriting from `BaseDomainService<T>`.
- **Rationale**: `BaseDomainService` already handles basic CRUD. `BaseEntityService` will add standardized `search(query: string)` and `filterByStatus(isActive: boolean)` methods which are common across Customers, Suppliers, and Drugs.
- **Alternatives Considered**: Adding these methods directly to `BaseDomainService`. Rejected because not all domain objects need search/status filtering (e.g., Log entries).

### 2. BaseReportService Enhancements
- **Decision**: Add `getAggregates(filters: TFilters, columns: string[])` to `BaseReportService`.
- **Rationale**: Currently, reporting services do manual aggregations in child classes. Moving this to the base class using Supabase's `.select('sum(column)')` or similar server-side logic improves performance.
- **Alternatives Considered**: Client-side aggregations. Rejected due to scalability concerns with large datasets.

### 3. PermissionsService Refactor
- **Decision**: Convert the current `permissionsService` object into a class `PermissionsServiceImpl` and integrate it into the base services via dependency injection or a protected property.
- **Rationale**: Aligns with the OOP direction and makes the service more testable and extensible.
- **Alternatives Considered**: Keeping it as a singleton object. Rejected as it breaks the OOP pattern used elsewhere.

### 4. Automated Batch Creation logic
- **Decision**: Use a trigger in `PurchaseServiceImpl.updateStatus` that detects the 'received' status.
- **Rationale**: Ensures data consistency between purchases and inventory.
- **Alternatives Considered**: Database triggers. Rejected to keep business logic in the service layer for better visibility and maintainability.

## Unresolved Items
- None. All major technical decisions for Phase 2 have been addressed.
