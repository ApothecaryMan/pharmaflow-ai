# Phase 3: Audit Trail & Service Integration

## Status: NOT STARTED
## Depends On: Phase 2 (COMPLETED)

---

## Objective

Every financial and inventory operation in PharmaFlow must produce a complete audit trail.
Currently `auditService.log()` is called in some places but not systematically. This phase
wires it into **every** write path so that:

1. Every sale, return, purchase, and stock adjustment is logged with who/when/what/why.
2. The `TransactionService` orchestrates audit logging as a first-class step (not an afterthought).
3. Alert / notification hooks fire on anomalous operations (negative stock, high-value voids, etc.).
4. Audit logs are queryable by branch, by employee, and by entity for compliance reporting.

---

## Scope

### Files Primarily Affected

| Layer | File | Change |
|-------|------|--------|
| Service | `services/transactions/transactionService.ts` | Enrich existing `auditService.log` calls; add missing ones |
| Service | `services/auditService.ts` | Add `logBatch()`, severity levels, structured detail types |
| Service | `services/inventory/stockMovement/stockMovementService.ts` | Ensure every movement emits an audit entry |
| Service | `services/cash/cashService.ts` | Audit cash-in / cash-out / shift open / close |
| Hook | `hooks/useEntityHandlers.ts` | Remove any remaining inline audit calls; delegate to services |
| Hook | `hooks/useShift.tsx` | Wire shift lifecycle to audit service |
| Types | `types/index.ts` | Add `AuditAction` union type, `AuditSeverity` |
| Config | `config/auditActions.ts` (NEW) | Centralized action-name constants |

### Files NOT Touched

- UI components — no visual changes in this phase.
- `DataContext.tsx` — already delegates to `transactionService`.
- Test files — covered separately in Phase 4.

---

## Architecture Decisions

### 1. Structured Action Names

All audit actions will follow the pattern `entity.verb`:

```
sale.create | sale.void | sale.return
purchase.create | purchase.complete | purchase.return
inventory.adjust | inventory.transfer
shift.open | shift.close | shift.cash_in | shift.cash_out
auth.login | auth.logout | auth.failed
employee.create | employee.update | employee.delete
```

These will be defined in `config/auditActions.ts` as a const enum for type safety.

### 2. Severity Levels

```typescript
type AuditSeverity = 'info' | 'warning' | 'critical';
```

- `info` — Normal operations (sale completed, shift opened).
- `warning` — Unusual but valid (large discount > 30%, manual stock adjustment).
- `critical` — Requires investigation (stock went negative, void after 24h, failed rollback).

### 3. Batch Logging

`auditService.logBatch(entries[])` will insert multiple entries in a single Supabase call,
reducing network overhead for operations that touch multiple entities (e.g., a checkout with
10 line items each generating a stock movement).

### 4. Async-Safe, Non-Blocking

Audit logging must **never** block or fail the primary operation. If Supabase insert fails,
the entry is queued in `syncQueueService` for retry. Local storage always receives the entry
immediately.

---

## Detailed Changes

### 3.1 — Extend `AuditEntry` Type

Add `severity` and `metadata` fields to `AuditEntry` in `auditService.ts`:

```typescript
export interface AuditEntry {
  // ... existing fields ...
  severity?: AuditSeverity;          // NEW
  metadata?: Record<string, any>;    // NEW — structured payload (amounts, counts, etc.)
}
```

### 3.2 — Create `config/auditActions.ts`

Centralize all action strings to prevent typos and enable autocomplete:

```typescript
export const AuditActions = {
  SALE_CREATE:     'sale.create',
  SALE_VOID:       'sale.void',
  SALE_RETURN:     'sale.return',
  PURCHASE_CREATE: 'purchase.create',
  // ...etc
} as const;
```

### 3.3 — Enrich TransactionService Audit Points

**`processCheckout`** — currently logs `sale.complete`. Add:
- `inventory.deduct` per item (batch-level) with qty, batchId, remaining stock.
- `shift.transaction` for the cash/card recording.
- Severity `warning` if any item's remaining stock < reorder point.

**`processReturn`** — currently logs `sale.return`. Add:
- `inventory.restore` per returned item.
- `shift.transaction` for the refund.
- Severity `warning` if return happens > 72h after sale.

**`processPurchaseTransaction`** — currently logs `purchase.complete`. Add:
- `inventory.receive` per item.
- Severity `warning` if received qty differs from ordered qty.

**`processPurchaseReturnTransaction`** — currently logs `purchase.return`. Add:
- `inventory.deduct` for returned goods.

### 3.4 — Wire Shift Lifecycle

In `useShift.tsx`, the `startShift` and `endShift` functions should call:

```typescript
auditService.log(AuditActions.SHIFT_OPEN, {
  userId: currentEmployeeId,
  details: { openingBalance: amount },
  branchId: activeBranchId,
  severity: 'info',
});
```

### 3.5 — Wire Cash Operations

In `cashService.ts`, `addTransaction` should emit:

```typescript
auditService.log(
  type === 'in' ? AuditActions.SHIFT_CASH_IN : AuditActions.SHIFT_CASH_OUT,
  { userId, details: { amount, reason }, severity: amount > 5000 ? 'warning' : 'info' }
);
```

### 3.6 — Add `logBatch` to `auditService`

```typescript
logBatch: async (entries: Omit<AuditEntry, 'id' | 'timestamp'>[]) => {
  const timestamped = entries.map(e => ({
    ...e,
    id: idGenerator.uuid(),
    timestamp: new Date().toISOString(),
  }));
  // Single Supabase insert
  supabase.from('audit_logs').insert(timestamped.map(mapAuditToDb));
  // Append all to local storage
  const existing = storage.get<AuditEntry[]>(STORAGE_KEY_AUDIT, []);
  storage.set(STORAGE_KEY_AUDIT, [...timestamped, ...existing].slice(0, 2000));
};
```

---

## Success Criteria

1. `tsc --noEmit` passes with 0 new errors.
2. Every `transactionService` method produces ≥ 1 audit entry per operation.
3. High-value or anomalous operations produce `severity: 'warning'` or `'critical'`.
4. `auditService.getLogs(branchId)` returns entries with all new fields populated.
5. No audit failure blocks or rolls back a primary transaction.
