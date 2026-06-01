-- ═══════════════════════════════════════════
-- Migration: Customer Sync on Checkout
-- Date: 2026-06-01
-- Description:
--   - Adds visit_count column to customers table
--   - Adds earned_points column to sales table
--   - Updates process_checkout to store earned_points & customer_code on sale,
--     increment visit_count, and normalize phone matching with code fallback
--   - Updates process_return to reverse customer data with code fallback
--   - Updates process_cancellation to reverse customer data with code fallback
-- ═══════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════
-- 1. Schema Changes
-- ═══════════════════════════════════════════

ALTER TABLE customers ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS earned_points INTEGER DEFAULT 0;

-- ═══════════════════════════════════════════
-- 2. Updated process_checkout
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.process_checkout(p_payload jsonb)
 RETURNS jsonb
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
     v_earned_points INTEGER := COALESCE(ROUND((p_payload->>'earnedPoints')::DECIMAL), 0)::INTEGER;
     v_phone_clean TEXT;
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
         customer_name, customer_code, customer_phone, items,
         earned_points
     ) VALUES (
         v_org_id, v_branch_id, v_serial_id, v_order_number,
         v_total, v_subtotal, v_global_discount,
         (p_payload->>'paymentMethod')::payment_method,
         (p_payload->>'saleType')::sale_type,
         COALESCE((p_payload->>'status')::sale_status, 'completed'),
         v_performer_id, v_shift_id,
         p_payload->>'customerName', p_payload->>'customerCode', p_payload->>'customerPhone', p_payload->'items',
         v_earned_points
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
 
         INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price, cost_price, is_unit)
         VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, (v_item->>'quantity')::INT, (v_item->>'publicPrice')::DECIMAL, v_cost_price, COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE))
         RETURNING id INTO v_sale_item_id;
 
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
 
         v_updated_items := v_updated_items || jsonb_build_array(
             v_item || jsonb_build_object(
                 'saleItemId', v_sale_item_id,
                 'name', v_drug_display_name,
                 'dosageForm', v_drug_record.dosage_form,
                 'expiryDate', v_first_expiry
             )
         );
     END LOOP;
 
     UPDATE sales SET items = v_updated_items WHERE id = v_sale_id;
 
     -- 4. Update Customer (only when status is 'completed')
     IF COALESCE(p_payload->>'status', 'completed') = 'completed' THEN
         -- Normalize phone: strip formatting chars for fuzzy matching
         v_phone_clean := REGEXP_REPLACE(p_payload->>'customerPhone', '[\s\-\(\)]', '', 'g');
         
         -- Try phone match first
         IF v_phone_clean IS NOT NULL AND v_phone_clean != '' THEN
             UPDATE customers 
             SET 
                 total_purchases = COALESCE(total_purchases, 0) + v_total,
                 points = COALESCE(points, 0) + v_earned_points,
                 last_visit = NOW(),
                 visit_count = COALESCE(visit_count, 0) + 1
             WHERE branch_id = v_branch_id
             AND REGEXP_REPLACE(phone, '[\s\-\(\)\+]', '', 'g') = v_phone_clean;
         END IF;
 
         -- Fall back to code match if phone didn't match
         IF p_payload->>'customerCode' IS NOT NULL AND p_payload->>'customerCode' != '' THEN
             UPDATE customers 
             SET 
                 total_purchases = COALESCE(total_purchases, 0) + v_total,
                 points = COALESCE(points, 0) + v_earned_points,
                 last_visit = NOW(),
                 visit_count = COALESCE(visit_count, 0) + 1
             WHERE code = p_payload->>'customerCode' AND branch_id = v_branch_id
             AND (v_phone_clean IS NULL OR v_phone_clean = ''
                  OR NOT EXISTS (
                      SELECT 1 FROM customers
                      WHERE branch_id = v_branch_id
                      AND REGEXP_REPLACE(phone, '[\s\-\(\)\+]', '', 'g') = v_phone_clean
                  ));
         END IF;
     END IF;
 
     -- 5. Finalize Cash & Audit
     IF (p_payload->>'paymentMethod') = 'cash' AND v_shift_id IS NOT NULL AND COALESCE(p_payload->>'status', 'completed') = 'completed' THEN
         INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
         VALUES (v_branch_id, v_shift_id, 'sale', v_total, 'Sale ' || v_serial_id, v_performer_id, v_sale_id, v_org_id);
         
         PERFORM atomic_increment_shift(v_shift_id, 0, 0, v_total, 0, 0, 0, 0);
     END IF;
 
     RETURN jsonb_build_object('success', true, 'saleId', v_sale_id, 'serialId', v_serial_id);
 
 EXCEPTION WHEN OTHERS THEN
     RETURN jsonb_build_object('success', false, 'error', SQLERRM);
 END;
 $$;

