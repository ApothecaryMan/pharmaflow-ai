# Supplier Payables & Purchase Cycle Completion Plan

## Context

The inventory side of the purchase cycle is production-grade (atomic receipt RPC, stock batches, FEFO, WAC cost, purchase returns, cash register integration). The **financial/accounts-payable side is entirely missing**:

- Suppliers have no opening balance, default payment terms, or current balance.
- Purchases support only binary `cash | credit`; the common Egyptian "part cash + part credit" is impossible.
- Credit purchases create **no liability record** — the payable is never tracked or paid.
- There is **no supplier payment screen, no ledger/statement, no aging report**.
- Cash transactions link to purchases only via free-text `reason` (no FKs).

This plan closes all of those gaps with a single coherent "supplier account ledger" design so that balances, statement, aging, and treasury stay in sync automatically.

## Design Decision: Ledger-Entry Backbone

Use a **`supplier_ledger_entries` table as the single source of truth** for every supplier balance movement. A supplier's current balance is `opening_balance + Σ(credit purchases) − Σ(credit returns/credits) − Σ(payments)`, derived from ledger rows. This gives:

- Current balance for free (no stored denormalized balance to drift).
- Supplier statement = chronological ledger rows with running balance.
- Aging = ledger rows bucketed by `due_date` (= purchase date + supplier credit_days).
- Atomic updates via the same SECURITY DEFINER RPC pattern already used in this repo.

All financial writes go through RPCs (never raw client inserts), matching the existing `process_purchase_receipt` / `process_purchase_return` / `process_cash_transaction` pattern.

## Payment Model: Unified "Credit + Linked Payment" (NOT a third payment type)

There is **no `cash | credit | mixed` enum and no `paid_amount` column**. Instead, every invoice is **fully credit** at the ledger level, and any money paid at receipt time is a **linked `supplier_payments` row** created in the same transaction:

1. **Every purchase** (regardless of how paid) creates a full payable ledger entry `('purchase', +total_cost, due_date = date + supplier.credit_days)`.
2. **If the user pays at receipt** (Cash = 100%, or Partial = a "paid now" amount):
   - A `supplier_payments` row is created for that amount, allocated to the purchase.
   - A ledger entry `('payment', −paid_now)` offsets the payable.
   - The cash drawer is hit immediately (cash transaction + shift counter).
   - Remaining balance (`total_cost − paid_now`) stays open on the supplier.
3. **Later settlements** use the same `supplier_payments` mechanism from the Supplier Payments page — identical code path.

Consequences:
- A **full-cash invoice is just a special case** of credit: payable + 100% payment on the same date. No separate code branch.
- The **Egyptian 50k / pay-20k-now case** needs zero extra schema — it's a partial `supplier_payments` row linked to the invoice.
- `purchases.payment_type` stays only as a **display hint** (legacy cash/credit badge); financial truth lives in the ledger + payments.

**Shift reconciliation note:** to preserve the existing register semantics, the **immediate payment at receipt** keeps the `'purchase'` cash transaction type + `cash_purchases` shift counter (unchanged behavior), while **later payments** use the new `'supplier_payment'` type + `cash_out` counter. Both write the same `supplier_payments` + ledger rows.

---

## Phase 0 — Cross-Cutting Fixes (prerequisite bugs)

| # | Fix | Why |
|---|-----|-----|
| F1 | Add `'card_return'` to `cash_tx_type` enum | Used in inserts (`20260731000000_add_card_returns_to_shifts.sql`) but never added — latent runtime failure |
| F2 | Add `'supplier_payment'` to `cash_tx_type` enum | Needed by the new payment flow |
| F3 | Add `purchases.notes TEXT` column | `purchaseService.reject()` writes `{ status:'rejected', notes }` but the column doesn't exist — field silently dropped |
| F4 | Add `related_purchase_id UUID` and `related_supplier_id UUID` to `cash_transactions` | Replace free-text `reason` linkage with real FKs for treasury traceability |

---

## Phase 1 — Schema & Migration

### 1.1 `suppliers` — extend (gap #1)
New columns:
- `opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0`
- `payment_type purchase_pay_type NOT NULL DEFAULT 'credit'` (default on new invoices)
- `credit_days INT NOT NULL DEFAULT 0` (0 = pay on receipt)
- `credit_limit NUMERIC(12,2)` (optional, nullable)

