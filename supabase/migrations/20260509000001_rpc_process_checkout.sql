-- Migration: RPC for Atomic Checkout
CREATE OR REPLACE FUNCTION process_checkout(
    p_payload JSONB
) RETURNS JSONB AS $$
DECLARE
    -- Context
    v_branch_id UUID := (p_payload->>'branchId')::UUID;
    v_org_id UUID := (p_payload->>'orgId')::UUID;
    v_performer_id UUID := (p_payload->>'performerId')::UUID;
    v_performer_name TEXT := p_payload->>'performerName';
    v_shift_id UUID := (p_payload->>'shiftId')::UUID;
    v_timestamp TIMESTAMPTZ := COALESCE((p_payload->>'timestamp')::TIMESTAMPTZ, NOW());
    v_branch_code TEXT := p_payload->>'branchCode';
    
    -- Sale Data
    v_items JSONB := p_payload->'items';
    v_customer_name TEXT := p_payload->>'customerName';
    v_customer_phone TEXT := p_payload->>'customerPhone';
    v_payment_method payment_method := (p_payload->>'paymentMethod')::payment_method;
    v_sale_type sale_type := COALESCE((p_payload->>'saleType')::sale_type, 'walk-in');
    v_delivery_fee NUMERIC := COALESCE((p_payload->>'deliveryFee')::NUMERIC, 0);
    v_global_discount NUMERIC := COALESCE((p_payload->>'globalDiscount')::NUMERIC, 0);
    
    -- Internal Variables
    v_sale_id UUID := gen_random_uuid();
    v_serial_id TEXT;
    v_daily_order_number INTEGER;
    v_item JSONB;
    v_drug_id UUID;
    v_drug_record RECORD;
    v_batch_record RECORD;
    v_qty_requested INTEGER;
    v_is_unit BOOLEAN;
    v_units_per_pack INTEGER;
    v_units_to_deduct INTEGER;
    v_total_units_remaining INTEGER;
    
    v_calculated_subtotal NUMERIC := 0;
    v_calculated_tax NUMERIC := 0;
    v_calculated_total NUMERIC := 0;
    
    v_processed_items JSONB := '[]'::JSONB;
    v_movement_ids UUID[] := '{}';
    v_sale_status sale_status;
