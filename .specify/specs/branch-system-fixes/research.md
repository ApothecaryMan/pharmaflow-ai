# Research Findings: Branch System Technical Audit

**Date**: 2026-03-19 | **Source**: Deep Dive Service Analysis

## 1. Summary of Current State
The application implements multi-branching using **Logical Isolation**. All branch data resides in shared IndexedDB stores or LocalStorage shards, and is filtered in memory by service layers.

## 2. Identified Vulnerabilities

### V-001: Sync Context Leak (Critical)
The `syncQueueService` fails to capture `branchId` during enrollment. The `SyncEngine` processes any action where `branchId` is falsy.
- **Root Cause**: `syncQueueService.enqueue` missing assignment.
- **Risk**: Branch A syncing Branch B's data to the cloud under Branch A's context.

### V-002: ID Generation "Ghosting"
`idGenerator.ts` attempts to guess the `branchCode` from global state if not provided.
- **Risk**: Permanent data corruption if the UI and service layer are temporarily out of sync during ID generation (e.g. during a rapid branch switch).

### V-003: Performance Degeneracy
Linear scans of the entire `DRUGS` and `SALES` datasets for each branch load.
- **Risk**: UI freezing (Jank) as the database grows to >10,000 items.

### V-005: Destructive Bulk Ops (High Risk)
`drugCacheService.saveAll` uses `store.clear()` before inserting new records.
- **Risk**: Since drugs for all branches share the same store, saving Branch A's data will permanently wipe Branch B's local data from IndexedDB.

### V-006: Component-Hook ID Mismatch
`useEntityHandlers.ts` calls `idGenerator.generate` without passing an explicit `branchId`.
- **Risk**: During branch transitions, IDs may be generated with the previous branch's prefix but saved with the new branch's metadata, causing permanent data-ID divergence.

### V-007: UI Projection Leak
`useComputedInventory.ts` maps the entire raw inventory list, even if it contains items from other branches.
- **Risk**: Users might see medication names from other branches (with 0 stock) if the source filtering is bypassed or fails.

## 3. Recommended Remediation
- **Context-Bound Sync**: Force `branchId` enrollment.
- **Indexed DB Indexing**: Enable native branch-filtered queries.
- **Unified Audit**: Consolidate `authService` logs into a singular, indexed `audit_entries` store.
- **Atomic Selective Updates**: Replace `store.clear()` with branch-specific deletions.
- **Strict Hook Context**: Pass `activeBranchId` to every generator and service call.
