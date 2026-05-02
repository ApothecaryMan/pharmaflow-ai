# Implementation Plan: Batch & Grouping Refactor

**Branch**: `018-batch-grouping-refactor` | **Date**: 2026-05-02 | **Spec**: [spec.md](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/specs/018-batch-grouping-refactor/spec.md)
**Input**: Feature specification from `/specs/018-batch-grouping-refactor/spec.md`

## Summary

The project aims to centralize the inventory grouping and quantity distribution logic. Currently, this logic is scattered across `Inventory.tsx` and `usePOSCart.ts`. We will introduce a `GroupedDrug` type and move the core logic to `batchService.ts` and `stockOperations.ts`. This ensures that batch allocation (FEFO) and product grouping are consistent across the entire application and easier to maintain.

## Technical Context

**Language/Version**: TypeScript / React 19+ / Vite  
**Primary Dependencies**: Supabase, TanStack Table v8, Lucide React  
**Storage**: Supabase (PostgreSQL) - `stock_batches` and `drugs` tables.  
**Testing**: Vitest / React Testing Library  
**Target Platform**: Web (Responsive)  
**Project Type**: Single project (Monolith structure)  
**Performance Goals**: Instant cart updates (<100ms), fast inventory grouping for 1000+ items.  
**Constraints**: Must respect branch-level data isolation via `branch_id`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Standard React/TypeScript patterns used.
- [x] Uses existing `money` utility for precision math.
- [x] Follows "Logical CSS Properties" for RTL/LTR stability.

## Project Structure

### Documentation (this feature)

```text
specs/018-batch-grouping-refactor/
├── plan.md              # This file
├── research.md          # Batch allocation & grouping patterns
├── data-model.md        # GroupedDrug and BatchAllocation definitions
├── quickstart.md        # How to use the new grouping services
├── contracts/           # Service interface definitions
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
src/
├── types/
│   └── index.ts         # New GroupedDrug type
├── services/
│   ├── inventory/
│   │   ├── batchService.ts     # Central grouping & allocation logic
│   │   └── stockOperations.ts   # Unified stock validation
├── components/
│   ├── inventory/
│   │   └── Inventory.tsx       # Refactored to use batchService
│   ├── sales/
│   │   └── pos/
│   │       ├── hooks/
│   │       │   └── usePOSCart.ts  # Refactored to use batchService
│   │       └── POS.tsx           # UI updates
```

**Structure Decision**: Standard repository structure. We are refactoring existing services and components.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No violations detected | N/A |
