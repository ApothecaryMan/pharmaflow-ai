# Feature Specification: Organization Management

**Feature Branch**: `001-org-management`  
**Created**: 2026-04-11  
**Status**: Draft  
**Input**: User description: "Build the organization management page including PulseGrid, Branch monitor, Member ACL, and Quota usage."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Strategic Overview (Priority: P1)
As an Organization Owner, I want a single dashboard that shows the performance of all my branches combined, so I can understand the health of my entire business at a glance.

**Why this priority**: Core value of multi-branch management.
**Independent Test**: Can be tested by visiting the Org Management page and verifying aggregated stats match the sum of individual branch stats.

**Acceptance Scenarios**:
1. **Given** multiple branches with sales data, **When** I view the Org Management page, **Then** I see the total sales revenue across all branches.
2. **Given** active shifts in different branches, **When** I check the dashboard, **Then** I see the total number of currently active shifts.

---

### User Story 2 - Branch Health Monitoring (Priority: P1)
As a Manager, I want to see the status of every branch (Open/Closed, last sync, current sales) in a list, so I can identify locations that need attention.

**Why this priority**: Essential for operational control.
**Independent Test**: Can be tested by opening/closing shifts in different branches and checking the monitor list.

**Acceptance Scenarios**:
1. **Given** branch A is open and branch B is closed, **When** I view the Branch Monitor, **Then** branch A shows "Active" and branch B shows "Inactive".
2. **Given** a recent sale in branch A, **When** I view the list, **Then** branch A's "Last Activity" time is updated correctly.

---

### User Story 3 - Subscription & Quota Management (Priority: P2)
As an Owner, I want to see how many branches and employees I have used compared to my plan limits, so I know when I need to upgrade or clean up data.

**Why this priority**: Important for billing and scalability.
**Independent Test**: Can be tested by adding a new branch and seeing the "Usage" percentage increase.

**Acceptance Scenarios**:
1. **Given** a "Starter" plan with 3 branch limit, **When** 2 branches exist, **Then** I see a progress bar at 66%.
2. **Given** I am close to a limit, **When** I view the page, **Then** I see a warning indicator.

---

### Edge Cases
- **Boundary Condition**: What happens when a branch has 0 sales? (Aggregator should handle it without errors).
- **Error Scenario**: How does the system handle a branch that fails to sync? (Show "Error" status in monitor and skip its data in global stats with a warning).

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST aggregate `totalSales`, `totalInventoryValue`, and `activeStaffCount` across all branches belonging to the current `orgId`.
- **FR-002**: System MUST display a list of all branches with: Name, Code, Current Status (Active/Inactive), and Last Synced Time.
- **FR-003**: System MUST show visual indicators (Progress Bars/Circles) for Subscription Plan limits (Branches, Employees, Drugs).
- **FR-004**: System MUST allow Org Admins/Owners to invite and manage members at the organization level.
- **FR-005**: System MUST restrict access to this page to users with `orgRole: 'owner'` or `'admin'`.

### Key Entities
- **Organization**: Top-level tenant holding shared config, billing, and member list.
- **Branch**: Individual location linked to an organization.
- **OrgMember**: User linked to the organization with a specific role (`owner`, `admin`, `member`).

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: Page loads and aggregates data from 5+ branches in under 1.5 seconds.
- **SC-002**: All financial totals on the PulseGrid match the sum of individual branch reports with 100% accuracy.
- **SC-003**: 100% of unauthorized (non-admin) access attempts are blocked and redirected.
