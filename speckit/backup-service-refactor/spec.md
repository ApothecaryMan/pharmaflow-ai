# spec.md — Zinc Backup Service (Refactor)
> SpecKit Format · Version 1.0
> Project: PharmaFlow / Zinc
> Module: `services/backup/backupService.ts`
> Target Scale: 1,000+ pharmacies

---

## 1. Context & Constraints

| Property | Value |
|---|---|
| **Runtime** | Browser (PWA, offline-first) |
| **Storage Layer** | Raw IndexedDB (no wrapper) — `pharmaflow_db` |
| **LocalStorage Prefixes** | `pharma`, `pos`, `receipt`, `pharmaflow`, `branch_pilot_session`, `pharma_active_branch_id` |
| **Language** | TypeScript (strict) |
| **UI Framework** | React |
| **Existing File** | `services/backup/backupService.ts` (partial logic — export/import JSON only) |
| **New Libraries Allowed** | ❌ None — pure browser APIs only |
| **Test Framework** | Vitest |
| **i18n** | Arabic (RTL) + English |

---

## 2. Problem Statement

The current `backupService.ts` has four critical vulnerabilities:

1. **Atomicity Failure** — `clear()` per store is sequential; crash = corrupted DB, unrecoverable.
2. **No Rollback** — once clear starts, there is no way back.
3. **No Validation** — destructive ops start immediately on file select.
4. **No Schema Migration** — restoring v2 backup into v4 app silently corrupts indexed fields (e.g., `branchId`).

Additionally:
- `branch_pilot_session` and `pharma_active_branch_id` are missing from backup prefixes → session loss after restore.
- `JSON.parse()` on large file blocks the UI thread.

---

## 3. Goals

### G-1: Data Integrity
The restore operation MUST be all-or-nothing. Partial state is worse than no restore.

### G-2: Rollback Safety
Before any destructive operation, a memory snapshot MUST exist. On failure, auto-rollback MUST execute.

### G-3: Validation-First Pipeline
Zero destructive operations before:
- [ ] File size check
- [ ] SHA-256 checksum match
- [ ] Schema version compatibility check
- [ ] Dry-run store validation

### G-4: Schema Migration
A `MigrationRegistry` must handle version gaps (e.g., v2 → v4) by chaining sequential migration functions.

### G-5: Non-Blocking Export/Import
Large payloads must not freeze the UI. Use `Web Worker` for JSON parsing.

### G-6: Complete LocalStorage Coverage
All session/auth keys must be included in backup and restored after import.

### G-7: UX Guardrails
User must confirm before restore via a `SnapshotPreviewModal` showing: version, date, org name, store count, warnings.

---

## 4. Non-Goals

- ❌ No cloud sync (out of scope for this module)
- ❌ No Dexie migration (stay on raw IDB as per architecture decision)
- ❌ No server-side backup
- ❌ No automated scheduling (manual trigger only)

---

## 5. Architecture

```
services/backup/
├── backupService.ts          ← Orchestrator (refactored)
├── backup.worker.ts          ← Web Worker: JSON parse off main thread
├── checksumService.ts        ← SHA-256 via crypto.subtle
├── migrationRegistry.ts      ← Schema version migration chain
├── validationService.ts      ← Pre-flight dry-run checks
├── rollbackService.ts        ← Memory snapshot + auto-restore
└── types/
    └── backup.types.ts       ← All shared interfaces
```

---

## 6. Data Contracts

### BackupBundle (file format written to disk)

```typescript
interface BackupBundle {
  meta: BackupMeta;
  localStorage: Record<string, string>;
  indexedDB: Record<string, unknown[]>;
}

interface BackupMeta {
  formatVersion: 1;              // bump if BackupBundle shape changes
  schemaVersion: number;         // DB schema version at export time
  appVersion: string;            // semver string e.g. "3.2.1"
  timestamp: string;             // ISO 8601
  orgName: string;               // branch/org display name
  checksum: string;              // SHA-256 of (indexedDB + localStorage) JSON
  storeCount: number;
  recordCount: number;
}
```

### ValidationResult

```typescript
interface ValidationResult {
  isCompatible: boolean;
  errors: string[];              // block restore
  warnings: string[];           // show in modal, allow proceed
}
```

### MigrationFn

```typescript
type MigrationFn = (
  data: Record<string, unknown[]>
) => Record<string, unknown[]>;
```

---

## 7. Behavior Specifications

### SPEC-EXP-01: Export — LocalStorage Capture
**Given** user triggers backup
**When** export starts
**Then** ALL keys matching these prefixes are captured:
`pharma`, `pos`, `receipt`, `pharmaflow`, `branch_pilot_session`, `pharma_active_branch_id`

### SPEC-EXP-02: Export — Checksum
**Given** IDB and LocalStorage data are serialized
**When** checksum is generated
**Then** `SHA-256(JSON.stringify({ indexedDB, localStorage }))` is stored in `meta.checksum`

