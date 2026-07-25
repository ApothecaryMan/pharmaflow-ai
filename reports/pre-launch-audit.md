# PharmaFlow AI (ZINC) — Pre-Launch Audit Report

> **Project**: ZINC v2.0.71 — Pharmacy Management System  
> **Stack**: React 19 + Supabase (PostgreSQL) + Tauri v2  
> **Audit Date**: July 2026  
> **Scope**: Full system — Sales, Purchases, Returns, Inventory, Stock, Cash, Security, Performance, Architecture

---

## 1. Entity Relationship Map

| Entity | Parent | Children | Key Fields |
|--------|--------|----------|------------|
| `organizations` | — | `branches`, `org_members`, `subscriptions` | `id`, `name`, `slug`, `owner_id` |
| `branches` | `organizations` | `employees`, `drugs`, `sales`, `purchases`, `shifts` | `id`, `org_id`, `name`, `code` |
| `employees` | `branches` | — | `id`, `branch_id`, `auth_user_id`, `role`, `employee_code` |
| `user_profiles` | `auth.users` | — | `id`, `username`, `full_name`, `phone`, `email` |
| `drugs` | `branches` | `stock_batches` | `id`, `branch_id`, `stock`, `cost_price`, `public_price`, `barcode` |
| `global_drugs` | — | `drug_approvals` | `id`, `name`, `barcode`, `manufacturer`, `active_substance` |
| `drug_approvals` | `global_drugs`, `organizations` | — | `id`, `global_drug_id`, `org_id`, `status` |
| `stock_batches` | `drugs` | — | `id`, `drug_id`, `quantity`, `expiry_date`, `cost_price`, `purchase_id`, `version` |
| `stock_movements` | `drugs` | — | `id`, `drug_id`, `type` (10 types), `quantity`, `batch_id`, `reference_id` |
| `suppliers` | `branches` | `purchases` | `id`, `branch_id`, `name`, `phone`, `code` |
| `purchases` | `branches`, `suppliers` | `purchase_items`, `purchase_returns` | `id`, `supplier_id`, `total_cost`, `status`, `payment_type` |
| `purchase_items` | `purchases`, `drugs` | — | `id`, `purchase_id`, `drug_id`, `quantity`, `cost_price`, `expiry_date` |
| `purchase_returns` | `purchases` | `purchase_return_items` | `id`, `purchase_id`, `total_refund`, `serial_id` |
| `purchase_return_items` | `purchase_returns`, `drugs` | — | `id`, `purchase_return_id`, `drug_id`, `quantity_returned`, `refund_amount` |
| `sales` | `branches` | `sale_items`, `returns` | `id`, `shift_id`, `total`, `status`, `payment_method`, `serial_id` |
| `sale_items` | `sales`, `drugs` | `sale_item_batches` | `id`, `sale_id`, `drug_id`, `quantity`, `unit_price`, `cost_price` |
| `sale_item_batches` | `sale_items`, `stock_batches` | — | `id`, `sale_item_id`, `batch_id`, `quantity`, `expiry_date` |
| `returns` | `sales` | `return_items` | `id`, `sale_id`, `total_refund`, `return_type`, `serial_id` |
| `return_items` | `returns`, `drugs` | — | `id`, `return_id`, `drug_id`, `quantity_returned`, `refund_amount`, `condition` |
| `shifts` | `branches` | `cash_transactions` | `id`, `branch_id`, `status`, `cash_sales`, `card_sales`, `returns`, `card_returns` |
| `cash_transactions` | `shifts` | — | `id`, `shift_id`, `type`, `amount`, `related_sale_id` |
| `customers` | `branches` | — | `id`, `branch_id`, `name`, `phone`, `code`, `points`, `total_purchases` |
| `expenses` | `branches`, `shifts` | — | `id`, `branch_id`, `shift_id`, `amount`, `category` |
| `audit_logs` | `branches` | — | `id`, `branch_id`, `actor_id`, `action`, `entity_type` |
| `login_audits` | — | — | `id`, `username`, `action`, `details`, `timestamp` |
| `active_sessions` | `auth.users` | — | `id`, `user_id`, `org_id`, `branch_id`, `is_active` |
| `employment_requests` | `organizations` | — | `id`, `org_id`, `target_username`, `status` |
| `daily_achievements` | `branches` | — | `id`, `branch_id`, `date`, `sales_target`, `sales_achieved` |
| `holidays` | `organizations` | — | `id`, `org_id`, `name`, `date`, `is_recurring` |
| `attendance_events` | `employees` | — | `id`, `employee_id`, `event_type` (IN/OUT), `timestamp` |
| `financial_snapshots` | `branches` | — | `id`, `branch_id`, `period_start`, `period_end`, `snapshot_data` |

