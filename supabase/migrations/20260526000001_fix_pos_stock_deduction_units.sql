-- ═══════════════════════════════════════════
-- Migration: Fix POS Stock Deduction Units (Packs vs Units)
-- Date: 2026-05-26
-- Description:
--   Redefines process_checkout, process_order_modification, and process_return
--   to properly scale pack quantities to units (using units_per_pack) when
--   updating stock_batches.
-- ═══════════════════════════════════════════

BEGIN;

-- 1. Redefine process_checkout to scale pack quantities to units in FEFO deduction
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
    v_sale_item_id UUID;
    v_updated_items JSONB := '[]'::JSONB;
    v_first_expiry DATE;
    v_cost_price DECIMAL;
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
        v_first_expiry := NULL;

        SELECT d.id, d.name, d.dosage_form, d.cost_price, d.unit_cost_price, d.units_per_pack 
        INTO v_drug_record 
        FROM drugs d
        LEFT JOIN stock_batches b ON b.id = v_payload_id
        WHERE d.id = v_payload_id OR d.id = b.drug_id
        LIMIT 1;

        v_drug_id := v_drug_record.id;
        v_drug_display_name := v_drug_record.name || COALESCE(' ' || v_drug_record.dosage_form, '');

        -- Determine cost price depending on whether unit or pack was sold
        IF COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE) THEN
            v_cost_price := COALESCE(
                v_drug_record.unit_cost_price,
                v_drug_record.cost_price / NULLIF(v_drug_record.units_per_pack, 0),
                0
            );
            v_remaining_qty := (v_item->>'quantity')::INT;
        ELSE
            v_cost_price := COALESCE(v_drug_record.cost_price, 0);
            v_remaining_qty := (v_item->>'quantity')::INT * COALESCE(v_drug_record.units_per_pack, 1);
        END IF;

        -- Record Sale Item (using raw item quantity sold, not units)
        INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price, cost_price, is_unit)
        VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, (v_item->>'quantity')::INT, (v_item->>'publicPrice')::DECIMAL, v_cost_price, COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE))
        RETURNING id INTO v_sale_item_id;

        -- FEFO Deduction (deducting actual units from stock_batches)
        FOR v_batch_record IN 
            SELECT id, quantity, expiry_date FROM stock_batches 
            WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
            ORDER BY (id = v_payload_id) DESC, expiry_date ASC, created_at ASC
        LOOP
            EXIT WHEN v_remaining_qty <= 0;
            v_qty_to_take := LEAST(v_remaining_qty, v_batch_record.quantity);
            
            IF v_first_expiry IS NULL THEN v_first_expiry := v_batch_record.expiry_date; END IF;

            UPDATE stock_batches SET quantity = quantity - v_qty_to_take WHERE id = v_batch_record.id;
            
            v_remaining_qty := v_remaining_qty - v_qty_to_take;
        END LOOP;
        
        IF v_remaining_qty > 0 THEN
            RAISE EXCEPTION 'Insufficient stock for %', v_drug_display_name;
        END IF;

        -- Accumulate updated item for JSONB snapshot
        v_updated_items := v_updated_items || jsonb_build_array(
            v_item || jsonb_build_object(
                'saleItemId', v_sale_item_id,
                'name', v_drug_display_name,
                'dosageForm', v_drug_record.dosage_form,
                'expiryDate', v_first_expiry
            )
        );
    END LOOP;

    -- Finalize JSONB snapshot in sales table
    UPDATE sales SET items = v_updated_items WHERE id = v_sale_id;

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


