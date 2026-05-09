-- Consolidate all fixes for the atomic process_checkout RPC
-- Date: 2026-05-09
-- Version: 3.0 (Smart ID Resolution + Strict Payload + Snapshots)

CREATE OR REPLACE FUNCTION process_checkout(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_branch_id UUID := (p_payload->>'branchId')::UUID;
    v_org_id UUID := (p_payload->>'orgId')::UUID;
    v_performer_auth_id UUID := (p_payload->>'performerId')::UUID;
    v_performer_id UUID;
    v_shift_id UUID;
    v_sale_id UUID;
    v_item JSONB;
    v_payload_id UUID;
    v_drug_id UUID;
    v_batch_record RECORD;
    v_remaining_qty INT;
    v_qty_to_take INT;
    v_total_cost DECIMAL := 0;
    v_order_number INT;
    v_serial_id TEXT;
    -- Use strict fields as sent by the updated frontend
    v_total DECIMAL := (p_payload->>'total')::DECIMAL;
    v_subtotal DECIMAL := (p_payload->>'subtotal')::DECIMAL;
    v_global_discount DECIMAL := (p_payload->>'globalDiscount')::DECIMAL;
BEGIN
    -- 0. Resolve Employee ID from Auth ID
    SELECT id INTO v_performer_id FROM public.employees WHERE auth_user_id = v_performer_auth_id;
    IF v_performer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee record not found for auth user ' || v_performer_auth_id);
    END IF;

    -- 1. Disable sync_drug_stock trigger for this transaction to prevent double-counting
    SET LOCAL "app.disable_stock_sync" = 'true';

    -- 2. Validate/Resolve Shift
    IF (p_payload->>'isWalkIn')::BOOLEAN THEN
        SELECT id INTO v_shift_id FROM shifts 
        WHERE branch_id = v_branch_id AND status = 'open'
        ORDER BY (opened_by = v_performer_id) DESC LIMIT 1;

        IF v_shift_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'No active shift found. Please open a shift first.');
        END IF;
    END IF;

    -- 3. Daily Sequence Management
    INSERT INTO branch_daily_sequences (branch_id, sale_date, current_value)
    VALUES (v_branch_id, CURRENT_DATE, 1)
    ON CONFLICT (branch_id, sale_date) DO UPDATE SET current_value = branch_daily_sequences.current_value + 1
    RETURNING current_value INTO v_order_number;

    v_serial_id := 'SALE-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_order_number::TEXT, 4, '0');

    -- 4. Create Sale Record
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

    -- 5. Process Items and Inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_payload_id := (v_item->>'id')::UUID;
        
        -- Smart ID Resolution: UI might send a Batch ID instead of Drug ID
        IF EXISTS (SELECT 1 FROM drugs WHERE id = v_payload_id) THEN
            v_drug_id := v_payload_id;
        ELSE
            SELECT drug_id INTO v_drug_id FROM stock_batches WHERE id = v_payload_id;
            IF v_drug_id IS NULL THEN
                RAISE EXCEPTION 'ID % is neither a Drug nor a Batch', v_payload_id;
            END IF;
        END IF;
        
        v_remaining_qty := (v_item->>'quantity')::INT;

        -- Record Sale Item
        INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price)
        VALUES (v_branch_id, v_sale_id, v_drug_id, v_item->>'name', v_remaining_qty, (v_item->>'publicPrice')::DECIMAL);

        -- FEFO Batch Deduction with priority for the selected batch
        FOR v_batch_record IN 
            SELECT id, quantity, cost_price, expiry_date FROM stock_batches 
            WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
            ORDER BY 
                (id = v_payload_id) DESC, -- Prioritize the specific batch selected in UI
                expiry_date ASC, 
                created_at ASC
        LOOP
            EXIT WHEN v_remaining_qty <= 0;
            v_qty_to_take := LEAST(v_remaining_qty, v_batch_record.quantity);
            
            -- Deduct from batch
            UPDATE stock_batches SET quantity = quantity - v_qty_to_take WHERE id = v_batch_record.id;
            
            -- Record Stock Movement with full snapshots
            INSERT INTO stock_movements (
                drug_id, branch_id, type, quantity, previous_stock, new_stock,
                reference_id, transaction_id, batch_id, performed_by, status,
                drug_name_snapshot, performed_by_name_snapshot, 
                public_price_snapshot, cost_price_snapshot, expiry_date
            ) VALUES (
                v_drug_id, v_branch_id, 'sale', -v_qty_to_take,
                (SELECT stock FROM drugs WHERE id = v_drug_id),
                (SELECT stock FROM drugs WHERE id = v_drug_id) - v_qty_to_take,
                v_sale_id, v_sale_id, v_batch_record.id, v_performer_id, 'approved',
                v_item->>'name', p_payload->>'performerName',
                (v_item->>'publicPrice')::DECIMAL, v_batch_record.cost_price, v_batch_record.expiry_date
            );
            
            -- Update overall drug stock
            UPDATE drugs SET stock = stock - v_qty_to_take WHERE id = v_drug_id;
            
            v_remaining_qty := v_remaining_qty - v_qty_to_take;
            v_total_cost := v_total_cost + (v_qty_to_take * v_batch_record.cost_price);
        END LOOP;
        
        IF v_remaining_qty > 0 THEN
            RAISE EXCEPTION 'Insufficient stock for %', (v_item->>'name');
        END IF;
    END LOOP;

    -- 6. Record Cash Transaction (for walk-in cash sales)
    IF (p_payload->>'paymentMethod') = 'cash' AND v_shift_id IS NOT NULL THEN
        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
        VALUES (v_branch_id, v_shift_id, 'sale', v_total, 'Sale ' || v_serial_id, v_performer_id, v_sale_id, v_org_id);
        
        -- Update shift totals
        UPDATE shifts SET cash_sales = cash_sales + v_total WHERE id = v_shift_id;
    END IF;

    -- 7. Audit Log
    INSERT INTO audit_logs (org_id, branch_id, actor_id, action, entity_type, entity_id, details)
    VALUES (v_org_id, v_branch_id, v_performer_id, 'CHECKOUT_COMPLETE', 'sale', v_sale_id, 
            jsonb_build_object('serial', v_serial_id, 'total', v_total));

    RETURN jsonb_build_object(
        'success', true, 
        'saleId', v_sale_id, 
        'serialId', v_serial_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false, 
        'error', SQLERRM
    );
END;
$$;
