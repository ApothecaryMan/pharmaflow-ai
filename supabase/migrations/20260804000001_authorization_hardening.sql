-- =============================================================================
-- Authorization Hardening for Core Transaction Functions
-- Adds has_branch_permission() check to 5 SECURITY DEFINER functions
-- that currently trust the payload blindly without verifying the caller.
--
-- Pattern: Same as close_shift, finalize_delivery_order, etc.
-- =============================================================================


-- =============================================================================
-- 1. open_shift — currently has ZERO authorization checks
-- =============================================================================

CREATE OR REPLACE FUNCTION public.open_shift(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_shift_id UUID := COALESCE(NULLIF(p_payload->>'id', '')::UUID, gen_random_uuid());
    v_branch_id UUID := NULLIF(p_payload->>'branchId', '')::UUID;
    v_opened_by UUID := NULLIF(p_payload->>'openedBy', '')::UUID;
    v_opening_balance NUMERIC := COALESCE(NULLIF(p_payload->>'openingBalance', '')::NUMERIC, 0);
    v_open_time TIMESTAMPTZ := COALESCE(NULLIF(p_payload->>'openTime', '')::TIMESTAMPTZ, now());
BEGIN
    IF v_branch_id IS NULL THEN RAISE EXCEPTION 'branchId is required'; END IF;
    IF v_opened_by IS NULL THEN RAISE EXCEPTION 'openedBy is required'; END IF;

    -- ═══ SECURITY FIX: verify caller has permission on this branch ═══
    IF NOT has_branch_permission(v_branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','pharmacist','cashier','senior_cashier','manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to open shift';
    END IF;

    -- Defence-in-depth: the partial unique index on (branch_id) WHERE status = 'open'
    -- is the real guard. This check catches the error earlier with a clearer message.
    IF EXISTS (SELECT 1 FROM public.shifts WHERE branch_id = v_branch_id AND status = 'open') THEN
        RAISE EXCEPTION 'An open shift already exists for this branch';
    END IF;

    INSERT INTO public.shifts (
        id, branch_id, status, open_time, opened_by, opening_balance,
        cash_in, cash_out, cash_sales, card_sales, returns, cash_purchases, cash_purchase_returns
    ) VALUES (
        v_shift_id, v_branch_id, 'open', v_open_time, v_opened_by, v_opening_balance,
        0, 0, 0, 0, 0, 0, 0
    );

    INSERT INTO public.cash_transactions (
        branch_id, shift_id, type, amount, reason, user_id, time
    ) VALUES (
        v_branch_id, v_shift_id, 'opening_balance', v_opening_balance, 'Start of shift', v_opened_by, v_open_time
    );

    RETURN jsonb_build_object('success', true, 'shiftId', v_shift_id);

EXCEPTION
    WHEN SQLSTATE '23505' THEN
        RETURN jsonb_build_object('success', false, 'error', 'An open shift already exists for this branch');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;


-- =============================================================================
-- 2. process_cancellation — currently has ZERO authorization checks
-- =============================================================================

CREATE OR REPLACE FUNCTION public.process_cancellation(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    v_customer_phone TEXT;
    v_customer_code TEXT;
    v_sale_earned_points INTEGER;
    v_phone_clean TEXT;
BEGIN
    -- ═══ SECURITY FIX: verify caller has permission on this branch ═══
    IF NOT has_branch_permission(v_branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','pharmacist','cashier','senior_cashier','manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to process cancellation';
    END IF;

    -- Lock sale first, then shift — consistent order with process_return to prevent deadlock
    SELECT total, payment_method, serial_id, customer_phone, customer_code, earned_points
    INTO v_sale_total, v_payment_method, v_sale_serial, v_customer_phone, v_customer_code, v_sale_earned_points
    FROM sales WHERE id = v_sale_id AND status = 'completed'
    FOR UPDATE;

    IF v_sale_serial IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sale not found or already processed');
    END IF;

    -- Then lock shift row
    SELECT id INTO v_shift_id FROM shifts WHERE branch_id = v_branch_id AND status = 'open' LIMIT 1 FOR UPDATE;

    v_sale_earned_points := COALESCE(v_sale_earned_points, 0);

    PERFORM set_stock_context('correction', v_sale_id, v_performer_id, NULL);

    FOR v_item IN SELECT drug_id, quantity, name FROM sale_items WHERE sale_id = v_sale_id
    LOOP
        FOR v_batch_record IN
            SELECT batch_id, quantity as moved_qty
            FROM stock_movements
            WHERE reference_id = v_sale_id AND drug_id = v_item.drug_id AND type = 'sale'
            FOR UPDATE
        LOOP
            UPDATE stock_batches SET quantity = quantity + ABS(v_batch_record.moved_qty) WHERE id = v_batch_record.batch_id;
        END LOOP;
    END LOOP;

    v_phone_clean := REGEXP_REPLACE(v_customer_phone, '[\s\-\(\)]', '', 'g');

    IF v_phone_clean IS NOT NULL AND v_phone_clean != '' THEN
        UPDATE customers
        SET
            total_purchases = GREATEST(COALESCE(total_purchases, 0) - v_sale_total, 0),
            points = GREATEST(COALESCE(points, 0) - v_sale_earned_points, 0)
        WHERE branch_id = v_branch_id
        AND REGEXP_REPLACE(phone, '[\s\-\(\)\+]', '', 'g') = v_phone_clean;
    END IF;

    IF v_customer_code IS NOT NULL AND v_customer_code != '' THEN
        UPDATE customers
        SET
            total_purchases = GREATEST(COALESCE(total_purchases, 0) - v_sale_total, 0),
            points = GREATEST(COALESCE(points, 0) - v_sale_earned_points, 0)
        WHERE code = v_customer_code AND branch_id = v_branch_id
        AND (v_phone_clean IS NULL OR v_phone_clean = ''
             OR NOT EXISTS (
                 SELECT 1 FROM customers
                 WHERE branch_id = v_branch_id
                 AND REGEXP_REPLACE(phone, '[\s\-\(\)\+]', '', 'g') = v_phone_clean
             ));
    END IF;

    -- Record the cancellation in cash_transactions and update shift counters
    -- for BOTH cash and card payments
    IF v_shift_id IS NOT NULL THEN
        IF v_payment_method = 'cash' THEN
            INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
            VALUES (v_branch_id, v_shift_id, 'adjustment', -v_sale_total,
                    'Cancellation of ' || v_sale_serial, v_performer_id, v_sale_id,
                    (SELECT org_id FROM sales WHERE id = v_sale_id));
            PERFORM atomic_increment_shift(v_shift_id, 0, 0, -v_sale_total, 0, 0, 0, 0);
        ELSIF v_payment_method = 'visa' THEN
            INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
            VALUES (v_branch_id, v_shift_id, 'adjustment', -v_sale_total,
                    'Cancellation of ' || v_sale_serial, v_performer_id, v_sale_id,
                    (SELECT org_id FROM sales WHERE id = v_sale_id));
            PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, -v_sale_total, 0, 0, 0);
        END IF;
    END IF;

    UPDATE sales SET status = 'cancelled' WHERE id = v_sale_id;

    RETURN jsonb_build_object('success', true, 'saleId', v_sale_id);
END;
$function$;


-- =============================================================================
-- 3. process_checkout — only checked employee existence, not branch permission
-- =============================================================================

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
     v_global_discount DECIMAL := (p_payload->>'globalDiscount')::DECIMAL;
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
     v_serial_id := v_branch_code || '-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_order_number::TEXT, 4, '0');

     INSERT INTO sales (
         org_id, branch_id, serial_id, daily_order_number,
         total, subtotal, global_discount,
         payment_method, sale_type, status,
         sold_by_employee_id, shift_id,
         customer_name, customer_code, customer_phone,
         customer_address, customer_street_address,
         earned_points
     ) VALUES (
         v_org_id, v_branch_id, v_serial_id, v_order_number,
         v_total, v_subtotal, v_global_discount,
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


-- =============================================================================
-- 4. process_order_modification — only checked employee existence
-- =============================================================================

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
    -- Replaces the weak "employee exists" check with proper auth.uid() verification
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
        global_discount = (p_payload->>'globalDiscount')::DECIMAL,
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


-- =============================================================================
-- 5. process_return — only checked employee existence
-- =============================================================================

CREATE OR REPLACE FUNCTION public.process_return(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    v_customer_phone TEXT;
    v_customer_code TEXT;
    v_sale_earned_points INTEGER;
    v_points_to_deduct INTEGER;
    v_phone_clean TEXT;
BEGIN
    -- ═══ SECURITY FIX: verify caller has permission on this branch ═══
    -- Replaces the weak "employee exists" check with proper auth.uid() verification
    IF NOT has_branch_permission(v_branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','pharmacist','cashier','senior_cashier','manager']::employee_role[]) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Unauthorized to process return');
    END IF;

    SELECT * INTO v_sale_record FROM sales WHERE id = v_sale_id FOR UPDATE;
    IF v_sale_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sale not found');
    END IF;

    v_payment_method := v_sale_record.payment_method;
    v_customer_phone := v_sale_record.customer_phone;
    v_customer_code := v_sale_record.customer_code;
    v_sale_earned_points := COALESCE(v_sale_record.earned_points, 0);

    SELECT id INTO v_shift_id FROM shifts
    WHERE branch_id = v_branch_id AND status = 'open'
    LIMIT 1
    FOR UPDATE;

    IF v_shift_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active shift found');
    END IF;

    v_return_serial := 'RET-' || to_char(CURRENT_DATE, 'YYYYMMDD') || LPAD(increment_sequence(v_branch_id, 'returns')::TEXT, 3, '0');

    INSERT INTO public.returns (
        org_id, branch_id, sale_id, serial_id,
        total_refund, return_type, reason, notes,
        processed_by, date
    ) VALUES (
        v_org_id, v_branch_id, v_sale_id, v_return_serial,
        0,
        (p_payload->>'returnType')::text::return_type,
        (p_payload->>'reason')::text::return_reason,
        p_payload->>'notes',
        v_performer_id, CURRENT_TIMESTAMP
    ) RETURNING id INTO v_return_id;

    PERFORM set_stock_context('return_customer', v_return_id, v_performer_id, p_payload->>'performerName');

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_drug_id := (v_item->>'drugId')::UUID;
        v_qty := (v_item->>'quantity')::INT;
        v_sale_item_id := (v_item->>'saleItemId')::UUID;

        IF v_sale_item_id IS NOT NULL THEN
            SELECT * INTO v_sale_item_record FROM sale_items WHERE id = v_sale_item_id;
        ELSE
            SELECT * INTO v_sale_item_record FROM sale_items
            WHERE sale_id = v_sale_id AND drug_id = v_drug_id
            AND is_unit = COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE)
            LIMIT 1;
        END IF;

        IF v_sale_item_record.id IS NULL THEN
            RAISE EXCEPTION 'Sale item not found for drug %', v_drug_id;
        END IF;

        v_drug_id := v_sale_item_record.drug_id;
        v_return_key := CASE WHEN v_sale_item_record.is_unit THEN v_sale_item_record.id::TEXT || '_unit' ELSE v_sale_item_record.id::TEXT || '_pack' END;
        v_already_returned := COALESCE((v_sale_record.item_returned_quantities->>v_return_key)::INT, 0);
        v_available_to_return := v_sale_item_record.quantity - v_already_returned;

        IF v_qty > v_available_to_return THEN
            RAISE EXCEPTION 'Cannot return % units of %. Only % units available to return.', v_qty, v_sale_item_record.name, v_available_to_return;
        END IF;

        v_item_refund := ROUND(v_qty * v_sale_item_record.public_price * (v_sale_record.total / NULLIF(v_sale_record.subtotal, 0)), 2);
        v_running_total_refund := v_running_total_refund + v_item_refund;

        SELECT name, dosage_form, units_per_pack INTO v_drug_record FROM drugs WHERE id = v_drug_id;

        SELECT batch_id, expiry_date INTO v_batch_id, v_expiry_date
        FROM stock_movements
        WHERE reference_id = v_sale_id AND drug_id = v_drug_id AND type = 'sale'
        ORDER BY timestamp DESC LIMIT 1
        FOR UPDATE;

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

        UPDATE sales SET item_returned_quantities =
            COALESCE(item_returned_quantities, '{}'::JSONB) ||
            jsonb_build_object(v_return_key, v_already_returned + v_qty)
        WHERE id = v_sale_id;
    END LOOP;

    UPDATE public.returns SET total_refund = v_running_total_refund WHERE id = v_return_id;

    UPDATE sales
    SET net_total = COALESCE(net_total, total) - v_running_total_refund,
        status = CASE WHEN (p_payload->>'returnType') = 'full' THEN 'returned'::sale_status ELSE status END
    WHERE id = v_sale_id;

    v_points_to_deduct := ROUND(v_sale_earned_points * (v_running_total_refund / NULLIF(v_sale_record.total, 0)))::INTEGER;

    v_phone_clean := REGEXP_REPLACE(v_customer_phone, '[\s\-\(\)]', '', 'g');

    IF v_phone_clean IS NOT NULL AND v_phone_clean != '' THEN
        UPDATE customers
        SET
            total_purchases = GREATEST(COALESCE(total_purchases, 0) - v_running_total_refund, 0),
            points = GREATEST(COALESCE(points, 0) - v_points_to_deduct, 0)
        WHERE branch_id = v_branch_id
        AND REGEXP_REPLACE(phone, '[\s\-\(\)\+]', '', 'g') = v_phone_clean;
    END IF;

    IF v_customer_code IS NOT NULL AND v_customer_code != '' THEN
        UPDATE customers
        SET
            total_purchases = GREATEST(COALESCE(total_purchases, 0) - v_running_total_refund, 0),
            points = GREATEST(COALESCE(points, 0) - v_points_to_deduct, 0)
        WHERE code = v_customer_code AND branch_id = v_branch_id
        AND (v_phone_clean IS NULL OR v_phone_clean = ''
             OR NOT EXISTS (
                 SELECT 1 FROM customers
                 WHERE branch_id = v_branch_id
                 AND REGEXP_REPLACE(phone, '[\s\-\(\)\+]', '', 'g') = v_phone_clean
             ));
    END IF;

    -- Record the return in cash_transactions and update shift counters
    -- for BOTH cash and card payments
    IF v_shift_id IS NOT NULL THEN
        IF v_payment_method = 'cash' THEN
            INSERT INTO cash_transactions (
                branch_id, shift_id, type, amount, reason,
                user_id, related_sale_id, org_id
            ) VALUES (
                v_branch_id, v_shift_id, 'return', -v_running_total_refund,
                'Return ' || v_return_serial, v_performer_id, v_sale_id, v_org_id
            );
            PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, 0, v_running_total_refund, 0, 0, 0);
        ELSIF v_payment_method = 'visa' THEN
            INSERT INTO cash_transactions (
                branch_id, shift_id, type, amount, reason,
                user_id, related_sale_id, org_id
            ) VALUES (
                v_branch_id, v_shift_id, 'card_return', -v_running_total_refund,
                'Return ' || v_return_serial, v_performer_id, v_sale_id, v_org_id
            );
            PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, 0, 0, 0, 0, v_running_total_refund);
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'returnId', v_return_id,
        'serialId', v_return_serial,
        'totalRefund', v_running_total_refund
    );
END;
$function$;
