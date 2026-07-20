# Concurrency-Safety & Realtime-Replication Audit

Audit date: 2026-07-31  
Scope: All transactional RPCs + realtime subscription layer  
Environment: Zinc `feature/realtime-unification` branch

---

## Part 1 — Locking / Concurrency Audit

### 1.1 Audit table

| # | Function | Locking used | Atomic check-and-deduct? | Race-safe? | Risk | Fix |
|---|---|---|---|---|---|---|
| 1 | **process_checkout** | None on stock_batches SELECT; UPDATE has no `WHERE quantity >=` guard | **NO** — separate SELECT then UPDATE (TOCTOU) | **NO** — two concurrent calls reading same batch qty both decrement → oversell to negative stock | **CRITICAL** | Add `FOR UPDATE` on batch SELECT, or use `atomic_increment_batch()` which has `WHERE quantity + delta >= 0` |
| 2 | **process_return** | `FOR UPDATE` on sales, shifts, stock_movements | N/A (additive — restocking) | **YES** — sale locked prevents double-return | **LOW** | None |
| 3 | **process_purchase_receipt** | `FOR UPDATE` on purchases, drugs | N/A (INSERT only) | **YES** | **LOW** | None |
| 4 | **process_purchase_return** | `FOR UPDATE` on drugs, stock_batches (FEFO loop) | Partial — FOR UPDATE on read, but UPDATE lacks `WHERE quantity >=` guard | **YES-ish** — serialized by FOR UPDATE, but no defensive guard on UPDATE | **LOW-MEDIUM** | Add `WHERE quantity >= v_take` to UPDATE |
| 5 | **process_stock_adjustment** | `FOR UPDATE` on drugs, pending movements, stock_batches (all reads) | YES — FOR UPDATE + check-before-UPDATE | **YES** — well-locked | **LOW** | Minor: add quantity guard on UPDATE for defense-in-depth |
| 6 | **process_cancellation** | `FOR UPDATE` on sales, shifts, stock_movements | N/A (additive — stock restored) | **YES** | **LOW** | None |
| 7 | **open_shift** | Partial unique index `idx_shifts_branch_open` (no row locks) | N/A (INSERT only) | **YES** — unique index catches duplicates | **LOW** | None |
| 8 | **close_shift** | `FOR UPDATE` on shifts row | N/A (UPDATE + INSERT) | **YES** | **LOW** | None |
| 9 | **process_cash_transaction** | No FOR UPDATE on shift before `atomic_increment_shift` | **NO** — balance check in `atomic_increment_shift` reads without lock | **NO** — two concurrent cash-outs pass balance check if reads overlap | **MEDIUM** | Lock shift row inside `atomic_increment_shift` |
| 10 | **record_expense** | No FOR UPDATE on shift | Same TOCTOU in `atomic_increment_shift` | **NO** — same race as #9 | **MEDIUM** | Same fix |
| 11 | **delete_expense** | `FOR UPDATE` on expense row | N/A (reversion) | **YES** | **LOW** | None |
| 12 | **finalize_delivery_order** | `FOR UPDATE` on sale; no FOR UPDATE on shift before `atomic_increment_shift` | Partial — sale safe; shift balance has TOCTOU | **PARTIALLY** — sale safe, shift balance at risk | **LOW** (sale), **MEDIUM** (shift) | Same `atomic_increment_shift` fix |

### 1.2 Critical race in `process_checkout`

```
Batch Qty=10. Two concurrent sales each needing 6 units:
  Client A: SELECT (no lock) reads qty=10, takes 6, UPDATE → qty=4
  Client B: SELECT (no lock) reads qty=10 (stale!), takes 6, UPDATE → qty=-2
  Both pass "IF v_remaining_qty > 0" → both succeed → NEGATIVE STOCK
```

**Source:** `supabase/migrations/20260729000000_fix_process_checkout_card_sales.sql:115-128`

```sql
FOR v_batch_record IN
    SELECT id, quantity, expiry_date FROM stock_batches
    WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
    ORDER BY ...             -- ⚠️ NO FOR UPDATE
LOOP
    v_qty_to_take := LEAST(v_remaining_qty, v_batch_record.quantity);
    UPDATE stock_batches SET quantity = quantity - v_qty_to_take
    WHERE id = v_batch_record.id;   -- ⚠️ NO quantity >= guard
```

Compare with `process_stock_adjustment` which correctly uses `FOR UPDATE` on batch reads:

```sql
FOR v_batch IN
    SELECT * FROM public.stock_batches WHERE ...
    ORDER BY expiry_date ASC, created_at ASC
    FOR UPDATE          -- ✅ Correct
```

### 1.3 TOCTOU in `atomic_increment_shift` balance check

`atomic_increment_shift` does a SELECT (no lock) to calculate available balance, then checks, then UPDATEs. When called from functions that **do not** hold `FOR UPDATE` on the shift row (`process_cash_transaction`, `record_expense`), two concurrent calls can both pass the balance check.

**Source:** `supabase/migrations/20260728000000_fix_balance_lock_and_process_return.sql:32-43`

