# plan.md — Zinc Backup Service Refactor
> SpecKit Format · Execution Plan
> Reads from: spec.md
> Output: tasks.md (generated from this plan)

---

## Phase Overview

```
Phase 0: Foundation & Types         [~1h]
Phase 1: Core Services              [~3h]
Phase 2: Orchestrator Refactor      [~2h]
Phase 3: UI Integration             [~1h]
Phase 4: Tests                      [~2h]
Phase 5: Cleanup & Hardening        [~1h]
                              Total: ~10h
```

---

## Phase 0 — Foundation & Types

**Objective:** Establish shared contracts before any implementation.
No service file is touched until types compile cleanly.

### P0-T1: Create `backup.types.ts`
Path: `services/backup/types/backup.types.ts`

Define and export:
- `BackupBundle`
- `BackupMeta` (with `formatVersion: 1` literal type)
- `ValidationResult`
- `MigrationFn`
- `BackupErrorCode` (union type)
- `BackupError extends Error` — carries `code: BackupErrorCode`
- `RollbackSnapshot = Record<string, unknown[]>`

**Constraint:** No `any`. Use `unknown[]` for IDB records.

### P0-T2: Define constants
Path: `services/backup/constants.ts`

```typescript
export const CURRENT_SCHEMA_VERSION = 4; // bump on each DB schema change
export const MAX_BACKUP_FILE_SIZE = 150 * 1024 * 1024; // 150MB
export const BACKUP_LS_PREFIXES = [
  "pharma",
  "pos",
  "receipt",
  "pharmaflow",
  "branch_pilot_session",
  "pharma_active_branch_id",
] as const;
export const BACKUP_FILE_EXTENSION = ".pharma";
```

---

## Phase 1 — Core Services

Each service is a pure module — no side effects, no React imports.

### P1-T1: `checksumService.ts`
Path: `services/backup/checksumService.ts`

```
export async function generateChecksum(
  idbData: Record<string, unknown[]>,
  lsData: Record<string, string>
): Promise<string>
```

Implementation:
1. `JSON.stringify({ indexedDB: idbData, localStorage: lsData })`
2. `TextEncoder().encode(str)`
3. `crypto.subtle.digest("SHA-256", buffer)`
4. Convert `Uint8Array` to hex string

**Why this signature:** checksum covers BOTH data sources to prevent partial tampering.

---

### P1-T2: `migrationRegistry.ts`
Path: `services/backup/migrationRegistry.ts`

```
const MIGRATIONS: Record<string, MigrationFn> = { ... }

export function migrateBackup(
  data: Record<string, unknown[]>,
  fromVersion: number,
  toVersion: number
): Record<string, unknown[]>
```

Rules:
- Loop `current` from `fromVersion` to `toVersion - 1`
- Apply `MIGRATIONS["N→N+1"]` if exists, else pass-through (no-op for gaps)
- NEVER mutate input — always spread: `{ ...data }`
- Log each applied migration step to `console.info` (for support debugging)

Initial migrations per spec section 9.

---

### P1-T3: `validationService.ts`
Path: `services/backup/validationService.ts`

```
export function dryRunValidation(
  bundle: BackupBundle,
  db: IDBDatabase
): ValidationResult
```

Logic:
- `backupStores = new Set(Object.keys(bundle.indexedDB))`
- `currentStores = new Set(Array.from(db.objectStoreNames))`
- `errors` ← stores in `currentStores` not in `backupStores` (restore would wipe them)
- `warnings` ← stores in `backupStores` not in `currentStores` (will be ignored)
- `isCompatible = errors.length === 0`

**Important:** Do NOT call `clear()` or write anything here. Read-only analysis.

---

### P1-T4: `rollbackService.ts`
Path: `services/backup/rollbackService.ts`

```
export async function captureSnapshot(db: IDBDatabase): Promise<RollbackSnapshot>

export async function atomicRestore(
  db: IDBDatabase,
  data: Record<string, unknown[]>
): Promise<void>
```

**`captureSnapshot` implementation:**
```
snapshot = {}
for each storeName in db.objectStoreNames:
  tx = db.transaction(storeName, "readonly")
  store = tx.objectStore(storeName)
  snapshot[storeName] = await idbGetAll(store)  // promisified IDBRequest
return snapshot
```

