# Master Architectural Overhaul: Atomic Services & SSOT

## 1. Vision & Objectives
This plan outlines the transition of PharmaFlow AI from a hook-heavy orchestration pattern to a **Service-Oriented Atomic Architecture**.

### Core Goals:
- **Single Source of Truth (SSOT)**: Ensure every piece of data has one owner and one path of mutation.
- **Transactional Integrity**: Ensure multi-domain operations (e.g., Purchase + Inventory + Finance) are atomic (all-or-nothing).
- **Reduced Complexity**: Decouple UI state management (Hooks) from business logic (Services).
- **Audit Accuracy**: Standardize how performers and contexts are captured across the system.

---

## 2. The New Architecture Model

### A. The ActionContext (The Fingerprint)
Every business operation will now require an `ActionContext`. This object travels from the UI through the services to the persistence layer.
```typescript
interface ActionContext {
  performerId: string;     // Employee ID
  performerName: string;   // Employee Name (for display/audit)
  branchId: string;        // Active Branch ID
  shiftId?: string;        // Active Shift ID (required for financial actions)
  orgId: string;           // Organization ID
}
```

### B. The Transaction Coordinator (The Brain)
We will expand the `transactionService.ts` to act as the primary coordinator for multi-domain actions. 
Instead of the Hook calling 5 services, the Hook calls **one** transaction method.

### C. Thin Hooks (The Event Dispatchers)
`useEntityHandlers.ts` will be stripped of orchestration logic. Its only jobs will be:
1. Building the `ActionContext` from the current app state.
2. Dispatching the action to the Service/DataContext.
3. Handling UI feedback (Loading states, Alerts).

---

## 3. Implementation Roadmap

### Phase 0: Type Consolidation
- Create `types/actions.ts` to house the unified `ActionContext`.
- Audit all services to ensure they use the same ID types (UUID vs Name).

### Phase 1: Purchase Domain Refactor
- Move `approvePurchase` logic from `useEntityHandlers` to `transactionService`.
- Implement `UndoManager` rollbacks for inventory updates if financial logging fails.

### Phase 2: Stock Adjustment Domain Refactor
- Centralize all stock movements (Adjustments, Deletions) into a single atomic service method.
- Remove manual `logMovement` calls from UI components.

### Phase 3: Finance Integration
- Ensure all cash-based actions (Purchases, Returns) automatically check for an open shift and record a transaction within the same atomic block.

---

## 4. Success Criteria
1. `useEntityHandlers.ts` reduced in size by >50%.
2. Zero "Orphan" records (e.g., a stock movement without a corresponding audit or transaction).
3. Consistent Audit logs showing the same performer format everywhere.
4. Pass all integration tests for multi-step workflows.
