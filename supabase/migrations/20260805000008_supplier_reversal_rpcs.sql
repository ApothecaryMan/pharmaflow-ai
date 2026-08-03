-- ============================================================
-- T2.6 — Reversal RPCs
-- Date: 2026-08-05
--
-- No in-place edits of the ledger. Every reversal is a MIRROR ledger
-- entry (entry_type *_reversal, reversal_of → the original entry) so
-- balance / statement / aging are pure SUM(amount) over the table.
--
--   void_supplier_payment(payment)
--       • deletes the allocation rows AS-IS (the payment is undone; the
--         freed open amount returns to the same invoices).
--       • writes ('payment_reversal', +amount) → net 0 vs the original
--         ('payment', −amount).
--       • cash payment → cash returns to the drawer (cash_in).
--
--   reverse_supplier_purchase(purchase)
--       • RESTRICTED: refuses if any purchase return exists for it —
--         a received invoice touched by returns is not a simple mistake
--         and must be handled manually.
--       • FEFO-decrements the received stock (same as a supplier
--         return), voids every non-voided payment linked to the invoice,
--         writes ('purchase_reversal', −total_cost), status → rejected.
--
--   reverse_supplier_purchase_return(return)
--       • restores the returned stock as a new batch.
--       • credit return → ('credit_note_reversal', +total_refund).
--       • cash return   → the cash paid out on reversal goes back to
--         the supplier (cash_purchase_returns counter down), guarded by
--         the current shift's returned-cash counter.
--
-- All three are SECURITY DEFINER + has_branch_permission + row locks,
-- matching record_supplier_payment / process_purchase_receipt.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.void_supplier_payment(
    p_payment_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL,
    p_performer_id UUID DEFAULT NULL,
    p_performer_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment RECORD;
    v_ledger_id UUID;
BEGIN
    SELECT * INTO v_payment FROM supplier_payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;

    IF NOT has_branch_permission(v_payment.branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to void supplier payment';
    END IF;

    IF v_payment.voided_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'alreadyVoided', true);
    END IF;

    -- 1) Drop allocations as-is (frees the open amount back to the invoices)
    DELETE FROM supplier_payment_allocations WHERE payment_id = p_payment_id;

    SELECT id INTO v_ledger_id FROM supplier_ledger_entries
    WHERE source_table = 'supplier_payments' AND source_id = p_payment_id AND entry_type = 'payment';

    -- 2) Mirror ledger entry (+amount cancels the original −amount)
    INSERT INTO supplier_ledger_entries (
        branch_id, org_id, supplier_id, entry_type, source_table, source_id, date, amount, reversal_of, created_by
    ) VALUES (
        v_payment.branch_id, v_payment.org_id, v_payment.supplier_id,
        'payment_reversal', 'supplier_payments', p_payment_id, v_payment.date, v_payment.amount, v_ledger_id, p_performer_id
    )
    ON CONFLICT (source_table, source_id, entry_type) DO NOTHING;

    UPDATE supplier_payments SET voided_at = now(), version = version + 1, notes = COALESCE(NULLIF(p_reason, ''), notes)
    WHERE id = p_payment_id;

    -- 3) Cash payment → money physically returns to the drawer
    IF v_payment.payment_method = 'cash' THEN
        IF p_shift_id IS NULL THEN
            RAISE EXCEPTION 'shiftId is required to refund the cash of a voided payment';
        END IF;
        IF p_performer_id IS NULL THEN
            RAISE EXCEPTION 'performedBy is required for cash refunds';
        END IF;

        INSERT INTO cash_transactions (
            branch_id, shift_id, type, amount, reason, user_id, time, org_id, related_purchase_id, related_supplier_id
        ) VALUES (
            v_payment.branch_id, p_shift_id, 'supplier_payment', v_payment.amount,
            'Voided payment ' || COALESCE(v_payment.serial_id, '') || ' — cash refunded to drawer',
            p_performer_id, CURRENT_TIMESTAMP, v_payment.org_id, NULL, v_payment.supplier_id
        );

        PERFORM atomic_increment_shift(p_shift_id, v_payment.amount, 0, 0, 0, 0, 0, 0, 0);
    END IF;

    RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id);
END;
$$;


