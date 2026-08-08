# Sales & Returns — RPC / Migration Code Review

> Written by code review of the sales/returns RPC surface in `supabase/migrations/`.
> This is a **static code review record** — it documents the atomicity/authorization guarantees *as written*.
> It is NOT a substitute for a live race-condition run. When `.env.concurrency` credentials are
> available, run `tests/concurrency/*` and diff results against the expectations in §8.

## 1. Scope & method

Reviewed the migration SQL that defines and evolves the money-critical RPCs backing sales, returns,
cash, and shift handling. For each RPC only the **most recent** `CREATE OR REPLACE FUNCTION` definition
was treated as authoritative. Line numbers refer to the current files.

Key sources:
- `20260806000000_step2_new_serial_scheme.sql` — final `process_checkout` / `process_return`, new serial scheme
- `20260619000005_server_side_authorization.sql` — `has_branch_permission` + RLS hardening
- `20260804000001_authorization_hardening.sql` — checkout branch-permission gate
- `20260720171500_concurrency_fixes_p0_p1.sql` — earlier `FOR UPDATE` attempt
- `20260618000001_fix_process_return_unit_refund.sql`, `20260730000000_fix_process_return_visa.sql`,
  `20260731000000_add_card_returns_to_shifts.sql` — return/card refinements

## 1. `process_checkout` (final: `20260806000000_step2_new_serial_scheme.sql`)

**Authorization (blocking):** the function begins by requiring `has_branch_permission(...)`; on failure
it `return`s `{ success: false, error: 'Access denied...' }` rather than raising.

**`has_branch_permission` (`20260619000005...:8-40`):**
- `IF auth.uid() IS NULL THEN RETURN FALSE;` (lines 16-23). `service_role` calls have no JWT `sub`,
  so **every RPC gated by this returns `success:false` for service-role clients** — relevant to the
  concurrency suite which drives RPCs with the service key (see §11).

**Stock & batch logic:**
- Shift is resolved from the payload `shiftId` or an open record for the branch (`step2...:192-197`).
- Loop over `p_payload->'items'` (line 230); for each item a batch allocation cursor is chosen and a
  `sale_item_batches` row is inserted. **No `WHERE quantity >=` guard and no `FOR UPDATE` on the
  `stock_batches` row in the final definition.** `20260720171500:112-117` had added `FOR UPDATE` to the
  decrement, but every later `CREATE OR REPLACE` (including the final serial-scheme rewrite) dropped it.
  Consequence: two concurrent checkouts on qty=1 can both decrement → double sale (P0 oversell race,
  see §10-1).
- `cash_transactions` inserts happen **only when a shift exists** (`v_shift_id IS NOT NULL`) AND the
  payload `status` is `completed`: `sale` for cash (line ~299) / `card_sale` for visa (lines ~305-310).

**Response shape (mapping mismatch):** the RPC returns
`sale = <row_to_json(sales)> || jsonb_build_object('items', [ { id: drug_id, quantity, publicPrice,
isUnit, saleItemId, unitsPerPack, batchAllocations: [...] }, ... ])` (lines 313-337).
The item `id` here is the **drug_id**. However `salesRepository.mapFromDb`
(`services/sales/repositories/salesRepository.ts:86`) reads `db.sale_items`, and
`transactionService.processCheckout` passes `data.sale` straight to it. Net effect: on a successful
checkout, the client maps **`items: []`** and all `batchAllocations`/`batchNumber`/`expiryDate` from the RPC
are discarded. The POS receipt path (`usePOSCheckout.ts`) consumes this response -> the mapped sale used for
display/loyalty lacks its line items. **Flagged as the highest-impact mapping defect.**

## 2. `process_return` (same file, lines ~384-500)

