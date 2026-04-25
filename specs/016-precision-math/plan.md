# Implementation Plan: Precision Financial Math

## Technical Context
We are migrating from floating-point math to a precise integer-based system. The core strategy is "Bottom-Up" pricing, where smaller unit prices are stored directly in the database to avoid division-related rounding errors.

### Proposed Architecture
- **Engine**: Upgraded `money` utility in `utils/money.ts` supporting `allocate` and `scaled multiply`.
- **Data Model**: Added `unit_price` and `unit_cost_price` to `drugs` table.
- **Service-First Logic**: All complex tax, discount, and total calculations must reside in Service classes, not UI components.

## Proposed Changes

### [Component] Database & Types
#### [MODIFY] [types/index.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/types/index.ts)
- Add `unitPrice` and `unitCostPrice` to `Drug` interface.
#### [NEW] [migration_016.sql](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/supabase/migrations/20260425000006_add_unit_pricing.sql)
- Add columns and backfill existing data.

### [Component] Service Layer (Principle IV Compliance)
#### [MODIFY] [purchaseService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/purchases/purchaseService.ts)
- Implement `calculatePurchaseTotals` and `calculateItemCosts` using `money` utility.
#### [MODIFY] [transactionService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/transactions/transactionService.ts)
- Use `money` for all return and balance validations.

### [Component] Utilities
#### [MODIFY] [stockOperations.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/utils/stockOperations.ts)
- Update `resolvePrice` to prioritize `drug.unitPrice`.

### [Component] UI Forms
#### [MODIFY] [Purchases.tsx] & [Inventory Modals]
- Update forms to allow manual entry/override of `unitPrice` and `unitCostPrice`.

## Verification Plan
### Automated Tests
- Run randomized multi-item transaction simulations using a scratch script.
### Manual Verification
- Verify that a 35.00 EGP box with 3 units correctly shows 11.67, 11.67, 11.66 in allocations if needed.