### Data Flow Architecture

```
React Components (60+ pages)
      ↓
Hooks Layer (useSalesHandlers, usePurchaseHandlers, useReturns, useInventory, etc.)
      ↓
Service Layer (26 service modules — only 5 import supabase directly)
      ↓
Repository Layer (24 repos — all access supabase, correct architectural layer)
      ↓   ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
Supabase JS Client  +  Supabase RPCs (20+ PL/pgSQL SECURITY DEFINER functions)
      ↓                                       ↓
[CRUD via JS]                  [Atomic DB transactions with FOR UPDATE locking]
      ↓                                       ↓
PostgreSQL (140 migrations, RLS per org_id/branch_id, triggers, optimistic locking)
      ↓
Supabase Realtime (WebSocket — tables added 07/31 for returns, purchases, customers, etc.)
      ↓
React Query Cache → Zustand Stores (auth, pos, ui, keyboard) → React Components
```

---

## 2. Business Flows

### 2.1 Sales (Checkout)

| Step | Location | What Happens | Atomic? |
|------|----------|-------------|---------|
| Add to cart | `posStore` (Zustand) | In-memory cart, persisted to localStorage as compressed JSON | ❌ UI only |
| Multi-tab POS | `usePOSTabs` | Up to 10 tabs, closed-tab history with restore | ❌ UI only |
| Validate + build payload | `useSalesHandlers` | Permission check (`sale.create`), time validation, role-based limits | ❌ |
| **Atomic checkout** | `process_checkout` RPC | ① Validate employee ② Resolve shift (auto-detect if not given) ③ Atomic daily order number via `INSERT ... ON CONFLICT` ④ Generate serial `{BRANCH}-{YYYYMMDD}-{NNNN}` ⑤ INSERT sale record ⑥ Set stock context for trigger-based audit ⑦ **FEFO cursor with `FOR UPDATE`**: `ORDER BY (preferred) DESC, expiry ASC, created ASC` → greedy deduct from batches ⑧ If insufficient stock → `RAISE EXCEPTION` (full rollback) ⑨ INSERT sale_items ⑩ Update customer loyalty (points, visits, total_purchases) ⑪ **If cash**: INSERT cash_transaction + `atomic_increment_shift(cash_sales+=total)` ⑫ **If visa**: INSERT cash_transaction + `atomic_increment_shift(card_sales+=total)` ⑬ **If delivery**: skip cash until finalization | ✅ Single DB txn |
| Cache update | `useCompleteSale.onSuccess` | FIFO-sorted batch deduction in cache, prepend sales list, update shift totals | ✅ Correct FIFO |

**Payment Methods**: `cash`, `visa`, `credit` + `delivery` (pending finalization)

### 2.2 Purchases

