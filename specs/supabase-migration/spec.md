# Feature Specification: Supabase Backend Migration

**Feature Branch**: `feature/supabase-migration`  
**Created**: 2026-03-22  
**Status**: Ready for Planning  
**Input**: Migrate ZINC from `localStorage` to a centralized PostgreSQL real-time database to ensure persistence, security, and multi-branch synchronization.

## Execution Flow (main)

```
1. Parse user description from Input
   → Validated: Need to migrate state to a centralized database.
2. Extract key concepts
   → Actors: Pharmacists, Cashiers, Admins.
   → Data: Inventory, Sales, Customers, Shifts.
   → Constraints: Strict data isolation per branch, no data loss.
3. Fill User Scenarios & Testing section
   → Scenarios mapped for Auth, Sales Sync, and Multi-Tenant Isolation.
4. Generate Functional Requirements
   → Testable requirements documented below.
5. Identify Key Entities
   → Mapped strictly to domain boundaries.
6. Run Review Checklist
   → Spec passes sanity checks and removes code-level implementation details.
7. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY (Persistence, Security, Synchronization).
- ❌ Avoid HOW to implement (No SQL schemas or Hooks implementation details in this document).
- 👥 Written for business stakeholders (Pharmacy Owners, Branch Managers).

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

**As a pharmacy owner**, I want my sales, inventory, and employee data to be securely stored in a centralized cloud database, synced in real-time across multiple branches, so that I can manage my network confidently without the risk of data loss from clearing browser caches.

### Acceptance Scenarios

1. **Multi-Branch Data Isolation**  
   **Given** an employee logs in at Branch A,  
   **When** they view the inventory or customers,  
   **Then** they must only see data belonging to Branch A.

2. **Real-time Stock Synchronization**  
   **Given** two cashiers in the same branch are checking out patients,  
   **When** Cashier 1 sells the last box of Panadol,  
   **Then** Cashier 2's screen updates instantly to show Panadol as Out of Stock.

3. **Secure Audit Trails**  
   **Given** a manager needs to trace a suspicious return,  
   **When** they review the shift logs,  
   **Then** they see exact timestamps and the name of the employee who authorized it, preventing falsification.

### Edge Cases

- **Loss of Connectivity:** What happens if the internet cuts out mid-sale? 
  *The system must cache sales locally and enqueue them for background sync when the connection is restored.*
- **Concurrency (Race Conditions):** What happens if two cashiers sell the same batch simultaneously? 
  *The system must use locking mechanisms (versioning) to reject the second transaction and prompt a refresh.*

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST require all employees to authenticate using secure credentials before accessing the dashboard.
- **FR-002**: System MUST isolate all domain entities (Drugs, Sales, Customers, Employees) such that Branch A cannot query, modify, or delete Branch B's data under any circumstance.
- **FR-003**: System MUST synchronise critical operations (Sales, Refunding, Stock Adjustments) across all connected clients in real-time.
- **FR-004**: System MUST allow "soft-deletion" of entities (e.g., archiving an obsolete drug) without violating or corrupting historical sales receipts.
- **FR-005**: System MUST prevent the physical deletion of suppliers, customers, or employees if they are linked to historical transactions.
- **FR-006**: System MUST automatically maintain an immutable `updated_at` timestamp for every record modification.
- **FR-007**: System MUST automatically sync derived calculations (e.g., `drugs.stock`) whenever a stock movement occurs, removing manual calculation errors.

### Key Entities

- **Branch**: The root organizational entity isolating all subsequent data.
- **Employee**: Authorized system users mapped to secure authentication identities.
- **Drug & StockBatch**: Inventory items subject to FEFO (First-Expire-First-Out) fulfillment tracking.
- **Sale & SaleItem**: Financial transactions tracking distinct items sold, prices, and origin batches.
- **StockMovement**: Immutable dual-entry ledger of all inventory additions, deductions, or corrections.
- **AuditLog**: Traceability system logging "who did what and when".

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed
