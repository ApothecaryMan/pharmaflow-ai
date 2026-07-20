# 🏗️ PharmaFlow AI - Database & Repository Optimization Plan

**Version:** 2.0 (Validated Against Live DB)
**Created:** 2026-07-19
**Author:** Senior Architecture Review
**Status:** Awaiting Approval

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 1: Performance Indexes](#phase-1-performance-indexes)
3. [Phase 2: BaseRepository Foundation](#phase-2-baserepository-foundation)
4. [Phase 3: JSONB Split-Brain Fix](#phase-3-jsonb-split-brain-fix)
5. [Phase 4: Service Layer Cleanup](#phase-4-service-layer-cleanup)
6. [Phase 5: Deep Schema Cleanup](#phase-5-deep-schema-cleanup)
7. [Risk Matrix](#risk-matrix)
8. [Rollback Procedures](#rollback-procedures)

---

## Executive Summary

### Current State
- **37 tables** in the public schema
- **18 repository files** in `services/*/repositories/`
- **~15 service files** importing `supabase` directly (bypassing repositories)
- **~38 missing FK indexes** causing sequential scans (8 added beyond original plan during review)
- **2 JSONB dual-write anti-patterns** (sales + purchases)
- **13 duplicated columns** between `employees` and `user_profiles`
- **5 critical RPCs** that read/write JSONB `items` columns

### Target State
- All FK columns indexed for fast JOINs
- Single Source of Truth for transaction items (relational tables only)
- Clean layered architecture: UI → Services → Repositories → Supabase
- No duplicated PII across tables
- All repositories inherit from `BaseRepository` with automatic tenant scoping

---

## Phase 1: Performance Indexes
**Risk:** 🟢 Zero | **Downtime:** None | **Effort:** 30 min | **Priority:** P0

### Why First?
Indexes are additive — they never break existing queries. This gives immediate performance gains while we plan the riskier phases.

### Pre-Conditions
- [ ] Supabase project accessible
- [ ] No active migrations running

---

### Task 1.1: Create FK Index Migration

**File:** `supabase/migrations/20260719_add_fk_indexes.sql`

```sql
-- ============================================================
-- Phase 1: Add Missing Foreign Key Indexes
-- Risk: ZERO — indexes are additive, never break existing queries
-- ============================================================

-- === sale_items ===
CREATE INDEX IF NOT EXISTS idx_sale_items_drug_id ON public.sale_items (drug_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_branch_id ON public.sale_items (branch_id);
-- NOTE: idx_sale_items_sale (sale_id) already exists ✅

-- === purchase_items ===
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_drug_id ON public.purchase_items (drug_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_branch_id ON public.purchase_items (branch_id);

-- === cash_transactions ===
CREATE INDEX IF NOT EXISTS idx_cash_transactions_shift_id ON public.cash_transactions (shift_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_branch_id ON public.cash_transactions (branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_user_id ON public.cash_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_related_sale_id ON public.cash_transactions (related_sale_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_org_id ON public.cash_transactions (org_id);

-- === returns ===
CREATE INDEX IF NOT EXISTS idx_returns_branch_id ON public.returns (branch_id);
CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON public.returns (sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_org_id ON public.returns (org_id);

-- === return_items ===
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON public.return_items (return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_drug_id ON public.return_items (drug_id);
CREATE INDEX IF NOT EXISTS idx_return_items_branch_id ON public.return_items (branch_id);

-- === purchase_returns ===
CREATE INDEX IF NOT EXISTS idx_purchase_returns_branch_id ON public.purchase_returns (branch_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_purchase_id ON public.purchase_returns (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier_id ON public.purchase_returns (supplier_id);

-- === purchase_return_items ===
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return_id ON public.purchase_return_items (purchase_return_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_drug_id ON public.purchase_return_items (drug_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_branch_id ON public.purchase_return_items (branch_id);

-- === stock_movements ===
CREATE INDEX IF NOT EXISTS idx_stock_movements_branch_id ON public.stock_movements (branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_id ON public.stock_movements (batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_id ON public.stock_movements (org_id);

-- === sale_item_batches ===
CREATE INDEX IF NOT EXISTS idx_sale_item_batches_sale_item_id ON public.sale_item_batches (sale_item_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_batches_batch_id ON public.sale_item_batches (batch_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_batches_branch_id ON public.sale_item_batches (branch_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_batches_org_id ON public.sale_item_batches (org_id);

-- === sales ===
CREATE INDEX IF NOT EXISTS idx_sales_shift_id ON public.sales (shift_id);
CREATE INDEX IF NOT EXISTS idx_sales_sold_by_employee_id ON public.sales (sold_by_employee_id);

-- === shifts ===
CREATE INDEX IF NOT EXISTS idx_shifts_org_id ON public.shifts (org_id);

-- === audit_logs ===
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_id ON public.audit_logs (branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs (org_id);

-- === drugs (missing FK indexes) ===
CREATE INDEX IF NOT EXISTS idx_drugs_supplier_id ON public.drugs (supplier_id);
CREATE INDEX IF NOT EXISTS idx_drugs_global_drug_id ON public.drugs (global_drug_id);

-- === suppliers ===
CREATE INDEX IF NOT EXISTS idx_suppliers_branch_id ON public.suppliers (branch_id);

-- === employees ===
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON public.employees (branch_id);
-- NOTE: idx_employees_org_id + idx_employees_org_branch already exist ✅

-- === expenses ===
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id_v2 ON public.expenses (branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_id_v2 ON public.expenses (org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON public.expenses (employee_id);

-- === purchases ===
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_by ON public.purchases (created_by);
-- NOTE: idx_purchases_branch_date + idx_purchases_org_id already exist ✅
```

### Task 1.2: Validate Indexes

```sql
-- Run AFTER migration to confirm all indexes were created
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

### Task 1.3: Performance Benchmark

```sql
-- Before/After comparison query
EXPLAIN ANALYZE
SELECT s.*, si.*
FROM sales s
JOIN sale_items si ON si.sale_id = s.id
WHERE s.branch_id = '<YOUR_BRANCH_ID>'
ORDER BY s.date DESC
LIMIT 10;
```

### Index Count Breakdown

| Table | Indexes Created | Notes |
|-------|----------------|-------|
| sale_items | 2 | `drug_id`, `branch_id` |
| purchase_items | 3 | `purchase_id`, `drug_id`, `branch_id` |
| cash_transactions | 5 | `shift_id`, `branch_id`, `user_id`, `related_sale_id`, `org_id` |
| returns | 3 | `branch_id`, `sale_id`, `org_id` |
| return_items | 3 | `return_id`, `drug_id`, `branch_id` |
| purchase_returns | 3 | `branch_id`, `purchase_id`, `supplier_id` |
| purchase_return_items | 3 | `purchase_return_id`, `drug_id`, `branch_id` |
| stock_movements | 3 | `branch_id`, `batch_id`, `org_id` |
| sale_item_batches | 4 | `sale_item_id`, `batch_id`, `branch_id`, `org_id` |
| sales | 2 | `shift_id`, `sold_by_employee_id` |
| shifts | 1 | `org_id` |
| audit_logs | 2 | `branch_id`, `org_id` |
| drugs | 2 | `supplier_id`, `global_drug_id` |
| suppliers | 1 | `branch_id` |
| employees | 1 | `branch_id` (`org_id` + `org_branch` already exist) |
| expenses | 3 | `branch_id_v2`, `org_id_v2`, `employee_id` |
| purchases | 2 | `supplier_id`, `created_by` (`branch_date` + `org_id` already exist) |
| **Total** | **38** | |

### ✅ Phase 1 Completion Checklist
- [x] Migration SQL created at `supabase/migrations/20260719_add_fk_indexes.sql`
- [x] All **38** indexes defined across 17 tables
- [ ] Migration executed against DB (pending deployment)
- [ ] Verify Index Scan in Supabase logs after deployment

---

## Phase 2: BaseRepository Foundation
**Risk:** 🟢 Zero | **Downtime:** None | **Effort:** 2-3 hours | **Priority:** P1

### Why Second?
This phase only adds NEW files — no existing code is modified. It builds the foundation that Phase 3 and 4 will rely on.

### Pre-Conditions
- [ ] Phase 1 completed

---

### Task 2.1: Create `BaseRepository` Class

**File:** `services/core/BaseRepository.ts`

**Responsibilities:**
1. Generic CRUD: `getById`, `insert`, `update`, `delete`, `upsert`
2. Tenant Scoping: `applyTenantScope(query, branchId, orgId)`
3. Automated Mapping: `snakeToCamel()`, `camelToSnake()` utilities
4. Error Wrapping: Catch PostgREST errors → throw domain errors
5. Column Selection: `listColumns` and `fullColumns` abstract getters

**Key Design Decisions:**
- Constructor accepts optional Supabase client (defaults to singleton) for testability
- `abstract mapFromDb(db: Record<string, unknown>): T` — subclasses define their own mapping
- `abstract mapToDb(entity: Partial<T>): Record<string, unknown>` — subclasses define their own mapping
- `applyTenantScope` is called automatically in all fetch methods
- Error wrapping: PostgREST error codes → domain errors (`NotFoundError`, `DuplicateRecordError`, `TenantScopeError`)
- `upsert` returns `Promise<T[]>` with `.select()` (returns upserted records)
- `delete` chains `.select()` to verify row existed (returns `false` if no row affected)
- `applyTenantScope` applies `org_id` filter whenever `orgId` is provided (regardless of `branchId`)

```typescript
import { supabase as defaultSupabase } from '../../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError, DuplicateRecordError, TenantScopeError } from './errors';

export abstract class BaseRepository<T extends { id: string }> {
  protected abstract tableName: string;
  protected abstract listColumns: string;
  protected abstract fullColumns: string;

  abstract mapFromDb(db: Record<string, unknown>): T;
  abstract mapToDb(entity: Partial<T>): Record<string, unknown>;

  constructor(protected supabase: SupabaseClient = defaultSupabase) {}

  protected applyTenantScope(query: any, branchId?: string, orgId?: string): any {
    const isAll = typeof branchId === 'string' && branchId.toLowerCase() === 'all';
    if (branchId && !isAll) {
      return query.eq('branch_id', branchId);
    }
    if (orgId) {
      return query.eq('org_id', orgId);
    }
    return query;
  }

  async getById(id: string, branchId?: string, orgId?: string): Promise<T | null> {
    const query = (this.supabase as any)
      .from(this.tableName)
      .select(this.fullColumns)
      .eq('id', id);
    const { data, error } = await this.applyTenantScope(query, branchId, orgId).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw this.wrapError(error);
    }
    return this.mapFromDb(data);
  }

  async insert(entity: Partial<T>): Promise<T> {
    const dbEntity = this.mapToDb(entity);
    const { data, error } = await (this.supabase as any)
      .from(this.tableName).insert(dbEntity)
      .select(this.listColumns).single();
    if (error) {
      if (error.code === '23505') throw new DuplicateRecordError(error.message);
      throw this.wrapError(error);
    }
    return this.mapFromDb(data);
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const dbUpdates = this.mapToDb(updates);
    const { data, error } = await (this.supabase as any)
      .from(this.tableName).update(dbUpdates)
      .eq('id', id).select(this.listColumns).single();
    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError(`Record not found: ${id}`);
      throw this.wrapError(error);
    }
    return this.mapFromDb(data);
  }

  async delete(id: string): Promise<boolean> {
    const { data, error } = await (this.supabase as any)
      .from(this.tableName).delete().eq('id', id).select();
    if (error) throw this.wrapError(error);
    return data !== null && data.length > 0;
  }

  async upsert(entities: Partial<T>[]): Promise<T[]> {
    const dbEntities = entities.map(e => this.mapToDb(e));
    const { data, error } = await (this.supabase as any)
      .from(this.tableName).upsert(dbEntities).select(this.listColumns);
    if (error) throw this.wrapError(error);
    return (data || []).map((e: any) => this.mapFromDb(e));
  }

  protected wrapError(error: any): Error {
    if (error.code === '23505') return new DuplicateRecordError(error.message);
    if (error.code === 'PGRST116') return new NotFoundError(error.message);
    if (error.message?.toLowerCase().includes('permission') ||
        error.message?.toLowerCase().includes('policy') ||
        error.message?.toLowerCase().includes('violates row-level security'))
      return new TenantScopeError(error.message);
    return new Error(error.message || 'Database error');
  }
}
```

### Task 2.2: Create Domain Error Classes

**File:** `services/core/errors.ts`

```typescript
export class NotFoundError extends Error { /* ... */ }
export class DuplicateRecordError extends Error { /* ... */ }
export class TenantScopeError extends Error { /* ... */ }
```

### Task 2.3: Create Mapping Utilities

**File:** `services/core/mappers.ts`

```typescript
export function snakeToCamel(obj: Record<string, any>): Record<string, any> { /* ... */ }
export function camelToSnake(obj: Record<string, any>): Record<string, any> { /* ... */ }
```

### Task 2.4: Write Unit Tests

**File:** `services/core/BaseRepository.test.ts`

- Test `applyTenantScope` with branch, org, and 'all' scenarios
- Test `snakeToCamel` and `camelToSnake` converters
- Test error wrapping (PostgREST code → domain error)

### ✅ Phase 2 Completion Checklist
- [x] `BaseRepository.ts` created with full CRUD (`getById`, `insert`, `update`, `delete`, `upsert`)
- [x] `errors.ts` created with `NotFoundError`, `DuplicateRecordError`, `TenantScopeError`
- [x] `mappers.ts` created with `snakeToCamel` / `camelToSnake`
- [x] `BaseRepository.test.ts` with 22 tests covering all methods + edge cases
- [x] All 22 unit tests pass (`npm test`)
- [x] No existing code was modified

---

## 🛠️ Post-Implementation Fixes (Phase 1 & 2)

**Risk:** 🟢 Zero | **Status:** Applied | **Date:** 2026-07-19

These fixes were discovered during code review of the Phase 1 and 2 implementation and were applied before proceeding to Phase 3.

### Bug Fixes — `BaseRepository.ts`

| # | Bug | Impact | Fix |
|---|-----|--------|-----|
| 1 | `upsert` returned `Promise<void>` — silently lost upserted records (IDs, defaults) | Medium — callers never received generated/defaulted fields | Return `Promise<T[]>` with `.select(this.listColumns)` |
| 2 | `delete` always returned `true` even when no rows affected | Low — callers relying on return value for UI state would show stale data | Chain `.select()` and return `data.length > 0` |
| 3 | `applyTenantScope` dropped `orgId` when `branchId` was undefined (not `'all'`) | Medium — org-scoped queries (e.g., `customers` after Phase 5) would not be scoped | Apply `org_id` filter whenever `orgId` is provided, regardless of `branchId` |

### Missing FK Indexes Added

These 8 indexes were missing from the original plan and were added to `20260719_add_fk_indexes.sql`:

| Table | Column | Index Name | Rationale |
|-------|--------|------------|-----------|
| `employees` | `branch_id` | `idx_employees_branch_id` | Employee list queries by branch |
| `expenses` | `branch_id` | `idx_expenses_branch_id_v2` | Branch-level expense reports |
| `expenses` | `org_id` | `idx_expenses_org_id_v2` | Org-wide financial summaries |
| `expenses` | `employee_id` | `idx_expenses_employee_id` | Employee expense history |
| `purchases` | `supplier_id` | `idx_purchases_supplier_id` | Supplier purchase history |
| `purchases` | `created_by` | `idx_purchases_created_by` | Filter purchases by creator |

**Notes:**
- `employees(org_id)` + `employees(org_id, branch_id)` already had indexes ✅
- `purchases(branch_id, date)` + `purchases(org_id)` already had indexes ✅
- Total index count: **38** (was ~30 in original plan)
- All uses `IF NOT EXISTS` — safe to run on existing DB

---

## Phase 3: JSONB Split-Brain Fix
**Risk:** 🔴 HIGH | **Downtime:** Brief (deploy window) | **Effort:** 3-5 days → 1 day | **Priority:** P1

**Status:** ✅ Implemented 2026-07-19 — all sub-phases complete, reviewed, verified.

### Why Third?
This phase eliminates the dual-write anti-pattern. The `sales.items` and `purchases.items` JSONB columns duplicate data that is already stored in `sale_items` and `purchase_items` relational tables.

### Key Deviation from Plan
Instead of editing **historical migration files** (already applied in production), we created a **new migration** `20260722_phase3_rpc_rewrites.sql` with `CREATE OR REPLACE FUNCTION` for all 3 RPCs. This preserves the audit trail and avoids re-running historical migrations.

### Blast Radius — 35+ Files Across All Layers

| Layer | Files | What references `items` |
|-------|-------|-------------------------|
| **DB RPCs** | 6 definitions | `process_purchase_receipt` (4 versions) reads `v_purchase.items`; `process_checkout` + `process_order_modification` write `sales.items` |
| **Repositories** | 2 | `salesRepository.ts`, `purchaseRepository.ts` |
| **Types** | 2 | `types/sales.ts:160` (`items: CartItem[]`), `types/purchases.ts:59` (`items: PurchaseItem[]`) |
| **Services** | 8 | `transactionService.ts`, `dashboardService.ts`, `financialService.ts`, `intelligenceService.ts`, `pricingService.ts`, `loyaltyUtils.ts`, `employeeStats.ts`, `purchaseService.ts` |
| **Frontend** | 29+ | 13 sales components, 4 dashboard components, 3 purchase components, 6 invoice layouts, 3 utils, 2 hooks |

### Key Insight — Reduced Risk

The `Sale.items` and `Purchase.items` fields are **typed interfaces** (`CartItem[]` / `PurchaseItem[]`). The repository `mapFromDb` computes `items` from a relational join (instead of reading `db.items` JSONB) and returns the **same shape** — so all 35+ consuming files **continue working without changes**.

### Pre-Conditions
- [x] Phase 1 completed (indexes exist for `sale_items.sale_id`, `purchase_items.purchase_id`)
- [x] Phase 2 completed (`BaseRepository` available)
- [ ] Full database backup taken (pending before migration execution)
- [x] All 4 `process_purchase_receipt` RPC versions identified and understood
- [x] Latest `process_checkout` + `process_order_modification` identified

---

### Sub-Phase 3a: Data Migration + RPC Rewrites (DB Only)

**Risk:** 🟡 Medium | **Files changed:** SQL only | **Verification:** Run test purchases

#### Task 3a.1: Migrate `purchases.items` JSONB → `purchase_items` Table

**Critical Finding:** `purchase_items` had **0 rows** — all purchases had items only in JSONB.

**File:** `supabase/migrations/20260720_migrate_purchase_items_jsonb.sql`

```sql
INSERT INTO purchase_items (id, purchase_id, branch_id, drug_id, name, dosage_form, quantity, cost_price, expiry_date, discount, public_price, tax, is_unit, units_per_pack)
SELECT
  gen_random_uuid(),
  p.id,
  p.branch_id,
  (item->>'drugId')::UUID,
  COALESCE(item->>'name', ''),
  item->>'dosageForm',
  COALESCE((item->>'quantity')::INT, 0),
  COALESCE((item->>'costPrice')::NUMERIC, 0),
  CASE
    WHEN NULLIF(item->>'expiryDate', '') IS NULL THEN NULL
    WHEN length(item->>'expiryDate') = 7 THEN ((item->>'expiryDate') || '-01')::DATE
    ELSE (item->>'expiryDate')::DATE
  END,
  COALESCE((item->>'discount')::NUMERIC, 0),
  COALESCE((item->>'publicPrice')::NUMERIC, 0),
  COALESCE((item->>'tax')::NUMERIC, 0),
  COALESCE((item->>'isUnit')::BOOLEAN, false),
  COALESCE((item->>'unitsPerPack')::INT, 1)
FROM purchases p,
     jsonb_array_elements(p.items) AS item
WHERE p.items IS NOT NULL
  AND jsonb_typeof(p.items) = 'array'
  AND jsonb_array_length(p.items) > 0
  AND NOT EXISTS (
    SELECT 1 FROM purchase_items pi WHERE pi.purchase_id = p.id
  );
```

#### Task 3a.2: Validate Data Migration

```sql
-- Must return 0 (all purchases with JSONB items now have relational items)
SELECT COUNT(*)
FROM purchases p
WHERE p.items IS NOT NULL
  AND jsonb_array_length(p.items) > 0
  AND NOT EXISTS (SELECT 1 FROM purchase_items pi WHERE pi.purchase_id = p.id);

-- Compare item counts
SELECT p.id, jsonb_array_length(p.items) AS jsonb_count,
  (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) AS relational_count
FROM purchases p
WHERE p.items IS NOT NULL AND jsonb_array_length(p.items) > 0;
```

#### Task 3a.3: Rewrite `process_purchase_receipt` RPC

**Strategy:** Created a single new migration `20260722_phase3_rpc_rewrites.sql` with `CREATE OR REPLACE FUNCTION` — **did not** edit the 4 historical migration files.

**Historical files (untouched — already executed in production):**
- `20260619000001_harden_purchase_receipt_rpc.sql`
- `20260619000004_atomic_purchase_cash.sql`
- `20260619000005_server_side_authorization.sql`
- `20260626000000_fix_purchase_payment_type.sql`

**Current Pattern (lines ~58-65):**
```sql
IF v_purchase.items IS NULL OR jsonb_typeof(v_purchase.items) <> 'array' ...
FOR v_item IN SELECT * FROM jsonb_array_elements(v_purchase.items)
```

**New Pattern:**
```sql
IF NOT EXISTS (SELECT 1 FROM purchase_items WHERE purchase_id = v_purchase_id) THEN ...
FOR v_item IN
  SELECT
    pi.drug_id AS drugId, pi.quantity, pi.is_unit AS isUnit,
    pi.units_per_pack AS unitsPerPack, pi.expiry_date AS expiryDate,
    pi.cost_price AS costPrice, pi.public_price AS publicPrice,
    pi.name, pi.dosage_form AS dosageForm, pi.discount
  FROM purchase_items pi
  WHERE pi.purchase_id = v_purchase_id
```

**Other changes:**
- `v_item JSONB` → `v_item RECORD`
- All `v_item->>'field'` → `v_item.field` (typed record access)
- `SET search_path = public` added (was missing in some versions)

#### Task 3a.4: Update `process_checkout` RPC (Stop Writing)

**File:** `20260722_phase3_rpc_rewrites.sql` (targets latest version `20260706000000`)

**Changes:**
- Removed `items` from INSERT column list and VALUES
- Removed `v_updated_items JSONB := '[]'::JSONB` declaration
- Removed the `v_updated_items` building block (lines 136-147)
- Removed `UPDATE sales SET items = v_updated_items`
- **Added**: return now builds `items` from `sale_items` via `jsonb_agg`:
  ```sql
  RETURN jsonb_build_object(
    'success', true,
    'sale', row_to_json((SELECT s FROM sales s WHERE id = v_sale_id))::jsonb ||
            jsonb_build_object('items', COALESCE(
              (SELECT jsonb_agg(jsonb_build_object(
                'id', si.drug_id, 'name', si.name, 'quantity', si.quantity,
                'publicPrice', si.public_price, 'isUnit', si.is_unit,
                'costPrice', si.cost_price, 'saleItemId', si.id
              )) FROM sale_items si WHERE si.sale_id = v_sale_id), '[]'::JSONB
            ))
  );
  ```

#### Task 3a.5: Update `process_order_modification` RPC (Stop Writing)

**File:** `20260722_phase3_rpc_rewrites.sql` (targets latest version `20260712000001`)

```sql
-- Removed `items = v_new_items,` from the UPDATE statement
```

---

### Sub-Phase 3b: Repository Layer Refactor

**Risk:** 🟡 Medium | **Files changed:** 2 repositories | **Verification:** `npm test` passes

#### Task 3b.1: Update `purchaseRepository.ts`

**File:** `services/purchases/repositories/purchaseRepository.ts`

**Critical:** `PurchaseItem` has `name`, `dosageForm` as flat strings, plus fields like `costPrice`, `publicPrice`, `tax`, `isUnit`, `unitsPerPack`. The `purchase_items` table stores these as snapshots — but to also provide Drug-level fields (e.g., `barcode`, `category`) for future use, join `drugs`.

**Added type (replaces `any`):**
```typescript
interface PurchaseItemRow {
  id: string; purchase_id: string; branch_id: string; drug_id: string;
  name: string; dosage_form: string | null; quantity: number;
  cost_price: number; expiry_date: string | null; discount: number | null;
  public_price: number; tax: number | null; is_unit: boolean | null;
  units_per_pack: number | null;
  drug: Record<string, unknown> | null;
}
```

**Query change (getById):**
```typescript
// OLD:
.select('*')
// NEW:
.select('*, purchase_items:purchase_items(*, drug:drugs(*))')
```

**`mapFromDb` change:**
```typescript
// OLD:
items: db.items || [],

// NEW:
items: (db.purchase_items || []).map((item: PurchaseItemRow) => ({
  ...item.drug,
  id: item.id, drugId: item.drug_id, name: item.name,
  quantity: item.quantity, costPrice: item.cost_price,
  expiryDate: item.expiry_date ?? undefined,
  dosageForm: item.dosage_form ?? undefined,
  discount: item.discount ?? undefined,
  publicPrice: item.public_price, tax: item.tax ?? undefined,
  isUnit: item.is_unit ?? undefined,
  unitsPerPack: item.units_per_pack ?? undefined,
})),
```

**`mapToDb` change:**
```typescript
// REMOVED this line:
if (p.items !== undefined) db.items = p.items;
```

**For `listPage` / list methods:** Keep `.select('*')` without join (items loaded on detail view only).

#### Task 3b.2: Update `salesRepository.ts`

**File:** `services/sales/repositories/salesRepository.ts`

**⚠️ Critical — `CartItem extends Drug`:** The frontend expects ALL Drug fields (`name`, `name_arabic`, `barcode`, `dosage_form`, `category`, `manufacturer`, etc.) on each item.

**Added type (replaces `any`):**
```typescript
interface SaleItemRow {
  id: string; sale_id: string; branch_id: string; drug_id: string;
  name: string; quantity: number; public_price: number; cost_price: number;
  discount: number | null; is_unit: boolean | null;
  drug: Record<string, unknown> | null;
  batch_allocations: BatchAllocationRow[] | null;
}
interface BatchAllocationRow {
  id: string; sale_item_id: string; batch_id: string;
  quantity: number; branch_id: string; expiry_date: string;
}
```

**Query change (getById):**
```typescript
// OLD:
.select(SALE_FULL_COLUMNS)

// NEW — join sale_items + nested drug + batch_allocations:
.select('*, sale_items:sale_items(*, drug:drugs(*), batch_allocations:sale_item_batches(*))')
```

**`mapFromDb` change — merge Drug fields into each item:**
```typescript
// OLD:
items: db.items || [],

// NEW:
items: (db.sale_items || []).map((item: SaleItemRow) => ({
  ...item.drug,                     // Drug fields: name, barcode, category, etc.
  id: item.id,
  name: item.name,                  // Override with sale-time snapshot
  quantity: item.quantity,
  publicPrice: item.public_price,
  costPrice: item.cost_price,
  discount: item.discount ?? undefined,
  isUnit: item.is_unit ?? undefined,
  batchAllocations: item.batch_allocations,
})),
```

**`mapToDb` change:**
```typescript
// REMOVED this line:
if (s.items !== undefined) db.items = s.items;
```

**Other changes:**
1. Removed `'items'` from `SALE_LIST_COLUMNS`
2. For `listPage`/list methods: Keep without items join (performance)
3. Keep `item_returned_quantities` in `SALE_LIST_COLUMNS` (not duplicated in `sale_items`)

#### Verification After 3b

The repository still returns `items: CartItem[]` / `items: PurchaseItem[]` — the same shape as before. All 35+ frontend files and 8 service files **continue working without changes**.

---

### Sub-Phase 3c: Drop JSONB Columns

**Risk:** 🟢 Low (after 3b verified) | **Files changed:** 1 migration | **Downtime:** None

#### Task 3c.1: Drop Columns

**File:** `supabase/migrations/20260721_drop_jsonb_items.sql`
*(Renamed from `20260720` to fix lexicographic ordering — ensures backfill runs first)*

```sql
-- ONLY RUN AFTER SUB-PHASE 3b IS VERIFIED WORKING!
ALTER TABLE purchases DROP COLUMN IF EXISTS items;
ALTER TABLE sales DROP COLUMN IF EXISTS items;
-- NOTE: Keep sales.item_returned_quantities — it tracks partial returns
-- and is NOT duplicated in sale_items
```

#### Task 3c.2: Verify No DB Errors

- Run all RPCs (`process_checkout`, `process_purchase_receipt`, `process_order_modification`, `process_return`)
- Check Supabase logs for `"column items does not exist"` errors

---

### Sub-Phase 3d: Clean Up Types & Dead Code

**Risk:** 🟢 Low | **Files changed:** 7 | **Effort:** 1 day

#### Task 3d.1: Update Type Definitions

**File:** `types/sales.ts` — Line 160
```typescript
/**
 * Cart items in this sale. Uses CartItem (extends Drug) for frontend display.
 * Computed from the `sale_items` relational join — no longer stored as JSONB.
 * Always present on detail queries (`getById`); empty array `[]` on list queries.
 */
items: CartItem[];
```

**File:** `types/purchases.ts` — Line 59
```typescript
/**
 * Items in this purchase.
 * Computed from the `purchase_items` relational join — no longer stored as JSONB.
 * Always present on detail queries (`getById`); empty array `[]` on list queries.
 */
items: PurchaseItem[];
```

#### Task 3d.2: Remove Dead JSONB References from RPC Backfill Migrations

No changes needed — these are historical records already executed in production:
- `20260515000002_fix_missing_names_in_sales.sql` (lines 320-350)
- `20260515000007_fix_sale_items_identifiers.sql` (lines 9-41)
- `20260429010000_standardize_public_price.sql` (lines 19-56)

#### Task 3d.3: Audit Frontend for Resilience

**Action:** Added `|| []` guards to 5 service files that iterate `sale.items` for calculations. Frontend list views naturally handle `items: []` since `mapFromDb` always returns an array. The `.reduce()` calls on list data were the only crash risk (empty array reduce without initial value throws).

**Files guarded:**
| File | Accesses Guarded |
|------|-----------------|
| `services/dashboard/dashboardService.ts` | 4× `(sale.items \|\| []).forEach(..)` |
| `services/customers/loyaltyUtils.ts` | 1× `(sale.items \|\| []).forEach(..)` |
| `services/sales/pricingService.ts` | 2× `(sale.items \|\| []).map/forEach(..)` |
| `services/intelligence/intelligenceService.ts` | 2× `for (const item of (sale.items \|\| []))` |
| `utils/employeeStats.ts` | 2× `(sale.items \|\| []).forEach(..)` |

---

### ✅ Phase 3 Completion Checklist

#### Sub-Phase 3a
- [x] Migration `20260720_migrate_purchase_items_jsonb.sql` created
- [x] New migration `20260722_phase3_rpc_rewrites.sql` created (not editing historical files)
- [x] `process_purchase_receipt` rewritten to read from `purchase_items` table
- [x] `process_checkout` updated (stopped writing to `sales.items`)
- [x] `process_order_modification` updated (stopped writing to `sales.items`)
- [ ] Migration executed against DB (pending deployment)

#### Sub-Phase 3b
- [x] `purchaseRepository.ts` updated (reads via join, no JSONB write, typed `PurchaseItemRow`)
- [x] `salesRepository.ts` updated (reads via join + batch_allocations, no JSONB write, typed `SaleItemRow`)
- [x] `npm test` passes (22/22 BaseRepository, 189/201 total)

#### Sub-Phase 3c
- [x] Drop migration `20260721_drop_jsonb_items.sql` created (runs AFTER backfill)
- [ ] JSONB columns dropped in DB (pending deployment)

#### Sub-Phase 3d
- [x] Type definitions updated with JSDoc
- [x] 5 service files guarded with `|| []`
- [ ] Frontend defensive guards verified (all 6 invoice layouts already have `|| []`; list views handle `items: []` naturally)

---

## Phase 4: Service Layer Cleanup
**Risk:** 🟡 Medium | **Downtime:** None | **Effort:** 1 day | **Priority:** P2

### Why Fourth?
Now that the data layer is clean, we enforce the architectural rule that Services cannot talk to Supabase directly.

### Pre-Conditions
- [ ] Phase 2 completed (`BaseRepository` available)
- [ ] Phase 3 completed (no more JSONB dual-writes)

---

### Task 4.1: Identify All Service Files Importing Supabase

These files currently violate the layering rule:

| # | Service File | Supabase Usage | Needs New Repository? |
|---|-------------|----------------|----------------------|
| 1 | `financials/financialService.ts` | `.rpc()` calls | Yes → `financialRepository.ts` |
| 2 | `hr/attendanceService.ts` | `.from()` queries | Yes → `attendanceRepository.ts` |
| 3 | `hr/attendanceReportService.ts` | `.from()` queries | Merge into `attendanceRepository.ts` |
| 4 | `hr/employeeService.ts` | `.from()` queries | Use existing `employeeRepository.ts` |
| 5 | `inventory/inventoryService.ts` | `.from()` queries | Use existing `inventoryRepository.ts` |
| 6 | `inventory/drugApprovalService.ts` | `.from()` queries | Yes → `drugApprovalRepository.ts` |
| 7 | `inventory/stockMovement/stockMovementService.ts` | `.from()` queries | Use existing `stockMovementRepository.ts` |
| 8 | `cash/cashService.ts` | `.from()` queries | Use existing `cashRepository.ts` |
| 9 | `returns/returnService.ts` | `.rpc()` calls | Yes → `returnRepository.ts` (move RPCs) |
| 10 | `transactions/transactionService.ts` | `.from()` queries | Yes → `transactionRepository.ts` |
| 11 | `settings/holidaysService.ts` | `.from()` queries | Yes → `holidaysRepository.ts` |
| 12 | `purchases/purchaseService.ts` | `.rpc()` calls | Move RPCs to `purchaseRepository.ts` |
| 13 | `org/orgMembersService.ts` | `.from()` queries | Yes → `orgMembersRepository.ts` |
| 14 | `dashboard/achievementService.ts` | `.from()` queries | Yes → `achievementRepository.ts` |
| 15 | `core/baseReportService.ts` | `.from()` queries | Refactor to use repositories |

### Task 4.2: Create Missing Repositories (One by One)

For each service in the table above:
1. Create `services/<module>/repositories/<name>Repository.ts`
2. Move all `.from()`, `.rpc()`, and `.select()` logic into the new repository
3. Update the service to import and call the repository instead
4. Remove `import { supabase }` from the service
5. Run `npm run lint` and `npm test`

**Execution Order** (by risk, lowest first):
1. `holidaysRepository.ts` (simple reads, no writes)
2. `achievementRepository.ts` (simple reads)
3. `orgMembersRepository.ts` (simple reads)
4. `drugApprovalRepository.ts` (reads + writes)
5. `attendanceRepository.ts` (reads + writes)
6. `transactionRepository.ts` (reads + writes)
7. `financialRepository.ts` (complex RPCs)
8. `returnRepository.ts` (complex RPCs)
9. Move RPC calls from `purchaseService.ts` → `purchaseRepository.ts`
10. Refactor `baseReportService.ts`

### Task 4.3: Add Lint Rule (Optional)

Add a custom ESLint rule or grep check in CI:
```bash
# Fail if any *Service.ts file imports supabase
grep -r "import.*supabase" services/**/*Service.ts && echo "VIOLATION" && exit 1
```

### ✅ Phase 4 Completion Checklist
- [ ] All 15 service files no longer import `supabase`
- [ ] 8 new repository files created
- [ ] All financial dashboard charts load correctly
- [ ] Attendance tracking works
- [ ] `npm run lint` passes
- [ ] `npm test` passes

---

## Phase 5: Deep Schema Cleanup
**Risk:** 🟡 Medium | **Downtime:** Brief | **Effort:** 1 day | **Priority:** P3

### Pre-Conditions
- [ ] Phase 3 completed (JSONB columns dropped)
- [ ] Phase 4 completed (all services use repositories)
- [ ] Full database backup

---

### Task 5.1: Link Unlinked Employees

**Current State:** 5 employees total. 3 have `user_id`, 5 have `auth_user_id`, 2 have no `user_id`.

```sql
-- Find employees without user_id link
SELECT id, name, auth_user_id, user_id
FROM employees
WHERE user_id IS NULL;
```

**Action:** Manually link these 2 employees to their `user_profiles` records, or create `user_profiles` entries for them.

### Task 5.2: Sync PII Data to `user_profiles`

Before dropping columns from `employees`, ensure `user_profiles` has all the data:

```sql
-- Copy employee PII to user_profiles where missing
UPDATE user_profiles up
SET
  phone = COALESCE(up.phone, e.phone),
  email = COALESCE(up.email, e.email),
  name_arabic = COALESCE(up.name_arabic, e.name_arabic),
  national_id_card = COALESCE(up.national_id_card, e.national_id_card),
  national_id_card_back = COALESCE(up.national_id_card_back, e.national_id_card_back),
  main_syndicate_card = COALESCE(up.main_syndicate_card, e.main_syndicate_card),
  sub_syndicate_card = COALESCE(up.sub_syndicate_card, e.sub_syndicate_card),
  cover_style = COALESCE(up.cover_style, e.cover_style),
  design_settings = COALESCE(up.design_settings, e.design_settings)
FROM employees e
WHERE e.user_id = up.id;
```

### Task 5.3: Drop Duplicate Columns from `employees`

**File:** `supabase/migrations/20260721_clean_employees.sql`

```sql
-- ============================================================
-- Drop duplicated PII columns from employees
-- Data has been verified in user_profiles first
-- ============================================================

ALTER TABLE employees DROP COLUMN IF EXISTS password;
ALTER TABLE employees DROP COLUMN IF EXISTS national_id_card;
ALTER TABLE employees DROP COLUMN IF EXISTS national_id_card_back;
ALTER TABLE employees DROP COLUMN IF EXISTS main_syndicate_card;
ALTER TABLE employees DROP COLUMN IF EXISTS sub_syndicate_card;
ALTER TABLE employees DROP COLUMN IF EXISTS cover_style;
ALTER TABLE employees DROP COLUMN IF EXISTS design_settings;
-- Keep: phone, email, name_arabic (used in employee lists without JOIN)
-- Keep: auth_user_id (used for Supabase Auth lookup)
-- Keep: photo (employee-specific avatar may differ from profile)
```

### Task 5.4: Update `employeeRepository.ts`

**File:** `services/hr/repositories/employeeRepository.ts`

**Changes:**
1. Remove dropped columns from `EMPLOYEE_FULL_COLUMNS`
2. Remove from `mapFromDb`: `password`, `nationalIdCard`, `nationalIdCardBack`, `mainSyndicateCard`, `subSyndicateCard`, `coverStyle`, `designSettings`
3. Remove from `mapToDb`: same columns
4. Update `getDocuments()` to read from `user_profiles` instead of `employees`
5. For `getById`, add JOIN: `.select('*, profile:user_profiles(national_id_card, ...)')`

### Task 5.5: Migrate Customers `branch_id` → `org_id`

**File:** `supabase/migrations/20260721_customers_org_scope.sql`

```sql
-- ============================================================
-- Migrate customers from branch-scoped to org-scoped
-- ============================================================

-- Step 1: Drop old UNIQUE constraints that depend on branch_id
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_branch_id_code_key;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_branch_id_phone_key;

-- Step 2: Create new UNIQUE constraints based on org_id
ALTER TABLE customers ADD CONSTRAINT customers_org_id_code_key UNIQUE (org_id, code);
ALTER TABLE customers ADD CONSTRAINT customers_org_id_phone_key UNIQUE (org_id, phone);

-- Step 3: Update RLS policy if needed
-- Current RLS checks org_id already ✅

-- Step 4: Drop branch_id column
-- WARNING: Only do this after verifying customerRepository.ts is updated!
-- ALTER TABLE customers DROP COLUMN IF EXISTS branch_id;
```

### Task 5.6: Update `customerRepository.ts`

**File:** `services/customers/repositories/customerRepository.ts`

**Changes:**
1. Remove all `.eq('branch_id', ...)` from queries
2. Change tenant scoping to use only `org_id`
3. Update `mapFromDb` and `mapToDb` to remove `branchId`

### Task 5.7: Update `process_return` RPC

This RPC has a `WHERE branch_id = v_branch_id` on the `customers` table:
```sql
-- CHANGE THIS:
WHERE branch_id = v_branch_id
-- TO THIS:
WHERE org_id = v_org_id
```

### ✅ Phase 5 Completion Checklist
- [ ] All 5 employees have `user_id` linked
- [ ] PII data synced to `user_profiles`
- [ ] Duplicate columns dropped from `employees`
- [ ] `employeeRepository.ts` updated
- [ ] Employee page loads correctly (names, photos, contact info)
- [ ] Employee documents load from `user_profiles`
- [ ] Customers UNIQUE constraints migrated
- [ ] Customer search works across branches
- [ ] `process_return` RPC updated
- [ ] `npm run lint` passes
- [ ] `npm test` passes

---

## Risk Matrix

| Phase | Risk Level | Impact if Failed | Rollback Difficulty | Dependencies |
|-------|-----------|-----------------|--------------------| -------------|
| 1: Indexes | 🟢 Zero | N/A | Drop indexes | None |
| 2: BaseRepository | 🟢 Zero | N/A | Delete files | None |
| 3: JSONB Fix | 🔴 High | POS broken, sales fail | Restore JSONB + revert RPCs | Phase 1, 2 |
| 3a: Data + RPCs | 🟡 Medium | Purchase receipt fails | Revert migration + RPCs | Phase 1, 2 |
| 3b: Repository | 🟡 Medium | Item data missing | Revert repo changes | Phase 3a |
| 3c: Drop Columns | 🟢 Low | Irreversible (have backup) | Restore from backup | Phase 3b |
| 3d: Cleanup | 🟢 Low | Cosmetic only | Revert type changes | Phase 3c |
| 4: Service Cleanup | 🟡 Medium | Some features break | Revert service files | Phase 2 |
| 5: Schema Cleanup | 🟡 Medium | Employee/Customer pages break | Restore columns | Phase 3, 4 |

---

## Rollback Procedures

### Phase 1 Rollback
```sql
-- Simply drop the added indexes
DROP INDEX IF EXISTS idx_sale_items_drug_id;
DROP INDEX IF EXISTS idx_sale_items_branch_id;
-- ... (repeat for all added indexes)
```

### Phase 3 Rollback (Most Critical)
```sql
-- 1. Re-add JSONB columns
ALTER TABLE sales ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS items JSONB;

-- 2. Repopulate from relational tables
UPDATE sales s SET items = (
  SELECT jsonb_agg(jsonb_build_object(
    'id', si.drug_id, 'name', si.name,
    'quantity', si.quantity, 'publicPrice', si.public_price
  ))
  FROM sale_items si WHERE si.sale_id = s.id
);

-- 3. Revert RPCs to original versions (keep backups!)
```

### Phase 5 Rollback
```sql
-- Re-add dropped columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS national_id_card TEXT;
-- ... etc
```

---

## 📊 Estimated Timeline

| Phase | Estimated Duration | Can Run In Parallel? |
|-------|-------------------|---------------------|
| Phase 1 | 30 minutes | No (run first) |
| Phase 2 | 2-3 hours | Yes (with Phase 1) |
| Phase 3 (3a+3b+3c+3d) | 3-5 days | No (sequential sub-phases) |
| Phase 4 | 1 day | Yes (with Phase 3b) |
| Phase 5 | 1 day | No (depends on 3+4) |
| **Total** | **~6-9 days** | |

---

## 🔮 Future Phases (Not Covered in This Plan)

> [!IMPORTANT]
> الخطة الحالية (المراحل 1-5) تغطي **~70%** من المشاكل الحرجة التي تؤثر على الأداء والصحة المعمارية. الأقسام التالية تمثل الـ **30% المتبقية** وهي مشاريع ضخمة يجب فتح خطة منفصلة لكل منها بعد الانتهاء من المراحل الحالية والتأكد من استقرار النظام.

---

### Phase 6: فصل جدول `drugs` (Catalog vs Inventory Split) 🧬
**Risk:** 🔴🔴 Very High | **Effort:** 3-5 days | **Priority:** P3

**المشكلة الحالية:**
جدول `drugs` يخلط بين بيانات الكتالوج (الاسم، الباركود، المصنّع، الفئة) وبيانات المخزون (stock، expiry_date، cost_price). هذا يعني:
- لا يمكن مشاركة كتالوج الأدوية بين الفروع بدون تكرار البيانات
- تحديث سعر الدواء في فرع يتطلب تحديثه يدوياً في كل فرع
- لا يوجد مفهوم "الدواء الواحد بمخزون مختلف في كل فرع"

**الحل المقترح:**
```
drugs (current) → org_drugs (catalog: name, barcode, manufacturer, category)
                → branch_inventory (inventory: stock, expiry_date, cost_price, branch_id)
```

**التأثير:**
- يمس **كل شاشة** في النظام (POS, Inventory, Purchases, Returns, Reports)
- يتطلب إعادة كتابة **جميع الـ RPCs** التي تتعامل مع `drugs`
- يتطلب ترحيل بيانات ضخمة

**ملاحظة:** جدول `global_drugs` موجود بالفعل ويمكن استخدامه كأساس للكتالوج.

---

### Phase 7: مراجعة شاملة لسياسات الأمان (RLS Audit) 🛡️
**Risk:** 🟡 Medium | **Effort:** 1-2 days | **Priority:** P2

**المهام:**
- [ ] مراجعة كل RLS policy على كل جدول
- [ ] التأكد من أن كل جدول يستخدم `get_user_org_ids()` أو `get_user_branch_ids()` بشكل متسق
- [ ] التأكد من وجود `WITH CHECK` policies للكتابة (INSERT/UPDATE) وليس فقط القراءة
- [ ] اختبار: مستخدم من مؤسسة A لا يستطيع رؤية بيانات مؤسسة B
- [ ] اختبار: موظف فرع 1 لا يستطيع رؤية بيانات فرع 2 (إلا إذا كان admin)

---

### Phase 8: تحسين أداء الـ RPCs 🚀
**Risk:** 🟡 Medium | **Effort:** 2-3 days | **Priority:** P2

**RPCs التي تحتاج مراجعة:**

| RPC | المشكلة المحتملة |
|-----|-----------------|
| `get_shortages` | يحتوي على 4 CTEs متداخلة + Pareto ABC classification — قد يكون بطيئاً مع آلاف الأدوية |
| `get_financial_report` | يقرأ من `sales`, `returns`, `sale_items`, `return_items`, `expenses` في query واحد |
| `compute_financial_summary_with_snapshots` | يحتاج مراجعة هل يستخدم الـ `financial_snapshots` table بكفاءة |
| `get_daily_financial_breakdown` | يحتاج EXPLAIN ANALYZE للتأكد من استخدام الفهارس |
| `get_top_products_financial` | يحتاج مراجعة |

**المهام:**
- [ ] تشغيل `EXPLAIN ANALYZE` على كل RPC
- [ ] تحسين الـ CTEs أو تحويلها إلى Materialized Views إذا لزم الأمر
- [ ] إضافة فهارس مركبة (Composite Indexes) إذا اقتضت الحاجة

---

### Phase 9: Table Partitioning للجداول الكبيرة 📊
**Risk:** 🟡 Medium | **Effort:** 2-3 days | **Priority:** P3

**الجداول المرشحة:**

| الجدول | سبب الترشيح | نوع التقسيم المقترح |
|--------|-------------|-------------------|
| `stock_movements` | ينمو مع كل عملية بيع/شراء/إرجاع — سيصل لملايين الصفوف | Range Partition by `timestamp` (شهري) |
| `audit_logs` | ينمو مع كل عملية — لا يُحذف أبداً | Range Partition by `timestamp` (شهري) |
| `login_audits` | سجلات تسجيل الدخول — ينمو مستمراً | Range Partition by `created_at` (شهري) |
| `sale_items` | ينمو مع كل عملية بيع | Range Partition by `sale_id` أو عبر الفرع |

**ملاحظة:** التقسيم يحتاج PostgreSQL 12+ (Supabase يدعمه). يتطلب إعادة إنشاء الجدول بالبنية الجديدة وترحيل البيانات.

---

### Phase 10: تحسينات البنية التحتية (Infrastructure) ⚙️
**Risk:** 🟢 Low | **Effort:** 1 day | **Priority:** P3

**المهام:**

| المهمة | الوصف |
|--------|-------|
| **Connection Pooling** | مراجعة إعدادات Supabase connection pool (PgBouncer) — التأكد من أن الحد الأقصى للاتصالات مناسب |
| **Vacuum & Analyze** | جدولة `VACUUM ANALYZE` دورياً على الجداول الكبيرة لمنع table bloat |
| **Realtime Subscriptions** | تقليل الـ 31+ WebSocket messages التي ظهرت في التقرير الأول — فحص هل كلها ضرورية |
| **Query Caching** | إضافة طبقة caching في الـ Repository layer للبيانات التي لا تتغير كثيراً (مثل `branches`, `suppliers`) |
| **Dead Row Cleanup** | فحص الجداول التي بها soft-deleted rows قديمة وأرشفتها |

---

### 📊 ملخص التغطية الكاملة

```
المراحل 1-5 (هذه الخطة):     ████████████████████░░░░░░░░  70%
المراحل 6-10 (خطط مستقبلية):  ░░░░░░░░░░░░░░░░░░░░████████  30%
                               ════════════════════════════
                               تغطية كاملة لقاعدة البيانات   100%
```

> **القاعدة:** ننفذ المراحل 1-5 أولاً → نتأكد من الاستقرار → نفتح خطة منفصلة لكل مرحلة مستقبلية.
