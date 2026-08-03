-- ============================================================
-- T2.3 — record_supplier_payment (SHARED payment code path)
-- Date: 2026-08-05
--
-- One RPC used by BOTH:
--   • the Supplier Payments page   (p_context = 'standalone') → cash
--     tx type 'supplier_payment' + shift cash_out counter.
--   • inside process_purchase_receipt for the immediate "paid now"
--     portion (p_context = 'receipt') → cash tx type 'purchase' +
--     shift cash_purchases counter.
--
-- Allocation is REQUIRED (no floating general payments):
--   1. explicit allocations from the payload are validated against
--      each purchase's open balance and the payment amount;
--   2. any remainder is auto-applied FIFO to the oldest open payables
--      (due_date ASC, date ASC, created_at ASC);
--   3. a remainder with NO open payables at all is allowed as a
--      payment-on-account (settles opening balance / deposit) — it
--      reduces the supplier balance via the ledger but does not touch
--      aging; a remainder that EXCEEDS existing open payables errors.
--
-- Helper fn_purchase_open_amount computes the remaining payable of a
-- single purchase:
--     total_cost
--       − Σ(allocations, payment not voided)
--       − Σ(credit notes on this purchase, completed/approved)
--   (credit notes reduce the same invoice's open amount so aging stays
--    exact — see process_purchase_return T2.2.)
-- ============================================================

BEGIN;

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'bank';