-- 2. Redefine process_order_modification to use unit-difference for stock adjustment
CREATE OR REPLACE FUNCTION process_order_modification(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID := (p_payload->>'saleId')::UUID;
    v_branch_id UUID := (p_payload->>'branchId')::UUID;
    v_org_id UUID := (p_payload->>'orgId')::UUID;
    v_performer_id UUID := (p_payload->>'performerId')::UUID;
    v_performer_name TEXT := p_payload->>'performerName';
    v_new_items JSONB := p_payload->'items';
    v_old_item RECORD;
    v_new_item JSONB;
    v_drug_id UUID;
    v_old_qty INT;
    v_new_qty INT;
    v_diff INT;
    v_batch_id UUID;
    v_current_stock INT;
    v_drug_record RECORD;
    v_drug_display_name TEXT;
    v_modifications JSONB := '[]'::JSONB;
    v_enriched_items JSONB := '[]'::JSONB;
    v_sale_item_id UUID;
    v_first_expiry DATE;
    v_cost_price DECIMAL;
    
    v_old_is_unit BOOLEAN;
    v_old_units INT;
    v_new_units INT;
    v_unit_diff INT;
BEGIN
    -- 0. Identity Check
    IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = v_performer_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
    END IF;

    -- 🟢 SET MOVEMENT CONTEXT
    PERFORM set_stock_context('correction', v_sale_id, v_performer_id, v_performer_name);

    -- 1. Enrichment and Comparison Loop
    FOR v_new_item IN SELECT * FROM jsonb_array_elements(v_new_items)
    LOOP
        v_drug_id := (v_new_item->>'id')::UUID;
        v_new_qty := (v_new_item->>'quantity')::INT;
        v_first_expiry := NULL;
        
        -- Resolve metadata (including cost price fields)
        SELECT id, name, dosage_form, stock, cost_price, unit_cost_price, units_per_pack 
        INTO v_drug_record 
        FROM drugs 
        WHERE id = v_drug_id;

        v_drug_display_name := v_drug_record.name || COALESCE(' ' || v_drug_record.dosage_form, '');

        -- Determine cost price depending on whether unit or pack was sold
        IF COALESCE((v_new_item->>'isUnit')::BOOLEAN, FALSE) THEN
            v_cost_price := COALESCE(
                v_drug_record.unit_cost_price,
                v_drug_record.cost_price / NULLIF(v_drug_record.units_per_pack, 0),
                0
            );
        ELSE
            v_cost_price := COALESCE(v_drug_record.cost_price, 0);
        END IF;

        -- Resolve old quantity and mode
        SELECT quantity, is_unit INTO v_old_qty, v_old_is_unit FROM sale_items WHERE sale_id = v_sale_id AND drug_id = v_drug_id;

        -- Convert both old and new to units
        IF v_old_qty IS NULL THEN
            v_old_units := 0;
        ELSE
            IF v_old_is_unit THEN
                v_old_units := v_old_qty;
            ELSE
                v_old_units := v_old_qty * COALESCE(v_drug_record.units_per_pack, 1);
            END IF;
        END IF;

        IF COALESCE((v_new_item->>'isUnit')::BOOLEAN, FALSE) THEN
            v_new_units := v_new_qty;
        ELSE
            v_new_units := v_new_qty * COALESCE(v_drug_record.units_per_pack, 1);
        END IF;

        v_unit_diff := v_new_units - v_old_units;

        -- Upsert sale_items using raw quantities
        IF v_old_qty IS NULL THEN
            INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price, cost_price, is_unit)
            VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, v_new_qty, (v_new_item->>'publicPrice')::DECIMAL, v_cost_price, COALESCE((v_new_item->>'isUnit')::BOOLEAN, FALSE))
            RETURNING id INTO v_sale_item_id;
            v_modifications := v_modifications || jsonb_build_object('type', 'item_added', 'name', v_drug_display_name);
        ELSE
            UPDATE sale_items SET 
                quantity = v_new_qty,
                name = v_drug_display_name,
                public_price = (v_new_item->>'publicPrice')::DECIMAL,
                cost_price = v_cost_price,
                is_unit = COALESCE((v_new_item->>'isUnit')::BOOLEAN, FALSE)
            WHERE sale_id = v_sale_id AND drug_id = v_drug_id
            RETURNING id INTO v_sale_item_id;
            
            v_diff := v_new_qty - v_old_qty;
            IF v_diff <> 0 THEN
                v_modifications := v_modifications || jsonb_build_object('type', 'quantity_update', 'name', v_drug_display_name, 'diff', v_diff);
            END IF;
        END IF;

        -- Stock Adjustment in units
        IF v_unit_diff > 0 THEN
            -- Deduct more stock (FEFO)
            DECLARE
                v_to_take_total INT := v_unit_diff;
                v_batch_rec RECORD;
            BEGIN
                FOR v_batch_rec IN 
                    SELECT id, quantity, expiry_date FROM stock_batches 
                    WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
                    ORDER BY expiry_date ASC, created_at ASC
                LOOP
                    EXIT WHEN v_to_take_total <= 0;
                    DECLARE v_take INT := LEAST(v_to_take_total, v_batch_rec.quantity);
                    BEGIN
                        IF v_first_expiry IS NULL THEN v_first_expiry := v_batch_rec.expiry_date; END IF;
                        UPDATE stock_batches SET quantity = quantity - v_take WHERE id = v_batch_rec.id;
                        v_to_take_total := v_to_take_total - v_take;
                    END;
                END LOOP;
                IF v_to_take_total > 0 THEN RAISE EXCEPTION 'Insufficient stock for %', v_drug_display_name; END IF;
            END;
        ELSIF v_unit_diff < 0 THEN
            -- Return stock to latest batch used for this sale
            DECLARE
                v_to_return INT := ABS(v_unit_diff);
                v_target_batch UUID;
                v_target_expiry DATE;
            BEGIN
                SELECT batch_id, expiry_date INTO v_target_batch, v_target_expiry
                FROM stock_movements 
                WHERE reference_id = v_sale_id AND drug_id = v_drug_id AND type = 'sale'
                ORDER BY timestamp DESC LIMIT 1;
                
                IF v_target_batch IS NOT NULL THEN
                    v_first_expiry := v_target_expiry;
                    UPDATE stock_batches SET quantity = quantity + v_to_return WHERE id = v_target_batch;
                END IF;
            END;
        ELSE
            -- No quantity change, just get latest expiry for snapshot
            SELECT expiry_date INTO v_first_expiry FROM stock_movements 
            WHERE reference_id = v_sale_id AND drug_id = v_drug_id AND type = 'sale'
            ORDER BY timestamp DESC LIMIT 1;
        END IF;

        -- Build enriched item for JSONB
        v_enriched_items := v_enriched_items || (v_new_item || jsonb_build_object(
            'saleItemId', v_sale_item_id,
            'name', v_drug_display_name, 
            'dosageForm', v_drug_record.dosage_form,
            'expiryDate', v_first_expiry
        ));
    END LOOP;

    -- Handle DELETED items (not in v_new_items)
    FOR v_old_item IN SELECT id, drug_id, quantity, name, is_unit FROM sale_items WHERE sale_id = v_sale_id
    LOOP
        IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_new_items) WHERE (value->>'id')::UUID = v_old_item.drug_id) THEN
            -- Return all stock for this item
            DECLARE
                v_to_return INT;
                v_target_batch UUID;
            BEGIN
                SELECT units_per_pack INTO v_drug_record FROM drugs WHERE id = v_old_item.drug_id;

                IF COALESCE(v_old_item.is_unit, FALSE) THEN
                    v_to_return := v_old_item.quantity;
                ELSE
                    v_to_return := v_old_item.quantity * COALESCE(v_drug_record.units_per_pack, 1);
                END IF;

                SELECT batch_id INTO v_target_batch 
                FROM stock_movements 
                WHERE reference_id = v_sale_id AND drug_id = v_old_item.drug_id AND type = 'sale'
                ORDER BY timestamp DESC LIMIT 1;
                
                IF v_target_batch IS NOT NULL THEN
                    UPDATE stock_batches SET quantity = quantity + v_to_return WHERE id = v_target_batch;
                END IF;
            END;
            DELETE FROM sale_items WHERE id = v_old_item.id;
            v_modifications := v_modifications || jsonb_build_object('type', 'item_removed', 'name', v_old_item.name);
        END IF;
    END LOOP;

    -- 3. Final Update
    UPDATE sales SET 
        total = (p_payload->>'total')::DECIMAL,
        subtotal = (p_payload->>'subtotal')::DECIMAL,
        global_discount = (p_payload->>'globalDiscount')::DECIMAL,
        items = v_enriched_items,
        modification_history = COALESCE(modification_history, '[]'::JSONB) || jsonb_build_object(
            'timestamp', CURRENT_TIMESTAMP,
            'modifiedBy', v_performer_name,
            'modifications', v_modifications
        )
    WHERE id = v_sale_id;

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- 3. Redefine process_return to scale returned pack quantities to units
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
        SELECT name, dosage_form, units_per_pack INTO v_drug_record FROM drugs WHERE id = v_drug_id;

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

        -- Restore stock logic (converting pack returns to unit equivalents)
        IF (v_item->>'condition') = 'sellable' AND v_batch_id IS NOT NULL THEN
            DECLARE
                v_return_units INT;
            BEGIN
                IF v_sale_item_record.is_unit THEN
                    v_return_units := v_qty;
                ELSE
                    v_return_units := v_qty * COALESCE(v_drug_record.units_per_pack, 1);
                END IF;
                UPDATE stock_batches SET quantity = quantity + v_return_units WHERE id = v_batch_id;
            END;
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
