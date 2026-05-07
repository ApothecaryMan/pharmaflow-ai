# Implementation Plan: Fix POS Quantity Logic & Stock Linking

**Branch**: `014-fix-pos-quantity-logic` | **Date**: 2026-05-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/018-batch-grouping-refactor/spec.md`

## Summary
Revert the POS quantity update logic from a "Global Redistribution" model (which caused batch-selection loss and calculation errors) to a "Stable Item Update" model. Implement cross-batch stock pool validation to prevent over-selling while maintaining manual batch integrity.

## Technical Context

**Language/Version**: TypeScript 5+ (ES2022)
**Primary Dependencies**: React 19, Lucide React, TanStack Table v8
**Storage**: Supabase (PostgreSQL), StorageService
**Testing**: Vitest (npm test)
**Target Platform**: Web (Bilingual EN/AR)
**Project Type**: Single Project Web App
**Performance Goals**: Instantaneous input response (no lag during typing)
**Constraints**: <100ms UI update for cart interactions
**Scale/Scope**: Handles carts with 50+ items and inventory with 1000+ batches

## Constitution Check

### Principles Compliance

- **I. Strict Type Safety**: No `any` will be used in the new logic. CartItem and Drug types will be strictly followed.
- **II. Localization First**: All error messages (e.g., stock limit reached) will use `t` translations.
- **III. Standard Components**: We will investigate if `SmartInput` can be used without sacrificing performance in the POS cart. If not, a justification for raw `<input>` (with proper RTL logic) will be added to Complexity Tracking.
- **IV. Service-Based Architecture**: Business logic for stock calculation will remain in `stockOperations.ts` and `usePOSCart.ts` (Service layer).
- **V. IDs**: Existing `id` and `batchId` patterns will be preserved.

### Gates

- [ ] **Type Check**: Run `npm run type-check` after refactor.
- [ ] **Test Check**: Ensure `npm test` passes.
- [ ] **Visual Check**: Verify RTL alignment in Arabic mode.

## Project Structure

### Documentation (this feature)

```text
specs/018-batch-grouping-refactor/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── sales/
│       └── pos/
│           ├── CartItemControls.tsx  # [MODIFY] UI Logic & Inputs
│           └── hooks/
│               └── usePOSCart.ts     # [MODIFY] Core Update Logic
└── utils/
    └── stockOperations.ts            # [MODIFY] Global Validation Helper
```

**Structure Decision**: Standard React component and hook structure as established in the project.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Raw `<input>` tags | Custom POS styling and high-performance stepper needs | `SmartInput` might add overhead or default styles that conflict with the compact POS layout |
