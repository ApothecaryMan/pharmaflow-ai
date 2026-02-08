# Refactoring Plan: Procurement & Supplier Management

## 1. Current State (Gaps)

- Purchase Orders (`PO`) currently store a snapshot of the supplier's name and contact information.
- If a supplier updates their contact details (phone, email, representative name) in the `SupplierManagement` view, older purchase orders still display the outdated "snapshot" data.

## 2. Strategic Shift

- **ID as Authority:** The `PO` object should only store the `supplierId` (e.g., `SUP-0012`).
- **Dynamic Join:** All UI components displaying purchase history must "join" the purchase data with the current supplier metadata using the `supplierId`.

## 3. Implementation Steps

1. **Model Update:** Refactor the `Purchase` interface in `types/index.ts`. Add `supplierId` as a required field and mark `supplierName` as deprecated/optional.
2. **Component Refactor:**
   - Update the `PurchaseForm` to emit only the `supplierId` to the `onCompletePurchase` handler.
   - Update `Purchases.tsx` table to use a lookup function: `suppliers.find(s => s.id === p.supplierId)`.
3. **Audit Resilience:** Ensure that `idGenerator.generate('purchases')` is called exactly once per invoice to prevent duplicate IDs during network retries or component re-mounts.

## 4. Expected Outcome

- Global updates to supplier profile info reflect instantly across all historical records.
- Reduced storage footprint per `PO` by removing redundant strings.
- More robust "Total Spent per Supplier" analytics, now calculated accurately via IDs rather than fuzzy name matching.
