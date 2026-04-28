# Research: Precision Financial Math

## Decisions & Rationale

### 1. Rounding Strategy: Round Half Up
- **Decision**: Strictly implement "Round Half Up" (Arithmetic Rounding).
- **Rationale**: Mandated by `FR4`. This is the standard in retail and pharmacy regulations in the target region (Egypt/Middle East), where .005 is rounded up to .01.
- **Alternatives**: Banker's Rounding (Round Half to Even) was considered but rejected as it can lead to confusion in customer-facing retail transactions.

### 2. Money Utility: Integer-Based Internal State
- **Decision**: Use a `BigInt` or `number` (if < 2^53) to store values in the smallest unit (Piastres).
- **Rationale**: Prevents IEEE 754 floating-point errors. 100 Piastres = 1 EGP.
- **Library**: Custom `money` utility in `utils/money.ts` as per `FR1`.

### 3. Allocation Algorithm: Huntington-Hill / Largest Remainder
- **Decision**: Implement a simple Largest Remainder Method for the `allocate` function.
- **Rationale**: When splitting a total (e.g., 35.00) into 3 units (11.67, 11.67, 11.66), we must ensure the sum remains exactly equal to the total. This resolves `SC2`.

## Unknowns & Clarifications (Resolved)

### AM1: Legacy Cleanup Scope
- **Finding**: A grep search for `toFixed(2)` and `Math.round` reveals 14 instances across `salesService`, `purchaseService`, `useRealTimeSalesAnalytics`, and `ReturnModal`.
- **Action**: All these instances must be replaced by `money.format()` or internal integer arithmetic.

### US1: Specific Validation Cases
- **Requirement**: "Precise Comparisons" (`FR5`).
- **Validation List**: 
  - `item_total <= subtotal`
  - `refund_amount <= paid_amount`
  - `discount_total <= subtotal`
  - `tax_amount` must be calculated *per item* and then summed to avoid precision drift at the total level.
