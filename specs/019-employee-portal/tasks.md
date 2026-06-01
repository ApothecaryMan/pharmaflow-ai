---
description: "Task list template for feature implementation"
---

# Tasks: Employee Portal & Independent Authentication

**Input**: Design documents from `/specs/019-employee-portal/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create component directories `components/employee-portal/` and `components/auth/`
- [x] T002 Create service directories `services/hr/repositories/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Generate Supabase migration for `user_profiles` table in `supabase/migrations/[timestamp]_user_profiles.sql`
- [x] T004 Generate Supabase migration for `employees` modifications (Dual Login fields) in `supabase/migrations/[timestamp]_employees_pos.sql`
- [x] T005 Generate Supabase migration for `employment_requests` table in `supabase/migrations/[timestamp]_employment_requests.sql`
- [x] T006 Implement Row Level Security (RLS) policies for new tables in `supabase/migrations/[timestamp]_employee_rls.sql`
- [x] T007 Update global TypeScript types (`UserProfile`, `EmploymentRequest`, modified `Employee`) in `types/index.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Employee Independent Registration (Priority: P1) 🎯 MVP

**Goal**: As a pharmacy professional, I want to create and manage my own independent profile on the platform.

**Independent Test**: Can be fully tested by registering a new user as an individual and accessing their standalone employee portal.

### Implementation for User Story 1

- [x] T008 [US1] Add `registerIndividual` method to `services/auth/authService.ts` to create `auth.users` and `user_profiles`
- [x] T009 [P] [US1] Create Employee Profile Repository in `services/hr/repositories/employeeProfileRepository.ts`
- [x] T010 [US1] Build independent registration UI in `components/auth/IndividualRegistration.tsx`
- [x] T011 [US1] Build standalone Employee Portal dashboard shell in `components/employee-portal/EmployeeDashboard.tsx`
- [x] T012 [US1] Add routing logic to detect zero-affiliation users and route to `/employee-portal` in `App.tsx` (or main router)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Pharmacy Requesting an Employee (Priority: P1)

**Goal**: As a pharmacy admin, I want to invite an existing independent employee to join my pharmacy using their unique username.

**Independent Test**: Can be tested by an admin entering a valid username and seeing the employment request created.

### Implementation for User Story 2

- [x] T013 [P] [US2] Create Employment Request Repository in `services/hr/repositories/employmentRequestRepository.ts` (send/fetch methods)
- [x] T014 [US2] Update Pharmacy "Staff Management" UI to add "Hire via Username" modal
- [x] T015 [US2] Implement frontend validation to verify `@username` exists before submitting request

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Employee Accepting Employment Request (Priority: P2)

**Goal**: As an independent employee, I want to review and accept/reject employment requests from pharmacies.

**Independent Test**: Can be tested by an employee logging into their portal, seeing a pending request, and accepting it.

### Implementation for User Story 3

- [x] T016 [US3] Add `acceptEmploymentRequest` transaction method (updates request + inserts to `employees` with POS fields) in `services/hr/repositories/employmentRequestRepository.ts`
- [x] T017 [US3] Build Pending Requests list UI in `components/employee-portal/EmploymentRequestsList.tsx`
- [x] T018 [US3] Integrate acceptance UI with repository logic in `EmployeeDashboard.tsx`

**Checkpoint**: All core employee handshake user stories should now be independently functional

---

## Phase 6: User Story 4 - Workspace Switching for Multi-Employment (Priority: P3)

**Goal**: As an employee working at multiple pharmacies, I want to be able to switch between the different pharmacy workspaces.

**Independent Test**: Testable by linking a user to two organizations and ensuring they can select which context to load.

### Implementation for User Story 4

- [x] T019 [P] [US4] Update `authService.ts` to detect multiple `employees` rows and trigger Workspace Switcher routing
- [x] T020 [US4] Build Workspace Switcher UI component in `src/components/auth/WorkspaceSwitcher.tsx`
- [x] T021 [US4] Update `QuickLogin.tsx` logic to authenticate using local `username` and local `password` inside the pharmacy in `src/components/layout/StatusBar/items/QuickLogin.tsx`
- [x] T022 [US4] Implement Workspace Switcher dropdown in the main TopNav for instant switching without logout in `src/components/layout/TopNav.tsx`

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple### Polish and Validation
- [x] T023 [P] Move all new hardcoded Arabic/English strings to `src/i18n/translations.ts`
- [x] T024 [P] Update `CONTRIBUTING.md` with new `QuickLogin` Dual Login architecture
- [x] T025 Run full end-to-end quickstart.md validation manually

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Sequential priority order (P1 → P2 → P3) recommended.
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities
- All Foundational DB migration tasks can be written in parallel.
- `employeeProfileRepository.ts` (US1) and `employmentRequestRepository.ts` (US2) can be implemented in parallel.
- Workspace Switcher UI (US4) can be built in parallel with the Employee Dashboard UI (US1).
