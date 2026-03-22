# Implementation Plan: Branch System Robustness

**Branch**: `312-branch-system-robustness` | **Date**: 2026-03-19 | **Spec**: [.specify/specs/branch-system-fixes/spec.md](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/.specify/specs/branch-system-fixes/spec.md)
**Input**: Feature specification from `/specs/branch-system-fixes/spec.md`

## Summary

The goal is to fix critical branch isolation and synchronization issues identified during the deep dive analysis. The technical approach involves:
1.  **Strict Context Enforcement**: Moving from "guessed" branch IDs to a mandatory session-derived `branchId`.
2.  **Database Level Isolation**: Adding IndexedDB indexes for `branchId` to all core stores (`DRUGS`, `SYNC_QUEUE`, `SYNC_DLQ`) to replace inefficient in-memory filtering.
3.  **Sync Security**: Patching `syncQueueService` and `SyncEngine` to ensure actions are tagged and processed strictly within their branch context, preventing data corruption across terminals.

## Technical Context

**Language/Version**: TypeScript / React  
**Primary Dependencies**: Vite, Vitest, IndexedDB API  
**Storage**: IndexedDB (Large data), LocalStorage (Settings/Sharded Sales)  
**Testing**: Vitest  
**Target Platform**: Web / PWA  
**Project Type**: Single (Web App)  
**Performance Goals**: <50ms for branch-filtered queries via IndexedDB indexes.  
**Constraints**: Must work offline; branch switching should be instantaneous and safe.  

## Project Structure

### Documentation (this feature)

```text
.specify/specs/branch-system-fixes/
├── spec.md              # Requirements & User Stories
├── plan.md              # This technical plan
├── checklist.md         # Implementation checklist
├── research.md          # Deep dive analysis findings (migrated from brain/ artifacts)
└── data-model.md        # Updated IndexedDB schema definitions
```

### Source Code (affected paths)

```text
services/
├── db.ts                # Schema updates (indexes)
├── syncQueueService.ts  # branchId enrollment
├── auditService.ts      # Unified auditing implementation
├── auth/authService.ts  # Removal of redundant audit logic
├── sync/syncEngine.ts   # Context-aware filtering
└── DataContext.tsx      # Provider-level context enforcement

utils/
└── idGenerator.ts       # Strict branch prefix enforcement
```

## Structure Decision
The existing project structure is a standard React service-component architecture. All fixes will be applied within the `services/` and `utils/` directories to maintain clean separation of concerns.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Mandatory Branch ID in ID Gen | Absolute safety against "ghost" data | Fallback guessing is exactly what caused the current bugs |
| IndexedDB Schema Migration | Native performance for branch filtering | In-memory filtering will not scale beyond 1000 records |
