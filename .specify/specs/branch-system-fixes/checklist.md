# Implementation Checklist: Branch System Robustness

**Purpose**: Track the technical implementation of branch-level data isolation and synchronization fixes.
**Created**: 2026-03-19
**Feature**: [.specify/specs/branch-system-fixes/spec.md](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/.specify/specs/branch-system-fixes/spec.md)

## 1. Foundation (Data Context & IDs)

- [ ] CHK001 Update `DataContext.tsx` to prioritize `UserSession.branchId` over localStorage/settings.
- [ ] CHK002 Modify `idGenerator.ts` to throw an error if `branchCode` is missing for branch-scoped entities.
- [ ] CHK003 Update all service calls to `idGenerator.generate` to pass the correct branch context.

## 2. Storage & Sync (The Critical Path)

- [x] CHK004 Add `branchId` field and index to `sync_queue` and `sync_dlq` in `db.ts`.
- [x] CHK005 Update `syncQueueService.enqueue` to accept and persist `branchId`.
- [x] CHK006 Implement strict `branchId` filtering in `SyncEngine.ts` to prevent cross-branch leakage.
- [x] CHK007 Add `branchId` index to `DRUGS` store in `db.ts` for efficient filtering.
- [x] CHK014 Refactor `drugCacheService.saveAll` to use branch-specific deletion instead of `store.clear()`.

## 3. Auditing & Performance

- [ ] CHK008 Implement unified `auditService.ts` with IndexedDB storage and `branchId` indexing.
- [ ] CHK009 Remove redundant audit logic from `authService.ts` and redirect to the new service.
- [x] CHK010 Refactor `inventoryService` and `salesService` to use IndexedDB indexes for branch filtering.
- [x] CHK015 Update `useEntityHandlers.ts` to pass `activeBranchId` to all `idGenerator` calls.
- [x] CHK016 Add safety filter to `useComputedInventory.ts` to prevent UI leaks.

## 4. Verification

- [ ] CHK011 Verify Branch A actions never leak into Branch B's sync payload.
- [ ] CHK012 Verify all audit logs are correctly tagged and retrievable by branch.
- [ ] CHK013 Verify system performance with simulated high-volume cross-branch data.
