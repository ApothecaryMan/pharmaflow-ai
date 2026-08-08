-- ============================================================================
-- Remove the global discount feature (dead code + always-0 column).
--
-- Background: the POS had no UI to SET a global discount (only per-item cashier
-- discount resets to 0), so `sales.global_discount` is effectively always 0.
-- The client sends `globalDiscount: 0` by default. Per-item discounts live on
-- `sale_items.discount` and are unaffected.
--
-- Steps (order matters): 1) redefine process_checkout so it no longer reads
-- `p_payload->>'globalDiscount'` nor writes the column; 2) drop the column.
-- If any historical row holds a nonzero value, that old line will no longer be
-- displayed on invoices — acknowledged trade-off of removing the feature.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_checkout(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
     v_order_number INT;
     v_serial_id TEXT;
     v_branch_code TEXT;
     v_drug_display_name TEXT;
     v_total DECIMAL := (p_payload->>'total')::DECIMAL;
     v_subtotal DECIMAL := (p_payload->>'subtotal')::DECIMAL;
     v_sale_item_id UUID;
     v_first_expiry DATE;
     v_cost_price DECIMAL;
     v_earned_points INTEGER := COALESCE(ROUND((p_payload->>'earnedPoints')::DECIMAL), 0)::INTEGER;
     v_phone_clean TEXT;
 BEGIN
     -- ═══ SECURITY FIX: verify caller has permission on this branch ═══
     -- Replaces the weak "employee exists" check with proper auth.uid() verification
     IF NOT has_branch_permission(v_branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','pharmacist','cashier','senior_cashier','manager']::employee_role[]) THEN
         RETURN jsonb_build_object('success', false, 'error', 'Access denied: Unauthorized to process checkout');
     END IF;

     v_shift_id := (p_payload->>'shiftId')::UUID;
     IF v_shift_id IS NULL THEN
         SELECT id INTO v_shift_id FROM shifts
         WHERE branch_id = v_branch_id AND status = 'open'
         ORDER BY (opened_by = v_performer_id) DESC LIMIT 1;
     END IF;

     INSERT INTO branch_daily_sequences (branch_id, sale_date, current_value)
     VALUES (v_branch_id, CURRENT_DATE, 1)
     ON CONFLICT (branch_id, sale_date) DO UPDATE SET current_value = branch_daily_sequences.current_value + 1
     RETURNING current_value INTO v_order_number;

     SELECT code INTO v_branch_code FROM branches WHERE id = v_branch_id;
     v_branch_code := COALESCE(v_branch_code, 'SALE');
     v_serial_id := generate_serial_id(v_branch_id, 'SL', v_branch_code, CURRENT_TIMESTAMP);

     INSERT INTO sales (
         org_id, branch_id, serial_id, daily_order_number,
         total, subtotal,
         payment_method, sale_type, status,
         sold_by_employee_id, shift_id,
         customer_name, customer_code, customer_phone,
         customer_address, customer_street_address,
         earned_points
     ) VALUES (
         v_org_id, v_branch_id, v_serial_id, v_order_number,
         v_total, v_subtotal,
         (p_payload->>'paymentMethod')::payment_method,
         (p_payload->>'saleType')::sale_type,
         COALESCE((p_payload->>'status')::sale_status, 'completed'),
         v_performer_id, v_shift_id,
         p_payload->>'customerName', p_payload->>'customerCode', p_payload->>'customerPhone',
         p_payload->>'customerAddress', p_payload->>'customerStreetAddress',
         v_earned_points
     ) RETURNING id INTO v_sale_id;

     PERFORM set_stock_context('sale', v_sale_id, v_performer_id, p_payload->>'performerName');

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

         INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price, cost_price, is_unit, units_per_pack)
         VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, (v_item->>'quantity')::INT, (v_item->>'publicPrice')::DECIMAL, v_cost_price, COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE), COALESCE(v_drug_record.units_per_pack, 1))
         RETURNING id INTO v_sale_item_id;

         FOR v_batch_record IN
             SELECT id, quantity, expiry_date, batch_number FROM stock_batches
             WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
             ORDER BY (id = v_payload_id) DESC, expiry_date ASC, created_at ASC
         LOOP
             EXIT WHEN v_remaining_qty <= 0;
             v_qty_to_take := LEAST(v_remaining_qty, v_batch_record.quantity);

             IF v_first_expiry IS NULL THEN v_first_expiry := v_batch_record.expiry_date; END IF;

