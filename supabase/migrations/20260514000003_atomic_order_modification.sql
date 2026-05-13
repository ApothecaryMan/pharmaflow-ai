-- Ensure modification_history column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='modification_history') THEN
        ALTER TABLE sales ADD COLUMN modification_history JSONB DEFAULT '[]'::JSONB;
    END IF;
END $$;

-- 1. Atomic Order Modification RPC
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
BEGIN
    -- 0. Identity Check
    IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = v_performer_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
    END IF;

    SET LOCAL "app.disable_stock_sync" = 'true';

    -- 1. Handle DELETED or REDUCED items (Compare Old vs New)
    FOR v_old_item IN SELECT drug_id, quantity, name FROM sale_items WHERE sale_id = v_sale_id
    LOOP
        v_drug_id := v_old_item.drug_id;
        v_old_qty := v_old_item.quantity;
        
        -- Find if item exists in new payload
        SELECT value INTO v_new_item FROM jsonb_array_elements(v_new_items) WHERE (value->>'id')::UUID = v_drug_id;
        
        IF v_new_item IS NULL THEN
            -- A. ITEM DELETED: Return all stock
            v_diff := v_old_qty;
            
            -- Find original batch(es) to return to
            FOR v_batch_id IN 
                SELECT batch_id FROM stock_movements 
                WHERE reference_id = v_sale_id AND drug_id = v_drug_id AND type = 'sale'
            LOOP
                UPDATE stock_batches SET quantity = quantity + v_diff WHERE id = v_batch_id;
                
                SELECT stock INTO v_current_stock FROM drugs WHERE id = v_drug_id;
                INSERT INTO stock_movements (
                    drug_id, branch_id, type, quantity, previous_stock, new_stock,
                    reference_id, transaction_id, batch_id, performed_by, status, drug_name_snapshot
                ) VALUES (
                    v_drug_id, v_branch_id, 'adjustment', v_diff, v_current_stock, v_current_stock + v_diff,
                    v_sale_id, v_sale_id, v_batch_id, v_performer_id, 'approved', v_old_item.name
                );
                UPDATE drugs SET stock = stock + v_diff WHERE id = v_drug_id;
            END LOOP;

            DELETE FROM sale_items WHERE sale_id = v_sale_id AND drug_id = v_drug_id;
            v_modifications := v_modifications || jsonb_build_object('type', 'item_removed', 'name', v_old_item.name);
            
        ELSIF (v_new_item->>'quantity')::INT < v_old_qty THEN
            -- B. QUANTITY REDUCED: Return partial stock
            v_diff := v_old_qty - (v_new_item->>'quantity')::INT;
            
            -- Return to last batch used
            SELECT batch_id INTO v_batch_id FROM stock_movements 
            WHERE reference_id = v_sale_id AND drug_id = v_drug_id AND type = 'sale'
            ORDER BY timestamp DESC LIMIT 1;

            IF v_batch_id IS NOT NULL THEN
                UPDATE stock_batches SET quantity = quantity + v_diff WHERE id = v_batch_id;
                SELECT stock INTO v_current_stock FROM drugs WHERE id = v_drug_id;
                INSERT INTO stock_movements (
                    drug_id, branch_id, type, quantity, previous_stock, new_stock,
                    reference_id, transaction_id, batch_id, performed_by, status, drug_name_snapshot
                ) VALUES (
                    v_drug_id, v_branch_id, 'adjustment', v_diff, v_current_stock, v_current_stock + v_diff,
                    v_sale_id, v_sale_id, v_batch_id, v_performer_id, 'approved', v_old_item.name
                );
                UPDATE drugs SET stock = stock + v_diff WHERE id = v_drug_id;
            END IF;

            UPDATE sale_items SET quantity = (v_new_item->>'quantity')::INT WHERE sale_id = v_sale_id AND drug_id = v_drug_id;
            v_modifications := v_modifications || jsonb_build_object('type', 'quantity_reduced', 'name', v_old_item.name, 'diff', v_diff);
        END IF;
    END LOOP;

    -- 2. Handle NEW or INCREASED items
    FOR v_new_item IN SELECT * FROM jsonb_array_elements(v_new_items)
    LOOP
        v_drug_id := (v_new_item->>'id')::UUID;
        v_new_qty := (v_new_item->>'quantity')::INT;
        
        SELECT quantity INTO v_old_qty FROM sale_items WHERE sale_id = v_sale_id AND drug_id = v_drug_id;
        
        IF v_old_qty IS NULL OR v_new_qty > v_old_qty THEN
            -- C. NEW ITEM or INCREASED QUANTITY: Deduct stock (FEFO)
            v_diff := v_new_qty - COALESCE(v_old_qty, 0);
            
            -- Resolve metadata
            SELECT name, dosage_form, stock INTO v_drug_record FROM drugs WHERE id = v_drug_id;
            v_drug_display_name := v_drug_record.name;
            IF v_drug_record.dosage_form IS NOT NULL AND v_drug_record.dosage_form <> '' THEN
                IF position(lower(v_drug_record.dosage_form) in lower(v_drug_record.name)) = 0 THEN
                    v_drug_display_name := v_drug_record.name || ' ' || v_drug_record.dosage_form;
                END IF;
            END IF;

            -- Deduct logic (Simplified FEFO)
            FOR v_batch_id, v_current_stock IN 
                SELECT id, quantity FROM stock_batches 
                WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
                ORDER BY expiry_date ASC, created_at ASC
            LOOP
                EXIT WHEN v_diff <= 0;
                DECLARE 
                    v_to_take INT := LEAST(v_diff, v_current_stock);
                BEGIN
                    UPDATE stock_batches SET quantity = quantity - v_to_take WHERE id = v_batch_id;
                    SELECT stock INTO v_current_stock FROM drugs WHERE id = v_drug_id;
                    INSERT INTO stock_movements (
                        drug_id, branch_id, type, quantity, previous_stock, new_stock,
                        reference_id, transaction_id, batch_id, performed_by, status, drug_name_snapshot
                    ) VALUES (
                        v_drug_id, v_branch_id, 'sale', -v_to_take, v_current_stock, v_current_stock - v_to_take,
                        v_sale_id, v_sale_id, v_batch_id, v_performer_id, 'approved', v_drug_display_name
                    );
                    UPDATE drugs SET stock = stock - v_to_take WHERE id = v_drug_id;
                    v_diff := v_diff - v_to_take;
                END;
            END LOOP;
            
            IF v_diff > 0 THEN RAISE EXCEPTION 'Insufficient stock for %', v_drug_display_name; END IF;

            IF v_old_qty IS NULL THEN
                INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price)
                VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, v_new_qty, (v_new_item->>'publicPrice')::DECIMAL);
                v_modifications := v_modifications || jsonb_build_object('type', 'item_added', 'name', v_drug_display_name);
            ELSE
                UPDATE sale_items SET quantity = v_new_qty WHERE sale_id = v_sale_id AND drug_id = v_drug_id;
                v_modifications := v_modifications || jsonb_build_object('type', 'quantity_increased', 'name', v_drug_display_name);
            END IF;
        END IF;
    END LOOP;

    -- 3. Update Sale Metadata (Total, modificationHistory)
    UPDATE sales SET 
        total = (p_payload->>'total')::DECIMAL,
        subtotal = (p_payload->>'subtotal')::DECIMAL,
        global_discount = (p_payload->>'globalDiscount')::DECIMAL,
        items = v_new_items, -- Update JSONB snapshot
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
