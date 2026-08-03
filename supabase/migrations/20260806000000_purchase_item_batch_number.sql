-- ============================================================
-- T5.2a — purchase_items.batch_number → stock_batches.batch_number
-- Date: 2026-08-06
--
-- Purpose:
--   1. Add `purchase_items.batch_number TEXT` so the UI can capture a
--      supplier batch/lot number per line item at purchase time.
--   2. Extend `process_purchase_receipt` to copy that batch number onto
--      the `stock_batches.batch_number` it creates (currently null).
--   3. Extend `reverse_supplier_purchase` void logic awareness is unchanged;
--      the batch number is purely informational on existing batches.
-- ============================================================

BEGIN;

ALTER TABLE public.purchase_items
    ADD COLUMN IF NOT EXISTS batch_number TEXT;

COMMENT ON COLUMN public.purchase_items.batch_number IS
    'Optional supplier batch/lot number captured at purchase time; copied to stock_batches.batch_number on receipt.';

CREATE OR REPLACE FUNCTION public.process_purchase_receipt(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purchase_id UUID := (p_payload->>'purchaseId')::UUID;
    v_performer_id UUID := NULLIF(p_payload->>'performerId', '')::UUID;
    v_performer_name TEXT := NULLIF(p_payload->>'performerName', '');
    v_shift_id UUID := NULLIF(p_payload->>'shiftId', '')::UUID;
    v_paid_now NUMERIC := COALESCE(NULLIF(p_payload->>'paidNow', ''), NULL)::NUMERIC;
    v_purchase RECORD;
    v_supplier RECORD;
    v_item RECORD;
    v_drug RECORD;
    v_drug_id UUID;
    v_item_quantity INT;
    v_units_per_pack INT;
    v_units_to_add INT;
    v_expiry_date DATE;
    v_unit_cost_price DECIMAL;
    v_public_price DECIMAL;
    v_unit_price DECIMAL;
    v_earliest_expiry DATE;
    v_global_unit_wac DECIMAL;
    v_due_date DATE;
    v_effective_paid NUMERIC;
    v_pay_payload JSONB;
BEGIN
    IF v_purchase_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing purchaseId');
    END IF;

    SELECT * INTO v_purchase FROM purchases WHERE id = v_purchase_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase not found');
    END IF;

    IF NOT has_branch_permission(v_purchase.branch_id, ARRAY['admin', 'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 'inventory_officer', 'manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to process purchase receipt';
    END IF;

    IF v_purchase.status IN ('received', 'completed') THEN
        RETURN jsonb_build_object('success', true, 'alreadyReceived', true);
    END IF;

    IF v_purchase.status = 'rejected' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rejected purchases cannot be received');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM purchase_items WHERE purchase_id = v_purchase_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase has no items to receive');
    END IF;

    PERFORM set_stock_context('purchase', v_purchase_id, v_performer_id, v_performer_name);

    FOR v_item IN
        SELECT
            pi.drug_id AS drugId,
            pi.quantity,
            pi.is_unit AS isUnit,
            pi.units_per_pack AS unitsPerPack,
            pi.expiry_date AS expiryDate,
            pi.cost_price AS costPrice,
            pi.public_price AS publicPrice,
            pi.unit_price AS unitPrice,
            pi.unit_cost_price AS unitCostPrice,
            pi.batch_number AS batchNumber,
            pi.name,
            pi.dosage_form AS dosageForm,
            pi.discount
        FROM purchase_items pi
        WHERE pi.purchase_id = v_purchase_id
    LOOP
        v_drug_id := v_item.drugId;
        v_item_quantity := v_item.quantity;

        IF v_drug_id IS NULL OR v_item_quantity IS NULL OR v_item_quantity <= 0 THEN
            RAISE EXCEPTION 'Invalid purchase item payload for purchase %', v_purchase_id;
        END IF;

        SELECT * INTO v_drug FROM drugs WHERE id = v_drug_id AND branch_id = v_purchase.branch_id FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Drug % not found in purchase branch %', v_drug_id, v_purchase.branch_id;
        END IF;

        v_units_per_pack := COALESCE(NULLIF(v_item.unitsPerPack, 0), NULLIF(v_drug.units_per_pack, 0), 1);
        v_units_to_add := CASE
            WHEN COALESCE(v_item.isUnit, false) THEN v_item_quantity
            ELSE v_item_quantity * v_units_per_pack
        END;
        v_expiry_date := COALESCE(v_item.expiryDate, (CURRENT_DATE + INTERVAL '1 year')::DATE);
        v_unit_cost_price := COALESCE(
            NULLIF(v_item.unitCostPrice, 0),
            NULLIF(v_item.costPrice, 0) / v_units_per_pack,
            v_drug.cost_price / NULLIF(v_drug.units_per_pack, 0)
        );
        v_public_price := COALESCE(v_item.publicPrice, v_drug.public_price);
        v_unit_price := COALESCE(NULLIF(v_item.unitPrice, 0), v_drug.unit_price);

        IF v_unit_cost_price IS NULL THEN
            RAISE EXCEPTION 'Missing unit cost for drug % in purchase %', v_drug_id, v_purchase_id;
        END IF;

        INSERT INTO stock_batches (
            drug_id, quantity, expiry_date, cost_price, purchase_id, date_received,
            batch_number, branch_id, org_id, version
        ) VALUES (
            v_drug_id, v_units_to_add, v_expiry_date, v_unit_cost_price, v_purchase_id, CURRENT_TIMESTAMP,
            COALESCE(NULLIF(v_item.batchNumber, ''), NULL), v_purchase.branch_id, v_purchase.org_id, 1
        );

        SELECT MIN(expiry_date) INTO v_earliest_expiry FROM stock_batches WHERE drug_id = v_drug_id AND branch_id = v_purchase.branch_id AND quantity > 0;
        SELECT SUM(quantity * cost_price) / NULLIF(SUM(quantity), 0) INTO v_global_unit_wac FROM stock_batches WHERE drug_id = v_drug_id AND branch_id = v_purchase.branch_id AND quantity > 0;

        UPDATE drugs
        SET public_price = v_public_price,
            unit_price = v_unit_price,
            cost_price = COALESCE(v_global_unit_wac * COALESCE(NULLIF(units_per_pack, 0), 1), NULLIF(v_item.costPrice, 0), cost_price),
            unit_cost_price = COALESCE(v_global_unit_wac, v_unit_cost_price, unit_cost_price),
            expiry_date = COALESCE(v_earliest_expiry, v_expiry_date)
        WHERE id = v_drug_id;
    END LOOP;

    -- ── 1) Effective paid amount (back-compat when paidNow omitted) ──
    IF v_paid_now IS NULL THEN
        v_effective_paid := CASE WHEN v_purchase.payment_type = 'cash' THEN v_purchase.total_cost ELSE 0 END;
    ELSE
        IF v_paid_now < 0 OR v_paid_now > v_purchase.total_cost THEN
            RAISE EXCEPTION 'paidNow (%) must be between 0 and total cost (%)', v_paid_now, v_purchase.total_cost;
        END IF;
        v_effective_paid := v_paid_now;
    END IF;

    -- ── 2) Due date + payment_type display hint ──────────────
    SELECT * INTO v_supplier FROM suppliers WHERE id = v_purchase.supplier_id;
    v_due_date := (v_purchase.date::DATE) + COALESCE(v_supplier.credit_days, 0);

    UPDATE purchases
    SET status = 'received',
        received_by = v_performer_name,
        received_at = CURRENT_TIMESTAMP,
        due_date = v_due_date,
        payment_type = CASE WHEN v_effective_paid >= v_purchase.total_cost THEN 'cash'::purchase_pay_type ELSE 'credit'::purchase_pay_type END
    WHERE id = v_purchase_id;

    -- ── 3) Full-payable ledger entry (always) ────────────────
    INSERT INTO supplier_ledger_entries (
        branch_id, org_id, supplier_id, entry_type, source_table, source_id, date, amount, due_date, created_by
    ) VALUES (
        v_purchase.branch_id, v_purchase.org_id, v_purchase.supplier_id,
        'purchase', 'purchases', v_purchase_id,
        v_purchase.date::DATE, v_purchase.total_cost, v_due_date, v_performer_id
    )
    ON CONFLICT (source_table, source_id, entry_type) DO NOTHING;

    -- ── 4) Immediate payment → shared record_supplier_payment path ──
    IF v_effective_paid > 0 THEN
        IF v_shift_id IS NULL THEN
            RAISE EXCEPTION 'shiftId is required for cash purchases';
        END IF;

        v_pay_payload := jsonb_build_object(
            'branchId', v_purchase.branch_id,
            'orgId', v_purchase.org_id,
            'supplierId', v_purchase.supplier_id,
            'purchaseId', v_purchase_id,
            'date', v_purchase.date::DATE,
            'amount', v_effective_paid,
            'paymentMethod', 'cash',
            'performedBy', v_performer_id,
            'performedByName', v_performer_name,
            'shiftId', v_shift_id,
            'allocations', jsonb_build_array(
                jsonb_build_object('purchaseId', v_purchase_id, 'amount', v_effective_paid)
            )
        );
        PERFORM record_supplier_payment(v_pay_payload, 'receipt');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;