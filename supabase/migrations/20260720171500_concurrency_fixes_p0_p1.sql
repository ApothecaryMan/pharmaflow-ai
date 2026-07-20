-- Migration: Concurrency Fixes (P0 & P1)
-- Description: Adds FOR UPDATE locks to prevent overselling and shift balance manipulation.

BEGIN;

-- 1. P0 Fix: Prevent Concurrent Oversell in process_checkout
CREATE OR REPLACE FUNCTION public.process_checkout(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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
     IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = v_performer_id) THEN
         RETURN jsonb_build_object('success', false, 'error', 'Employee record not found');
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

         INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price, cost_price, is_unit)
         VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, (v_item->>'quantity')::INT, (v_item->>'publicPrice')::DECIMAL, v_cost_price, COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE))
         RETURNING id INTO v_sale_item_id;

         -- 🔒 FIXED: added FOR UPDATE to prevent oversell race
         FOR v_batch_record IN
             SELECT id, quantity, expiry_date FROM stock_batches
             WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
             ORDER BY (id = v_payload_id) DESC, expiry_date ASC, created_at ASC
             FOR UPDATE
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
     END LOOP;

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
                     (SELECT jsonb_agg(jsonb_build_object(
                         'id', si.drug_id,
                         'name', si.name,
                         'quantity', si.quantity,
                         'publicPrice', si.public_price,
                         'isUnit', si.is_unit,
                         'costPrice', si.cost_price,
                         'saleItemId', si.id
                     )) FROM sale_items si WHERE si.sale_id = v_sale_id),
                     '[]'::JSONB
                 ))
     );
 END;
 $$;

-- 2. P1 Fix: Prevent TOCTOU race condition in shift balance
CREATE OR REPLACE FUNCTION public.atomic_increment_shift(
  p_shift_id UUID,
  p_cash_in NUMERIC DEFAULT 0,
  p_cash_out NUMERIC DEFAULT 0,
  p_cash_sales NUMERIC DEFAULT 0,
  p_card_sales NUMERIC DEFAULT 0,
  p_returns NUMERIC DEFAULT 0,
  p_cash_purchases NUMERIC DEFAULT 0,
  p_cash_purchase_returns NUMERIC DEFAULT 0
)
RETURNS void AS $$
DECLARE
  v_available_above_base NUMERIC;
BEGIN
  -- Self-lock: prevents TOCTOU on balance check
  PERFORM 1 FROM shifts WHERE id = p_shift_id FOR UPDATE;

  SELECT 
    (COALESCE(cash_in, 0) + COALESCE(cash_sales, 0) + COALESCE(cash_purchase_returns, 0)) - 
    (COALESCE(cash_out, 0) + COALESCE(returns, 0) + COALESCE(cash_purchases, 0))
  INTO v_available_above_base
  FROM shifts 
  WHERE id = p_shift_id;

  IF (p_cash_out > 0 OR p_cash_purchases > 0 OR p_returns > 0 OR p_cash_sales < 0) THEN
    IF v_available_above_base < (p_cash_out + p_cash_purchases + p_returns + GREATEST(-p_cash_sales, 0)) THEN
      RAISE EXCEPTION 'Insufficient balance: Cannot withdraw more than available cash above base (%)', v_available_above_base;
    END IF;
  END IF;

  UPDATE shifts SET
    cash_in     = COALESCE(cash_in, 0)     + p_cash_in,
    cash_out    = COALESCE(cash_out, 0)    + p_cash_out,
    cash_sales  = COALESCE(cash_sales, 0)  + p_cash_sales,
    card_sales  = COALESCE(card_sales, 0)  + p_card_sales,
    returns     = COALESCE(returns, 0)     + p_returns,
    cash_purchases = COALESCE(cash_purchases, 0) + p_cash_purchases,
    cash_purchase_returns = COALESCE(cash_purchase_returns, 0) + p_cash_purchase_returns
  WHERE id = p_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
