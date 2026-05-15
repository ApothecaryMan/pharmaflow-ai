-- Fix Sale Items Identifiers in JSONB snapshot and RPCs
-- Date: 2026-05-15
-- Objective: Ensure that the 'items' JSONB column in the 'sales' table contains the 'saleItemId' 
--            (matching sale_items.id) to support foreign key constraints in returns.
--            Also ensures is_unit is correctly preserved in sale_items table.

BEGIN;

-- 1. Backfill existing sales with saleItemId in their items JSONB
DO $$
DECLARE
    v_sale_id UUID;
    v_updated_items JSONB;
BEGIN
    FOR v_sale_id IN SELECT id FROM sales WHERE items IS NOT NULL AND items != '[]'::JSONB
    LOOP
        -- Reconstruct items by matching drugId and isUnit with the sale_items table
        WITH matched_items AS (
            SELECT 
                jsonb_set(
                    item, 
                    '{saleItemId}', 
                    COALESCE(
                        (SELECT to_jsonb(id) FROM sale_items si 
                         WHERE si.sale_id = v_sale_id 
                         AND (si.drug_id = (item->>'drugId')::UUID OR si.drug_id = (item->>'id')::UUID)
                         AND si.is_unit = COALESCE((item->>'isUnit')::BOOLEAN, FALSE)
                         LIMIT 1), 
                        'null'::jsonb
                    )
                ) as updated_item
            FROM sales s, jsonb_array_elements(s.items) item
            WHERE s.id = v_sale_id
        )
        SELECT jsonb_agg(updated_item) INTO v_updated_items FROM matched_items;

        IF v_updated_items IS NOT NULL THEN
            UPDATE sales SET items = v_updated_items WHERE id = v_sale_id;
        END IF;
    END LOOP;
END $$;

-- 2. Redefine process_checkout to automatically populate saleItemId in the JSONB snapshot
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
        v_first_expiry := NULL;

        SELECT d.id, d.name, d.dosage_form INTO v_drug_record 
        FROM drugs d
        LEFT JOIN stock_batches b ON b.id = v_payload_id
        WHERE d.id = v_payload_id OR d.id = b.drug_id
        LIMIT 1;

        v_drug_id := v_drug_record.id;
        v_drug_display_name := v_drug_record.name || COALESCE(' ' || v_drug_record.dosage_form, '');

        -- Record Sale Item
        INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price, is_unit)
        VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, v_remaining_qty, (v_item->>'publicPrice')::DECIMAL, COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE))
        RETURNING id INTO v_sale_item_id;

        -- FEFO Deduction
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

-- 3. Redefine process_order_modification to automatically populate saleItemId
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
        
        -- Resolve metadata
        SELECT id, name, dosage_form, stock INTO v_drug_record FROM drugs WHERE id = v_drug_id;
        v_drug_display_name := v_drug_record.name || COALESCE(' ' || v_drug_record.dosage_form, '');

        -- Upsert sale_items
        SELECT id, quantity INTO v_old_qty FROM sale_items WHERE sale_id = v_sale_id AND drug_id = v_drug_id;
        
        IF v_old_qty IS NULL THEN
            INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price, is_unit)
            VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, v_new_qty, (v_new_item->>'publicPrice')::DECIMAL, COALESCE((v_new_item->>'isUnit')::BOOLEAN, FALSE))
            RETURNING id INTO v_sale_item_id;
            v_modifications := v_modifications || jsonb_build_object('type', 'item_added', 'name', v_drug_display_name);
            v_diff := v_new_qty;
        ELSE
            UPDATE sale_items SET 
                quantity = v_new_qty,
                name = v_drug_display_name,
                public_price = (v_new_item->>'publicPrice')::DECIMAL,
                is_unit = COALESCE((v_new_item->>'isUnit')::BOOLEAN, FALSE)
            WHERE sale_id = v_sale_id AND drug_id = v_drug_id
            RETURNING id INTO v_sale_item_id;
            v_diff := v_new_qty - v_old_qty;
            IF v_diff <> 0 THEN
                v_modifications := v_modifications || jsonb_build_object('type', 'quantity_update', 'name', v_drug_display_name, 'diff', v_diff);
            END IF;
        END IF;

        -- Stock Adjustment if quantity changed
        IF v_diff > 0 THEN
            -- Deduct more stock (FEFO)
            DECLARE
                v_to_take_total INT := v_diff;
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
        ELSIF v_diff < 0 THEN
            -- Return stock to latest batch used for this sale
            DECLARE
                v_to_return INT := ABS(v_diff);
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
    FOR v_old_item IN SELECT id, drug_id, quantity, name FROM sale_items WHERE sale_id = v_sale_id
    LOOP
        IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_new_items) WHERE (value->>'id')::UUID = v_old_item.drug_id) THEN
            -- Return all stock for this item
            DECLARE
                v_to_return INT := v_old_item.quantity;
                v_target_batch UUID;
            BEGIN
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

COMMIT;
