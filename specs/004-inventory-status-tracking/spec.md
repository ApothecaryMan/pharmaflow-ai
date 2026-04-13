# Feature Specification: Inventory Status Tracking

**Feature Branch**: `004-inventory-status-tracking`
**Created**: 2026-04-13
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Smart Restock Identification (Priority: P1)
As a pharmacist, I want to distinguish between items that are out of stock but active (Restock) and items that are no longer sold (Discontinued), so that my "Order Alerts" are accurate.

**Acceptance Scenarios**:
1. **Given** a drug with `stock = 0` and `status = 'active'`, **When** viewing the "Order Alerts" card, **Then** it is counted in "Critical Restock".
2. **Given** a drug with `stock = 0` and `status = 'discontinued'`, **When** viewing the "Order Alerts" card, **Then** it is counted in "Discontinued Items".

## Requirements

- **FR-001**: Add `status` field to `Drug` entity with values: `active`, `inactive`, `discontinued`.
- **FR-002**: Implement a third `InteractiveCard` in `Inventory.tsx` called "Order Alerts" (تنبيه الطلبيات).
- **FR-003**: Card Pages:
    - **Page 1**: "Critical Restock" (نواقص - أدوية نشطة رصيدها 0).
    - **Page 2**: "Near Reorder" (أوشكت - رصيد <= minStock ونشطة).
    - **Page 3**: "Discontinued" (متوقفة - رصيد 0 وملغاة).
- **FR-004**: Default value for `status` should be `active` for existing/new items if unspecified.

## Success Criteria

- **SC-001**: "Order Alerts" card correctly filters items based on both Stock and Status.
- **SC-002**: Swiping the card provides actionable insights for purchasing vs warehouse cleanup.
