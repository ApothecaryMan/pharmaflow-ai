-- ==========================================
-- Migration: Add address to process_checkout
-- ==========================================

BEGIN;

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
         customer_address, customer_street_address,
         earned_points
     ) VALUES (
         v_org_id, v_branch_id, v_serial_id, v_order_number,
         v_total, v_subtotal, v_global_discount,
         (p_payload->>'paymentMethod')::payment_method,
         (p_payload->>'saleType')::sale_type,
         COALESCE((p_payload->>'status')::sale_status, 'completed'),
         v_performer_id, v_shift_id,
         p_payload->>'customerName', p_payload->>'customerCode', p_payload->>'customerPhone', p_payload->'items',
         p_payload->>'customerAddress', p_payload->>'customerStreetAddress',
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
             jsonb_build_object(
                 'id', v_drug_id,
                 'name', v_drug_display_name,
                 'quantity', (v_item->>'quantity')::INT,
                 'isUnit', COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE),
                 'publicPrice', (v_item->>'publicPrice')::DECIMAL,
                 'discount', (v_item->>'discount')::DECIMAL,
                 'expiryDate', v_first_expiry,
                 'saleItemId', v_sale_item_id
             )
         );
     END LOOP;
 
     -- 4. Update snapshot
     UPDATE sales SET items = v_updated_items WHERE id = v_sale_id;
 
     -- 5. Customer Sync
     v_phone_clean := REGEXP_REPLACE(p_payload->>'customerPhone', '\D', '', 'g');
     
     IF v_phone_clean IS NOT NULL AND v_phone_clean != '' THEN
         UPDATE customers
         SET 
            last_visit = CURRENT_TIMESTAMP,
            total_purchases = total_purchases + 1,
            points = points + v_earned_points,
            visit_count = COALESCE(visit_count, 0) + 1
         WHERE 
            (phone = v_phone_clean OR code = p_payload->>'customerCode')
            AND org_id = v_org_id;
     END IF;
 
     -- 6. Fetch complete sale
     RETURN jsonb_build_object(
         'success', true,
         'sale', row_to_json((SELECT s FROM sales s WHERE id = v_sale_id))::jsonb
     );
 END;
 $$;

COMMIT;