| Step | Location | What Happens | Atomic? |
|------|----------|-------------|---------|
| Create PO | `purchaseService.create` | INSERT `purchases` + `purchase_items`, status = `pending` | ❌ Sequential inserts |
| Approve | `purchaseService.approve` | status → `approved`, records `approved_by`, `approval_date` | ✅ Single UPDATE |
| **Mark received** | `process_purchase_receipt` RPC | ① Lock purchase `FOR UPDATE` ② Validate not already received/rejected ③ For each item: resolve unit qty, resolve expiry (default +1yr), INSERT `stock_batches` (trigger logs `stock_movements`), recalculate **WAC**: `SUM(qty×cost)/SUM(qty)` from all active batches ④ UPDATE `drugs`: `public_price`, `cost_price` (WAC×unitsPerPack), `unit_cost_price` (WAC), `expiry_date` (earliest across batches) ⑤ UPDATE purchase: status=`received`, `received_by`, `received_at` ⑥ **If cash**: INSERT cash_transaction + `atomic_increment_shift(cash_purchases+=total)` | ✅ Single DB txn |
| Direct purchase | `processDirectPurchaseTransaction` | Create + receive in one step with UndoManager rollback | ✅ Service + DB |

**Status Machine**: `pending → approved → received` (or `→ rejected`, or `→ completed` for direct buy)

### 2.3 Sales Returns

| Step | Location | What Happens | Atomic? |
|------|----------|-------------|---------|
| Permission + validation | `useSalesHandlers` | `sale.refund` check, role limits (cashier: 500 EGP, pharmacist: 1000 EGP), open shift required | ❌ |
| **Process return** | `process_return` RPC | ① Lock sale `FOR UPDATE` ② Lock shift `FOR UPDATE` ③ Generate serial `RET-YYYYMMDDNNN` ④ INSERT `returns` header ⑤ Set stock context `return_customer` ⑥ For each item: validate `qty ≤ available_to_return` (reads `item_returned_quantities` JSONB on sale), calculate refund `qty × price × (total/subtotal)`, find batch from `stock_movements` where `reference_id = sale_id`, **if `condition = 'sellable'`**: `UPDATE stock_batches SET qty += return_units`, UPDATE `sales.item_returned_quantities` tracking ⑦ Reverse loyalty points proportionally ⑧ **If cash**: INSERT cash_transaction(-amt) + `atomic_increment_shift(returns+=amt)` ⑨ **If visa**: INSERT cash_transaction + `atomic_increment_shift(card_returns+=amt)` | ✅ Single DB txn |

### 2.4 Purchase Returns

| Step | Location | What Happens | Atomic? |
|------|----------|-------------|---------|
| **Process return** | `process_purchase_return` RPC | ① Branch permission check (`has_branch_permission`) ② Validate required fields ③ INSERT `purchase_returns` header ④ For each item: lock drug `FOR UPDATE`, set stock context `return_supplier`, INSERT `purchase_return_items`, **FIFO deduct** from batches (`ORDER BY expiry ASC, created ASC FOR UPDATE`, take `LEAST(remaining, batch.quantity)`), if insufficient stock → `RAISE EXCEPTION` ⑤ **If cash**: INSERT cash_transaction(+amt) + `atomic_increment_shift(cash_purchase_returns+=amt)` | ✅ Single DB txn |

### 2.5 Inventory / Stock

| Operation | Mechanism | Where |
|-----------|-----------|-------|
| Stock tracking | `drugs.stock` (aggregate) + `stock_batches.quantity` (per-batch) | Synced via DB triggers + RPCs |
| FEFO allocation | `ORDER BY (preferred) DESC, expiry ASC, created ASC` with `FOR UPDATE` | `process_checkout` RPC |
| WAC calculation | `SUM(qty × cost_price) / NULLIF(SUM(qty), 0)` across active batches | `process_purchase_receipt` RPC |
| Stock adjustment | `process_stock_adjustment` RPC with approval workflow | `inventoryService` |
| Barcode search | DB ILIKE → fallback to in-memory HashMap O(1) | `drugSearchService` |
| Drug approval | `global_drugs → drug_approvals(pending) → approve_global_drugs` RPC | Creates drug + initial batch + `initial` stock movement |
| Movement types (10) | `initial`, `purchase`, `return_customer`, `transfer_in`, `sale`, `return_supplier`, `damage`, `transfer_out`, `adjustment`, `correction` | `stock_movements` table |
| Trigger logging | `fn_log_stock_movement` on `stock_batches` INSERT/UPDATE/DELETE | Reads session vars set by `set_stock_context` |

