# Feature Specification: OOP Service Refactor - Phase 2

**Feature Branch**: `013-oop-service-refactor-p2`  
**Created**: 2026-04-25  
**Status**: Draft  
**Input**: User description: "OOP Service Refactor - Phase 2 (Remaining Tasks) covering entity management standardization, reporting/analytics evolution, and staff/permissions security."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Entity Management (Priority: P1)

As a user, I want a consistent and reliable way to manage business entities like customers and suppliers so that I can easily search and filter them regardless of their type.

**Why this priority**: Core business operations depend on efficient management of external partners. Standardizing this behavior reduces confusion and improves system stability.

**Independent Test**: Can be fully tested by performing identical search and filtering (by active/inactive status) operations on both Customer and Supplier lists.

**Acceptance Scenarios**:

1. **Given** a list of customers and suppliers, **When** I search for a specific name, **Then** the results should accurately filter both lists using the same search logic.
2. **Given** a mix of active and inactive entities, **When** I filter by "Active" status, **Then** only current partners should be displayed for both customers and suppliers.

---

### User Story 2 - Actionable Business Analytics (Priority: P2)

As a manager, I want to see aggregated sales and purchase data, such as top products and revenue trends, so that I can make data-driven decisions for my pharmacy.

**Why this priority**: Moving from raw data storage to reporting adds significant business value by identifying growth opportunities and inventory needs.

**Independent Test**: Can be tested by verifying that the dashboard displays the top 5 products by volume and a chart of daily revenue for the last 30 days.

**Acceptance Scenarios**:

1. **Given** a history of sales, **When** I view the analytics dashboard, **Then** I should see a list of top-performing products with accurate sales counts.
2. **Given** sales over multiple days, **When** I request a revenue report, **Then** the system should display a chart showing daily totals for the specified period.

---

### User Story 3 - Automated Inventory Reception (Priority: P2)

As an inventory manager, I want the system to automatically create inventory batches when a purchase order is marked as "received" so that I don't have to manually enter batch details.

**Why this priority**: Reduces manual data entry errors and ensures inventory levels are updated immediately upon stock arrival.

**Independent Test**: Can be tested by changing a purchase order status to "received" and verifying that corresponding batches are created in the inventory.

**Acceptance Scenarios**:

1. **Given** an open purchase order, **When** its status is changed to "received", **Then** the system MUST generate inventory batches for all items in that order.

---

### User Story 4 - Secure Profile and Access Control (Priority: P3)

As a staff member, I want to manage my profile information and be certain that my actions are authorized based on my specific role permissions.

**Why this priority**: Protects sensitive data and ensures that only qualified personnel can perform critical system operations.

**Independent Test**: Can be tested by updating an employee profile (avatar/contact) and then attempting to perform an action for which the user lacks permissions (e.g., deleting a sale).

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they update their contact information, **Then** the changes should persist in their profile.
2. **Given** a user without admin rights, **When** they attempt to access restricted settings, **Then** the system MUST deny access and provide an appropriate warning.

### Edge Cases

- **Partial Search Matches**: Ensuring that search logic handles typos or partial names consistently across entities.
- **Concurrent Permission Changes**: How the system handles a user's permissions being revoked while they are in an active session.
- **Missing Analytics Data**: Handling cases where there is no sales data for the requested period in the dashboard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a unified search interface for all core business entities (Customers, Suppliers).
- **FR-002**: System MUST support status-based filtering (Active/Inactive) for all business entities.
- **FR-003**: System MUST perform server-side aggregations (sums, counts) for sales and purchase reporting.
- **FR-004**: System MUST calculate and display top products based on sales volume over a specified period.
- **FR-005**: System MUST generate daily revenue data for time-series visualization in dashboards.
- **FR-006**: System MUST automatically trigger inventory batch creation when a purchase order status transitions to 'received'.
- **FR-007**: Employees MUST be able to update their own contact information and profile avatars.
- **FR-008**: System MUST verify role-based permissions before executing any sensitive business operation.

### Key Entities *(include if feature involves data)*

- **Customer/Supplier**: External entities with contact info, status, and transaction history.
- **Sale/Purchase**: Transaction records with items, totals, and status.
- **Inventory Batch**: Specific lots of products with quantities and expiry dates.
- **Employee**: System user with profile data and assigned roles.
- **Permission**: A specific action-based authorization token linked to roles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Search and filter operations return consistent results for both customers and suppliers within 500ms.
- **SC-002**: 100% of purchase orders marked as 'received' result in the automatic creation of valid inventory batches.
- **SC-003**: Analytics queries (top products, daily revenue) return accurate results for up to 10,000 transaction records in under 2 seconds.
- **SC-004**: All role-based security checks are processed through a centralized verification service, eliminating hardcoded role checks in UI components.