BEGIN
    -- 1. Validation: Open Shift required for Walk-in
    IF v_sale_type = 'walk-in' AND v_shift_id IS NULL THEN
        RAISE EXCEPTION 'An active shift is required for walk-in sales.';
    END IF;

    -- 2. Determine Sale Status
    IF v_sale_type = 'walk-in' THEN
        v_sale_status := 'completed';
    ELSE
        -- Delivery logic: check if driver is assigned (simplified for now)
        v_sale_status := 'pending';
    END IF;

    -- 3. Atomic Daily Order Number
    v_daily_order_number := get_next_daily_order_number_atomic(v_branch_id, v_timestamp::DATE);

    -- 4. Serial ID Generation (PF-XXXX)
    -- PF is fallback, v_branch_code should be passed
    v_serial_id := v_branch_code || '-' || LPAD(increment_sequence(v_branch_id, 'sales')::TEXT, 4, '0');

    -- 5. Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_drug_id := (v_item->>'id')::UUID;
        v_qty_requested := (v_item->>'quantity')::INTEGER;
        v_is_unit := COALESCE((v_item->>'isUnit')::BOOLEAN, false);
        
        -- Load drug and lock it
        SELECT * INTO v_drug_record FROM drugs WHERE id = v_drug_id FOR SHARE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Drug not found: %', v_drug_id;
        END IF;

        v_units_per_pack := COALESCE(v_drug_record.units_per_pack, 1);
        v_units_to_deduct := CASE WHEN v_is_unit THEN v_qty_requested ELSE v_qty_requested * v_units_per_pack END;

        -- Validate global stock before deep dive
        IF v_drug_record.stock < v_units_to_deduct THEN
            RAISE EXCEPTION 'Insufficient stock for %: requested %, available %', v_drug_record.name, v_units_to_deduct, v_drug_record.stock;
        END IF;

        -- FEFO Batch Allocation with Locking
        v_total_units_remaining := v_units_to_deduct;
        
        FOR v_batch_record IN 
            SELECT * FROM stock_batches 
            WHERE drug_id = v_drug_id AND quantity > 0 
            ORDER BY expiry_date ASC, created_at ASC
            FOR UPDATE
        LOOP
            EXIT WHEN v_total_units_remaining <= 0;

            DECLARE
                v_take INTEGER := LEAST(v_batch_record.quantity, v_total_units_remaining);
                v_movement_id UUID := gen_random_uuid();
            BEGIN
                -- Update Batch
                UPDATE stock_batches 
                SET quantity = quantity - v_take,
                    version = version + 1
                WHERE id = v_batch_record.id;

                -- Insert Movement
                INSERT INTO stock_movements (
                    id, drug_id, drug_name_snapshot, branch_id, type, 
                    quantity, previous_stock, new_stock, 
                    reference_id, batch_id, performed_by, performed_by_name_snapshot,
                    status, expiry_date, timestamp
                ) VALUES (
                    v_movement_id, v_drug_id, v_drug_record.name, v_branch_id, 'sale',
                    -v_take, v_drug_record.stock - (v_units_to_deduct - v_total_units_remaining), 
                    v_drug_record.stock - (v_units_to_deduct - v_total_units_remaining) - v_take,
                    v_sale_id, v_batch_record.id, v_performer_id, v_performer_name,
                    'approved', v_batch_record.expiry_date, v_timestamp
                );

                v_total_units_remaining := v_total_units_remaining - v_take;
            END;
        END LOOP;

        IF v_total_units_remaining > 0 THEN
            RAISE EXCEPTION 'Insufficient batch stock for %: could not allocate % units', v_drug_record.name, v_total_units_remaining;
        END IF;

        -- Update Global Stock (Explicitly since trigger is disabled)
        UPDATE drugs SET stock = stock - v_units_to_deduct WHERE id = v_drug_id;

        -- Accumulate Totals
        v_calculated_subtotal := v_calculated_subtotal + (COALESCE((v_item->>'publicPrice')::NUMERIC, v_drug_record.public_price) * v_qty_requested);
        -- For now tax is simplified or extracted from drug_record
        v_calculated_tax := v_calculated_tax + (v_calculated_subtotal * (COALESCE(v_drug_record.tax, 0) / 100));

        -- Add to processed items (maintaining compatibility with current JSONB structure)
        v_processed_items := v_processed_items || v_item;
    END LOOP;

    v_calculated_total := v_calculated_subtotal + v_calculated_tax + v_delivery_fee - v_global_discount;

    -- 6. Create Sale
    INSERT INTO sales (
        id, serial_id, branch_id, org_id, date, updated_at, 
        sold_by_employee_id, daily_order_number, total, subtotal,
        customer_name, customer_phone, payment_method, sale_type,
        delivery_fee, global_discount, status, items
    ) VALUES (
        v_sale_id, v_serial_id, v_branch_id, v_org_id, v_timestamp, v_timestamp,
        v_performer_id, v_daily_order_number, v_calculated_total, v_calculated_subtotal,
        v_customer_name, v_customer_phone, v_payment_method, v_sale_type,
        v_delivery_fee, v_global_discount, v_sale_status, v_processed_items
    );

    -- 7. Handle Financials for Walk-in
    IF v_sale_type = 'walk-in' THEN
        -- Add Cash Transaction
        INSERT INTO cash_transactions (
            branch_id, shift_id, time, type, amount, reason, user_id, related_sale_id
        ) VALUES (
            v_branch_id, v_shift_id, v_timestamp, 
            CASE WHEN v_payment_method = 'cash' THEN 'sale'::cash_tx_type ELSE 'card_sale'::cash_tx_type END,
            v_calculated_total, 'Sale #' || v_serial_id, v_performer_id, v_sale_id
        );

        -- Update Shift Totals
        IF v_payment_method = 'cash' THEN
            UPDATE shifts SET cash_sales = cash_sales + v_calculated_total WHERE id = v_shift_id;
        ELSE
            UPDATE shifts SET card_sales = card_sales + v_calculated_total WHERE id = v_shift_id;
        END IF;
    END IF;

    -- 8. Audit Log
    INSERT INTO audit_logs (
        branch_id, actor_id, action, entity_type, entity_id, details, timestamp
    ) VALUES (
        v_branch_id, v_performer_id, 'sale.complete', 'sale', v_sale_id, 
        'Completed Sale #' || v_serial_id || ' - Total: ' || v_calculated_total, v_timestamp
    );

    -- Return the created sale
    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'serial_id', v_serial_id,
        'daily_order_number', v_daily_order_number,
        'total', v_calculated_total
    );

EXCEPTION WHEN OTHERS THEN
    -- Transaction will automatically rollback on error
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