### 2.6 Cash Register / Shifts

| Step | Location | What Happens | Atomic? |
|------|----------|-------------|---------|
| Open shift | `open_shift` RPC | Creates shift `status='open'`; partial unique index `idx_shifts_branch_open` prevents double-open | ✅ |
| Close shift | `close_shift` RPC | Calculates expected balance, validates against closing balance | ✅ |
| Cash in/out | `process_cash_transaction` RPC | + `atomic_increment_shift` with balance check | ✅ |
| All sales/returns | Embedded in respective RPCs | `atomic_increment_shift` with `PERFORM 1 FROM shifts FOR UPDATE` (P1 fix prevents TOCTOU) | ✅ |

**Shift columns**: `cash_sales`, `card_sales`, `returns`, `card_returns`, `cash_purchases`, `cash_purchase_returns`, `cash_in`, `cash_out`, `total_discounts`, `cash_invoice_count`, `card_invoice_count`

---

## 3. Security & Concurrency

| Concern | Protection | Details |
|---------|-----------|---------|
| Tenant isolation | RLS policies | All tables filtered by `org_id IN (get_user_org_ids())` or `branch_id IN (get_user_branch_ids())` |
| Critical table protection | RLS: SELECT-only | `stock_batches`, `stock_movements` — read via RLS, mutations only via SECURITY DEFINER RPCs |
| Concurrent overselling | `FOR UPDATE` on batch SELECT | FEFO cursor locks batch rows — **P0 fix** (`20260720171500`) |
| Shift balance race | `PERFORM 1 FROM shifts FOR UPDATE` | Prevents TOCTOU on shift balance check — **P1 fix** (`20260720171500`) |
| Double shift open | Partial unique index | `UNIQUE INDEX idx_shifts_branch_open WHERE status = 'open'` |
| Search path hijacking | `SET search_path = public` | Applied in all SECURITY DEFINER RPCs |
| Optimistic locking | `version` column | `stock_batches.version` incremented on each write |
| Auth | Supabase Auth + WebAuthn | Biometric login, password, attendance PIN |
| RLS recursion fix | Converted to `LANGUAGE plpgsql` | Fixed PostgreSQL error 42P17 (`20260717`) |

### RLS Policy Summary

| Scope | Tables | Policy |
|-------|--------|--------|
| `org_id` | `organizations`, `branches`, `employees`, `drugs`, `sales`, `purchases`, `customers`, `suppliers`, `shifts` | `org_id IN (SELECT get_user_org_ids())` |
| `branch_id` | `sale_items`, `sale_item_batches`, `return_items`, `purchase_items`, `purchase_returns`, `expenses` | `branch_id IN (SELECT get_user_branch_ids())` |
| SELECT-only | `stock_batches`, `stock_movements` | Read via RLS; mutations via SECURITY DEFINER RPCs only |
| Self + org | `employees` | `auth_user_id = auth.uid() OR org_id IN (...)` |
| Self only | `user_profiles`, `user_active_sessions` | `auth.uid() = user_id` |

---

## 4. Database Schema — 37 Tables, 140 Migrations

### Evolution Timeline

```
Mar 2026  — Initial schema + multi-tenant (2 migrations)
Apr 2026  — Global catalog, pricing, org_id backfill, atomic ops foundation (12 migrations)
May 2026  — Core RPCs (checkout, return, cancellation, purchase receipt), FEFO, cash system, shortages, financial reports (40+ migrations)
Jun 2026  — Employee portal, attendance, employment requests, user profiles, login audits, active sessions, security audit (40+ migrations)
Jul 2026  — Phase 3 JSONB split-brain fix, 38 FK indexes, P0/P1 concurrency, RLS cleanup, card/visa accounting, realtime, dashboard (45+ migrations)
```

### Key RPC Functions