**`atomicRestore` implementation:**
```
storeNames = Object.keys(data)
tx = db.transaction(storeNames, "readwrite")

return new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve()
  tx.onerror = () => reject(new BackupError("TRANSACTION_FAILED", tx.error?.message))
  tx.onabort = () => reject(new BackupError("TRANSACTION_FAILED", "Transaction aborted"))

  for each storeName of storeNames:
    store = tx.objectStore(storeName)
    store.clear()                           // no await
    for each record of data[storeName]:
      store.put(record)                     // no await — IDB internal queue
  // tx auto-commits when call stack empties
})
```

**Critical:** Never `await` inside the for-loops. The IDB transaction auto-commits when the microtask queue is empty if no pending requests exist. `await` would yield the stack and kill the transaction.

---

### P1-T5: `backup.worker.ts`
Path: `services/backup/backup.worker.ts`

```typescript
self.onmessage = async ({ data: { file } }: MessageEvent<{ file: File }>) => {
  try {
    const text = await (file as File).text();
    const parsed = JSON.parse(text) as BackupBundle;
    self.postMessage({ success: true, data: parsed });
  } catch (err) {
    self.postMessage({ success: false, error: (err as Error).message });
  }
};
```

Called from orchestrator via:
```typescript
function parseInWorker(file: File): Promise<BackupBundle>
```
Which creates the worker, posts the file, resolves/rejects on `onmessage`.

---

## Phase 2 — Orchestrator Refactor

### P2-T1: Refactor `backupService.ts`

**Delete** existing export/import logic.
**Rewrite** with two public functions:

#### `exportBackup(db: IDBDatabase, orgName: string): Promise<void>`

Pipeline:
1. Read all IDB stores → `idbData`
2. Read LocalStorage by prefixes → `lsData`
3. Generate checksum → `meta.checksum`
4. Assemble `BackupBundle`
5. `JSON.stringify(bundle)` → `Blob`
6. Trigger download with filename: `zinc-backup-{orgName}-{date}.pharma`

#### `importBackup(file: File, db: IDBDatabase): Promise<void>`

Full pipeline matching spec section 7:

```
STEP 1: Size guard           → SPEC-IMP-01
STEP 2: Worker parse         → SPEC-IMP-02
STEP 3: Checksum verify      → SPEC-IMP-03
STEP 4: Version gate         → SPEC-IMP-04
STEP 5: Auto migrate         → SPEC-IMP-05
STEP 6: Dry run              → SPEC-IMP-06
STEP 7: Return ValidationResult + BackupMeta to caller
        (caller shows modal — SPEC-IMP-07)
STEP 8: [After user confirms] captureSnapshot → SPEC-IMP-08
STEP 9: atomicRestore        → SPEC-IMP-09
STEP 10: on failure → atomicRestore(snapshot) → SPEC-IMP-10
STEP 11: restore LocalStorage → SPEC-IMP-11
STEP 12: window.location.reload()
```

**Split at Step 7:** `importBackup` returns preview data. The modal is shown by the caller (React component). After confirmation, caller calls `confirmRestore(bundle, db, snapshot)`.

This keeps the service pure (no React/UI dependencies).

---

## Phase 3 — UI Integration

### P3-T1: `SnapshotPreviewModal` component
Path: `components/backup/SnapshotPreviewModal.tsx`

Props:
```typescript
interface SnapshotPreviewModalProps {
  meta: BackupMeta;
  validation: ValidationResult;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}
```

Displays:
- Version: `v{meta.schemaVersion}` (+ migration notice if different from current)
- Date: formatted Arabic locale date from `meta.timestamp`
- Org: `meta.orgName`
- Records: `meta.recordCount` records across `meta.storeCount` stores
- Warnings: yellow list (if any)
- Errors: red list → confirm button disabled

Buttons: "تأكيد الاستعادة" (destructive, red) | "إلغاء"

### P3-T2: Update Navbar backup trigger
- On file select → call `importBackup(file, db)`
- Show loading state during pipeline
- On step 7 return → show `SnapshotPreviewModal`
- On confirm → call `confirmRestore()`
- On any `BackupError` → show Arabic toast per error code