UPDATE stock_batches SET quantity = quantity - v_qty_to_take WHERE id = v_batch_record.id;

              -- Fix: properly insert into sale_item_batches to link the batch to the sale item
              INSERT INTO sale_item_batches (branch_id, sale_item_id, batch_id, quantity, expiry_date)
              VALUES (v_branch_id, v_sale_item_id, v_batch_record.id, v_qty_to_take, v_batch_record.expiry_date);

             v_remaining_qty := v_remaining_qty - v_qty_to_take;
         END LOOP;

         IF v_remaining_qty > 0 THEN
             RAISE EXCEPTION 'Insufficient stock for %', v_drug_display_name;
         END IF;
     END LOOP;

     v_phone_clean := REGEXP_REPLACE(p_payload->>'customerPhone', '\D', '', 'g');

     IF v_phone_clean IS NOT NULL AND v_phone_clean != '' THEN
         UPDATE customers
         SET
            last_visit = CURRENT_TIMESTAMP,
            total_purchases = COALESCE(total_purchases, 0) + v_total,
            points = points + v_earned_points,
            visit_count = COALESCE(visit_count, 0) + 1
         WHERE
            (phone = v_phone_clean OR code = p_payload->>'customerCode')
            AND org_id = v_org_id;
     END IF;

     IF v_shift_id IS NOT NULL AND COALESCE(p_payload->>'status', 'completed') = 'completed' THEN
         IF (p_payload->>'paymentMethod') = 'cash' THEN
             INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
             VALUES (v_branch_id, v_shift_id, 'sale', v_total, 'Sale ' || v_serial_id, v_performer_id, v_sale_id, v_org_id);

             PERFORM atomic_increment_shift(v_shift_id, 0, 0, v_total, 0, 0, 0, 0);
         ELSIF (p_payload->>'paymentMethod') = 'visa' THEN
             INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
             VALUES (v_branch_id, v_shift_id, 'card_sale', v_total, 'Sale ' || v_serial_id, v_performer_id, v_sale_id, v_org_id);

             PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, v_total, 0, 0, 0);
         END IF;
     END IF;

     RETURN jsonb_build_object(
         'success', true,
         'sale', row_to_json((SELECT s FROM sales s WHERE id = v_sale_id))::jsonb ||
                 jsonb_build_object('items', COALESCE(
                     (SELECT jsonb_agg(
                         jsonb_build_object(
                             'id', si.drug_id,
                             'name', si.name,
                             'quantity', si.quantity,
                             'publicPrice', si.public_price,
                             'isUnit', si.is_unit,
                             'costPrice', si.cost_price,
                             'saleItemId', si.id,
                             'unitsPerPack', si.units_per_pack,
                             'batchAllocations', (
                                 SELECT jsonb_agg(
                                     jsonb_build_object(
                                         'batchId', sib.batch_id,
                                         'quantity', sib.quantity,
                                         'expiryDate', sib.expiry_date,
                                         'batchNumber', sb.batch_number
                                     )
                                 )
                                 FROM sale_item_batches sib
                                 JOIN stock_batches sb ON sb.id = sib.batch_id
                                 WHERE sib.sale_item_id = si.id
                             )
                         )
                     ) FROM sale_items si WHERE si.sale_id = v_sale_id),
                     '[]'::JSONB
                 ))
     );
 END;
 $function$;