| RPC | Purpose | Tables Touched |
|-----|---------|---------------|
| `process_checkout` | Atomic sale | sales, sale_items, stock_batches, shifts, cash_transactions, customers |
| `process_return` | Atomic customer return | returns, return_items, stock_batches, sales, shifts, cash_transactions, customers |
| `process_cancellation` | Cancel sale + restore stock | sales, stock_batches, stock_movements, shifts, cash_transactions |
| `process_order_modification` | Modify delivery order | sales, sale_items, stock_batches |
| `finalize_delivery_order` | Complete delivery + record payment | sales, cash_transactions, shifts |
| `process_purchase_receipt` | Receive purchase + create batches | purchases, stock_batches, drugs, shifts, cash_transactions |
| `process_purchase_return` | Return to supplier | purchase_returns, stock_batches, shifts, cash_transactions |
| `process_stock_adjustment` | Manual inventory adjustment | drugs, stock_batches, stock_movements |
| `atomic_increment_shift` | Thread-safe shift counter | shifts (with FOR UPDATE self-lock) |
| `atomic_increment_stock` | Thread-safe drug stock | drugs (with version check) |
| `atomic_increment_batch` | Thread-safe batch qty | stock_batches (with version check) |
| `open_shift` / `close_shift` | Shift lifecycle | shifts |
| `approve_global_drugs` | Copy global drug → branch | drugs, stock_batches, stock_movements, drug_approvals |
| `set_stock_context` | Session vars for movement triggers | (session variables) |
| `get_financial_report` | P&L report | sales, purchases, expenses, shifts |
| `get_daily_financial_breakdown` | Daily revenue/refund | sales, returns |
| `get_shortages_predictive_alerts` | Shortage predictions (Pareto ABC) | drugs, stock_batches |
| `verify_employee_credentials` | Attendance PIN/password auth | employees |
| `delete_expense` | Atomic expense delete + shift revert | expenses, shifts |
| `sync_user_profile_to_employee` | Trigger: auth → employee sync | user_profiles, employees |
| `accept_employment_request` | Accept employment invitation | employment_requests, employees |
| `logout_employee_session` | Terminate session | active_sessions |

---

## 5. Production Readiness Scorecard

| Domain | Status | Grade | Notes |
|--------|--------|-------|-------|
| **Sales checkout** | ✅ Ready | A | Atomic RPC with FEFO + FOR UPDATE + FIFO cache update |
| **Purchase receipt** | ✅ Ready | A | Atomic RPC with WAC + batch creation + shift update |
| **Sales return** | ✅ Ready | A | Proportional refund, condition-aware stock restore, loyalty reversal, card_returns support |
| **Purchase return** | ✅ Ready | A | FIFO deduct, cash refund, shift credit |
| **Stock adjustment** | ✅ Ready | A | Approval workflow + audit trail |
| **Cash register** | ✅ Ready | A | `atomic_increment_shift` with balance lock (P1) + card tracking |
| **RLS security** | ✅ Covered | A- | All tables isolated; stock tables read-only via RLS; recursion fixed |
| **Concurrency** | ✅ Addressed | B+ | P0/P1 fixed; no idempotency key on checkout yet |
| **Realtime events** | ✅ Fixed 07/31 | B | 6 tables (returns, purchases, customers, suppliers, shifts, cash_transactions) were missing from publication |
| **Card/visa tracking** | ✅ Fixed 07/29-31 | B | Was invisible to register until recent patches |
| **Audit trail** | ✅ Complete | A | `stock_movements` via triggers, `audit_logs` for business events |
| **Frontend cache** | ✅ Correct | A | FIFO batch deduction, proper expiry handling, items fetched on approve |
| **Test coverage** | ❌ Minimal | D | 6 concurrency integration tests only; zero RPC unit tests |
| **Performance** | ⚠️ Needs work | C | 20+ tables with `enableVirtualization={false}`, over-fetching columns |
| **Code architecture** | ✅ Mostly clean | B+ | 24 repos in correct layer; 5 services bypass repos; JSONB split-brain fix pending deployment |

---

## 6. Production Readiness Details

### ✅ What's Production-Ready

