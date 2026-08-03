-- ============================================================
-- T2.7 — Backfill payables for legacy received purchases
-- Date: 2026-08-05
--
-- Every purchase that was received BEFORE the AP feature shipped has no
-- ledger entry, no due_date, and no payment record. Without this backfill:
--   • get_supplier_balance would understate payables by the whole legacy
--     invoice book;
--   • get_supplier_aging would show every legacy invoice as FULLY OPEN
--     (fn_purchase_open_amount = total_cost − 0 − 0).
--
-- Legacy semantics (pre-AP process_purchase_receipt):
--   • payment_type = 'cash'    → paid in FULL at receipt; the cash already
--     left the drawer via the old cash tx ('purchase') + cash_purchases
--     counter, so the backfill only creates the AP-side records and must
--     NOT touch cash again.
--   • payment_type = 'credit'  → nothing was paid.
--
-- This migration is fully idempotent (guarded inserts / ON CONFLICT
-- DO NOTHING / WHERE due_date IS NULL) and safe to re-run.
-- ============================================================

BEGIN;

-- ── 1. due_date for received/completed purchases that lack one ──
UPDATE purchases p
SET due_date = (p.date::DATE) + COALESCE(s.credit_days, 0)
FROM suppliers s
WHERE p.supplier_id = s.id
  AND p.status IN ('received', 'completed')
  AND p.due_date IS NULL;

-- ── 2. Ledger 'purchase' entry for every open/paid legacy invoice ──
INSERT INTO supplier_ledger_entries (
    branch_id, org_id, supplier_id, entry_type, source_table, source_id,
    date, amount, due_date
)
SELECT p.branch_id, p.org_id, p.supplier_id, 'purchase', 'purchases', p.id,
       p.date::DATE, p.total_cost, p.due_date
FROM purchases p
WHERE p.status IN ('received', 'completed')
ON CONFLICT (source_table, source_id, entry_type) DO NOTHING;

-- ── 3. Legacy cash purchases: record the historical payment ──
-- (supplier_payments + allocation + 'payment' ledger entry; NO cash
--  movement — the drawer was already debited by the old receipt flow.)
DO $$
DECLARE
    v_paid RECORD;
    v_pay_id UUID;
BEGIN
    FOR v_paid IN
        SELECT p.id AS purchase_id, p.branch_id, p.org_id, p.supplier_id,
               p.total_cost, p.date::DATE AS d, COALESCE(p.created_at, now()) AS created_at
        FROM purchases p
        WHERE p.status IN ('received', 'completed')
          AND p.payment_type = 'cash'
          AND NOT EXISTS (
              SELECT 1 FROM supplier_payment_allocations a WHERE a.purchase_id = p.id
          )
    LOOP
        INSERT INTO supplier_payments (
            branch_id, org_id, serial_id, supplier_id, date, amount,
            payment_method, reference, created_by_name, created_at
        ) VALUES (
            v_paid.branch_id, v_paid.org_id, 'SP-BF-' || v_paid.purchase_id,
            v_paid.supplier_id, v_paid.d, v_paid.total_cost, 'cash',
            'Backfill of legacy cash purchase (pre-AP)', 'System Backfill',
            v_paid.created_at
        )
        RETURNING id INTO v_pay_id;

        INSERT INTO supplier_payment_allocations (org_id, payment_id, purchase_id, amount)
        VALUES (v_paid.org_id, v_pay_id, v_paid.purchase_id, v_paid.total_cost);

        INSERT INTO supplier_ledger_entries (
            branch_id, org_id, supplier_id, entry_type, source_table, source_id,
            date, amount
        ) VALUES (
            v_paid.branch_id, v_paid.org_id, v_paid.supplier_id,
            'payment', 'supplier_payments', v_pay_id, v_paid.d, -v_paid.total_cost
        )
        ON CONFLICT (source_table, source_id, entry_type) DO NOTHING;
    END LOOP;
END $$;

COMMIT;
