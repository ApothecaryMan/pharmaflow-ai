# Feature Specification: Inventory Summary Dashboard

**Feature Branch**: `003-inventory-summary-cards`
**Created**: 2026-04-13
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Multi-Context Inventory Valuation (Priority: P1)
As a business owner, I want to see how much money I've invested in stock (Cost) and how much I expect to earn (Sale Value) in a single card, so that I can quickly assess my ROI without cluttering the UI.

**Acceptance Scenarios**:
1. **Given** navigation between pages, **When** I view the "Inventory Value" card, **Then** I can swipe to switch between "Total Cost" and "Total Sale Value".
2. **Given** real-time stock changes, **When** I update an item price or quantity, **Then** the values in the summary card update instantly.

### User Story 2 - High-Density Item Metrics (Priority: P1)
As a manager, I want to see the total number of items in my inventory, so that I can track stock variety.

**Acceptance Scenarios**:
1. **Given** the Inventory page is loaded, **When** I view the first summary card, **Then** I see the total count of unique products.

## Requirements

- **FR-001**: Implement two `InteractiveCard` instances at the top of the Inventory page.
- **FR-002**: Card 1 (Item Count) MUST show the total number of unique products derived from the `inventory` array.
- **FR-003**: Card 2 (Inventory Value) MUST show:
    - **Page 1**: Total Inventory Value at Cost (Quantity * Cost Price).
    - **Page 2**: Total Potential Sale Value (Quantity * Sale Price).
- **FR-004**: Cards MUST automatically adapt their theme (e.g., Green for value, Blue for counts).
- **FR-005**: Values MUST update reactively as the `inventory` prop changes (standard React behavior).
- **FR-006**: The dashboard MUST be positioned above the table filters and responsive to screen sizes.

## Success Criteria

- **SC-001**: Summary metrics are calculated correctly based on the filtered `inventory` data.
- **SC-002**: Transitions between Cost and Sale values are smooth (< 300ms).
- **SC-003**: UI remains consistent with the `ShiftHistory` summary card design.