-- ── Helper: open (unpaid) amount of a single purchase ─────────
CREATE OR REPLACE FUNCTION public.fn_purchase_open_amount(p_purchase_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
    SELECT GREATEST(
        p.total_cost
        - COALESCE((
            SELECT SUM(a.amount) FROM supplier_payment_allocations a
            JOIN supplier_payments sp ON sp.id = a.payment_id
            WHERE a.purchase_id = p.id AND sp.voided_at IS NULL
        ), 0)
        - COALESCE((
            SELECT SUM(r.total_refund) FROM purchase_returns r
            WHERE r.purchase_id = p.id
              AND r.payment_method = 'credit'
              AND r.status <> 'rejected'
        ), 0),
        0
    )
    FROM purchases p
    WHERE p.id = p_purchase_id;
$$;

CREATE OR REPLACE FUNCTION public.record_supplier_payment(p_payload JSONB, p_context TEXT DEFAULT 'standalone')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment_id UUID := COALESCE(NULLIF(p_payload->>'id', '')::UUID, gen_random_uuid());
    v_branch_id UUID := NULLIF(p_payload->>'branchId', '')::UUID;
    v_org_id UUID := NULLIF(p_payload->>'orgId', '')::UUID;
    v_supplier_id UUID := NULLIF(p_payload->>'supplierId', '')::UUID;
    v_purchase_id UUID := NULLIF(p_payload->>'purchaseId', '')::UUID;
    v_date DATE := COALESCE(NULLIF(p_payload->>'date', '')::DATE, CURRENT_DATE);
    v_amount NUMERIC := COALESCE(NULLIF(p_payload->>'amount', '')::NUMERIC, 0);
    v_payment_method payment_method := COALESCE(NULLIF(p_payload->>'paymentMethod', '')::payment_method, 'cash');
    v_reference TEXT := NULLIF(p_payload->>'reference', '');
    v_notes TEXT := NULLIF(p_payload->>'notes', '');
    v_performer_id UUID := NULLIF(p_payload->>'performedBy', '')::UUID;
    v_performer_name TEXT := NULLIF(p_payload->>'performedByName', '');
    v_shift_id UUID := NULLIF(p_payload->>'shiftId', '')::UUID;
    v_context TEXT := COALESCE(NULLIF(p_context, ''), 'standalone');
    v_serial_id TEXT;
    v_alloc JSONB;
    v_allocated NUMERIC := 0;
    v_alloc_amount NUMERIC;
    v_open_amount NUMERIC;
    v_remaining NUMERIC;
    v_total_open NUMERIC := 0;
    v_open RECORD;
    v_take NUMERIC;
    v_cash_tx_type cash_tx_type;
BEGIN
    IF v_branch_id IS NULL THEN RAISE EXCEPTION 'branchId is required'; END IF;
    IF v_supplier_id IS NULL THEN RAISE EXCEPTION 'supplierId is required'; END IF;
    IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
    IF v_context NOT IN ('standalone', 'receipt') THEN RAISE EXCEPTION 'p_context must be standalone or receipt'; END IF;

    -- Role set is context-dependent so the shared path does not regress
    -- existing flows: a receipt-time payment must be allowed for whoever may
    -- receive a purchase (incl. inventory_officer), while standalone
    -- supplier payments stay restricted to the financial roles.
    IF v_context = 'receipt' THEN
        IF NOT has_branch_permission(v_branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','pharmacist','inventory_officer','manager']::employee_role[]) THEN
            RAISE EXCEPTION 'Access denied: Unauthorized to record supplier payment';
        END IF;
    ELSE
        IF NOT has_branch_permission(v_branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','manager']::employee_role[]) THEN
            RAISE EXCEPTION 'Access denied: Unauthorized to record supplier payment';
        END IF;
    END IF;

    SELECT org_id INTO v_org_id FROM suppliers WHERE id = v_supplier_id AND branch_id = v_branch_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Supplier not found in branch'; END IF;

    v_serial_id := 'SP-' || to_char(CURRENT_DATE, 'YYYYMMDD') || LPAD(increment_sequence(v_branch_id, 'supplier_payments')::TEXT, 3, '0');

    INSERT INTO supplier_payments (
        id, branch_id, org_id, serial_id, supplier_id, date, amount,
        payment_method, reference, notes, created_by, created_by_name
    ) VALUES (
        v_payment_id, v_branch_id, v_org_id, v_serial_id, v_supplier_id, v_date, v_amount,
        v_payment_method, v_reference, v_notes, v_performer_id, v_performer_name
    );

    -- ── 1) Explicit allocations ──────────────────────────────
    IF jsonb_typeof(p_payload->'allocations') = 'array' THEN
        FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_payload->'allocations')
        LOOP
            v_purchase_id := NULLIF(v_alloc->>'purchaseId', '')::UUID;
            IF v_purchase_id IS NULL THEN
                CONTINUE;
            END IF;

            v_alloc_amount := COALESCE(NULLIF(v_alloc->>'amount','')::NUMERIC, 0);
            IF v_alloc_amount <= 0 THEN
                RAISE EXCEPTION 'Allocation amount must be positive';
            END IF;

            SELECT open_amount INTO v_open_amount
            FROM purchases p, LATERAL (SELECT fn_purchase_open_amount(p.id) AS open_amount) o
            WHERE p.id = v_purchase_id AND p.supplier_id = v_supplier_id AND p.branch_id = v_branch_id
              AND p.status IN ('received','completed');

            IF v_open_amount IS NULL THEN
                RAISE EXCEPTION 'Purchase % is not an open payable for this supplier', v_purchase_id;
            END IF;

            IF v_alloc_amount > v_open_amount THEN
                RAISE EXCEPTION 'Allocation for purchase % exceeds its open balance (open %)', v_purchase_id, v_open_amount;
            END IF;

            v_allocated := v_allocated + v_alloc_amount;
            INSERT INTO supplier_payment_allocations (org_id, payment_id, purchase_id, amount)
            VALUES (v_org_id, v_payment_id, v_purchase_id, v_alloc_amount);
        END LOOP;

        IF v_allocated > v_amount THEN
            RAISE EXCEPTION 'Allocations exceed payment amount';
        END IF;
    END IF;

    -- ── 2) FIFO remainder against oldest open payables ───────
    v_remaining := v_amount - v_allocated;
    IF v_remaining > 0.005 THEN
        SELECT COALESCE(SUM(o.open_amount), 0) INTO v_total_open
        FROM purchases p, LATERAL (SELECT fn_purchase_open_amount(p.id) AS open_amount) o
        WHERE p.supplier_id = v_supplier_id
          AND p.branch_id = v_branch_id
          AND p.status IN ('received','completed')
          AND o.open_amount > 0;

        IF v_total_open > 0 AND v_remaining > v_total_open + 0.005 THEN
            RAISE EXCEPTION 'Overpayment: remaining % exceeds total open payables (%) for this supplier', v_remaining, v_total_open;
        END IF;

        FOR v_open IN
            SELECT p.id AS purchase_id, o.open_amount
            FROM purchases p, LATERAL (SELECT fn_purchase_open_amount(p.id) AS open_amount) o
            WHERE p.supplier_id = v_supplier_id
              AND p.branch_id = v_branch_id
              AND p.status IN ('received','completed')
              AND o.open_amount > 0
            ORDER BY COALESCE(p.due_date, p.date) ASC, p.date ASC, p.created_at ASC
            FOR UPDATE OF p
        LOOP
            EXIT WHEN v_remaining <= 0.005;
            v_take := LEAST(v_remaining, v_open.open_amount);
            INSERT INTO supplier_payment_allocations (org_id, payment_id, purchase_id, amount)
            VALUES (v_org_id, v_payment_id, v_open.purchase_id, v_take);
            v_remaining := v_remaining - v_take;
        END LOOP;
    END IF;
    -- (Remainder with v_total_open = 0 → payment-on-account: settles the
    --  opening balance / a deposit. No allocation rows, reduces balance
    --  via the ledger entry below, does not affect aging.)

    -- ── 3) Ledger entry ──────────────────────────────────────
    INSERT INTO supplier_ledger_entries (branch_id, org_id, supplier_id, entry_type, source_table, source_id, date, amount, created_by)
    VALUES (v_branch_id, v_org_id, v_supplier_id, 'payment', 'supplier_payments', v_payment_id, v_date, -v_amount, v_performer_id);

    -- ── 4) Cash movement (only cash actually leaves the drawer) ──
    IF v_payment_method = 'cash' THEN
        IF v_shift_id IS NULL THEN
            RAISE EXCEPTION 'shiftId is required for cash payments';
        END IF;

        IF v_context = 'receipt' THEN
            v_cash_tx_type := 'purchase';
        ELSE
            v_cash_tx_type := 'supplier_payment';
        END IF;

        INSERT INTO cash_transactions (
            branch_id, shift_id, type, amount, reason, user_id, time, org_id,
            related_purchase_id, related_supplier_id
        ) VALUES (
            v_branch_id, v_shift_id, v_cash_tx_type, v_amount,
            'Supplier payment ' || v_serial_id, v_performer_id, CURRENT_TIMESTAMP, v_org_id,
            v_purchase_id, v_supplier_id
        );

        IF v_context = 'receipt' THEN
            PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, 0, 0, v_amount, 0);
        ELSE
            PERFORM atomic_increment_shift(v_shift_id, 0, v_amount, 0, 0, 0, 0, 0);
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'paymentId', v_payment_id, 'serialId', v_serial_id);
END;
$$;

COMMIT;
