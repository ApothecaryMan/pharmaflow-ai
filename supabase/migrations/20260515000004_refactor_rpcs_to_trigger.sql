-- ═══════════════════════════════════════════
-- Refactor RPCs to use Unified Stock Movement Trigger
-- Removes manual logging and manual stock updates from core transactions
-- ═══════════════════════════════════════════

BEGIN;

-- 1. Redefine process_checkout (removing manual inventory logic)
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
    v_order_number INT;
    v_serial_id TEXT;
    v_drug_display_name TEXT;
    v_total DECIMAL := (p_payload->>'total')::DECIMAL;
    v_subtotal DECIMAL := (p_payload->>'subtotal')::DECIMAL;
    v_global_discount DECIMAL := (p_payload->>'globalDiscount')::DECIMAL;
BEGIN
    -- 0. Identity Check
    IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = v_performer_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee record not found');
    END IF;

    -- 1. Shift Resolution
    v_shift_id := (p_payload->>'shiftId')::UUID;
    IF v_shift_id IS NULL THEN
        SELECT id INTO v_shift_id FROM shifts 
        WHERE branch_id = v_branch_id AND status = 'open'
        ORDER BY (opened_by = v_performer_id) DESC LIMIT 1;
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
        (p_payload->>'saleType')::sale_type,
        'completed',
        v_performer_id, v_shift_id,
        p_payload->>'customerName', p_payload->>'customerPhone', p_payload->'items'
    ) RETURNING id INTO v_sale_id;

    -- 🟢 SET MOVEMENT CONTEXT
    PERFORM set_stock_context('sale', v_sale_id, v_performer_id, p_payload->>'performerName');

    -- 3. Atomic Item Processing
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_payload_id := (v_item->>'id')::UUID;
        v_remaining_qty := (v_item->>'quantity')::INT;

        SELECT d.id, d.name, d.dosage_form INTO v_drug_record 
        FROM drugs d
        LEFT JOIN stock_batches b ON b.id = v_payload_id
        WHERE d.id = v_payload_id OR d.id = b.drug_id
        LIMIT 1;

        v_drug_id := v_drug_record.id;
        v_drug_display_name := v_drug_record.name || COALESCE(' ' || v_drug_record.dosage_form, '');

        -- Record Sale Item
        INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price)
        VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, v_remaining_qty, (v_item->>'publicPrice')::DECIMAL);

        -- FEFO Deduction
        FOR v_batch_record IN 
            SELECT id, quantity FROM stock_batches 
            WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
            ORDER BY (id = v_payload_id) DESC, expiry_date ASC, created_at ASC
        LOOP
            EXIT WHEN v_remaining_qty <= 0;
            v_qty_to_take := LEAST(v_remaining_qty, v_batch_record.quantity);
            
            -- Trigger will automatically log movement and update drugs.stock
            UPDATE stock_batches SET quantity = quantity - v_qty_to_take WHERE id = v_batch_record.id;
            
            v_remaining_qty := v_remaining_qty - v_qty_to_take;
        END LOOP;
        
        IF v_remaining_qty > 0 THEN
            RAISE EXCEPTION 'Insufficient stock for %', v_drug_display_name;
        END IF;
    END LOOP;

    -- 4. Finalize Cash & Audit
    IF (p_payload->>'paymentMethod') = 'cash' AND v_shift_id IS NOT NULL THEN
        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
        VALUES (v_branch_id, v_shift_id, 'sale', v_total, 'Sale ' || v_serial_id, v_performer_id, v_sale_id, v_org_id);
        
        PERFORM atomic_increment_shift(v_shift_id, 0, 0, v_total, 0, 0, 0, 0);
    END IF;

    RETURN jsonb_build_object('success', true, 'saleId', v_sale_id, 'serialId', v_serial_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Redefine process_return
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
    v_total_refund DECIMAL := (p_payload->>'totalRefund')::DECIMAL;
    v_batch_id UUID;
    v_expiry_date DATE;
    v_drug_id UUID;
    v_qty INT;
    v_return_serial TEXT;
    v_payment_method TEXT;
    v_drug_record RECORD;
BEGIN
    -- 0. Identity Check
    IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = v_performer_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
    END IF;

    -- 1. Shift Resolution
    SELECT id INTO v_shift_id FROM shifts 
    WHERE branch_id = v_branch_id AND status = 'open' 
    LIMIT 1;
    
    IF v_shift_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active shift found');
    END IF;

    -- 2. Meta Info
    SELECT payment_method INTO v_payment_method FROM sales WHERE id = v_sale_id;
    v_return_serial := 'RET-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);

    -- 3. Create Return Record
    INSERT INTO public.returns (
        org_id, branch_id, sale_id, serial_id,
        total_refund, return_type, reason, notes,
        processed_by, date
    ) VALUES (
        v_org_id, v_branch_id, v_sale_id, v_return_serial,
        v_total_refund, 
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
            v_branch_id, v_return_id, v_drug_id, (v_item->>'saleItemId')::uuid, v_drug_record.name,
            v_qty, COALESCE((v_item->>'isUnit')::boolean, false), (v_item->>'publicPrice')::DECIMAL, 
            (v_item->>'refundAmount')::DECIMAL,
            (v_item->>'condition')::text::item_condition, v_drug_record.dosage_form, v_expiry_date
        );

        -- Restore stock logic
        IF (v_item->>'condition') = 'sellable' AND v_batch_id IS NOT NULL THEN
            -- Trigger will log movement and update drugs.stock
            UPDATE stock_batches SET quantity = quantity + v_qty WHERE id = v_batch_id;
        END IF;

        -- Update Tracking
        UPDATE sales SET item_returned_quantities = 
            COALESCE(item_returned_quantities, '{}'::JSONB) || 
            jsonb_build_object(
                CASE WHEN (v_item->>'isUnit')::BOOLEAN THEN v_drug_id::TEXT || '_unit' ELSE v_drug_id::TEXT || '_pack' END,
                COALESCE((item_returned_quantities->>(CASE WHEN (v_item->>'isUnit')::BOOLEAN THEN v_drug_id::TEXT || '_unit' ELSE v_drug_id::TEXT || '_pack' END))::INT, 0) + v_qty
            )
        WHERE id = v_sale_id;
    END LOOP;

    -- 5. Financials
    UPDATE sales 
    SET net_total = COALESCE(net_total, total) - v_total_refund,
        status = CASE WHEN (p_payload->>'returnType') = 'full' THEN 'returned'::sale_status ELSE status END
    WHERE id = v_sale_id;

    IF v_payment_method = 'cash' THEN
        INSERT INTO cash_transactions (
            branch_id, shift_id, type, amount, reason, 
            user_id, related_sale_id, org_id
        ) VALUES (
            v_branch_id, v_shift_id, 'return', -v_total_refund, 
            'Return ' || v_return_serial, v_performer_id, v_sale_id, v_org_id
        );
        UPDATE shifts SET returns = COALESCE(returns, 0) + v_total_refund WHERE id = v_shift_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'returnId', v_return_id, 'serialId', v_return_serial);
