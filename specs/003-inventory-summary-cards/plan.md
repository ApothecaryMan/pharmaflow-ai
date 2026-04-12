# Implementation Plan: Inventory Summary Dashboard

This plan outlines the integration of interactive summary cards into the Inventory module.

## Proposed Changes

### [Inventory Component]

#### [MODIFY] [Inventory.tsx](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/inventory/Inventory.tsx)
-   Implement metrics calculation using `useMemo`.
-   Calculate:
    -   `totalItems`: Count of `inventory.length`.
    -   `totalCost`: Sum of `stock * costPrice`.
    -   `totalSaleValue`: Sum of `stock * price`.
-   Insert a summary row above the filter section using `InteractiveCard`.

## Verification Plan

### Manual Verification
-   Open Inventory page.
-   Verify total items count matches table length.
-   Swipe the Value card to switch between Cost and Sale.
-   Check that filters update the summary numbers (if filtered data is used).
