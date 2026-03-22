# Feature Specification: Branch System Robustness & Isolation

**Feature Branch**: `312-branch-system-robustness`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: User request: "Deep Dive Branch Analysis & spec-kit"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Multi-Branch Synchronization (Priority: P1)
As a Pharmacy Owner with multiple branches, I want my offline transactions to be synchronized exactly once to the correct branch in the cloud, even if multiple branches are syncing simultaneously from the same local environment (e.g., multiple tabs or devices), so that my inventory and sales reports are 100% accurate.
**Why this priority**: Essential for data integrity. The current "blind" sync can leak data between branches.
**Independent Test**: Perform a sale in Branch A while offline. Switch to Branch B (or open a second tab). Verify that only the Sync Engine instance for Branch A pushes that sale to the server.

### User Story 2 - Consistent Branch Context (Priority: P2)
As a Pharmacist, when I switch the active branch in the UI, I want all subsequent actions (Sales, Stock Adjustments, Audit Logs) to be immediately and correctly tagged with the new branch, so that I don't accidentally record activity against the wrong location.
**Why this priority**: Prevents user error and audit trail corruption.
**Independent Test**: Switch from Branch A to Branch B. Perform a quick sale. Check the audit log and ensure both the sale record AND the audit entry show Branch B, with NO "ghost" entries in Branch A's log.

### User Story 3 - Unified Audit Trail (Priority: P3)
As a System Auditor, I want a single, consolidated view of all activities (Security, Sales, Inventory) performed in each branch, so that I can easily investigate discrepancies without checking multiple disconnected log files.
**Why this priority**: Simplifies compliance and troubleshooting.
**Independent Test**: Log in, perform a sale, then log out. Open the unified Audit Viewer and verify all three events (Login, Sale, Logout) appear in the same chronological list for that branch.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `syncQueueService.enqueue` MUST automatically capture the `branchId` from the active user session or a provided context.
- **FR-002**: `SyncEngine.ts` MUST strictly filter pending actions by `branchId` and IGNORE any action that does not match its active context or is explicitly global.
- **FR-003**: `idGenerator.generate` MUST require an explicit `branchCode` for branch-specific entities; fallback to global settings guessing is FORBIDDEN.
- **FR-004**: Implementation of a **unified `auditService`** that replaces the redundant `authService` audit logic and uses IndexedDB with a `branchId` index for performance.
- **FR-005**: All services (Sales, Inventory, Purchases) MUST use the **Session Branch** as the primary filter. Method signatures should be updated to make `branchId` mandatory for all data-altering operations.
- **FR-006**: `drugCacheService.saveAll` MUST NOT use `store.clear()`. It must use a branch-isolated delete or a selective migration strategy to prevent wiping other branches' data.
- **FR-007**: Hooks that derive computed data (like `useComputedInventory`) MUST enforce branch isolation at the view level as a secondary guard against source data leakage.

### Key Entities

- **SyncAction**: Added `branchId: string` (Mandatory for non-global actions).
- **AuditEntry**: Unified structure used by all services, including `branchId`, `userId`, and `actionType`.
- **UserSession**: The master source of truth for the current `branchId`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0% "Cross-Branch Leakage" in automated sync tests (Branch A actions never appear in Branch B's push payload).
- **SC-002**: Unified Audit Trail shows 100% of recorded system events in chronological order for any selected branch.
- **SC-003**: No ID generation errors when switching branches rapidly in the UI.
