-- Migration: Atomic Purchase, Return, and Delivery Finalization (P2)
-- Date: 2026-06-19
-- Description: Adds atomic cash drawer handling to purchases, purchase returns, and delivery order finalization.

BEGIN;

-- 1. Update process_purchase_receipt to atomically deduct cash
CREATE OR REPLACE FUNCTION process_purchase_receipt(p_payload JSONB)
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
    v_purchase RECORD;
    v_item JSONB;
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
BEGIN
    IF v_purchase_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing purchaseId');
    END IF;

    SELECT *
    INTO v_purchase
    FROM purchases
    WHERE id = v_purchase_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase not found');
    END IF;

    IF v_purchase.branch_id NOT IN (SELECT get_user_branch_ids()) THEN
        RAISE EXCEPTION 'Access denied to branch %', v_purchase.branch_id;
    END IF;

    IF v_purchase.status IN ('received', 'completed') THEN
        RETURN jsonb_build_object('success', true, 'alreadyReceived', true);
    END IF;

    IF v_purchase.status = 'rejected' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rejected purchases cannot be received');
    END IF;

    IF v_purchase.items IS NULL OR jsonb_typeof(v_purchase.items) <> 'array' OR jsonb_array_length(v_purchase.items) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase has no items to receive');
    END IF;

    PERFORM set_stock_context('purchase', v_purchase_id, v_performer_id, v_performer_name);

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_purchase.items)
    LOOP
        v_drug_id := NULLIF(v_item->>'drugId', '')::UUID;
        v_item_quantity := NULLIF(v_item->>'quantity', '')::INT;

        IF v_drug_id IS NULL OR v_item_quantity IS NULL OR v_item_quantity <= 0 THEN
            RAISE EXCEPTION 'Invalid purchase item payload for purchase %', v_purchase_id;
        END IF;

        SELECT *
        INTO v_drug
        FROM drugs
        WHERE id = v_drug_id
          AND branch_id = v_purchase.branch_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Drug % not found in purchase branch %', v_drug_id, v_purchase.branch_id;
        END IF;

        v_units_per_pack := COALESCE(NULLIF(NULLIF(v_item->>'unitsPerPack', '')::INT, 0), NULLIF(v_drug.units_per_pack, 0), 1);
        v_units_to_add := CASE
            WHEN COALESCE(NULLIF(v_item->>'isUnit', '')::BOOLEAN, false) THEN v_item_quantity
            ELSE v_item_quantity * v_units_per_pack
        END;
        v_expiry_date := CASE
            WHEN NULLIF(v_item->>'expiryDate', '') IS NULL THEN (CURRENT_DATE + INTERVAL '1 year')::DATE
            WHEN length(v_item->>'expiryDate') = 7 THEN ((v_item->>'expiryDate') || '-01')::DATE
            ELSE (v_item->>'expiryDate')::DATE
        END;
        v_unit_cost_price := COALESCE(
            NULLIF(v_item->>'unitCostPrice', '')::DECIMAL,
            NULLIF(v_item->>'costPrice', '')::DECIMAL / v_units_per_pack
        );
        v_public_price := COALESCE(NULLIF(v_item->>'publicPrice', '')::DECIMAL, v_drug.public_price);
        v_unit_price := COALESCE(NULLIF(v_item->>'unitPrice', '')::DECIMAL, v_drug.unit_price);

        IF v_unit_cost_price IS NULL THEN
            RAISE EXCEPTION 'Missing unit cost for drug % in purchase %', v_drug_id, v_purchase_id;
        END IF;

        INSERT INTO stock_batches (
            drug_id, quantity, expiry_date, cost_price, purchase_id, date_received, branch_id, org_id, version
        ) VALUES (
            v_drug_id, v_units_to_add, v_expiry_date, v_unit_cost_price, v_purchase_id, CURRENT_TIMESTAMP, v_purchase.branch_id, v_purchase.org_id, 1
        );

        SELECT MIN(expiry_date) INTO v_earliest_expiry FROM stock_batches WHERE drug_id = v_drug_id AND branch_id = v_purchase.branch_id AND quantity > 0;
        SELECT SUM(quantity * cost_price) / NULLIF(SUM(quantity), 0) INTO v_global_unit_wac FROM stock_batches WHERE drug_id = v_drug_id AND branch_id = v_purchase.branch_id AND quantity > 0;

        UPDATE drugs
        SET public_price = v_public_price,
            unit_price = v_unit_price,
            cost_price = COALESCE(v_global_unit_wac * COALESCE(NULLIF(units_per_pack, 0), 1), NULLIF(v_item->>'costPrice', '')::DECIMAL, cost_price),
            unit_cost_price = COALESCE(v_global_unit_wac, v_unit_cost_price, unit_cost_price),
            expiry_date = COALESCE(v_earliest_expiry, v_expiry_date)
        WHERE id = v_drug_id;
    END LOOP;

    UPDATE purchases
    SET status = 'received', received_by = v_performer_name, received_at = CURRENT_TIMESTAMP
    WHERE id = v_purchase_id;

    -- NEW: Atomic Cash Transaction handling
    IF v_purchase.payment_method = 'cash' THEN
        IF v_shift_id IS NULL THEN
            RAISE EXCEPTION 'shiftId is required for cash purchases';
        END IF;

        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, time, org_id)
        VALUES (v_purchase.branch_id, v_shift_id, 'purchase', v_purchase.total_cost, 'Purchase #' || v_purchase.id, v_performer_id, CURRENT_TIMESTAMP, v_purchase.org_id);
        
        PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, 0, 0, v_purchase.total_cost, 0);
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;