| Feature | Why |
|---------|-----|
| **Atomic checkout** | `process_checkout` RPC runs in single DB transaction with FOR UPDATE on batches. FEFO allocation. Shift + cash + loyalty updated atomically. |
| **Atomic purchase receipt** | `process_purchase_receipt` RPC creates batches, recalculates WAC, updates drug pricing, records cash transaction — all in one txn. |
| **Atomic returns (both directions)** | `process_return` validates available qty, restocks condition-appropriate batches, reverses loyalty. `process_purchase_return` uses FIFO deduct. |
| **Cash register integrity** | `atomic_increment_shift` self-locks with `FOR UPDATE` before every balance change (P1 fix). Partial unique index prevents double open. |
| **Concurrency safety** | P0 (overselling) + P1 (shift TOCTOU) fixes applied. Optimistic locking via `version` column on `stock_batches`. |
| **Tenant isolation** | RLS on all tables by `org_id`/`branch_id`. Critical tables (`stock_batches`, `stock_movements`) are SELECT-only via RLS. |
| **Audit trail** | `fn_log_stock_movement` trigger auto-logs every batch change. `audit_logs` for business events. `login_audits` for auth events. |
| **Frontend cache consistency** | `useCompleteSale` does proper FIFO batch deduction in cache. `useApprovePurchase` fetches items from server before updating cache. No `|| new Date()` expiry fallback. |
| **Card/visa separation** | Latest RPCs (07/29-31) properly record card sales and card returns in `cash_transactions` and shift counters. |
| **Realtime events** | All relevant tables added to `supabase_realtime` publication (fixed 07/31). |

### ⚠️ Items Needing Verification

| Item | What to Check |
|------|--------------|
| **Phase 3 JSONB migrations** | Verify `20260720_migrate_purchase_items_jsonb.sql`, `20260722_phase3_rpc_rewrites.sql`, `20260721_drop_jsonb_items.sql` have been applied to DB. If not, `sales.items` and `purchases.items` JSONB columns still duplicate relational data. |
| **38 FK indexes** | Verify `20260719_add_fk_indexes.sql` was applied. Without it, JOINs on `sale_items.drug_id`, `cash_transactions.shift_id`, etc. do sequential scans. |
| **Historical secrets in git** | `SUPABASE_SERVICE_ROLE_KEY` exists in git history (commits before `028820ad`). Rotate the key and purge history if repo is public. |

---

## 7. Performance Issues

| Issue | Location | Impact | Severity |
|-------|----------|--------|----------|
| `enableVirtualization={false}` | 20+ table components | DOM bloat, lag with 1000+ items | 🔴 High |
| Over-fetching columns | `inventoryRepository.getAll` (27 cols), `salesRepository.listPage` (37 cols), `employeeRepository.getAll` (includes biometric keys) | ~40-60% unnecessary data per query | 🟡 Medium |
| Broad cache invalidation | `queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', ...] })` | Every mutation refetches all dashboard data | 🟡 Medium |
| Layout thrashing | `POS ClosedTabsHistoryModal` — `getBoundingClientRect()` in render body | UI jank on state changes | 🔴 High |
| Unthrottled scroll listener | `Tooltip.tsx` — `getBoundingClientRect` + `offsetWidth/Height` on every scroll | Performance degradation on scroll | 🔴 High |
| Full icon bundle | `import * as Myna` via dynamic Proxy prevents tree-shaking | Larger bundle size | 🟡 Medium |

---

## 8. Remaining Gaps

