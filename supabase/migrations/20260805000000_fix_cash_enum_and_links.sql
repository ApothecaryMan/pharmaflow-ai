-- ============================================================
-- T0.1 — Cross-cutting fixes for the supplier payables buildout
-- Date: 2026-08-05
-- 1. Add 'card_return' to cash_tx_type (used in INSERTs since
--    20260731000000 but never added to the enum — latent runtime failure).
-- 2. Add 'supplier_payment' to cash_tx_type (new payment flow).
-- 3. purchases.notes (purchaseService.reject() writes { status, notes }
--    but the column did not exist — field was silently dropped).
-- 4. cash_transactions.related_purchase_id / related_supplier_id —
--    replace free-text 'reason' linkage with real FKs for treasury
--    traceability back to the purchase / supplier account.
-- ============================================================

BEGIN;

-- ── 1 & 2. cash_tx_type enum values ──────────────────────────
ALTER TYPE cash_tx_type ADD VALUE IF NOT EXISTS 'card_return';
ALTER TYPE cash_tx_type ADD VALUE IF NOT EXISTS 'supplier_payment';

-- ── 3. purchases.notes ───────────────────────────────────────
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── 4. cash_transactions FK links ────────────────────────────
ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS related_purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL;
ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS related_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cash_transactions_related_purchase_id ON cash_transactions(related_purchase_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_related_supplier_id ON cash_transactions(related_supplier_id);

COMMIT;