-- 2. Update process_purchase_return to atomically add cash
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
    IF NOT EXISTS (SELECT 1 FROM get_user_branch_ids() b WHERE b = v_branch_id) THEN RAISE EXCEPTION 'Access denied to branch %', v_branch_id; END IF;
    IF v_purchase_id IS NULL THEN RAISE EXCEPTION 'purchaseId is required'; END IF;
    IF v_supplier_id IS NULL THEN RAISE EXCEPTION 'supplierId is required'; END IF;

    SELECT org_id INTO v_org_id FROM public.purchases WHERE id = v_purchase_id AND branch_id = v_branch_id;
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Purchase % not found in branch %', v_purchase_id, v_branch_id;
    END IF;

    IF jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'items must be an array'; END IF;
    IF jsonb_array_length(p_payload->'items') = 0 THEN RAISE EXCEPTION 'purchase return must contain at least one item'; END IF;

    INSERT INTO public.purchase_returns (
        id, branch_id, purchase_id, supplier_id, supplier_name_snapshot, date, total_refund, status, notes
    ) VALUES (
        v_return_id, v_branch_id, v_purchase_id, v_supplier_id, COALESCE(v_supplier_name, ''), v_date, v_total_refund, v_status, v_notes
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

    -- NEW: Atomic Cash Transaction handling
    IF v_payment_method = 'cash' THEN
        IF v_shift_id IS NULL THEN
            RAISE EXCEPTION 'shiftId is required for cash purchase returns';
        END IF;

        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, time, org_id)
        VALUES (v_branch_id, v_shift_id, 'purchase_return', v_total_refund, 'Purchase Return #' || v_return_id, v_performer_id, CURRENT_TIMESTAMP, v_org_id);
        
        PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, 0, 0, 0, v_total_refund);
    END IF;

    RETURN jsonb_build_object('success', true, 'purchaseReturnId', v_return_id, 'itemsCount', v_items_count);
END;
$$;


-- 3. Atomic Finalize Delivery Order
CREATE OR REPLACE FUNCTION public.finalize_delivery_order(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale_id UUID := (p_payload->>'saleId')::UUID;
    v_shift_id UUID := NULLIF(p_payload->>'shiftId', '')::UUID;
    v_performer_id UUID := NULLIF(p_payload->>'performerId', '')::UUID;
    v_performer_name TEXT := (p_payload->>'performerName');
    v_sale RECORD;
BEGIN
    IF v_sale_id IS NULL THEN RAISE EXCEPTION 'saleId is required'; END IF;
    IF v_shift_id IS NULL THEN RAISE EXCEPTION 'shiftId is required'; END IF;

    SELECT * INTO v_sale FROM public.sales WHERE id = v_sale_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Sale not found'); END IF;
    
    IF v_sale.status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'alreadyCompleted', true);
    END IF;

    UPDATE public.sales SET 
        status = 'completed', 
        shift_transaction_recorded = true,
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = v_sale_id;

    IF v_sale.payment_method = 'cash' THEN
        INSERT INTO public.cash_transactions (branch_id, shift_id, type, amount, reason, user_id, time, related_sale_id, org_id)
        VALUES (v_sale.branch_id, v_shift_id, 'sale', v_sale.total, 'Delivery Finalized #' || COALESCE(v_sale.serial_id, v_sale.id::text), v_performer_id, CURRENT_TIMESTAMP, v_sale_id, v_sale.org_id);
        
        PERFORM atomic_increment_shift(v_shift_id, 0, 0, v_sale.total, 0, 0, 0, 0);
    ELSIF v_sale.payment_method = 'visa' THEN
        INSERT INTO public.cash_transactions (branch_id, shift_id, type, amount, reason, user_id, time, related_sale_id, org_id)
        VALUES (v_sale.branch_id, v_shift_id, 'card_sale', v_sale.total, 'Delivery Finalized #' || COALESCE(v_sale.serial_id, v_sale.id::text), v_performer_id, CURRENT_TIMESTAMP, v_sale_id, v_sale.org_id);
        
        PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, v_sale.total, 0, 0, 0);
    END IF;

    RETURN jsonb_build_object('success', true, 'saleId', v_sale_id);
END;
$$;

COMMIT;