```sql
SELECT (...) INTO v_available_above_base
FROM shifts WHERE id = p_shift_id;   -- ⚠️ NO FOR UPDATE

IF v_available_above_base < (...) THEN
    RAISE EXCEPTION '...';
END IF;

UPDATE shifts SET ... WHERE id = p_shift_id;
```

### 1.4 Idempotency

**Finding: No protection against double-submit for any mutation.**

- No client-generated idempotency key in any mutation payload
- No UNIQUE constraint on `sales.serial_id`, `returns.serial_id`, `purchase_returns.serial_id`
- `daily_order_number` is atomic but each call gets a new number — retries create duplicate rows

A double-submit of `process_checkout` creates:
1. Duplicate sale row (different serial_id)
2. Double stock deduction
3. Double cash_sales increment
4. Two cash_transactions rows

### 1.5 Risk ranking

| Priority | Issue | Impact | Fix |
|---|---|---|---|
| **P0** | `process_checkout` missing FOR UPDATE on batch SELECT | Oversell → negative stock, financial loss | Add `FOR UPDATE` to batch SELECT or use `atomic_increment_batch` |
| **P1** | `atomic_increment_shift` TOCTOU on balance check | Shift balance bypasses cash control | Self-lock shift row inside `atomic_increment_shift` |
| **P2** | No idempotency on any mutation | Double-submit duplicates sales with cascading stock deductions | Add idempotency key + UNIQUE constraint to checkout first |
| **P3** | UPDATE statements lack defensive `WHERE quantity >=` guards | Defense-in-depth gap (currently protected by FOR UPDATE) | Add guards to UPDATE in process_purchase_return, process_stock_adjustment |

---

## Part 2 — Realtime Replication Tests

### Test scripts location

`tests/concurrency/` — 6 test scripts, each idempotent and self-cleaning.

### Test 1 — Realtime propagation latency

`tests/concurrency/test1_realtime_latency.ts`

- Client A subscribes to tenant channel via `supabase.channel()`
- Client B performs `process_checkout`
- Measures time from RPC response to Client A receiving the `postgres_changes` event
- Repeats 20 times; reports min/max/avg/p95

### Test 2 — Concurrent oversell attempt

`tests/concurrency/test2_concurrent_oversell.ts`

- Seeds stock_batch with quantity = 1
- Fires 2 `process_checkout` calls from separate clients simultaneously (`Promise.all`)
- Asserts: exactly 1 succeeds, 1 returns insufficient-stock error
- Final batch quantity = 0
- Runs 50 iterations with different seed rows

### Test 3 — Multi-device consistency after burst

`tests/concurrency/test3_multi_device_consistency.ts`

- 5 subscriber clients on same tenant channel
- 1 actor client fires 30 mixed transactions (sales/returns/purchases) rapidly
- After settle time, asserts all 5 subscribers' local state matches DB state exactly

### Test 4 — Detail-view consistency

`tests/concurrency/test4_detail_view_consistency.ts`

- Client A opens a specific sale (subscribes to channel filtered by sale_id)
- Client B processes a return against that sale
- Asserts Client A receives the change without manual refetch

### Test 5 — Reconnection recovery

`tests/concurrency/test5_reconnection_recovery.ts`

- Client A subscribed and receiving events
- Simulate dropped WebSocket
- Client B performs 3 transactions while disconnected
- Reconnect Client A
- Assert state converges to DB state

### Test 6 — Duplicate submission / idempotency

`tests/concurrency/test6_duplicate_submission.ts`

- Fire same `process_checkout` payload twice in quick succession
- Assert only one sale record created
- Currently expected to **fail** (no idempotency protection exists)

---

## Part 3 — Fix plan (ordered by priority)

### P0: `process_checkout` batch-lock gap

**Where:** `process_checkout` stock_batches SELECT loop  
**What:** Add `FOR UPDATE` to the FEFO batch cursor SELECT  
**Why:** Prevents oversell when two concurrent checkouts target the same batch

```diff
 FOR v_batch_record IN
     SELECT id, quantity, expiry_date FROM stock_batches
     WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
     ORDER BY (id = v_payload_id) DESC, expiry_date ASC, created_at ASC
+    FOR UPDATE
```

### P1: `atomic_increment_shift` self-lock

**Where:** `atomic_increment_shift` function  
**What:** Add `FOR UPDATE` on the shift row inside the function  
**Why:** Protects the balance-check-then-UPDATE sequence from TOCTOU races

```diff
+   PERFORM 1 FROM shifts WHERE id = p_shift_id FOR UPDATE;
    SELECT (...) INTO v_available_above_base
    FROM shifts WHERE id = p_shift_id;
```

### P2: Idempotency for checkout

**Where:** Client-side (generate key) + `sales` table (UNIQUE constraint)  
**What:** Add `idempotency_key UUID UNIQUE` column to `sales`; generate client-side and pass in payload; use `INSERT ... ON CONFLICT DO NOTHING`  
**Why:** Prevents duplicate sales from network retries / double-clicks

### P3: Defensive quantity guards

**Where:** `process_purchase_return` UPDATE, `process_stock_adjustment` UPDATE  
**What:** Add `WHERE quantity >= v_take` (or `WHERE quantity >= v_remaining`)  
**Why:** Defense-in-depth even if FOR UPDATE is bypassed
