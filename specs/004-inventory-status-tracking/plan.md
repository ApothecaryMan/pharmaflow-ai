# Implementation Plan: Inventory Status Tracking

Integrating smart status-based inventory alerts.

## Proposed Changes

### [Database & Types]

#### [MODIFY] [index.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/types/index.ts)
-   Add `status: 'active' | 'inactive' | 'discontinued'` to `Drug` interface.

### [Inventory Component]

#### [MODIFY] [Inventory.tsx](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/inventory/Inventory.tsx)
-   Update `summaryStats` calculation:
    -   `criticalRestock`: `stock === 0 && status === 'active'`
    -   `nearReorder`: `stock > 0 && stock <= minStock && status === 'active'`
    -   `discontinuedCount`: `stock === 0 && status === 'discontinued'`
-   Add the "Order Alerts" `InteractiveCard`.

## Verification Plan

### Automated Verification
-   Simulate drugs with different status/stock combinations and verify card counts.

### Manual Verification
-   Swipe through the 3 pages of the new card.
-   Verify counts match the expected state of the inventory array.