-- process_order_modification also wrote global_discount; redefine it without that line
CREATE OR REPLACE FUNCTION public.process_order_modification(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    v_movement RECORD;
BEGIN
    -- ═══ SECURITY FIX: verify caller has permission on this branch ═══
    IF NOT has_branch_permission(v_branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','pharmacist','cashier','senior_cashier','manager']::employee_role[]) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Unauthorized to modify order');
    END IF;

    PERFORM 1 FROM sales WHERE id = v_sale_id FOR UPDATE;

    SET LOCAL "app.disable_stock_sync" = 'true';

    FOR v_old_item IN SELECT drug_id, quantity, name FROM sale_items WHERE sale_id = v_sale_id
    LOOP
        v_drug_id := v_old_item.drug_id;
        v_old_qty := v_old_item.quantity;

        SELECT value INTO v_new_item FROM jsonb_array_elements(v_new_items) WHERE (value->>'id')::UUID = v_drug_id;

        IF v_new_item IS NULL THEN
            FOR v_movement IN
                SELECT batch_id, quantity AS moved_qty
                FROM stock_movements
                WHERE reference_id = v_sale_id AND drug_id = v_drug_id AND type = 'sale'
                ORDER BY timestamp ASC
            LOOP
                UPDATE stock_batches SET quantity = quantity + ABS(v_movement.moved_qty) WHERE id = v_movement.batch_id;

                SELECT stock INTO v_current_stock FROM drugs WHERE id = v_drug_id;
                INSERT INTO stock_movements (
                    drug_id, branch_id, type, quantity, previous_stock, new_stock,
                    reference_id, transaction_id, batch_id, performed_by, status, drug_name_snapshot
                ) VALUES (
                    v_drug_id, v_branch_id, 'adjustment', ABS(v_movement.moved_qty), v_current_stock, v_current_stock + ABS(v_movement.moved_qty),
                    v_sale_id, v_sale_id, v_movement.batch_id, v_performer_id, 'approved', v_old_item.name
                );
                UPDATE drugs SET stock = stock + ABS(v_movement.moved_qty) WHERE id = v_drug_id;
            END LOOP;

            DELETE FROM sale_items WHERE sale_id = v_sale_id AND drug_id = v_drug_id;
            v_modifications := v_modifications || jsonb_build_object('type', 'item_removed', 'name', v_old_item.name);

        ELSIF (v_new_item->>'quantity')::INT < v_old_qty THEN
            v_diff := v_old_qty - (v_new_item->>'quantity')::INT;

            FOR v_movement IN
                SELECT batch_id, quantity AS moved_qty
                FROM stock_movements
                WHERE reference_id = v_sale_id AND drug_id = v_drug_id AND type = 'sale'
                ORDER BY timestamp ASC
            LOOP
                EXIT WHEN v_diff <= 0;
                DECLARE
                    v_restore INT := LEAST(v_diff, ABS(v_movement.moved_qty));
                BEGIN
                    UPDATE stock_batches SET quantity = quantity + v_restore WHERE id = v_movement.batch_id;

                    SELECT stock INTO v_current_stock FROM drugs WHERE id = v_drug_id;
                    INSERT INTO stock_movements (
                        drug_id, branch_id, type, quantity, previous_stock, new_stock,
                        reference_id, transaction_id, batch_id, performed_by, status, drug_name_snapshot
                    ) VALUES (
                        v_drug_id, v_branch_id, 'adjustment', v_restore, v_current_stock, v_current_stock + v_restore,
                        v_sale_id, v_sale_id, v_movement.batch_id, v_performer_id, 'approved', v_old_item.name
                    );
                    UPDATE drugs SET stock = stock + v_restore WHERE id = v_drug_id;
                    v_diff := v_diff - v_restore;
                END;
            END LOOP;

            UPDATE sale_items SET quantity = (v_new_item->>'quantity')::INT WHERE sale_id = v_sale_id AND drug_id = v_drug_id;
            v_modifications := v_modifications || jsonb_build_object('type', 'quantity_reduced', 'name', v_old_item.name, 'diff', v_old_qty - (v_new_item->>'quantity')::INT);
        END IF;
    END LOOP;

    FOR v_new_item IN SELECT * FROM jsonb_array_elements(v_new_items)
    LOOP
        v_drug_id := (v_new_item->>'id')::UUID;
        v_new_qty := (v_new_item->>'quantity')::INT;

        SELECT quantity INTO v_old_qty FROM sale_items WHERE sale_id = v_sale_id AND drug_id = v_drug_id;

        IF v_old_qty IS NULL OR v_new_qty > v_old_qty THEN
            v_diff := v_new_qty - COALESCE(v_old_qty, 0);

            SELECT name, dosage_form, stock INTO v_drug_record FROM drugs WHERE id = v_drug_id;
            v_drug_display_name := v_drug_record.name;
            IF v_drug_record.dosage_form IS NOT NULL AND v_drug_record.dosage_form <> '' THEN
                IF position(lower(v_drug_record.dosage_form) in lower(v_drug_record.name)) = 0 THEN
                    v_drug_display_name := v_drug_record.name || ' ' || v_drug_record.dosage_form;
                END IF;
            END IF;

            FOR v_batch_id, v_current_stock IN
                SELECT id, quantity FROM stock_batches
                WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
                ORDER BY expiry_date ASC, created_at ASC
                FOR UPDATE
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

    UPDATE sales SET
        total = (p_payload->>'total')::DECIMAL,
        subtotal = (p_payload->>'subtotal')::DECIMAL,
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
$function$;

-- Drop the now-unused column (function redefinitions above no longer reference it)
ALTER TABLE public.sales DROP COLUMN IF EXISTS global_discount;