-- High-Performance process_checkout (v3.1 - Expert Security, Validation & Schema Alignment)
-- Date: 2026-05-15
-- Changes:
-- 1. [Security] Added auth.uid() check to verify performerId.
-- 2. [Validation] Added subtotal/total calculation verification.
-- 3. [Validation] Added check for negative values.
-- 4. [Schema] Aligned with actual column names (removed insurance_sales, verified snapshots).

CREATE OR REPLACE FUNCTION public.process_checkout(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_branch_id UUID := (p_payload->>'branchId')::UUID;
    v_org_id UUID := (p_payload->>'orgId')::UUID;
    v_performer_id UUID := (p_payload->>'performerId')::UUID;
    v_shift_id UUID;
    v_sale_id UUID;
    v_item JSONB;
    v_payload_id UUID;
    v_drug_id UUID;
    v_drug_record RECORD;
    v_batch_record RECORD;
    v_remaining_qty INT;
    v_qty_to_take INT;
    v_total_deducted_for_drug INT;
    v_current_stock_cache INT;
    v_order_number INT;
    v_serial_id TEXT;
    v_drug_display_name TEXT;
    v_payment_method TEXT := p_payload->>'paymentMethod';
    v_total DECIMAL := (p_payload->>'total')::DECIMAL;
    v_subtotal DECIMAL := (p_payload->>'subtotal')::DECIMAL;
    v_global_discount DECIMAL := (p_payload->>'globalDiscount')::DECIMAL;
    v_delivery_fee DECIMAL := COALESCE((p_payload->>'deliveryFee')::DECIMAL, 0);
    v_calculated_total DECIMAL;
    v_current_user_id UUID := auth.uid();
BEGIN
    -- 0. Security & Identity Check
    IF v_current_user_id IS NOT NULL AND v_current_user_id != v_performer_id THEN
        IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = v_performer_id AND auth_user_id = v_current_user_id) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Security Violation: Performer identity mismatch.');
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = v_performer_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee record not found: ' || v_performer_id);
    END IF;

    -- 0.1 Business Logic Validation
    IF v_total < 0 OR v_subtotal < 0 OR v_global_discount < 0 OR v_delivery_fee < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Validation Error: Negative values are not allowed.');
    END IF;

    v_calculated_total := v_subtotal - v_global_discount + v_delivery_fee;
    IF ABS(v_total - v_calculated_total) > 0.01 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Validation Error: Total mismatch. Expected ' || v_calculated_total || ' but got ' || v_total);
    END IF;

    SET LOCAL "app.disable_stock_sync" = 'true';

    -- 1. Shift Resolution
    v_shift_id := (p_payload->>'shiftId')::UUID;
    IF v_shift_id IS NULL THEN
        SELECT id INTO v_shift_id FROM shifts 
        WHERE branch_id = v_branch_id AND status = 'open'
        ORDER BY (opened_by = v_performer_id) DESC LIMIT 1;
    END IF;

    IF v_shift_id IS NULL AND (p_payload->>'saleType') = 'walk-in' THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active shift found. Please open a shift first.');
    END IF;

    -- 2. Serial & Sale Record
    INSERT INTO branch_daily_sequences (branch_id, sale_date, current_value)
    VALUES (v_branch_id, CURRENT_DATE, 1)
    ON CONFLICT (branch_id, sale_date) DO UPDATE SET current_value = branch_daily_sequences.current_value + 1
    RETURNING current_value INTO v_order_number;

    v_serial_id := 'SALE-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_order_number::TEXT, 4, '0');

    INSERT INTO sales (
        org_id, branch_id, serial_id, daily_order_number,
        total, subtotal, global_discount, delivery_fee,
        payment_method, sale_type, status,
        sold_by_employee_id, shift_id,
        customer_name, customer_phone, items
    ) VALUES (
        v_org_id, v_branch_id, v_serial_id, v_order_number,
        v_total, v_subtotal, v_global_discount, v_delivery_fee,
        v_payment_method::payment_method,
        (p_payload->>'saleType')::sale_type,
        'completed',
        v_performer_id, v_shift_id,
        p_payload->>'customerName', p_payload->>'customerPhone', p_payload->'items'
    ) RETURNING id INTO v_sale_id;

    -- 3. Atomic Item Processing
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_payload_id := (v_item->>'id')::UUID;
        v_remaining_qty := (v_item->>'quantity')::INT;
        
        IF v_remaining_qty <= 0 THEN
             RAISE EXCEPTION 'Validation Error: Item quantity must be greater than zero.';
        END IF;

        v_total_deducted_for_drug := 0;

        SELECT d.id, d.name, d.dosage_form, d.stock 
        INTO v_drug_record 
        FROM drugs d
        LEFT JOIN stock_batches b ON b.id = v_payload_id
        WHERE d.id = v_payload_id OR d.id = b.drug_id
        LIMIT 1;

        IF v_drug_record.id IS NULL THEN
            RAISE EXCEPTION 'Item not found: %', v_payload_id;
        END IF;

        v_drug_id := v_drug_record.id;
        v_current_stock_cache := v_drug_record.stock;
        v_drug_display_name := v_drug_record.name || ' ' || COALESCE(v_drug_record.dosage_form, '');

        -- FEFO Deduction
        FOR v_batch_record IN 
            SELECT id, quantity, cost_price, expiry_date FROM stock_batches 
            WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
            ORDER BY (id = v_payload_id) DESC, expiry_date ASC, created_at ASC
        LOOP
            EXIT WHEN v_remaining_qty <= 0;
            v_qty_to_take := LEAST(v_remaining_qty, v_batch_record.quantity);
            
            IF v_total_deducted_for_drug = 0 THEN
               UPDATE sales SET items = (
                 SELECT jsonb_agg(
                   CASE WHEN (elem->>'id')::UUID = v_payload_id THEN elem || jsonb_build_object('expiryDate', v_batch_record.expiry_date)
                   ELSE elem END
                 ) FROM jsonb_array_elements(items) elem
               ) WHERE id = v_sale_id;
            END IF;

            UPDATE stock_batches SET quantity = quantity - v_qty_to_take WHERE id = v_batch_record.id;
            
            INSERT INTO stock_movements (
                drug_id, branch_id, type, quantity, previous_stock, new_stock,
                reference_id, transaction_id, batch_id, performed_by, status,
                drug_name_snapshot, performed_by_name_snapshot, 
                public_price_snapshot, cost_price_snapshot, expiry_date
            ) VALUES (
                v_drug_id, v_branch_id, 'sale', -v_qty_to_take,
                v_current_stock_cache,
                v_current_stock_cache - v_qty_to_take,
                v_sale_id, v_sale_id, v_batch_record.id, v_performer_id, 'approved',
                v_drug_display_name, p_payload->>'performerName',
                (v_item->>'publicPrice')::DECIMAL, v_batch_record.cost_price, v_batch_record.expiry_date
            );
            
            v_current_stock_cache := v_current_stock_cache - v_qty_to_take;
            v_total_deducted_for_drug := v_total_deducted_for_drug + v_qty_to_take;
            v_remaining_qty := v_remaining_qty - v_qty_to_take;
        END LOOP;
        
        IF v_remaining_qty > 0 THEN
            RAISE EXCEPTION 'Insufficient stock for %', v_drug_display_name;
        END IF;

        UPDATE drugs SET stock = stock - v_total_deducted_for_drug WHERE id = v_drug_id;
    END LOOP;

    -- 4. Finalize Cash & Audit
    IF v_payment_method = 'cash' AND v_shift_id IS NOT NULL THEN
        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
        VALUES (v_branch_id, v_shift_id, 'sale', v_total, 'Sale ' || v_serial_id, v_performer_id, v_sale_id, v_org_id);
        
        UPDATE shifts SET cash_sales = COALESCE(cash_sales, 0) + v_total WHERE id = v_shift_id;
    ELSIF v_payment_method = 'card' AND v_shift_id IS NOT NULL THEN
        UPDATE shifts SET card_sales = COALESCE(card_sales, 0) + v_total WHERE id = v_shift_id;
    END IF;

    INSERT INTO audit_logs (org_id, branch_id, actor_id, action, entity_type, entity_id, details)
    VALUES (v_org_id, v_branch_id, v_performer_id, 'CHECKOUT_COMPLETE', 'sale', v_sale_id, 
            jsonb_build_object('serial', v_serial_id, 'total', v_total));

    RETURN jsonb_build_object('success', true, 'saleId', v_sale_id, 'serialId', v_serial_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
