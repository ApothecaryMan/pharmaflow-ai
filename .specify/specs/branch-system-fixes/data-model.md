# Data Model: Branch System Enhancements

## 1. IndexedDB Schema Updates

The following changes must be applied to `services/db.ts` to support efficient branch isolation.

### Store: `SYNC_QUEUE` & `SYNC_DLQ`
- **Primary Key**: `id` (autoIncrement)
- **New Index**: `branchId`
- **Purpose**: Allow the `SyncEngine` to query only the active branch's pending actions using `index('branchId').getAll(activeBranchId)`.

### Store: `DRUGS` (Inventory)
- **Primary Key**: `id`
- **New Index**: `branchId`
- **Purpose**: Enable native branch-filtered inventory lookups, replacing `drugCacheService.loadAll().filter(...)`.

### Store: `AUDIT_LOGS` (New Unified Store)
- **Primary Key**: `id` (randomUUID)
- **Index 1**: `branchId`
- **Index 2**: `timestamp`
- **Index 3**: `actionType`
- **Purpose**: Consolidate all system events into a single, high-performance searchable log.

## 2. Object Structures

### `SyncAction` (Updated)
```typescript
interface SyncAction {
  id?: number;
  type: SyncActionType;
  payload: any;
  branchId: string; // [MANDATORY] - Added to schema index
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}
```

### `AuditEntry` (Consolidated)
```typescript
interface AuditEntry {
  id: string; // idGenerator.generate('generic', branchId)
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  details: string;
  branchId: string; // [MANDATORY] - Added to schema index
}
```