| Priority | Gap | Current State | Action |
|----------|-----|--------------|--------|
| **🔴 P0** | No idempotency on checkout | `process_checkout` has no idempotency key. Duplicate submission test (`test6`) expected to fail. | Add idempotency key to RPC |
| **🔴 P0** | Secrets in git history | `SUPABASE_SERVICE_ROLE_KEY` exists in git commits before `028820ad` | Rotate key, purge git history |
| **🔴 P0** | Layout thrashing + scroll perf | 3 critical audit issues from `audit-report.json` (May 2026 — verify still present) | Fix in POS modal + Tooltip |
| **🟡 P1** | 38 FK indexes pending | Migration `20260719_add_fk_indexes.sql` exists | Verify and deploy |
| **🟡 P1** | Phase 3 JSONB fix pending | Migrations `20260720/21/22` exist | Verify applied to DB |
| **🟡 P1** | Zero RPC unit tests | No tests for any of 20+ money-handling SQL functions | Add tests |
| **🟡 P1** | Card/visa flow validation | Patched 07/29-31, needs manual QA signoff | End-to-end test |
| **🟡 P1** | 5 services bypass repositories | `timeService`, `baseReportService`, `orgService`, `authService`, `stockMovementService` import supabase directly | Move queries to repos |
| **🟡 P2** | `enableVirtualization={false}` on 20+ tables | Inventory, customers, employees, suppliers, expiry, etc. | Enable virtualization |
| **🟡 P2** | Over-fetching in list queries | 27-37 columns returned for list views | Narrow column selections |
| **🟡 P2** | `process_return` refund calculation | RPC uses simplified `qty × price × (total/subtotal)`; `pricingService` uses `money.allocate()` | Align methods |
| **🟢 P3** | Address 35 audit-report.json issues | 3 critical, 12 high, 15 medium, 5 low (May 2026 — may be stale) | Re-audit and fix |
| **🟢 P3** | ReturnPolicy not enforced | `returnWindowDays`, `restockingFeePercent` exist in types only | Implement in RPC |

---

## 9. Test Coverage

| What Should Be Tested | Current State |
|-----------------------|---------------|
| `process_checkout` RPC | ❌ No tests |
| `process_return` RPC | ❌ No tests |
| `process_purchase_receipt` RPC | ❌ No tests |
| `process_purchase_return` RPC | ❌ No tests |
| `atomic_increment_shift` | ❌ No tests |
| `process_stock_adjustment` RPC | ❌ No tests |
| `process_cancellation` RPC | ❌ No tests |
| All 20+ RPC functions | ❌ Zero unit tests |
| Financial calculations (`pricingService`) | ❌ No tests |
| Concurrent oversell (P0 fix) | ✅ 1 integration test |
| Shift balance race (P1 fix) | ❌ No test |
| Multi-device consistency | ✅ 1 integration test |
| Reconnection recovery | ✅ 1 integration test |
| Duplicate submission (expected to fail) | ⚠️ 1 test expecting failure |
| RLS policy behavior | ❌ No tests |
| BaseRepository (unit tests) | ✅ 22 tests |

---

## 10. Summary

### The Database Layer is Production-Ready ✅
- Every critical flow runs as a `SECURITY DEFINER` PL/pgSQL function in a single database transaction
- FEFO allocation with `FOR UPDATE` row locking prevents overselling (P0)
- `atomic_increment_shift` with self-lock prevents balance corruption (P1)
- RLS on all tables enforces tenant isolation; stock tables are SELECT-only via RLS
- Card/visa accounting fixed (07/29-31), realtime publication fixed (07/31)
- `fn_log_stock_movement` trigger provides automatic audit trail

### The Frontend Cache is Correct ✅
- `useCompleteSale` does proper FIFO batch deduction (verified in code)
- `usePurchaseMutations` has no `|| new Date()` expiry fallback (verified)
- `useApprovePurchase` fetches items from server before cache update (verified)
- The test file `tests/optimistic_bugs.test.ts` describes old code that has been fixed

### Remaining Work Before Launch
1. **Verify Phase 3 JSONB migrations applied** — 3 migrations pending unknown status
2. **Verify 38 FK indexes deployed** — performance-critical
3. **Add idempotency key to checkout** — duplicate submissions not rejected
4. **Rotate service role key** — exists in git history
5. **Add RPC unit tests** — zero coverage on 20+ money-handling functions
6. **Fix performance issues** — `enableVirtualization={false}` on 20+ tables, layout thrashing

---

*Generated by AI audit — July 2026*
