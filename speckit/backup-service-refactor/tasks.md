# tasks.md — Zinc Backup Service Refactor
> Generated from: plan.md + spec.md
> Format: SpecKit Task List
> Status tracking: [ ] = pending · [x] = done · [~] = in progress · [!] = blocked

---

## Phase 0 — Foundation & Types

- [ ] **P0-T1** · Create `services/backup/types/backup.types.ts`
  - [ ] `BackupErrorCode` union type (7 codes)
  - [ ] `BackupError extends Error` with `code` field
  - [ ] `BackupMeta` interface with `formatVersion: 1` literal
  - [ ] `BackupBundle` interface
  - [ ] `ValidationResult` interface
  - [ ] `MigrationFn` type alias
  - [ ] `RollbackSnapshot` type alias
  - [ ] Verify: `tsc --noEmit` passes on this file alone

- [ ] **P0-T2** · Create `services/backup/constants.ts`
  - [ ] `CURRENT_SCHEMA_VERSION = 4`
  - [ ] `MAX_BACKUP_FILE_SIZE = 150MB`
  - [ ] `BACKUP_LS_PREFIXES` array (6 prefixes including the 2 missing ones)
  - [ ] `BACKUP_FILE_EXTENSION = ".pharma"`

---

## Phase 1 — Core Services

- [ ] **P1-T1** · Create `services/backup/checksumService.ts`
  - [ ] `generateChecksum(idbData, lsData): Promise<string>`
  - [ ] Uses `crypto.subtle.digest("SHA-256")`
  - [ ] Input: both IDB and LS data as one combined object
  - [ ] Output: lowercase hex string

- [ ] **P1-T2** · Create `services/backup/migrationRegistry.ts`
  - [ ] `MIGRATIONS` object (private, not exported)
  - [ ] Entry `"1→2"`: no-op placeholder
  - [ ] Entry `"2→3"`: add `branchId` to `drugs[]`
  - [ ] Entry `"3→4"`: rename `inventory` → `stock_ledger`
  - [ ] `migrateBackup(data, fromVersion, toVersion): Record<string, unknown[]>` (exported)
  - [ ] No mutation of input — use spread
  - [ ] `console.info` log per applied step

- [ ] **P1-T3** · Create `services/backup/validationService.ts`
  - [ ] `dryRunValidation(bundle, db): ValidationResult`
  - [ ] Compute `errors` (stores missing from backup = data loss risk)
  - [ ] Compute `warnings` (stores in backup not in DB = will be ignored)
  - [ ] `isCompatible = errors.length === 0`
  - [ ] NO writes, NO side effects

- [ ] **P1-T4** · Create `services/backup/rollbackService.ts`
  - [ ] `captureSnapshot(db): Promise<RollbackSnapshot>`
    - [ ] Read all stores with readonly transactions
    - [ ] Promisify `IDBRequest` correctly (no library)
  - [ ] `atomicRestore(db, data): Promise<void>`
    - [ ] Open ONE `readwrite` transaction across ALL store names
    - [ ] `store.clear()` per store — no await
    - [ ] `store.put(record)` per record — no await
    - [ ] Resolve on `tx.oncomplete`
    - [ ] Reject with `BackupError("TRANSACTION_FAILED")` on `tx.onerror` / `tx.onabort`
  - [ ] **Self-check:** Confirm there is NO `await` inside the write loops

- [ ] **P1-T5** · Create `services/backup/backup.worker.ts`
  - [ ] `self.onmessage` handler receives `{ file: File }`
  - [ ] `file.text()` then `JSON.parse()`
  - [ ] Posts `{ success: true, data }` or `{ success: false, error: string }`
  - [ ] Create helper in orchestrator: `parseInWorker(file): Promise<BackupBundle>`

---

## Phase 2 — Orchestrator Refactor

- [ ] **P2-T1** · Refactor `services/backup/backupService.ts`

  **Export function:**
  - [ ] `exportBackup(db: IDBDatabase, orgName: string): Promise<void>`
  - [ ] Read all IDB stores
  - [ ] Read LS keys by `BACKUP_LS_PREFIXES`
  - [ ] Call `generateChecksum(idbData, lsData)`
  - [ ] Assemble `BackupBundle` with full `BackupMeta`
  - [ ] Download as `.pharma` file
  - [ ] Filename: `zinc-backup-{orgName}-{YYYY-MM-DD}.pharma`

  **Import function (pre-confirm):**
  - [ ] `importBackup(file, db): Promise<{ bundle: BackupBundle; validation: ValidationResult }>`
  - [ ] Step 1: Size guard → `BackupError("FILE_TOO_LARGE")` if > 150MB
  - [ ] Step 2: `parseInWorker(file)` 
  - [ ] Step 3: Verify checksum → `BackupError("CHECKSUM_MISMATCH")`
  - [ ] Step 4: Version gate → `BackupError("VERSION_TOO_NEW")`
  - [ ] Step 5: `migrateBackup()` if needed
  - [ ] Step 6: `dryRunValidation()` 
  - [ ] Return `{ bundle, validation }` to caller — no UI here

  **Confirm function (post-modal):**
  - [ ] `confirmRestore(bundle, db): Promise<void>`
  - [ ] Step 8: `captureSnapshot(db)`
  - [ ] Step 9: `atomicRestore(db, bundle.indexedDB)`
  - [ ] Step 10: on failure → `atomicRestore(db, snapshot)` → rethrow
    - [ ] If rollback also fails → throw `BackupError("ROLLBACK_FAILED")`
  - [ ] Step 11: Write all LS keys from `bundle.localStorage`
  - [ ] Step 12: `window.location.reload()`

  **Cleanup:**
  - [ ] Delete all old export/import logic
  - [ ] Verify no orphaned functions remain

