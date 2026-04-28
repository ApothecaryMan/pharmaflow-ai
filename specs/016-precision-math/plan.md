# Implementation Plan: Precision Financial Math

**Branch**: `016-precision-math` | **Date**: 2026-04-28 | **Spec**: [spec.md](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/specs/016-precision-math/spec.md)

## Summary
Migrate the entire financial calculation engine from floating-point arithmetic to a precise integer-based (Piastres) system. This involves adopting a "Bottom-Up" data model where unit prices are stored directly, and a centralized `money` utility handles all arithmetic, rounding (Round Half Up), and allocation.

## Technical Context
- **Language/Version**: TypeScript ES2022
- **Primary Dependencies**: React 19, Vite, Tailwind CSS
- **Storage**: Supabase (PostgreSQL) - integer columns for currency.
- **Testing**: scratch/test-precision-final.ts (10,000 transaction simulation)
- **Target Platform**: Web (Chrome/Safari)
- **Project Type**: Web Application (PharmaFlow AI)
- **Constraints**: 0% rounding discrepancy across multi-item returns.

## Constitution Check

| Principle | Status | Note |
|-----------|--------|------|
| I. Strict Type Safety | PASS | All price fields use `number` (mapped to integer). No `any`. |
| II. Localization First | PASS | `money.format()` integrates with current i18n system. |
| III. Standard Components | PASS | Updating forms to use `SmartInput` for manual overrides. |
| IV. Service Architecture | PASS | Moving pricing logic to `pricingService.ts` and `salesService.ts`. |
| V. Secure Data Handling | PASS | Using `StorageService` and sequential IDs as mandated. |

## Project Structure

```text
specs/016-precision-math/
├── plan.md              # This file
├── research.md          # Rounding and allocation decisions
├── data-model.md        # Updated Drug entity schema
├── quickstart.md        # How to run precision simulations
└── tasks.md             # Implementation tasks

src/
├── components/
│   ├── pos/             # POS cart and checkout logic
│   └── inventory/       # Manual unit price entry modals
├── services/
│   ├── sales/           # Return and total validations
│   ├── purchases/       # Cost calculations
│   └── pricingService.ts # NEW: Centralized pricing engine
└── utils/
    └── money.ts         # CORE: Integer-based math engine
```

## Proposed Changes

### [Component] Utilities & Engine
#### [MODIFY] [money.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/utils/money.ts)
- Implement `allocate(total, ratios)` for fair distribution.
- Implement `scaledMultiply(amount, factor)` with Round Half Up.

### [Component] Service Layer
#### [NEW] [pricingService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/pricingService.ts)
- Centralize all tax, discount, and unit-price resolution logic.
#### [MODIFY] [salesService.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/services/sales/salesService.ts)
- Update return logic to use `money.allocate` for partial returns.

### [Component] Data Layer
#### [MODIFY] [types/index.ts](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/types/index.ts)
- Add `unitPrice` and `unitCostPrice` to `Drug` interface.
#### [NEW] [migration.sql](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/supabase/migrations/20260425000006_add_unit_pricing.sql)
- DB migration for integer pricing columns.

## Complexity Tracking
*No constitution violations identified.*

## Verification Plan
### Automated Tests
- `npm run test:precision` (via scratch script) to simulate 10,000 transactions.
### Manual Verification
- Verify a 100.00 EGP total split across 3 items shows 33.34, 33.33, 33.33.