### 1.2 `purchases` — extend (gap #3, unified model)
New columns:
- `due_date DATE` (computed = date + supplier.credit_days; set on receipt)
- `notes TEXT` (from F3)
- **No `paid_amount`** — payments live in `supplier_payments` (see Payment Model above).
- `payment_type` stays as-is (`cash | credit`) purely as a display hint / legacy back-compat.

### 1.3 NEW `supplier_ledger_entries`
```sql
CREATE TYPE supplier_ledger_entry_type AS ENUM (
  'opening_balance', 'purchase', 'credit_note', 'payment',
  'purchase_reversal', 'credit_note_reversal', 'payment_reversal'
);
CREATE TYPE supplier_ledger_source AS ENUM (
  'suppliers', 'purchases', 'purchase_returns', 'supplier_payments'
);

CREATE TABLE supplier_ledger_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  org_id        UUID REFERENCES organizations(id),
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  entry_type    supplier_ledger_entry_type NOT NULL,  -- ENUM, not TEXT
  source_table  supplier_ledger_source NOT NULL,      -- ENUM, not TEXT
  source_id     UUID NOT NULL,  -- FK to the source row
  date          DATE NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,  -- SIGNED: + = we owe supplier, − = reduces debt
  due_date      DATE,                    -- for aging (only on 'purchase' entries)
  reversal_of   UUID REFERENCES supplier_ledger_entries(id),  -- NULL = live entry; set when this negates another
  created_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source_table, source_id, entry_type)
);
```
- `entry_type` and `source_table` are **ENUMs** (fixed values enforced by Postgres, not free TEXT) — includes dedicated reversal types so the `UNIQUE (source_table, source_id, entry_type)` guard survives reversals.
- One entry per financial event, inserted **inside the same RPC transaction** as the source row.
- `reversal_of` links a reversing entry back to the entry it cancels (see §2.6 Reversal Mechanism). Balance/statement/aging simply `SUM(amount)` over all entries — a reversal is a signed entry with opposite sign, so the running balance nets correctly with **zero special-casing**.

### 1.4 NEW `supplier_payments` (gap #5)
```sql
CREATE TABLE supplier_payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  org_id        UUID REFERENCES organizations(id),
  serial_id     TEXT UNIQUE,   -- SP-YYYYMMDDNNN via increment_sequence
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  date          DATE NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  payment_method payment_method_enum NOT NULL DEFAULT 'cash',  -- cash | bank | card
  reference     TEXT,          -- bank ref / cheque no.
  notes         TEXT,
  voided_at     TIMESTAMPTZ,   -- set by void_supplier_payment (§2.6)
  created_by    UUID,
  created_by_name TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  version       INT NOT NULL DEFAULT 1
);

-- Invoice allocation — REQUIRED (every paid unit tied to a specific invoice for exact aging)
CREATE TABLE supplier_payment_allocations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   UUID NOT NULL REFERENCES supplier_payments(id) ON DELETE CASCADE,
  purchase_id  UUID NOT NULL REFERENCES purchases(id),
  amount       NUMERIC(12,2) NOT NULL
);
```

### 1.5 NEW `supplier_credits` (credit notes from credit returns, gap #4)
Reuse `purchase_returns` + `purchase_return_items` and record a ledger entry of type `credit_note` when the return's `paymentMethod = 'credit'`. A dedicated `supplier_credits` table is **optional** and deferred — see Task T8 note.

### 1.6 New migration files
Follow the repo naming convention `YYYYMMDDHHMMSS_short_name.sql`. Suggested files (exact timestamps bumped above `20260804000002`):

| File | Content |
|------|---------|
| `20260805..._supplier_payables_schema.sql` | 1.1, 1.2, F3 |
| `20260805..._supplier_ledger_and_payments.sql` | 1.3 (enums + reversal_of), 1.4 (voided_at), indexes, RLS |
| `20260805..._supplier_payment_allocations.sql` | 1.4b + FK/index |
| `20260805..._fix_cash_tx_enum_and_links.sql` | F1, F2, F4 |
| `20260805..._supplier_reversal_rpcs.sql` | 2.6 reversal RPCs (reverse purchase/return, void payment) |

