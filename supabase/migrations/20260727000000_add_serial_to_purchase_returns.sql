-- Add serial_id to purchase_returns for PR-YYYYMMDDNNN serial numbers

ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS serial_id TEXT;
CREATE INDEX IF NOT EXISTS idx_purchase_returns_serial_id ON purchase_returns(serial_id);

CREATE OR REPLACE FUNCTION public.process_purchase_return(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_return_id UUID := COALESCE(NULLIF(p_payload->>'id', '')::UUID, gen_random_uuid());
    v_branch_id UUID := NULLIF(p_payload->>'branchId', '')::UUID;
    v_purchase_id UUID := NULLIF(p_payload->>'purchaseId', '')::UUID;
    v_supplier_id UUID := NULLIF(p_payload->>'supplierId', '')::UUID;
    v_supplier_name TEXT := p_payload->>'supplierName';
    v_date TIMESTAMPTZ := COALESCE(NULLIF(p_payload->>'date', '')::TIMESTAMPTZ, now());
    v_total_refund NUMERIC := COALESCE(NULLIF(p_payload->>'totalRefund', '')::NUMERIC, 0);
    v_status purchase_status := COALESCE(NULLIF(p_payload->>'status', '')::purchase_status, 'completed');
    v_notes TEXT := NULLIF(p_payload->>'notes', '');
    v_performer_id UUID := NULLIF(p_payload->>'processedBy', '')::UUID;
    v_shift_id UUID := NULLIF(p_payload->>'shiftId', '')::UUID;
    v_payment_method VARCHAR := p_payload->>'paymentMethod';
    v_org_id UUID;
    v_serial_id TEXT;
    v_item JSONB;
    v_drug RECORD;
    v_batch RECORD;
    v_drug_id UUID;
    v_quantity INT;
    v_remaining INT;
    v_take INT;
    v_reason purchase_ret_reason;
    v_condition item_condition;
    v_items_count INT := 0;
BEGIN
    IF v_branch_id IS NULL THEN RAISE EXCEPTION 'branchId is required'; END IF;

    IF NOT has_branch_permission(v_branch_id, ARRAY['admin', 'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 'inventory_officer', 'manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to process purchase returns';
    END IF;

    IF v_purchase_id IS NULL THEN RAISE EXCEPTION 'purchaseId is required'; END IF;
    IF v_supplier_id IS NULL THEN RAISE EXCEPTION 'supplierId is required'; END IF;

    SELECT org_id INTO v_org_id FROM public.purchases WHERE id = v_purchase_id AND branch_id = v_branch_id;
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Purchase % not found in branch %', v_purchase_id, v_branch_id;
    END IF;

    IF jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'items must be an array'; END IF;
    IF jsonb_array_length(p_payload->'items') = 0 THEN RAISE EXCEPTION 'purchase return must contain at least one item'; END IF;

    -- Generate PR-YYYYMMDDNNN serial
    v_serial_id := 'PR-' || to_char(CURRENT_DATE, 'YYYYMMDD') || LPAD(increment_sequence(v_branch_id, 'purchase_returns')::TEXT, 3, '0');

    INSERT INTO public.purchase_returns (
        id, branch_id, purchase_id, supplier_id, supplier_name_snapshot, date, total_refund, status, notes, serial_id
    ) VALUES (
        v_return_id, v_branch_id, v_purchase_id, v_supplier_id, COALESCE(v_supplier_name, ''), v_date, v_total_refund, v_status, v_notes, v_serial_id
    );

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_drug_id := NULLIF(v_item->>'drugId', '')::UUID;
        v_quantity := NULLIF(v_item->>'quantityReturned', '')::INT;
        v_reason := COALESCE(NULLIF(v_item->>'reason', '')::purchase_ret_reason, 'other');
        v_condition := COALESCE(NULLIF(v_item->>'condition', '')::item_condition, 'other');

        IF v_drug_id IS NULL THEN RAISE EXCEPTION 'Return item drugId is required'; END IF;
        IF v_quantity IS NULL OR v_quantity <= 0 THEN RAISE EXCEPTION 'Return quantity must be positive for drug %', v_drug_id; END IF;

        SELECT * INTO v_drug FROM public.drugs WHERE id = v_drug_id AND branch_id = v_branch_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Drug % not found in branch %', v_drug_id, v_branch_id; END IF;

        PERFORM set_stock_context('return_supplier', v_return_id, v_performer_id, p_payload->>'processedByName', v_reason::TEXT, v_notes);

        INSERT INTO public.purchase_return_items (
            id, branch_id, purchase_return_id, drug_id, name, quantity_returned, is_unit, units_per_pack, cost_price, refund_amount, dosage_form, reason, condition
        ) VALUES (
            gen_random_uuid(), v_branch_id, v_return_id, v_drug_id, COALESCE(NULLIF(v_item->>'name', ''), v_drug.name),
            v_quantity, COALESCE(NULLIF(v_item->>'isUnit', '')::BOOLEAN, false), NULLIF(v_item->>'unitsPerPack', '')::INT,
            COALESCE(NULLIF(v_item->>'costPrice', '')::NUMERIC, 0), COALESCE(NULLIF(v_item->>'refundAmount', '')::NUMERIC, 0),
            NULLIF(v_item->>'dosageForm', ''), v_reason, v_condition
        );

        v_remaining := v_quantity;
        FOR v_batch IN
            SELECT * FROM public.stock_batches WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
            ORDER BY expiry_date ASC, created_at ASC FOR UPDATE
        LOOP
            EXIT WHEN v_remaining <= 0;
            v_take := LEAST(v_remaining, v_batch.quantity);
            UPDATE public.stock_batches SET quantity = quantity - v_take, version = version + 1 WHERE id = v_batch.id;
            v_remaining := v_remaining - v_take;
        END LOOP;

        IF v_remaining > 0 THEN RAISE EXCEPTION 'Insufficient stock for drug %', v_drug_id; END IF;
        v_items_count := v_items_count + 1;
    END LOOP;

    IF v_payment_method = 'cash' THEN
        IF v_shift_id IS NULL THEN
            RAISE EXCEPTION 'shiftId is required for cash purchase returns';
        END IF;

        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, time, org_id)
        VALUES (v_branch_id, v_shift_id, 'purchase_return', v_total_refund, 'Purchase Return ' || v_serial_id, v_performer_id, CURRENT_TIMESTAMP, v_org_id);

        PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, 0, 0, 0, v_total_refund);
    END IF;

    RETURN jsonb_build_object('success', true, 'purchaseReturnId', v_return_id, 'serialId', v_serial_id, 'itemsCount', v_items_count);
END;
$$;
