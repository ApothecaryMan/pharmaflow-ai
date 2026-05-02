# Feature Specification: Batch & Grouping Refactor

**Feature Branch**: `018-batch-grouping-refactor`  
**Created**: 2026-05-02  
**Status**: Draft  
**Input**: User description: "Refactor batch grouping and quantity distribution logic into batchService.ts and stockOperations.ts to centralize product-level and batch-level stock management. This includes creating a GroupedDrug type, implementing auto-distribution of quantities across batches (FEFO), and refactoring POS and Inventory components to use these centralized utilities while respecting Branch-specific data."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Inventory View (Priority: P1)

Pharmacists can view their inventory grouped by product identity (Name, Dosage Form, Barcode) while still being able to see and select specific batches within that group. This provides a clean overview without losing the ability to track specific stock instances.

**Why this priority**: Essential for a clean inventory management experience and accurate stock counting across multiple branches.

**Independent Test**: Can be tested by viewing the Inventory table and verifying that multiple batches of the same drug are consolidated into a single row with an aggregate stock count.

**Acceptance Scenarios**:

1. **Given** two batches of "Panadol 500mg" (Exp: 2026-01 and 2026-06), **When** viewing the Inventory list, **Then** only one row for "Panadol 500mg" is visible.
2. **Given** the grouped row, **When** checking the stock column, **Then** it shows the sum of all batches in that group.

---

### User Story 2 - Intelligent Cart Allocation (Priority: P2)

When a pharmacist adds a product to the sales cart, the system automatically allocates the requested quantity from available batches using the FEFO (First Expiry First Out) principle. If one batch is insufficient, the system automatically splits the item across the next available batch.

**Why this priority**: Automates a tedious manual process and ensures the pharmacy always sells older stock first, reducing waste.

**Independent Test**: Can be tested by adding a quantity larger than the first batch's stock to the cart and verifying that two cart items (for different batches) are created automatically.

**Acceptance Scenarios**:

1. **Given** Batch A (10 units) and Batch B (10 units), **When** adding 15 units of the product to the cart, **Then** the cart contains two entries: Batch A (10 units) and Batch B (5 units).

---

### User Story 3 - Manual Batch Override (Priority: P2)

While the system defaults to FEFO, pharmacists can manually switch a cart item to a specific batch. If the manually selected batch has insufficient stock for the total requested quantity, the system automatically distributes the remainder to other available batches.

**Why this priority**: Provides flexibility for edge cases (e.g., a customer specifically wants a longer expiry date) while maintaining stock accuracy.

**Independent Test**: Can be tested by choosing a specific batch in the cart dropdown and verifying the quantities are redistributed correctly.

**Acceptance Scenarios**:

1. **Given** a cart item for Batch A, **When** the user selects Batch B from the dropdown, **Then** the cart item is updated to Batch B, and any spillover quantity is moved to Batch A or other batches.

---

### Edge Cases

- **Mixed Quantities**: What happens when a user adds 1.5 packs (1 pack + 5 units)? The system must correctly distribute the units across batches even if they cross batch boundaries.
- **Stock Depletion during Session**: How does the system handle a scenario where a batch's stock is reduced by another terminal while the current user is still editing their cart? The allocation logic must re-validate before final checkout.
- **Double Deduction**: Two terminals sell the last 5 units simultaneously. Without pre-checkout validation, both succeed and stock goes negative. The system must fail the second transaction gracefully.
- **Grouping Key Collision**: Two different products from different manufacturers share the same name and dosage form but have different barcodes. The system must NOT merge them into a single group.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST group inventory items by a canonical product identity key: `barcode || (name + dosageForm + manufacturer)`.
- **FR-002**: System MUST calculate aggregate stock for grouped products in real-time.
- **FR-003**: System MUST automatically distribute requested quantities across batches using FEFO logic.
- **FR-004**: System MUST support manual batch selection in the sales interface.
- **FR-005**: System MUST isolate grouping and distribution logic from the UI components.
- **FR-006**: System MUST respect branch-level data isolation (users only see groups/batches for their active branch).
- **FR-007**: System MUST use one unified grouping key across ALL modules (Inventory, POS, Reports) to prevent identity mismatches.
- **FR-008**: System MUST re-validate stock availability for all cart items immediately before checkout submission to prevent double-deduction across concurrent terminals.
- **FR-009**: System MUST NOT contain accounting logic (max discount calculation, profit margin computation, stock clamping) inside UI components — these MUST reside in service or utility layers.

### Key Entities *(include if feature involves data)*

- **GroupedDrug**: A virtual entity representing a collection of `Drug` batches sharing the same identity.
- **BatchAllocation**: A record of how a requested quantity is distributed across specific `StockBatch` entities.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Inventory grouping logic is centralized and reused across at least 3 components (Inventory, POS, Reports).
- **SC-002**: Automated batch splitting reduces manual cart adjustments by 80% during peak hours.
- **SC-003**: Cart quantity updates (increment/decrement) correctly maintain FEFO distribution without manual user intervention.