---

## Phase 3 — UI Integration

- [ ] **P3-T1** · Create `components/backup/SnapshotPreviewModal.tsx`
  - [ ] Props: `meta`, `validation`, `onConfirm`, `onCancel`, `isLoading`
  - [ ] Display: version, date (Arabic locale), orgName, record count, store count
  - [ ] Warnings: yellow section (if `validation.warnings.length > 0`)
  - [ ] Errors: red section (if `validation.errors.length > 0`)
  - [ ] Confirm button disabled if `!validation.isCompatible`
  - [ ] Confirm button text: "تأكيد الاستعادة"
  - [ ] RTL layout

- [ ] **P3-T2** · Update Navbar backup trigger
  - [ ] File input `onChange` → call `importBackup()`
  - [ ] Loading state during pipeline
  - [ ] On success → show `SnapshotPreviewModal`
  - [ ] `onConfirm` → call `confirmRestore()`
  - [ ] On `BackupError` → show Arabic toast using `ERROR_MESSAGES` map
  - [ ] `ROLLBACK_FAILED` → permanent non-dismissible banner (not toast)
  - [ ] Add `ERROR_MESSAGES` map with all 7 codes

---

## Phase 4 — Tests

- [ ] **P4-T1** · `checksumService.test.ts`
  - [ ] Same input → same hash (deterministic)
  - [ ] Changed `idbData` → different hash
  - [ ] Changed `lsData` → different hash

- [ ] **P4-T2** · `migrationRegistry.test.ts`
  - [ ] v2→v4: all drugs have `branchId` field
  - [ ] v3→v4: `stock_ledger` exists, `inventory` deleted
  - [ ] v4→v4: data returned unchanged
  - [ ] No mutation of original input (immutability check)

- [ ] **P4-T3** · `validationService.test.ts`
  - [ ] Store in DB but not in backup → `errors` contains it
  - [ ] Store in backup but not in DB → `warnings` contains it
  - [ ] Exact match → `{ isCompatible: true, errors: [], warnings: [] }`

- [ ] **P4-T4** · `rollbackService.test.ts` (using `fake-indexeddb`)
  - [ ] `captureSnapshot`: returns all records from all stores
  - [ ] `atomicRestore`: all records present after restore
  - [ ] Failed transaction rejects with `BackupError("TRANSACTION_FAILED")`

- [ ] **P4-T5** · `backupService.integration.test.ts` (using `fake-indexeddb`)
  - [ ] Round-trip: export → clear → import → assert identical state
  - [ ] Checksum mismatch → throws `CHECKSUM_MISMATCH`
  - [ ] Version too new → throws `VERSION_TOO_NEW`
  - [ ] v2 backup → auto-migrated → correct v4 shape after restore

---

## Phase 5 — Cleanup & Hardening

- [ ] **P5-T1** · Run `tsc --noEmit` — zero errors
- [ ] **P5-T2** · Delete dead code from original `backupService.ts`
- [ ] **P5-T3** · JSDoc on `exportBackup`, `importBackup`, `confirmRestore`
- [ ] **P5-T4** · Create `services/backup/SCHEMA_VERSION_HISTORY.md`
  - [ ] Table with v1–v4 entries
  - [ ] Instructions for future developers adding a migration

---

## Dependency Graph

```
backup.types.ts ← (all files depend on this — must be first)
constants.ts    ← (all files depend on this)
     │
     ├── checksumService.ts
     ├── migrationRegistry.ts
     ├── validationService.ts
     ├── rollbackService.ts
     ├── backup.worker.ts
     │
     └── backupService.ts (orchestrator — depends on all above)
              │
              └── SnapshotPreviewModal.tsx + Navbar update
```

---

## Prompt for Claude (Copy-Paste Ready)

```
You are implementing a refactor of `services/backup/backupService.ts` for a 
pharmacy PWA called Zinc (PharmaFlow).

Read the following files carefully before writing any code:
- spec.md   → behavioral specifications and data contracts
- plan.md   → architecture decisions and implementation rules
- tasks.md  → the ordered task list to follow

RULES:
1. Complete tasks in exact phase order: P0 → P1 → P2 → P3 → P4 → P5
2. After each file is written, confirm it compiles (tsc --noEmit) before continuing
3. Never use `await` inside a readwrite IDB transaction loop
4. Never import React or any UI library inside service files
5. Never modify or delete migration registry entries — only append
6. All user-facing strings must be in Arabic
7. If a spec behavior is ambiguous, ask before implementing
8. Use `fake-indexeddb` for all IDB tests — never real browser IDB

Start with P0-T1. Show me the file content, then wait for my approval before 
moving to P0-T2.
```
