-- ============================================================
-- T1.1 — Extend suppliers (payables master data) + purchases
-- Date: 2026-08-05
--
-- suppliers:
--   opening_balance  — prior debt recorded once, flows through the
--                      ledger via fn_sync_supplier_opening_balance.
--   payment_type     — default payment type for new invoices
--                      ('credit' is the sensible Egyptian default).
--   credit_days      — days until due; due_date = purchase date + this.
--   credit_limit     — optional alert-only ceiling (nullable).
--
-- purchases:
--   due_date         — date + supplier.credit_days, set on receipt
--                      (feeds the aging report).
--   (notes was added by 20260805000000_fix_cash_enum_and_links.sql)
-- ============================================================

BEGIN;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_type purchase_pay_type NOT NULL DEFAULT 'credit';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2);

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS due_date DATE;

ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS unit_cost_price NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier_date ON purchases(supplier_id, date);
CREATE INDEX IF NOT EXISTS idx_purchases_due_date ON purchases(due_date);

COMMIT;
