-- Implementation of Atomic Returns and Cancellations
-- Date: 2026-05-09
-- Version: 1.0

-- 1. Atomic Returns RPC
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
    v_performer_auth_id UUID := (p_payload->>'performerId')::UUID;
    v_performer_id UUID;
    v_shift_id UUID;
    v_item JSONB;
    v_total_refund DECIMAL := (p_payload->>'totalRefund')::DECIMAL;
    v_batch_id UUID;
    v_drug_id UUID;
    v_qty INT;
    v_return_serial TEXT;
    v_payment_method TEXT;
BEGIN
    -- Resolve Performer
    SELECT id INTO v_performer_id FROM public.employees WHERE auth_user_id = v_performer_auth_id;
    IF v_performer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
    END IF;

    -- Resolve Shift (Must be open)
    SELECT id INTO v_shift_id FROM shifts 
    WHERE branch_id = v_branch_id AND status = 'open' 
    LIMIT 1;
    
    IF v_shift_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active shift found');
    END IF;

    -- Get Sale Info
    SELECT payment_method INTO v_payment_method FROM sales WHERE id = v_sale_id;

    -- Generate Return Serial
    v_return_serial := 'RET-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);

    -- Insert Return Record
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

    -- Disable stock sync triggers for atomicity
    SET LOCAL "app.disable_stock_sync" = 'true';

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_drug_id := (v_item->>'drugId')::UUID;
        v_qty := (v_item->>'quantity')::INT;

        -- Record Return Item
        INSERT INTO return_items (
            branch_id, return_id, drug_id, name,
            quantity_returned, public_price, refund_amount,
            condition
        ) VALUES (
            v_branch_id, v_return_id, v_drug_id, v_item->>'name',
            v_qty, (v_item->>'publicPrice')::DECIMAL, 
            (v_item->>'refundAmount')::DECIMAL,
            (v_item->>'condition')::text::return_condition
        );

        -- If item is sellable, restore stock to the specific batch
        IF (v_item->>'condition') = 'sellable' THEN
            SELECT batch_id INTO v_batch_id 
            FROM stock_movements 
            WHERE reference_id = v_sale_id AND drug_id = v_drug_id AND type = 'sale'
            ORDER BY timestamp DESC LIMIT 1;

            IF v_batch_id IS NOT NULL THEN
                UPDATE stock_batches SET quantity = quantity + v_qty WHERE id = v_batch_id;
                
                INSERT INTO stock_movements (
                    drug_id, branch_id, type, quantity, previous_stock, new_stock,
                    reference_id, transaction_id, batch_id, performed_by, status,
                    drug_name_snapshot, performed_by_name_snapshot
                ) VALUES (
                    v_drug_id, v_branch_id, 'return_customer', v_qty,
                    (SELECT stock FROM drugs WHERE id = v_drug_id),
                    (SELECT stock FROM drugs WHERE id = v_drug_id) + v_qty,
                    v_return_id, v_sale_id, v_batch_id, v_performer_id, 'approved',
                    v_item->>'name', p_payload->>'performerName'
                );

                UPDATE drugs SET stock = stock + v_qty WHERE id = v_drug_id;
            END IF;
        END IF;
    END LOOP;

    -- Financial Updates
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

    -- Update Sale status if full return
    IF (p_payload->>'returnType') = 'full' THEN
        UPDATE sales SET status = 'returned' WHERE id = v_sale_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'returnId', v_return_id, 'serialId', v_return_serial);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Atomic Cancellation RPC
CREATE OR REPLACE FUNCTION process_cancellation(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID := (p_payload->>'saleId')::UUID;
    v_branch_id UUID := (p_payload->>'branchId')::UUID;
    v_performer_auth_id UUID := (p_payload->>'performerId')::UUID;
    v_performer_id UUID;
    v_shift_id UUID;
    v_item RECORD;
    v_batch_record RECORD;
    v_sale_total DECIMAL;
    v_payment_method TEXT;
    v_sale_serial TEXT;
BEGIN
    SELECT id INTO v_performer_id FROM public.employees WHERE auth_user_id = v_performer_auth_id;
    SELECT id INTO v_shift_id FROM shifts WHERE branch_id = v_branch_id AND status = 'open' LIMIT 1;
    
    SELECT total, payment_method, serial_id INTO v_sale_total, v_payment_method, v_sale_serial
    FROM sales WHERE id = v_sale_id AND status = 'completed';

    IF v_sale_serial IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sale not found or already processed');
    END IF;

    SET LOCAL "app.disable_stock_sync" = 'true';

    FOR v_item IN SELECT drug_id, quantity, name FROM sale_items WHERE sale_id = v_sale_id
    LOOP
        FOR v_batch_record IN 
            SELECT batch_id, quantity as moved_qty 
            FROM stock_movements 
            WHERE reference_id = v_sale_id AND drug_id = v_item.drug_id AND type = 'sale'
        LOOP
            UPDATE stock_batches SET quantity = quantity + ABS(v_batch_record.moved_qty) WHERE id = v_batch_record.batch_id;
            
            INSERT INTO stock_movements (
                drug_id, branch_id, type, quantity, previous_stock, new_stock,
                reference_id, transaction_id, batch_id, performed_by, status,
                drug_name_snapshot
            ) VALUES (
                v_item.drug_id, v_branch_id, 'adjustment', ABS(v_batch_record.moved_qty),
                (SELECT stock FROM drugs WHERE id = v_item.drug_id),
                (SELECT stock FROM drugs WHERE id = v_item.drug_id) + ABS(v_batch_record.moved_qty),
                v_sale_id, v_sale_id, v_batch_record.batch_id, v_performer_id, 'approved',
                v_item.name
            );
        END LOOP;
        
        UPDATE drugs SET stock = stock + v_item.quantity WHERE id = v_item.drug_id;
    END LOOP;

    IF v_payment_method = 'cash' AND v_shift_id IS NOT NULL THEN
        INSERT INTO cash_transactions (
            branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id
        ) VALUES (
            v_branch_id, v_shift_id, 'adjustment', -v_sale_total, 
            'Cancellation of ' || v_sale_serial, v_performer_id, v_sale_id, (SELECT org_id FROM sales WHERE id = v_sale_id)
        );
        UPDATE shifts SET cash_sales = cash_sales - v_sale_total WHERE id = v_shift_id;
    END IF;

    UPDATE sales SET status = 'cancelled' WHERE id = v_sale_id;

    RETURN jsonb_build_object('success', true, 'saleId', v_sale_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
