-- High-Performance process_checkout (v2)
-- Date: 2026-05-14
-- Optimizations:
-- 1. [Payload] Removed redundant fields (server resolves info).
-- 2. [SELECT] Local stock tracking to avoid repeat SELECTs per batch.
-- 3. [UPDATE] Batch-accumulated stock update (1 UPDATE per drug instead of N per batch).

CREATE OR REPLACE FUNCTION process_checkout(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    v_total_cost DECIMAL := 0;
    v_order_number INT;
    v_serial_id TEXT;
    v_drug_display_name TEXT;
    v_total DECIMAL := (p_payload->>'total')::DECIMAL;
    v_subtotal DECIMAL := (p_payload->>'subtotal')::DECIMAL;
    v_global_discount DECIMAL := (p_payload->>'globalDiscount')::DECIMAL;
BEGIN
    -- 0. Identity Check
    IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = v_performer_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee record not found: ' || v_performer_id);
    END IF;

    SET LOCAL "app.disable_stock_sync" = 'true';

    -- 1. Shift Resolution
    IF (p_payload->>'isWalkIn')::BOOLEAN THEN
        SELECT id INTO v_shift_id FROM shifts 
        WHERE branch_id = v_branch_id AND status = 'open'
        ORDER BY (opened_by = v_performer_id) DESC LIMIT 1;

        IF v_shift_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'No active shift found. Please open a shift first.');
        END IF;
    END IF;

    -- 2. Serial & Sale Record
    INSERT INTO branch_daily_sequences (branch_id, sale_date, current_value)
    VALUES (v_branch_id, CURRENT_DATE, 1)
    ON CONFLICT (branch_id, sale_date) DO UPDATE SET current_value = branch_daily_sequences.current_value + 1
    RETURNING current_value INTO v_order_number;

    v_serial_id := 'SALE-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_order_number::TEXT, 4, '0');

    INSERT INTO sales (
        org_id, branch_id, serial_id, daily_order_number,
        total, subtotal, global_discount,
        payment_method, sale_type, status,
        sold_by_employee_id, shift_id,
        customer_name, customer_phone, items
    ) VALUES (
        v_org_id, v_branch_id, v_serial_id, v_order_number,
        v_total, v_subtotal, v_global_discount,
        (p_payload->>'paymentMethod')::payment_method,
        CASE WHEN (p_payload->>'isWalkIn')::BOOLEAN THEN 'walk-in'::sale_type ELSE 'delivery'::sale_type END,
        'completed',
        v_performer_id, v_shift_id,
        p_payload->>'customerName', p_payload->>'customerPhone', p_payload->'items'
    ) RETURNING id INTO v_sale_id;

    -- 3. Atomic Item Processing (Optimized)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_payload_id := (v_item->>'id')::UUID;
        v_remaining_qty := (v_item->>'quantity')::INT;
        v_total_deducted_for_drug := 0;

        -- Resolve Drug ID & Metadata (1 SELECT for all batches)
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

        -- Build display name
        v_drug_display_name := v_drug_record.name;
        IF v_drug_record.dosage_form IS NOT NULL AND v_drug_record.dosage_form <> '' THEN
            IF position(lower(v_drug_record.dosage_form) in lower(v_drug_record.name)) = 0 THEN
                v_drug_display_name := v_drug_record.name || ' ' || v_drug_record.dosage_form;
            END IF;
        END IF;

        -- Record Sale Item
        INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price)
        VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, v_remaining_qty, (v_item->>'publicPrice')::DECIMAL);

        -- FEFO Deduction
        FOR v_batch_record IN 
            SELECT id, quantity, cost_price, expiry_date FROM stock_batches 
            WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
            ORDER BY (id = v_payload_id) DESC, expiry_date ASC, created_at ASC
        LOOP
            EXIT WHEN v_remaining_qty <= 0;
            v_qty_to_take := LEAST(v_remaining_qty, v_batch_record.quantity);
            
            UPDATE stock_batches SET quantity = quantity - v_qty_to_take WHERE id = v_batch_record.id;
            
            -- Record Movement (using cached stock to avoid SELECT)
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

        -- 🟢 OPTIMIZATION: One UPDATE per drug (after all batches processed)
        UPDATE drugs SET stock = stock - v_total_deducted_for_drug WHERE id = v_drug_id;
    END LOOP;

    -- 4. Finalize Cash & Audit
    IF (p_payload->>'paymentMethod') = 'cash' AND v_shift_id IS NOT NULL THEN
        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
        VALUES (v_branch_id, v_shift_id, 'sale', v_total, 'Sale ' || v_serial_id, v_performer_id, v_sale_id, v_org_id);
        
        UPDATE shifts SET cash_sales = cash_sales + v_total WHERE id = v_shift_id;
    END IF;

    INSERT INTO audit_logs (org_id, branch_id, actor_id, action, entity_type, entity_id, details)
    VALUES (v_org_id, v_branch_id, v_performer_id, 'CHECKOUT_COMPLETE', 'sale', v_sale_id, 
            jsonb_build_object('serial', v_serial_id, 'total', v_total));

    RETURN jsonb_build_object('success', true, 'saleId', v_sale_id, 'serialId', v_serial_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