**RLS:** every new table gets `branch_id` isolation policies matching the existing `has_branch_permission()` pattern; service role bypass for RPCs.

---

## Phase 2 — RPCs & Triggers

### 2.1 Modify `process_purchase_receipt` (gaps #2, #3 — unified model)
Accepts optional `paidNow` in payload (0 or omitted for pure credit; `total_cost` for full cash; any amount for partial). For **every** purchase:
1. Always insert ledger entry `('purchase', amount = +total_cost, due_date = date + supplier.credit_days)`.
2. If `paidNow > 0`:
   - Insert `supplier_payments` row (`amount = paidNow`) + `supplier_payment_allocations` row linking to this purchase.
   - Insert ledger entry `('payment', amount = −paidNow)`.
   - Cash movement: `INSERT cash_transactions(type='purchase', amount=−paidNow, related_supplier_id, related_purchase_id)` + `atomic_increment_shift(cash_purchases=paidNow)` — same as today, keyed off the linked payment instead of a `paid_amount` column.
3. Set `purchases.due_date`.
- Back-compat: no `paidNow` → pure credit (no cash movement, no payment row); `paidNow = total` → behaves exactly like today's full-cash purchase. `payment_type` column is set for display only.

### 2.2 Modify `process_purchase_return` (gap #4)
- `paymentMethod = 'cash'` → unchanged (cash in).
- `paymentMethod = 'credit'` → no cash in; instead insert ledger entry `('credit_note', amount = −total_refund)`.

### 2.3 NEW `record_supplier_payment(p_payload JSONB, p_context TEXT)` (gap #5)
Atomic `SECURITY DEFINER` — **one genuinely shared code path** used by both the Supplier Payments page and (internally) the immediate payment inside `process_purchase_receipt`. `p_context IN ('standalone' | 'receipt')` is the **only** thing that switches the cash-side behavior — no duplicated logic:
- `p_context = 'standalone'` → cash tx type `'supplier_payment'` + shift `cash_out` counter (Supplier Payments page / later payments).
- `p_context = 'receipt'` → cash tx type `'purchase'` + shift `cash_purchases` counter (called from inside `process_purchase_receipt`).

Steps:
1. Validate branch + `has_branch_permission()`.
2. Insert `supplier_payments` (serial `SP-...` via `increment_sequence`), lock supplier row.
3. **Allocation — REQUIRED, never floating** (this is what keeps aging exact for later payments):
   - If the payload carries explicit allocations → validate `Σ allocated ≤ amount`, reject if greater.
   - Any amount left unallocated is auto-applied **FIFO** against open payables ordered by `due_date ASC, date ASC, created_at ASC`, creating `supplier_payment_allocations` rows until the payment is fully absorbed.
   - Result: every paid unit is always tied to a specific invoice → `get_supplier_aging` stays exact. There is **no "general payment on account"** concept.
4. Insert ledger entry `('payment', amount = −amount)`.
5. Cash per `p_context` (see above): `INSERT cash_transactions(type=?, amount=−amount, related_supplier_id, related_purchase_id)` + matching `atomic_increment_shift` counter.
6. Bank/card: skip cash drawer; optionally record in a bank column (T9 out of scope if no bank module).

