-- Intelligent Return Engine (RPC V2)
-- Date: 2026-05-15
-- Objective: Move all return calculations and validations to the server side.
--            The RPC now calculates refunds and checks availability atomically.

BEGIN;

CREATE OR REPLACE FUNCTION process_return(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_return_id UUID;
    v_branch_id UUID := (p_payload->>'branchId')::UUID;
    v_org_id UUID := (p_payload->>'orgId')::UUID;
    v_sale_id UUID := (p_payload->>'saleId')::UUID;
    v_performer_id UUID := (p_payload->>'performerId')::UUID;
    v_shift_id UUID;
    v_item JSONB;
    v_running_total_refund DECIMAL := 0;
    v_item_refund DECIMAL;
    v_batch_id UUID;
    v_expiry_date DATE;
    v_drug_id UUID;
    v_sale_item_id UUID;
    v_qty INT;
    v_return_serial TEXT;
    v_payment_method TEXT;
    v_drug_record RECORD;
    v_sale_item_record RECORD;
    v_already_returned INT;
    v_available_to_return INT;
    v_return_key TEXT;
    v_sale_record RECORD;
BEGIN
    -- 0. Identity & Sale Check
    IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = v_performer_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
    END IF;

    SELECT * INTO v_sale_record FROM sales WHERE id = v_sale_id;
    IF v_sale_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sale not found');
    END IF;
    
    v_payment_method := v_sale_record.payment_method;

    -- 1. Shift Resolution
    SELECT id INTO v_shift_id FROM shifts 
    WHERE branch_id = v_branch_id AND status = 'open' 
    LIMIT 1;
    
    IF v_shift_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active shift found');
    END IF;

    -- 2. Meta Info
    v_return_serial := 'RET-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);

    -- 3. Create Return Record (Total refund will be updated later)
    INSERT INTO public.returns (
        org_id, branch_id, sale_id, serial_id,
        total_refund, return_type, reason, notes,
        processed_by, date
    ) VALUES (
        v_org_id, v_branch_id, v_sale_id, v_return_serial,
        0, -- Placeholder
        (p_payload->>'returnType')::text::return_type,
        (p_payload->>'reason')::text::return_reason,
        p_payload->>'notes',
        v_performer_id, CURRENT_TIMESTAMP
    ) RETURNING id INTO v_return_id;

    -- 🟢 SET MOVEMENT CONTEXT
    PERFORM set_stock_context('return_customer', v_return_id, v_performer_id, p_payload->>'performerName');

    -- 4. Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_drug_id := (v_item->>'drugId')::UUID;
        v_qty := (v_item->>'quantity')::INT;
        v_sale_item_id := (v_item->>'saleItemId')::UUID;

        -- Resolve Sale Item (The source of truth for price and original quantity)
        IF v_sale_item_id IS NOT NULL THEN
            SELECT * INTO v_sale_item_record FROM sale_items WHERE id = v_sale_item_id;
        ELSE
            -- Fallback for old sales without saleItemId in snapshot
            SELECT * INTO v_sale_item_record FROM sale_items 
            WHERE sale_id = v_sale_id AND drug_id = v_drug_id 
            AND is_unit = COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE)
            LIMIT 1;
        END IF;

        IF v_sale_item_record.id IS NULL THEN
            RAISE EXCEPTION 'Sale item not found for drug %', v_drug_id;
        END IF;

        -- Check Availability
        v_return_key := CASE WHEN v_sale_item_record.is_unit THEN v_drug_id::TEXT || '_unit' ELSE v_drug_id::TEXT || '_pack' END;
        v_already_returned := COALESCE((v_sale_record.item_returned_quantities->>v_return_key)::INT, 0);
        v_available_to_return := v_sale_item_record.quantity - v_already_returned;

        IF v_qty > v_available_to_return THEN
            RAISE EXCEPTION 'Cannot return % units of %. Only % units available to return.', v_qty, v_sale_item_record.name, v_available_to_return;
        END IF;

        -- Calculate Refund (Server-Side Calculation with Proportional Discount)
        -- We apply the same ratio as the original sale: (total / subtotal)
        v_item_refund := ROUND(v_qty * v_sale_item_record.public_price * (v_sale_record.total / NULLIF(v_sale_record.subtotal, 0)), 2);
        v_running_total_refund := v_running_total_refund + v_item_refund;

        -- Resolve metadata for Return Item
        SELECT name, dosage_form INTO v_drug_record FROM drugs WHERE id = v_drug_id;

        -- Find original batch and expiry for this sale
        SELECT batch_id, expiry_date INTO v_batch_id, v_expiry_date
        FROM stock_movements 
        WHERE reference_id = v_sale_id AND drug_id = v_drug_id AND type = 'sale'
        ORDER BY timestamp DESC LIMIT 1;

        -- Record Return Item
        INSERT INTO return_items (
            branch_id, return_id, drug_id, sale_item_id, name,
            quantity_returned, is_unit, public_price, refund_amount,
            condition, dosage_form, expiry_date
        ) VALUES (
            v_branch_id, v_return_id, v_drug_id, v_sale_item_record.id, v_drug_record.name,
            v_qty, v_sale_item_record.is_unit, v_sale_item_record.public_price, 
            v_item_refund,
            (v_item->>'condition')::text::item_condition, v_drug_record.dosage_form, v_expiry_date
        );

        -- Restore stock logic
        IF (v_item->>'condition') = 'sellable' AND v_batch_id IS NOT NULL THEN
            UPDATE stock_batches SET quantity = quantity + v_qty WHERE id = v_batch_id;
        END IF;

        -- Update Tracking in Sales Record
        UPDATE sales SET item_returned_quantities = 
            COALESCE(item_returned_quantities, '{}'::JSONB) || 
            jsonb_build_object(v_return_key, v_already_returned + v_qty)
        WHERE id = v_sale_id;
    END LOOP;

    -- 5. Finalize Return Record Total
    UPDATE public.returns SET total_refund = v_running_total_refund WHERE id = v_return_id;

    -- 6. Update Sale Financials
    UPDATE sales 
    SET net_total = COALESCE(net_total, total) - v_running_total_refund,
        status = CASE WHEN (p_payload->>'returnType') = 'full' THEN 'returned'::sale_status ELSE status END
    WHERE id = v_sale_id;

    -- 7. Cash Transaction & Shift
    IF v_payment_method = 'cash' THEN
        INSERT INTO cash_transactions (
            branch_id, shift_id, type, amount, reason, 
            user_id, related_sale_id, org_id
        ) VALUES (
            v_branch_id, v_shift_id, 'return', -v_running_total_refund, 
            'Return ' || v_return_serial, v_performer_id, v_sale_id, v_org_id
        );
        UPDATE shifts SET returns = COALESCE(returns, 0) + v_running_total_refund WHERE id = v_shift_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'returnId', v_return_id, 
        'serialId', v_return_serial,
        'totalRefund', v_running_total_refund
    );
END;
$$;

COMMIT;