CREATE OR REPLACE FUNCTION public.reverse_supplier_purchase(
    p_purchase_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL,
    p_performer_id UUID DEFAULT NULL,
    p_performer_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purchase RECORD;
    v_item RECORD;
    v_drug RECORD;
    v_batch RECORD;
    v_payment RECORD;
    v_units_per_pack INT;
    v_units_to_remove INT;
    v_remaining INT;
    v_take INT;
    v_ledger_id UUID;
    v_return_count INT;
BEGIN
    SELECT * INTO v_purchase FROM purchases WHERE id = p_purchase_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Purchase not found'; END IF;

    IF NOT has_branch_permission(v_purchase.branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','manager','pharmacist']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to reverse purchase';
    END IF;

    IF v_purchase.status NOT IN ('received', 'completed') THEN
        RAISE EXCEPTION 'Only received/completed purchases can be reversed';
    END IF;

    SELECT COUNT(*) INTO v_return_count FROM purchase_returns WHERE purchase_id = p_purchase_id;
    IF v_return_count > 0 THEN
        RAISE EXCEPTION 'Cannot reverse a purchase that has returns; handle the returns first';
    END IF;

    -- 1) Reverse the received stock (FEFO remove, same as supplier return)
    PERFORM set_stock_context('return_supplier', v_purchase.id, p_performer_id, p_performer_name, p_reason, 'Purchase reversal');

    FOR v_item IN
        SELECT * FROM purchase_items WHERE purchase_id = p_purchase_id FOR UPDATE
    LOOP
        SELECT * INTO v_drug FROM drugs WHERE id = v_item.drug_id AND branch_id = v_purchase.branch_id FOR UPDATE;
        v_units_per_pack := COALESCE(NULLIF(v_item.units_per_pack, 0), NULLIF(v_drug.units_per_pack, 0), 1);
        v_units_to_remove := CASE WHEN COALESCE(v_item.is_unit, false) THEN v_item.quantity ELSE v_item.quantity * v_units_per_pack END;
        v_remaining := v_units_to_remove;

        FOR v_batch IN
            SELECT * FROM stock_batches
            WHERE drug_id = v_item.drug_id AND branch_id = v_purchase.branch_id AND quantity > 0
            ORDER BY expiry_date ASC, created_at ASC FOR UPDATE
        LOOP
            EXIT WHEN v_remaining <= 0;
            v_take := LEAST(v_remaining, v_batch.quantity);
            UPDATE stock_batches SET quantity = quantity - v_take, version = version + 1 WHERE id = v_batch.id;
            v_remaining := v_remaining - v_take;
        END LOOP;

        IF v_remaining > 0 THEN
            RAISE EXCEPTION 'Insufficient stock on hand to reverse purchase (drug %)', v_item.drug_id;
        END IF;
    END LOOP;

    -- 2) Void every non-voided payment linked to this invoice
    FOR v_payment IN
        SELECT DISTINCT sp.id AS payment_id
        FROM supplier_payments sp
        JOIN supplier_payment_allocations a ON a.payment_id = sp.id
        WHERE a.purchase_id = p_purchase_id AND sp.voided_at IS NULL
    LOOP
        PERFORM void_supplier_payment(v_payment.payment_id, p_reason, p_shift_id, p_performer_id, p_performer_name);
    END LOOP;

    -- 3) Mirror ledger entry (−total_cost cancels the payable)
    SELECT id INTO v_ledger_id FROM supplier_ledger_entries
    WHERE source_table = 'purchases' AND source_id = p_purchase_id AND entry_type = 'purchase';

    INSERT INTO supplier_ledger_entries (
        branch_id, org_id, supplier_id, entry_type, source_table, source_id, date, amount, reversal_of, created_by
    ) VALUES (
        v_purchase.branch_id, v_purchase.org_id, v_purchase.supplier_id,
        'purchase_reversal', 'purchases', p_purchase_id, CURRENT_DATE, -v_purchase.total_cost, v_ledger_id, p_performer_id
    )
    ON CONFLICT (source_table, source_id, entry_type) DO NOTHING;

    -- 4) Mark rejected
    UPDATE purchases SET status = 'rejected', notes = COALESCE(NULLIF(p_reason, ''), notes)
    WHERE id = p_purchase_id;

    RETURN jsonb_build_object('success', true, 'purchaseId', p_purchase_id);
END;
$$;


