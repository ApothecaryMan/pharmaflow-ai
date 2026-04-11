# Tasks: Organization Management

**Input**: Design documents from `/specs/001-org-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable
- **[Story]**: US1 (Metrics), US2 (Monitor), US3 (Quota), US4 (Permissions)

---

## Phase 1: Setup (Shared Infrastructure)
- [x] T001 Create project structure per implementation plan
- [x] T002 Initialize IndexedDB service `services/org/orgAggregationService.ts`
- [x] T003 [P] Configure role guard for `OrganizationManagementPage`

---

## Phase 2: Foundational (Blocking Prerequisites)
- [x] T004 Implement `aggregateOrgMetrics` logic with IndexedDB caching
- [x] T005 [P] Setup base layout for `OrganizationManagementPage.tsx`
- [x] T006 [P] Register page in `config/pageRegistry.ts` and sidebar

---

## Phase 3: User Story 1 - Strategic Overview (P1)
- [x] T007 [US1] Create `OrgPulseGrid.tsx` component
- [x] T008 [P] [US1] Implement `StatCard` sub-components
- [x] T009- [x] Integrate with `orgAggregationService`.
- [x] Implement "The Last Owner Rule" for security.
- [x] **[FIXED]** Corrected `activeOrgId` propagation in `PageRouter.tsx` and `App.tsx`.
- [x] Standardize translation with `language` prop.
rMonitor.tsx` with dynamic status logic
- [x] T011 [US3] Create `QuotaMonitor.tsx` with progress visualizations
- [x] T012 [US2/3] Connect dashboard components to data stream

---

## Phase 5: Member Permission Matrix [US4]

(P2) 🎯 NEXT
**Goal**: Centralized UI to manage member roles and branch assignments.
**Independent Test**: Change an employee's role/branch in the matrix and verify it updates in the backend/cache.

### Implementation for User Story 4

- [x] T013 [P] [US4] Initialize `components/org/MemberPermissionMatrix.tsx` with basic layout
- [x] T014 [US4] Setup TanStack Table v8 instance for member data
- [x] T015 [P] [US4] Create `MemberRoleCell` component with role dropdown (`owner`, `admin`, `member`)
- [x] T016 [P] [US4] Create `BranchAssignmentCell` component with branch dropdown
- [x] T017 [US4] Implement "Save Changes" logic using `employeeService.update`
- [x] T017b [US4] Enforce "Last Owner Rule" to prevent accidental lockout
- [x] T018 [US4] Integrate `MemberPermissionMatrix` and pass `employees` and `branches` from parent state
- [x] T019 [US4] Add Arabic translations for all matrix headers and status labels in `i18n/translations.ts`

---


## Phase 6: Polish & Verification

**Purpose**: Cross-cutting verification and optimization.

- [x] T020 [P] Verify RTL alignment for the Permissions Matrix
- [x] T021 [P] Optimize TanStack Table search and filtering for 50+ members
- [x] T022 Conduct final end-to-end walkthrough of all management modules
- [x] T023 Run `quickstart.md` validation on a clean environment

---

## Dependencies & Execution Order
1. **Phases 1-4**: (Completed)
2. **Phase 5 (Permissions)**:
   - T013 → T014 → T015/T016 (Parallel) → T017 → T018
3. **Phase 6 (Polish)**: After Phase 5 is stable.

---

## Implementation Strategy
- **MVP**: Completed Phases 1-4.
- **Incremental**: Phase 5 adds the final "ACL" requirement from the spec.
