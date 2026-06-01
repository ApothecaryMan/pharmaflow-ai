# Implementation Plan: Employee Portal & Independent Authentication

**Branch**: `019-employee-portal` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

## Summary

Separate employee registration from pharmacy registration by introducing an independent Employee Portal. Employees maintain their own profiles and are requested by pharmacies via a unique Username. The system supports multi-tenant switching for employees working at multiple pharmacies.

## Technical Context

**Language/Version**: TypeScript (ES2022), React 19+
**Primary Dependencies**: Supabase (Auth & Postgres), Vite, Tailwind CSS
**Target Platform**: Web App
**Project Type**: Single Web Application with Multi-tenant capabilities

## Constitution Check

*GATE: Passed*
- [x] No `any` types.
- [x] No hardcoded strings (Will use `i18n/translations.ts`).
- [x] No direct `localStorage` access (Will use `StorageService`).

## Project Structure

### Documentation (this feature)

```text
specs/019-employee-portal/
├── plan.md              
├── research.md          
├── data-model.md        
├── quickstart.md        
└── tasks.md             
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── auth/
│   │   ├── IndividualRegistration.tsx
│   │   ├── OrgRegistration.tsx
│   │   └── WorkspaceSwitcher.tsx
│   ├── employee-portal/
│   │   ├── EmployeeDashboard.tsx
│   │   └── EmploymentRequestsList.tsx
├── services/
│   ├── auth/
│   │   └── authService.ts (Modified to handle independent sessions and workspace switching)
│   ├── hr/
│   │   └── repositories/
│   │       ├── employeeProfileRepository.ts (New)
│   │       └── employmentRequestRepository.ts (New)
└── types/
    └── index.ts (Updated with UserProfile and EmploymentRequest types)
```

**Structure Decision**: The frontend will remain a single React application, but the routing will diverge based on the user's affiliations. Users with no active `org_members` records are routed to the `employee-portal`, while users with multiple go to the `WorkspaceSwitcher`.
