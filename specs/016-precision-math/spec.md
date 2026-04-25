# Feature Specification: Precision Financial Math

## Description
Implement a robust, high-precision financial calculation system across the entire pharmacy management platform. The goal is to eliminate floating-point arithmetic errors and ensure absolute precision by adopting a "Bottom-Up" pricing approach where unit prices are stored as independent, manually-entered values.

## User Scenarios
- **Scenario 1: Accurate Sales Returns**
  As a pharmacist, when I process a return for a single item, the system must use the stored unit price (accounting for historical discounts) to calculate the exact refund without cents drifting.
- **Scenario 2: Correct POS Totals**
  As a cashier, adding items in either "Pack" or "Unit" mode uses pre-defined, precise prices, ensuring the cart total is always 100% accurate.
- **Scenario 3: Manual Unit Pricing**
  As a pharmacist, when adding a new drug, I want to manually enter the price of a single strip/unit to ensure it matches the regulated or manufacturer price, rather than relying on automated division.

## Functional Requirements
- **FR1: Unified Money Engine**
  The system must use the centralized `money` utility for all arithmetic.
- **FR2: Bottom-Up Data Model**
  The `Drug` entity must store `unitPrice` and `unitCostPrice` as independent fields.
- **FR3: Integer-Based Arithmetic**
  Internally, all calculations use integers (piastres) via the `money` utility.
- **FR4: Rounding Strategy (Round Half Up)**
  The `money` engine must strictly implement "Round Half Up" for all multiplication/division operations.
- **FR5: Precise Comparisons**
  Use integer-based comparisons for all financial validations (e.g., `amount >= balance`).

## Success Criteria
- **SC1: 0% Discrepancy**
  Zero calculation errors across 10,000+ simulated complex transactions.
- **SC2: No Balance Overflows**
  Elimination of "Refund amount exceeds remaining balance" errors.
- **SC3: Database Integrity**
  All existing drugs backfilled with precise unit prices.

## Assumptions
- Smallest currency unit is 1/100th (100 Piastres = 1 EGP).
- Manual unit prices take precedence over calculated values.