-- ═══════════════════════════════════════════
-- 3. Updated process_return
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.process_return(p_payload JSONB)
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
    v_customer_phone TEXT;
    v_customer_code TEXT;
    v_sale_earned_points INTEGER;
    v_points_to_deduct INTEGER;
    v_phone_clean TEXT;
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
    v_customer_phone := v_sale_record.customer_phone;
    v_customer_code := v_sale_record.customer_code;
    v_sale_earned_points := COALESCE(v_sale_record.earned_points, 0);

    -- 1. Shift Resolution
    SELECT id INTO v_shift_id FROM shifts 
    WHERE branch_id = v_branch_id AND status = 'open' 
    LIMIT 1;
    
    IF v_shift_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active shift found');
    END IF;

    -- 2. Meta Info
    v_return_serial := 'RET-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);

    -- 3. Create Return Record
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

    -- 🟢 SET MOVEMENT CONTEXT
    PERFORM set_stock_context('return_customer', v_return_id, v_performer_id, p_payload->>'performerName');

    -- 4. Process Items
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

        v_return_key := CASE WHEN v_sale_item_record.is_unit THEN v_drug_id::TEXT || '_unit' ELSE v_drug_id::TEXT || '_pack' END;
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
        ORDER BY timestamp DESC LIMIT 1;

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

    -- 5. Finalize Return Record Total
    UPDATE public.returns SET total_refund = v_running_total_refund WHERE id = v_return_id;

    -- 6. Update Sale Financials
    UPDATE sales 
    SET net_total = COALESCE(net_total, total) - v_running_total_refund,
        status = CASE WHEN (p_payload->>'returnType') = 'full' THEN 'returned'::sale_status ELSE status END
    WHERE id = v_sale_id;

    -- 7. Reverse Customer total_purchases & points (proportional to refund)
    v_points_to_deduct := ROUND(v_sale_earned_points * (v_running_total_refund / NULLIF(v_sale_record.total, 0)))::INTEGER;

    -- Normalize phone: strip formatting chars for fuzzy matching
    v_phone_clean := REGEXP_REPLACE(v_customer_phone, '[\s\-\(\)]', '', 'g');

    -- Try phone match first
    IF v_phone_clean IS NOT NULL AND v_phone_clean != '' THEN
        UPDATE customers 
        SET 
            total_purchases = GREATEST(COALESCE(total_purchases, 0) - v_running_total_refund, 0),
            points = GREATEST(COALESCE(points, 0) - v_points_to_deduct, 0)
        WHERE branch_id = v_branch_id
        AND REGEXP_REPLACE(phone, '[\s\-\(\)\+]', '', 'g') = v_phone_clean;
    END IF;

    -- Fall back to code match if phone didn't match
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

    -- 8. Cash Transaction & Shift
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

-- ═══════════════════════════════════════════
-- 4. Updated process_cancellation
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.process_cancellation(p_payload JSONB)
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
    v_customer_phone TEXT;
    v_customer_code TEXT;
    v_sale_earned_points INTEGER;
    v_phone_clean TEXT;
BEGIN
    SELECT id INTO v_shift_id FROM shifts WHERE branch_id = v_branch_id AND status = 'open' LIMIT 1;
    
    SELECT total, payment_method, serial_id, customer_phone, customer_code, earned_points 
    INTO v_sale_total, v_payment_method, v_sale_serial, v_customer_phone, v_customer_code, v_sale_earned_points
    FROM sales WHERE id = v_sale_id AND status = 'completed';

    IF v_sale_serial IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sale not found or already processed');
    END IF;

    v_sale_earned_points := COALESCE(v_sale_earned_points, 0);

    -- 🟢 SET MOVEMENT CONTEXT
    PERFORM set_stock_context('correction', v_sale_id, v_performer_id, NULL);

    FOR v_item IN SELECT drug_id, quantity, name FROM sale_items WHERE sale_id = v_sale_id
    LOOP
        FOR v_batch_record IN 
            SELECT batch_id, quantity as moved_qty 
            FROM stock_movements 
            WHERE reference_id = v_sale_id AND drug_id = v_item.drug_id AND type = 'sale'
        LOOP
            UPDATE stock_batches SET quantity = quantity + ABS(v_batch_record.moved_qty) WHERE id = v_batch_record.batch_id;
        END LOOP;
    END LOOP;

    -- Reverse Customer total_purchases & points
    v_phone_clean := REGEXP_REPLACE(v_customer_phone, '[\s\-\(\)]', '', 'g');

    -- Try phone match first
    IF v_phone_clean IS NOT NULL AND v_phone_clean != '' THEN
        UPDATE customers 
        SET 
            total_purchases = GREATEST(COALESCE(total_purchases, 0) - v_sale_total, 0),
            points = GREATEST(COALESCE(points, 0) - v_sale_earned_points, 0)
        WHERE branch_id = v_branch_id
        AND REGEXP_REPLACE(phone, '[\s\-\(\)\+]', '', 'g') = v_phone_clean;
    END IF;

    -- Fall back to code match if phone didn't match
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

    IF v_payment_method = 'cash' AND v_shift_id IS NOT NULL THEN
        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
        VALUES (v_branch_id, v_shift_id, 'adjustment', -v_sale_total, 'Cancellation of ' || v_sale_serial, v_performer_id, v_sale_id, (SELECT org_id FROM sales WHERE id = v_sale_id));
        PERFORM atomic_increment_shift(v_shift_id, 0, 0, -v_sale_total, 0, 0, 0, 0);
    END IF;

    UPDATE sales SET status = 'cancelled' WHERE id = v_sale_id;

    RETURN jsonb_build_object('success', true, 'saleId', v_sale_id);
END;
$$;

COMMIT;