**Error message map:**
```typescript
const ERROR_MESSAGES: Record<BackupErrorCode, string> = {
  FILE_TOO_LARGE:       "حجم الملف أكبر من 150MB",
  PARSE_FAILED:         "الملف تالف أو غير صالح",
  CHECKSUM_MISMATCH:    "الملف معدّل أو تالف — لا يمكن الاستعادة",
  VERSION_TOO_NEW:      "هذا الملف من إصدار أحدث. يرجى تحديث التطبيق أولاً",
  DRY_RUN_FAILED:       "هيكل قاعدة البيانات غير متوافق",
  TRANSACTION_FAILED:   "فشلت العملية — تم التراجع تلقائياً",
  ROLLBACK_FAILED:      "خطأ حرج — يرجى التواصل مع الدعم الفني فوراً",
};
```

---

## Phase 4 — Tests

Path: `services/backup/__tests__/`

### P4-T1: `checksumService.test.ts`
- Same input → same hash
- Different input → different hash

### P4-T2: `migrationRegistry.test.ts`
- v2 → v4: drugs have `branchId`
- v3 → v4: `stock_ledger` exists, `inventory` deleted
- v4 → v4 (same version): data unchanged
- v2 → v2 (no migration needed): data unchanged

### P4-T3: `validationService.test.ts`
- Missing store in backup → `errors` contains store name
- Extra store in backup → `warnings` contains store name
- Perfect match → `isCompatible: true`, empty arrays

### P4-T4: `rollbackService.test.ts`
Using fake IDB (via `fake-indexeddb` npm package):
- `captureSnapshot` returns all records
- `atomicRestore` writes all records correctly
- `atomicRestore` on failed tx → rejects with `BackupError`

### P4-T5: `backupService.integration.test.ts`
Full round-trip:
1. Populate fake IDB + LocalStorage
2. `exportBackup()` → capture blob
3. Clear IDB + LocalStorage
4. `importBackup(blob)` → confirm
5. Assert IDB and LocalStorage identical to step 1

---

## Phase 5 — Cleanup & Hardening

### P5-T1: TypeScript strict check
Run `tsc --noEmit` — zero errors allowed.

### P5-T2: Remove dead code
Delete old export/import functions from original `backupService.ts`.

### P5-T3: JSDoc on public API
Document `exportBackup` and `importBackup` with:
- `@param`
- `@throws BackupError` with each possible code
- `@returns`

### P5-T4: Add `SCHEMA_VERSION_HISTORY.md`
Path: `services/backup/SCHEMA_VERSION_HISTORY.md`

Template:
```markdown
# Schema Version History

| Version | Date | Change Summary | Migration Key |
|---|---|---|---|
| 1 | 2024-01-01 | Initial schema | — |
| 2 | 2024-03-15 | Added employee shifts | 1→2 |
| 3 | 2024-07-01 | Added branchId to drugs | 2→3 |
| 4 | 2025-01-10 | Renamed inventory→stock_ledger | 3→4 |
```

This file is the source of truth for future developers adding migrations.

---

## Execution Rules for Claude (AI Implementation Guide)

When implementing from this plan:

1. **Read `spec.md` before writing any code.** If a behavior isn't in spec, don't invent it.

2. **Types first.** `backup.types.ts` must compile before any service is touched.

3. **One task at a time.** Complete and verify each task before moving to the next.

4. **Never `await` inside an IDB readwrite transaction loop.** This is the most common mistake. See P1-T4.

5. **Keep services pure.** No React, no `document`, no `window` inside service files (except `window.location.reload()` in the final step of orchestrator — and even that should be injectable for testing).

6. **Migrations are append-only.** Never modify or delete an existing migration entry. Add new ones only.

7. **`ROLLBACK_FAILED` is P0.** If both restore and rollback fail, show a permanent, non-dismissible error state. This is a catastrophic data situation.

8. **Test with `fake-indexeddb`.** Do not write tests that touch a real browser IDB.

9. **The modal is the last line of defense.** All validation must complete BEFORE the modal is shown. The modal's confirm button must never trigger further validation.

10. **Follow the phase order.** Phase 0 → 1 → 2 → 3 → 4 → 5. Skipping phases will cause integration failures.