### 2.4 NEW read functions (gaps #1, #6, #7)
- `get_supplier_balance(p_supplier_id)` → `opening_balance + Σ(ledger.amount)`.
- `get_supplier_statement(p_supplier_id, p_date_from, p_date_to)` → chronological ledger rows + running balance (window function).
- `get_supplier_aging(p_branch_id, p_as_of_date)` — **per-purchase remaining, bucketed by due_date**. Because allocation is mandatory, the remaining balance per invoice is computed **explicitly from allocations** — never the raw `total_cost`, and never a naive `SUM` of ledger entries (both would ignore what's already been paid against that specific invoice):

  ```
  remaining_per_purchase = purchases.total_cost
                          − Σ(supplier_payment_allocations.amount
                              WHERE allocations.purchase_id = purchases.id
                                AND allocations.payment.voided_at IS NULL)
  ```

  Each `remaining_per_purchase` is placed in the bucket determined by its `due_date` relative to `p_as_of_date` (`current / 1-30 / 31-60 / 61-90 / 90+`), then aggregated to a total per supplier. Invoices with `remaining ≤ 0` are excluded. Voided payments auto-reopen their invoice because their allocation rows are gone (see §2.6).

### 2.5 Trigger for opening balance (gap #1)
`fn_sync_supplier_opening_balance` AFTER INSERT/UPDATE of `suppliers.opening_balance` → upsert a single `('opening_balance', amount)` ledger entry, so the opening balance flows through the same ledger as everything else.

### 2.6 Reversal / cancellation mechanism (edits after ledger entries + payments exist)
**Policy: no in-place edits to financial rows.** Any purchase / return / payment that already has ledger entries is changed only by writing reversing entries — this keeps the ledger fully auditable and the running balance always correct (`SUM(amount)` still nets to 0 after a full reversal).

All three RPCs are `SECURITY DEFINER`, run in one transaction, and require `has_branch_permission()`:

- **`reverse_supplier_purchase(p_purchase_id, p_reason)`** — cancel/undo a received purchase:
  1. Reverse stock: `return_supplier`-style movement for the same quantities (FEFO), same path used by `process_purchase_return`.
  2. Reverse cash (if original had `paidNow`): cash-in `'purchase'` reverse transaction (amount = `paidNow`) + shift `cash_purchases` counter decrement.
  3. Reverse payments: void each linked `supplier_payments` row (`voided_at`) and insert mirror ledger entries `('payment_reversal', +amount, reversal_of)` for each.
  4. Insert mirror ledger entry `('purchase_reversal', −total_cost, reversal_of = original 'purchase' entry)`.
  5. Mark purchase `status = 'rejected'` with `notes = p_reason` (reuses existing status; no new statuses).

- **`reverse_supplier_purchase_return(p_return_id, p_reason)`** — undo a return: reverse the stock restore, reverse the cash-in (cash return) **or** insert a mirror `credit_note_reversal` entry (credit return), and clear the return.

- **`void_supplier_payment(p_payment_id, p_reason)`** — fix a mis-entered payment:
  1. **Delete the allocation rows exactly as they are** — each `supplier_payment_allocations` row reopens its own balance on the **same `purchase_id`** it was originally tied to. **No FIFO re-distribution** — FIFO only applies to *unallocated amounts at payment time*, never to reversing an already-allocated payment. The aging query picks up the freed amount automatically (the row no longer exists, so `remaining_per_purchase` increases on that exact invoice).
  2. Insert mirror ledger entry `('payment_reversal', +amount, reversal_of)` — restores the supplier-level balance.
  3. Refund cash drawer: cash-in reverse transaction + `cash_out` counter decrement (standalone) / `cash_purchases` decrement (receipt).
  4. Set `supplier_payments.voided_at`.

**Guard rule:** a purchase whose `paidNow > 0` can be reversed at any time — its payments are voided together in the same transaction, so the balance always unwinds to zero. Read-only consumers never need "ignore reversal" logic: they `SUM` all entries and the opposite-sign reversal cancels the original automatically.

---

## Phase 3 — Service Layer (new files)

| File | Purpose |
|------|---------|
| `types/supplierLedger.ts` | `SupplierLedgerEntry`, `SupplierStatementRow`, `EntryType` |
| `types/supplierPayment.ts` | `SupplierPayment`, `SupplierPaymentAllocation`, `PaymentMethod` |
| `types/aging.ts` | `AgingBucket`, `SupplierAgingRow`, bucket label helper |
| `services/suppliers/supplierAccountService.ts` | current balance, statement, aging, open-invoices list for FIFO (orchestration) |
| `services/suppliers/repositories/supplierAccountRepository.ts` | `.rpc('get_supplier_balance' / 'get_supplier_statement' / 'get_supplier_aging')`, open-payables query |
| `services/payments/supplierPaymentService.ts` | create payment (`p_context`), allocation + FIFO remainder, void, history list |
| `services/payments/repositories/supplierPaymentRepository.ts` | `.rpc('record_supplier_payment', { p_payload, p_context })`, `.rpc('void_supplier_payment')`, list queries |
| `hooks/suppliers/useSupplierPayments.ts` | form state + submit + optimistic update |
| `hooks/suppliers/useSupplierStatement.ts` | date-range query with running balance |
| `hooks/suppliers/useSupplierAging.ts` | as-of-date query |

### Modified files
- `types/suppliers.ts` — add `openingBalance`, `paymentType`, `creditDays`, `creditLimit`, `currentBalance?` (from RPC).
- `types/purchases.ts` — add `dueDate`, `notes`, `immediatePayment?` (display-only, derived from linked `supplier_payments`); **no `paid_amount`**.
- `services/purchases/repositories/purchaseRepository.ts` — pass `paidNow` into `process_purchase_receipt` payload.
- `services/returns/repositories/returnsRepository.ts` — pass return `paymentMethod='credit'` support into `process_purchase_return` payload.

---

## Phase 4 — New Pages (UI)

All new pages registered in `config/pageRegistry.ts` + `config/routes.ts` + `config/permissions.ts` + `config/permissionsMapping.ts` + `config/menuData.ts` (two already have menu placeholders).

| View id | File | Description | Permission |
|---------|------|-------------|------------|
| `supplier-payments` | `components/purchases/SupplierPayments.tsx` (NEW) | Register payment against supplier (cash/bank/card), REQUIRED invoice allocation, running payment history + void | `supplier.pay` |
| `supplier-statement` | `components/reports/SupplierStatement.tsx` (NEW) | Supplier picker + date range → chronological ledger with running balance, print/export | `supplier.statement` |
| `supplier-aging` | `components/reports/SupplierAging.tsx` (NEW) | Table of suppliers × aging buckets, totals, drill-in to statement | `supplier.aging` |

### Page spec — `SupplierPayments`
- Header: supplier select (shows live current balance), date, amount, payment method, reference, notes.
- **Allocation is REQUIRED — no "unallocated / general payment" option.** Allocation panel lists open credit purchases (from the aging query) with checkboxes → auto-fills amount. Any remainder the user leaves unallocated is shown as a hint ("X will be applied to your oldest invoices automatically") and assigned FIFO by the RPC — the UI never submits a truly unallocated payment. User cannot submit with `Σ allocated > amount`.
- Submit → `useSupplierPayments` → `record_supplier_payment(payload, p_context='standalone')` → refresh balance + history.
- History tab: `supplier_payments` list with allocations, serial `SP-...`, and a **Void** action (→ `void_supplier_payment`).

### Page spec — `SupplierStatement`
- Filters: supplier, date range. Table: `date | type | source ref | debit(owed) | credit(paid) | running balance`.
- Print via existing receipt/print infrastructure; `export` to CSV.

### Page spec — `SupplierAging`
- As-of date picker. Columns: `supplier | current | 1–30 | 31–60 | 61–90 | 90+ | total`. Row click → statement filtered to that supplier.

---

## Phase 5 — Existing Page Updates

| Page | Change |
|------|--------|
| `SuppliersList.tsx` | Add form fields: opening balance, default payment type, credit days, credit limit; add **Current Balance** column (from `get_supplier_balance`) |
| `Purchases.tsx` | Payment toggle → Cash / Credit / **Partial** (UI-level only; all three map to "full payable + linked payment" at the ledger). When Partial (or Cash), show "Paid Now" amount input (defaults from supplier terms) → creates a linked `supplier_payments` row; add **batch number** input per item (currently absent — populates `stock_batches.batch_number`) |
| `PurchaseReturns.tsx` | Refund method: Cash or **Credit (credit note to account)**; show resulting supplier balance |
| `CashRegister.tsx` + `ShiftHistory.tsx` | Render `supplier_payment` transactions; show supplier name via `related_supplier_id` |
| `PurchaseHistory.tsx` | Show immediate payment (linked `supplier_payments`), `due_date`, current payable, "Pay" shortcut linking to `supplier-payments` |

---

## Phase 6 — Permissions & Roles

- `config/permissions.ts`: add `supplier.pay`, `supplier.statement`, `supplier.aging`.
- `config/permissionsMapping.ts`: map new view ids.
- `config/employeeRoles.ts`: grant to `admin` + `manager` (pay limited to admin/manager; statement/aging view for cashier+).

---

## Task Checklist

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

### Phase 0 — Cross-cutting fixes
- [ ] **T0.1** Migration: add `'card_return'`, `'supplier_payment'` to `cash_tx_type` enum; add `purchases.notes`, `cash_transactions.related_purchase_id`, `related_supplier_id`
  - File: `supabase/migrations/20260805..._fix_cash_tx_enum_and_links.sql` · Est. 30 min · Depends: —
- [ ] **T0.2** Update `types/cash.ts`, `services/cash/repositories/cashRepository.ts` to map new FKs + `supplier_payment` type
  - Est. 30 min · Depends: T0.1

### Phase 1 — Schema
- [ ] **T1.1** Migration: extend `suppliers` (opening_balance, payment_type, credit_days, credit_limit) + `purchases` (due_date, notes)
  - File: `20260805..._supplier_payables_schema.sql` · Est. 1 hr · Depends: T0.1
- [ ] **T1.2** Migration: `supplier_ledger_entries` (entry_type/source_table ENUMs + reversal_of), `supplier_payments` (+voided_at), `supplier_payment_allocations` + indexes + RLS
  - File: `20260805..._supplier_ledger_and_payments.sql` · Est. 1.5 hr · Depends: T1.1
- [ ] **T1.3** Update `src/types/supabase.ts` / `types/suppliers.ts` / `types/purchases.ts` for new columns
  - Est. 30 min · Depends: T1.1, T1.2

### Phase 2 — RPCs
- [ ] **T2.1** Modify `process_purchase_receipt`: always full-payable ledger entry; optional `paidNow` → linked `supplier_payments` + allocation + cash `'purchase'` tx; set due_date
  - File: `20260805..._modify_process_purchase_receipt.sql` · Est. 2.5 hr · Depends: T1.2
- [ ] **T2.2** Modify `process_purchase_return`: credit-note ledger entry path
  - File: `20260805..._modify_process_purchase_return.sql` · Est. 1.5 hr · Depends: T1.2
- [ ] **T2.3** New `record_supplier_payment(p_payload, p_context)` RPC — shared path; `p_context` picks cash type/counter; REQUIRED allocation + FIFO fallback
  - File: `20260805..._record_supplier_payment.sql` · Est. 3 hr · Depends: T1.2
- [ ] **T2.4** New `get_supplier_balance`, `get_supplier_statement`, `get_supplier_aging` — aging uses `remaining = purchases.total_cost − Σ(allocations, payment not voided)` per invoice, bucketed by due_date
  - File: `20260805..._supplier_account_queries.sql` · Est. 2.5 hr · Depends: T1.2
- [ ] **T2.5** Trigger `fn_sync_supplier_opening_balance`
  - File: `20260805..._supplier_opening_balance_trigger.sql` · Est. 45 min · Depends: T1.1
- [ ] **T2.6** Reversal RPCs: `reverse_supplier_purchase`, `reverse_supplier_purchase_return`, `void_supplier_payment`
  - File: `20260805..._supplier_reversal_rpcs.sql` · Est. 3 hr · Depends: T2.1, T2.2, T2.3

### Phase 3 — Services (new files)
- [ ] **T3.1** `types/supplierLedger.ts`, `types/supplierPayment.ts`, `types/aging.ts`
  - Est. 30 min · Depends: T1.3
- [ ] **T3.2** `services/suppliers/supplierAccountService.ts` + `repositories/supplierAccountRepository.ts`
  - Est. 1 hr · Depends: T2.4
- [ ] **T3.3** `services/payments/supplierPaymentService.ts` + `repositories/supplierPaymentRepository.ts` (p_context, FIFO remainder, void)
  - Est. 1.25 hr · Depends: T2.3
- [ ] **T3.4** Hooks `useSupplierPayments`, `useSupplierStatement`, `useSupplierAging`
  - Est. 1 hr · Depends: T3.2, T3.3
- [ ] **T3.5** Update `purchaseRepository` to pass `paidNow` into receipt payload; update `returnsRepository` for credit-return
  - Est. 45 min · Depends: T2.1, T2.2

### Phase 4 — New pages
- [ ] **T4.1** `components/purchases/SupplierPayments.tsx` + register view `supplier-payments`
  - Est. 3 hr · Depends: T3.3, T3.4
- [ ] **T4.2** `components/reports/SupplierStatement.tsx` + view `supplier-statement`
  - Est. 2.5 hr · Depends: T3.2
- [ ] **T4.3** `components/reports/SupplierAging.tsx` + view `supplier-aging`
  - Est. 2.5 hr · Depends: T3.2
- [ ] **T4.4** Register routes/permissions/menu (`config/routes.ts`, `pageRegistry.ts`, `permissions.ts`, `permissionsMapping.ts`, `employeeRoles.ts`, `menuData.ts`); add AR labels to `i18n/translations.ts`
  - Est. 1 hr · Depends: T4.1–T4.3

### Phase 5 — Existing page updates
- [x] **T5.1** `SuppliersList.tsx`: opening balance, payment terms, current balance column
  - Est. 1.5 hr · Depends: T3.2
- [x] **T5.2** `Purchases.tsx`: Cash/Credit/Partial toggle + "Paid Now" amount (linked payment) + batch number input
  - Est. 3 hr · Depends: T2.1, T3.5
- [x] **T5.3** `PurchaseReturns.tsx`: credit-note option + balance display
  - Est. 1.5 hr · Depends: T2.2
- [x] **T5.4** `CashRegister.tsx`, `ShiftHistory.tsx`, `PurchaseHistory.tsx`: supplier_payment rendering + payable/pay shortcut
  - Est. 1.5 hr · Depends: T0.2, T4.1

### Phase 6 — Permissions & i18n
- [ ] **T6.1** `config/permissions.ts` + `permissionsMapping.ts` + `employeeRoles.ts` grants
  - Est. 30 min · Depends: T4.4
- [ ] **T6.2** AR/EN strings for all new pages + `npm run check-translations`
  - Est. 45 min · Depends: T4.4

### Verification
- [ ] **T7.1** `npm run type-check` (tsc --noEmit) clean
- [ ] **T7.2** `npm run lint` clean
- [ ] **T7.3** Unit tests: ledger math (balance = opening + credit purchases − payments − credits), aging buckets **with per-invoice allocation math** (partial payment on invoice X reduces only X's bucket; void of an allocated payment reopens the same X, not FIFO elsewhere), statement running balance, FIFO allocation of unallocated remainder, reversal netting (reversal cancels original → balance 0) (`vitest`)
- [ ] **T7.4** Manual E2E: full-cash purchase (= payable + 100% linked payment), partial paid-now purchase (20k now / 30k open), pure credit purchase → statement reflects all three; pay partial later from Supplier Payments (allocated + FIFO remainder) → balance & aging update; credit return → credit note appears; reverse a received purchase + void a payment → balance nets to zero

### Deferred (documented, out of scope this pass)
- [ ] Bank/card ledger module (T9) — bank transfers recorded as non-cash payments only.
- [ ] Dedicated `supplier_credits` table — credit notes live in ledger + `purchase_returns` for now.
- [ ] Purchase-order vs receipt split (PO table) — kept as status workflow per current design.
- [ ] `suppliers.credit_limit` enforcement at receipt time (alert-only initially).

---

## Data-Model Relationship Summary

```
suppliers ──1:N── supplier_ledger_entries ──┬─1:1── source (suppliers / purchases / purchase_returns / supplier_payments)
   │
   ├── opening_balance (ledger 'opening_balance')
   └── payment_type + credit_days → defaults on purchases & due_date

purchases ── full payable → ledger 'purchase' (+ due_date); paidNow → supplier_payments + allocation
purchase_returns ── cash → cash-in / credit → ledger 'credit_note' (−)
supplier_payments ── amount → ledger 'payment' (−) + cash_transactions('purchase' | 'supplier_payment') + allocations (required / FIFO)
reversals ── mirror ledger entries (entry_type *_reversal, reversal_of) for reverse purchase / reverse return / void payment
cash_transactions ── related_supplier_id / related_purchase_id (Phase 0)
```

Every balance change is a signed ledger row written atomically inside its RPC, so `get_supplier_balance` / statement / aging are derivations of one source of truth — no stored balances to drift.