END;
$$;

-- 3. Redefine process_purchase_receipt
CREATE OR REPLACE FUNCTION process_purchase_receipt(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purchase_id UUID := (p_payload->>'purchaseId')::UUID;
    v_performer_id UUID := (p_payload->>'performerId')::UUID;
    v_branch_id UUID;
    v_org_id UUID;
    v_item JSONB;
    v_drug_id UUID;
    v_units_to_add INT;
    v_batch_id UUID;
    v_earliest_expiry DATE;
    v_global_wac DECIMAL;
    v_performer_name TEXT := p_payload->>'performerName';
BEGIN
    SELECT branch_id, org_id INTO v_branch_id, v_org_id FROM purchases WHERE id = v_purchase_id;
    IF v_branch_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase not found');
    END IF;

    -- 🟢 SET MOVEMENT CONTEXT
    PERFORM set_stock_context('purchase', v_purchase_id, v_performer_id, v_performer_name);

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_drug_id := (v_item->>'drugId')::UUID;
        v_units_to_add := (v_item->>'quantity')::INT;

        -- Trigger will automatically log movement and update drugs.stock
        INSERT INTO stock_batches (
            drug_id, quantity, expiry_date, cost_price, 
            purchase_id, date_received, branch_id, org_id, version
        ) VALUES (
            v_drug_id, v_units_to_add, (v_item->>'expiryDate')::DATE, 
            (v_item->>'costPrice')::DECIMAL, v_purchase_id, 
            CURRENT_TIMESTAMP, v_branch_id, v_org_id, 1
        ) RETURNING id INTO v_batch_id;

        -- Metadata Updates (still needed)
        SELECT MIN(expiry_date) INTO v_earliest_expiry FROM stock_batches 
        WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0;

        SELECT SUM(quantity * cost_price) / NULLIF(SUM(quantity), 0) INTO v_global_wac
        FROM stock_batches WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0;

        UPDATE drugs SET
            public_price = (v_item->>'publicPrice')::DECIMAL,
            unit_price = (v_item->>'unitPrice')::DECIMAL,
            cost_price = COALESCE(v_global_wac, (v_item->>'costPrice')::DECIMAL),
            expiry_date = COALESCE(v_earliest_expiry::TEXT, (v_item->>'expiryDate'))
        WHERE id = v_drug_id;
    END LOOP;

    UPDATE purchases SET status = 'received', received_by = v_performer_name, received_at = CURRENT_TIMESTAMP WHERE id = v_purchase_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Redefine process_cancellation
CREATE OR REPLACE FUNCTION process_cancellation(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID := (p_payload->>'saleId')::UUID;
    v_branch_id UUID := (p_payload->>'branchId')::UUID;
    v_performer_id UUID := (p_payload->>'performerId')::UUID;
    v_shift_id UUID;
    v_item RECORD;
    v_batch_record RECORD;
    v_sale_total DECIMAL;
    v_payment_method TEXT;
    v_sale_serial TEXT;
BEGIN
    SELECT id INTO v_shift_id FROM shifts WHERE branch_id = v_branch_id AND status = 'open' LIMIT 1;
    
    SELECT total, payment_method, serial_id INTO v_sale_total, v_payment_method, v_sale_serial
    FROM sales WHERE id = v_sale_id AND status = 'completed';

    IF v_sale_serial IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sale not found or already processed');
    END IF;

    -- 🟢 SET MOVEMENT CONTEXT
    PERFORM set_stock_context('correction', v_sale_id, v_performer_id, NULL);

    FOR v_item IN SELECT drug_id, quantity, name FROM sale_items WHERE sale_id = v_sale_id
    LOOP
        FOR v_batch_record IN 
            SELECT batch_id, quantity as moved_qty 
            FROM stock_movements 
            WHERE reference_id = v_sale_id AND drug_id = v_item.drug_id AND type = 'sale'
        LOOP
            -- Trigger will log movement and update drugs.stock
            UPDATE stock_batches SET quantity = quantity + ABS(v_batch_record.moved_qty) WHERE id = v_batch_record.batch_id;
        END LOOP;
    END LOOP;

    IF v_payment_method = 'cash' AND v_shift_id IS NOT NULL THEN
        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
        VALUES (v_branch_id, v_shift_id, 'adjustment', -v_sale_total, 'Cancellation of ' || v_sale_serial, v_performer_id, v_sale_id, (SELECT org_id FROM sales WHERE id = v_sale_id));
        PERFORM atomic_increment_shift(v_shift_id, 0, 0, -v_sale_total, 0, 0, 0, 0);
    END IF;

    UPDATE sales SET status = 'cancelled' WHERE id = v_sale_id;

    RETURN jsonb_build_object('success', true, 'saleId', v_sale_id);
END;
$$;

-- 5. Atomic Stock Increment Cleanup (Force batch logic)
DROP FUNCTION IF EXISTS atomic_increment_stock(uuid, integer);
DROP FUNCTION IF EXISTS atomic_increment_stock(uuid, numeric);

COMMIT;