CREATE OR REPLACE FUNCTION public.reverse_supplier_purchase_return(
    p_return_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL,
    p_performer_id UUID DEFAULT NULL,
    p_performer_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ret RECORD;
    v_item RECORD;
    v_drug RECORD;
    v_ledger_id UUID;
    v_returned_cash NUMERIC;
    v_org_id UUID;
BEGIN
    SELECT * INTO v_ret FROM purchase_returns WHERE id = p_return_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Purchase return not found'; END IF;

    IF NOT has_branch_permission(v_ret.branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','manager','pharmacist']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to reverse purchase return';
    END IF;

    IF v_ret.status = 'rejected' THEN
        RETURN jsonb_build_object('success', true, 'alreadyReversed', true);
    END IF;

    -- Legacy return rows may predate org_id backfill: fall back to the purchase's org
    v_org_id := COALESCE(v_ret.org_id, (SELECT org_id FROM purchases WHERE id = v_ret.purchase_id));

    -- 1) Restore the returned stock (new batch; trigger syncs drugs.stock)
    PERFORM set_stock_context('purchase', v_ret.id, p_performer_id, p_performer_name, p_reason, 'Purchase return reversal');

    FOR v_item IN SELECT * FROM purchase_return_items WHERE purchase_return_id = p_return_id
    LOOP
        SELECT * INTO v_drug FROM drugs WHERE id = v_item.drug_id AND branch_id = v_ret.branch_id FOR UPDATE;
        INSERT INTO stock_batches (
            drug_id, quantity, expiry_date, cost_price, purchase_id, date_received, branch_id, org_id, version
        ) VALUES (
            v_item.drug_id, v_item.quantity_returned,
            COALESCE(v_drug.expiry_date, (CURRENT_DATE + INTERVAL '1 year')::DATE),
            COALESCE(v_item.cost_price, 0), v_ret.purchase_id, CURRENT_DATE, v_ret.branch_id, v_org_id, 1
        );
    END LOOP;

    -- 2) Reverse the settlement
    IF v_ret.payment_method = 'credit' THEN
        SELECT id INTO v_ledger_id FROM supplier_ledger_entries
        WHERE source_table = 'purchase_returns' AND source_id = p_return_id AND entry_type = 'credit_note';

        INSERT INTO supplier_ledger_entries (
            branch_id, org_id, supplier_id, entry_type, source_table, source_id, date, amount, reversal_of, created_by
        ) VALUES (
            v_ret.branch_id, v_org_id, v_ret.supplier_id,
            'credit_note_reversal', 'purchase_returns', p_return_id, CURRENT_DATE, v_ret.total_refund, v_ledger_id, p_performer_id
        )
        ON CONFLICT (source_table, source_id, entry_type) DO NOTHING;
    ELSIF v_ret.payment_method = 'cash' THEN
        IF p_shift_id IS NULL THEN
            RAISE EXCEPTION 'shiftId is required to reverse a cash purchase return';
        END IF;
        IF p_performer_id IS NULL THEN
            RAISE EXCEPTION 'performedBy is required for cash reversals';
        END IF;

        SELECT COALESCE(cash_purchase_returns, 0) INTO v_returned_cash FROM shifts WHERE id = p_shift_id;
        IF v_returned_cash < v_ret.total_refund THEN
            RAISE EXCEPTION 'Cannot reverse: returned-cash on shift (%) is less than the refund (%)', v_returned_cash, v_ret.total_refund;
        END IF;

        INSERT INTO cash_transactions (
            branch_id, shift_id, type, amount, reason, user_id, time, org_id, related_purchase_id, related_supplier_id
        ) VALUES (
            v_ret.branch_id, p_shift_id, 'purchase_return', -v_ret.total_refund,
            'Reversed purchase return ' || COALESCE(v_ret.serial_id, ''), p_performer_id, CURRENT_TIMESTAMP, v_org_id, v_ret.purchase_id, v_ret.supplier_id
        );

        PERFORM atomic_increment_shift(p_shift_id, 0, 0, 0, 0, 0, 0, -v_ret.total_refund, 0);
    END IF;

    -- 3) Mark rejected
    UPDATE purchase_returns SET status = 'rejected', notes = COALESCE(NULLIF(p_reason, ''), notes)
    WHERE id = p_return_id;

    RETURN jsonb_build_object('success', true, 'purchaseReturnId', p_return_id);
END;
$$;

COMMIT;