- Builds return payload, requires an **open shift** for the sale's branch (`WHERE status='open' ... FOR
  UPDATE`; returns `success:false, 'No active shift found'` if none).
- Recomputes refund with `sale_item `price derived from the item snapshot (unit vs pack), inserts
  `return_items`/`returns`, decrements the batch quantity (restock), updates the sale
  `item_returned_quantities`/`net_total`/`has_returns`/`status`, and writes a `cash_transactions` row for
  the refund (cash vs card branch; card-refund type added for visa `20260730000000`, card returns added
  to shifts `20260731000000`).
- Requires `has_branch_permission` too — service-role calls return `Access denied`.
- **Client payload contract gap:** only the top-level `returnData.reason` is sent into the RPC payload
  (`services/transactions/transactionService.ts:239-245`); per-item `ReturnItem.reason` values are dropped.

## 4. `process_cancellation` / `process_order_modification`

- Cancellation restores stock and reverses the sale/cash effect through the same shift-accounting helpers.
- Modification computes stock delta and rewrites totals, then re-syncs cash if payment method changed.
- Both are name-only wrappers verified to exist in the concurrency suite assumptions; the deeper math was
  not re-derived line-by-line here (the client-side orchestration is in `transactionService.ts`).

## 5. `open_shift` / `close_shift` / `process_cash_transaction`

- `close_shift` (final definition) performs the expected-vs-closing math **server-side**: it computes
  `expected_balance` from opening + cash sales + cash in + cash purchase returns - cash purchases - returns -
  cash out (mirroring the client `utils/shiftCalculations.ts`), takes `closing_balance` from the caller
  payload, returns/rejects already-closed shifts, and locks the shift row `FOR UPDATE`. A computed
  `difference` is returned but **not enforced/validated** by the RPC.
- `process_cash_transaction` enforces an allowed enum of `type` values (`sale`, `card_sale`, `cash_in`,
  `cash_out`, `expense`, `refund`, ...) and writes a `shifts`/`cash_transactions` pair.

## 6. Authorization / RLS surface

- RPCs are `SECURITY DEFINER` and gate every financially-significant action through
  `has_permission`. Direct client `insert/update/delete` on `sales`, `sale_items`, `stock_batches`,
  `cash_transactions`, `shifts` is blocked by RLS (hardened in `20260804...`).
- **Operational consequence:** any automated/service-account integration that drives these RPCs with a
  service-role key will be denied. The concurrency suite in its current form is therefore not going to
  exercise the race conditions it measures (see §11).

## 7. Realtime publication

Realtime is enabled for the tables the flow touches (incl. `95.json` in
`20260731000000_enable_realtime_missing_tables.sql` and the sales `UPDATE` used by detail-view
subscriptions). Without an open shift, `cash_transactions` is never written, so event subscriptions on
that table stay empty (§11-1, §11-3).

## 8. Non-blocking observations

- **Idempotency:** no unique idempotency column/key on `sales` and no `ON CONFLICT` guard (verified by
  grep for `idempoten|dedup`). Two identical `process_checkout` calls create two sales rows. Documented
  P2; the concurrency `test6` forecasts this failure.
- **`expected == pos` / response vs client mapping** (§1) is a genuine integration defect that unit tests
  cannot catch (client mocks never exercise the SQL `items` key).
- **Serial generation** is centralized through RPCs (`update_rpc_serials`, `serial_centralization`); the
  migration set shows a transition from per-row serializer handling to a centralized scheme.

## 9. Migration files touching the surface (chronological)

`20260509000001` checkout · `20260509000002` atomic logic · `20260509000003` returns/cancel ·
`20260513000000` cash schema · `20260514000000/01` payload/returns opt · `20260515000000` security ·
`20260515000004` RPC→trigger refactor · `20260515000008` return v2 · `20260526000001` stock units ·
`20260618000001` return unit refund · `20260712000001` locks · `20260720171500` p0/p1 ·
`20260722` v3 rewrites · `20260724000000` serials · `20260725000000` return name null ·
`20260728000000` return lock · `20260729000000` card sales · `20260730000000` return visa ·
`20260731000000` card returns to shifts · `20260801000000` units per pack snapshot ·
`20260802000000` batch allocation fix · `20260805000010` serial centering · `20260806000000` step2 scheme

## 10. Confirmed findings (ranked)

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| 1 | `process_checkout` returns items under key `items`, client reads `sale_items` → items/alloc dropped on success | **P0** | `20260806000000:313-337` vs `salesRepository.ts:86`, `transactionService.ts:95-98` |
| 2 | Oversell guard: current `process_checkout` decrements `stock_batches` without `FOR UPDATE`/`WHERE quantity>=` | **P1** | `20260806000000:261-278` (later rewrites dropped the `20260720171500:112-117` lock) |
| 3 | `has_branch_permission` returns FALSE for `auth.uid() IS NULL` → service-role/key calls denied | default | `20260619000005:16-23` |
| 4 | No idempotency key/guard on duplicate `process_checkout` | **P2** | schema grep; helpers.ts payload has no key |
| 5 | `process_return` per-item `reason` never sent by client | **P2** | `transactionService.ts:239-245` |
| 6 | `close_shift` `difference` computed but not enforced server-side | P2 | `20260620000001:69-75` |

## 11. Expected live-run results (static predication)

Run via `npx tsx tests/concurrency/runner.ts` **after providing `.env.concurrency`**. Treat each test's own
`Result:` stdout line as authoritative — `runner.ts` swallows thrown errors and always prints `6 passed`.

| # | Test | Expected on current code | Why |
|---|------|--------------------------|-----|
| 1 | realtime latency | **FAIL / crashes** | no shift seeded ⇒ no `cash_transactions` INSERT ⇒ subscription never fires; service-role denied |
| 2 | concurrent oversell | **FAIL** | P0 lock regressed (§10-2); with service-role it also degrades to 0-success |
| 3 | multi-device consistency | **misleading PASS** | 5 subscribers each see 0 events ⇒ "all equal" |
| 4 | detail-view (return) | **FAIL / throws** | process_checkout `success:false`; process_return needs open shift (none seeded) |
| 5 | reconnection | **false positive** | RPCs blocked ⇒ 0 vs 0 ⇒ "auto-resync works" (meaningless) |
| 6 | duplicate submission | **expected FAIL** | no idempotency (§4) |

Before trusting any concurrency result: run with a **user JWT** for a seeded employee (not service key),
seed an **open shift**, and fix `seedTestEnv` (`organizations.owner_id`, `employee.phone`, `employee.start_date`
NOT NULL constraints) or pre-provision all four optional TEST_*_ID values.

## 12. Unified bug registry — test-locked, ticket-ready (P0 first)

Each row is also covered by a `it.skip("CURRENTLY BUGGY …")` test in the suite. The tests assert the **correct**
value (not the buggy one), so re-enabling one (`it.skip` → `it`) is the acceptance test for that fix: the test
will be red on current code and green only after the fix. To fix: apply the change, flip the test on, run it.

| Bug | Location | Current (buggy) behavior | Required (correct) behavior | Test lock |
|-----|----------|--------------------------|-----------------------------|-----------|
| ~~BUG-D5~~ | ~~`components/sales/pos/hooks/usePOSCart.ts:57-62`~~ | ~~Global discount wipes item discounts~~ | **RESOLVED BY REMOVAL (2026-08-07): global discount feature deleted (never reachable from UI, DB column always 0). See §13.** No longer a bug. | removed with feature |
| **BUG-010** | `hooks/sales/useReturnModalLogic.ts:208-226` | Card (visa) refund validated against **combined** opening+cash+card balance | Card refund must validate against the **card-only** balance | `useReturnModalLogic.test.tsx` `BUG-010` |
| **BUG-D6** | `utils/money.ts:101` (`allocate`) + `services/sales/pricingService.ts:61` | All-zero-quantity cart with tax → `taxAmount`/`subtotalExclTax` = `NaN` | Must be `0` | `pricingService.test.ts` `BUG-TEST-002` scenario |
| **BUG-D7** | `services/sales/pricingService.ts:101` (`calculateRefundAmount`) | Uneven full-line refund rounds per-unit pence → refunds `99.99` for a `100.00` share | Full-line refund must equal the line's `100.00` share | `pricingService.test.ts` `BUG-TEST-001` scenario |
| **BUG-D8** | `services/transactions/transactionService.ts:239-245` | `processReturn` never maps `ReturnItem.reason` → payload omits per-item reason | Per-item reason must be included in the return payload | `transactionService.test.ts:266` |
| **BUG-D9** | `services/returns/repositories/returnsRepository.ts:350,147` | Non-UUID search filters on `supplier_name` (phantom column) → PostgREST errors, branch can never match | Filter on `supplier_name_snapshot` (real column) | `returnsRepository.test.ts:712` |

> Note: earlier draft `BUG-D1` marker at `usePOSCart.ts:457` is **not a real bug** — the code already clamps via
> `Math.min(…, maxDiscount)`. Left as a stale source comment; no test locks it as buggy.