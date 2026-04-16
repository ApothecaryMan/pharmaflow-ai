# Implementation Plan: Organization Management

**Branch**: `001-org-management` | **Date**: 2026-04-11 | **Spec**: [spec.md](file:///home/x1carbon/Projects/HTML/pZINC-ai/specs/001-org-management/spec.md)

## Summary

This plan covers the centralized Organization Management system for ZINC, focusing on high-performance data aggregation (Phases 1-4) and the Member Permission Matrix (Phase 5). The approach uses IndexedDB for client-side caching of cross-branch metrics and a standardized `TanStackTable` for permission management.

## Technical Context

**Language/Version**: React 19 / TypeScript 5  
**Primary Dependencies**: Lucide React, TanStack Table v8 (MANDATORY per Constitution), existing services (`employeeService`, `branchService`).  
**Storage**: IndexedDB (Metrics Cache), Supabase (Primary Persistence).  
**Testing**: Vitest + React Testing Library.  
**Target Platform**: Web (Desktop Optimized).
**Project Type**: Multi-Tenant Web Application.  
**Performance Goals**: <1.5s aggregation for 10 branches; 60fps UI interactions.  
**Constraints**: Role Guard (Owner/Admin only), Full RTL support, No `any` types.  
**Scale/Scope**: Up to 15 branches per organization, 50 employees.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Strict Type Safety**: All props and state interfaces defined.
- [x] **Localization First**: All strings moved to translation keys.
- [x] **Standard Component Usage**: Using `TanStackTable` for the matrix.
- [x] **Service-Based Architecture**: Business logic kept in `employeeService` and `orgAggregationService`.
- [x] **Secure Data Handling**: Using `StorageService` and `idGenerator`.

## Project Structure

### Documentation (this feature)

```text
specs/001-org-management/
├── plan.md              # This file
├── research.md          # Multi-branch access logic research
├── data-model.md        # OrgMember and Branch relations
├── quickstart.md        # Dev setup for org metrics
└── tasks.md             # Implementation tracking
```

### Source Code (repository root)

```text
components/
└── org/
    ├── OrganizationManagementPage.tsx
    ├── OrgPulseGrid.tsx
    ├── BranchMasterMonitor.tsx
    ├── QuotaMonitor.tsx
    └── MemberPermissionMatrix.tsx  # Phase 5 Target

services/
└── org/
    └── orgAggregationService.ts
```

**Structure Decision**: Standard root-level directories consistent with project conventions.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| IndexedDB for Metrics | Performance | LocalStorage parsing blocks UI thread for large datasets. |
| Global Aggregate Service | Shared Logic | Calculating metrics inside components leads to code duplication. |
