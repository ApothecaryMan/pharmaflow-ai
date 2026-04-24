# Implementation Plan: OOP Service Refactor - Phase 2

**Branch**: `013-oop-service-refactor-p2` | **Date**: 2026-04-25 | **Spec**: [spec.md](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/specs/013-oop-service-refactor-p2/spec.md)
**Input**: Feature specification from `/specs/013-oop-service-refactor-p2/spec.md`

## Summary

This feature completes the service layer transition to a robust OOP architecture. The primary focus is on standardizing entity management (Customers/Suppliers) through a new `BaseEntityService`, evolving the reporting layer (`Sales`/`Purchases`) with advanced analytics and server-side aggregations, and centralizing security via a refactored `PermissionsService`. This ensures consistency, reduces code duplication, and improves data integrity through automated workflows like batch creation.

## Technical Context

**Language/Version**: TypeScript (ES2022 target)  
**Primary Dependencies**: React 19+, Vite, Supabase, TanStack Table  
**Storage**: Supabase (PostgreSQL), `StorageService`  
**Testing**: Vitest  
**Target Platform**: Web (Bilingual LTR/RTL)
**Project Type**: Web application  
**Performance Goals**: <500ms search/filter response, dashboard charts loading under 2s.  
**Constraints**: No `any` types, strict i18n compliance, standard component usage.  
**Scale/Scope**: 5 core services to be refactored or updated, covering Customers, Suppliers, Sales, Purchases, and Employees.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Strict Type Safety**: All new classes and interfaces will use specific types. `any` is forbidden.
- [x] **Localization First**: Any new user-facing strings (e.g., error messages) will be added to `i18n/translations.ts`.
- [x] **Service-Based Architecture**: Core logic is strictly isolated in `services/core` and `services/[domain]`.
- [x] **Standard Component Usage**: No direct HTML tags in components; using `SmartInput`, `TanStackTable`, etc.
- [x] **Secure Data Handling**: Using `idGenerator` for sequential IDs and `StorageService` for persistence.

## Project Structure

### Documentation (this feature)

```text
specs/013-oop-service-refactor-p2/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (Internal service contracts)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
services/
├── core/
│   ├── BaseDomainService.ts    # Base for all services
│   ├── BaseEntityService.ts    # NEW: Standardizes search/filter
│   └── BaseReportService.ts    # Updated: Supports aggregations
├── customers/
│   └── customerService.ts      # Refactored: CustomerServiceImpl
├── suppliers/
│   └── supplierService.ts      # Refactored: SupplierServiceImpl
├── sales/
│   └── salesService.ts         # Updated: Analytics methods
├── purchases/
│   └── purchaseService.ts      # Updated: Auto-batch logic
├── hr/
│   └── employeeService.ts      # Updated: Profile management
└── auth/
    └── permissions.ts          # Refactored: PermissionsServiceImpl
```

**Structure Decision**: Single project structure with centralized service layer. Core abstractions reside in `services/core/`.

## Complexity Tracking

*No violations detected. The refactoring simplifies existing complexity.*