### SPEC-EXP-03: Export — File Naming
**Given** export succeeds
**When** file is downloaded
**Then** filename = `zinc-backup-{orgName}-{YYYY-MM-DD}.pharma`

---

### SPEC-IMP-01: Import — Size Guard
**Given** user selects a file
**When** file size > 150MB
**Then** throw `BackupError("FILE_TOO_LARGE")` before any parsing

### SPEC-IMP-02: Import — Worker Parse
**Given** file passes size guard
**When** JSON is parsed
**Then** parsing runs in `backup.worker.ts` (Web Worker), NOT on main thread

### SPEC-IMP-03: Import — Checksum Verification
**Given** file is parsed
**When** checksum is computed on received `{ indexedDB, localStorage }`
**Then** computed hash MUST equal `bundle.meta.checksum`, else throw `BackupError("CHECKSUM_MISMATCH")`

### SPEC-IMP-04: Import — Version Gate
**Given** checksum passes
**When** `bundle.meta.schemaVersion > CURRENT_SCHEMA_VERSION`
**Then** throw `BackupError("VERSION_TOO_NEW")` — do NOT proceed

### SPEC-IMP-05: Import — Auto Migration
**Given** `bundle.meta.schemaVersion < CURRENT_SCHEMA_VERSION`
**When** migration chain runs
**Then** each step `N→N+1` in `MigrationRegistry` is applied sequentially until current version

### SPEC-IMP-06: Import — Dry Run
**Given** migration completes
**When** dry-run validation runs
**Then**:
- `errors` = stores present in DB but missing from backup → block restore
- `warnings` = stores in backup not in current DB → show in modal

### SPEC-IMP-07: Import — User Confirmation
**Given** dry-run passes (no errors)
**When** modal is shown
**Then** user sees: schemaVersion, timestamp, orgName, storeCount, recordCount, warnings list
**And** must click "تأكيد الاستعادة" to proceed

### SPEC-IMP-08: Import — Rollback Snapshot
**Given** user confirms
**When** rollback snapshot is created
**Then** ALL current IDB stores are read into memory before any `clear()` is called

### SPEC-IMP-09: Import — Atomic Write
**Given** rollback snapshot exists
**When** restore executes
**Then**:
- ONE `readwrite` transaction opened over ALL store names simultaneously
- `store.clear()` called for each store
- ALL `store.put(record)` calls made WITHOUT `await` (queue-based, no transaction auto-commit)
- `tx.oncomplete` resolves the promise
- `tx.onerror` / `tx.onabort` rejects → triggers SPEC-IMP-10

### SPEC-IMP-10: Import — Auto Rollback
**Given** `atomicRestore()` throws
**When** rollback executes
**Then** rollback snapshot is written back via same `atomicRestore()` pattern
**And** user sees error toast: "فشل الاستعادة — تم التراجع تلقائياً"

### SPEC-IMP-11: Import — LocalStorage Restore
**Given** IDB restore succeeds
**When** LocalStorage keys are restored
**Then** ALL keys from `bundle.localStorage` are written back
**And** `window.location.reload()` is called

---

## 8. Error Taxonomy

```typescript
type BackupErrorCode =
  | "FILE_TOO_LARGE"        // > 150MB
  | "PARSE_FAILED"          // Worker JSON.parse threw
  | "CHECKSUM_MISMATCH"     // SHA-256 doesn't match
  | "VERSION_TOO_NEW"       // backup newer than app
  | "DRY_RUN_FAILED"        // missing required stores
  | "TRANSACTION_FAILED"    // IDB tx aborted
  | "ROLLBACK_FAILED";      // catastrophic — both restore AND rollback failed
```

`ROLLBACK_FAILED` is a P0 — must show permanent error banner, not dismissible toast.

---

## 9. Migration Registry — Initial Entries

```
v1 → v2: (placeholder — no-op)
v2 → v3: drugs[] — add branchId = record.branchId ?? "default_branch"
v3 → v4: rename store inventory → stock_ledger
```

New migrations appended per release. NEVER delete old entries.

---

## 10. Acceptance Criteria

| ID | Criterion | Priority |
|---|---|---|
| AC-01 | Restore fails cleanly if file is corrupt (wrong hash) | P0 |
| AC-02 | DB is identical before and after a round-trip export→import | P0 |
| AC-03 | Crash during restore rolls back to pre-restore state | P0 |
| AC-04 | v2 backup restores correctly into v4 app | P1 |
| AC-05 | UI does not freeze during export/import of 50k+ records | P1 |
| AC-06 | session keys restored after import (no logout) | P1 |
| AC-07 | Modal shows correct metadata before destructive op | P2 |
| AC-08 | All error codes surface a user-readable Arabic message | P2 |
