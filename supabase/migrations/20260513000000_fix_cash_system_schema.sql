-- Migration: Fix Cash Transaction System & Shift Classification
-- Date: 2026-05-13

-- 1. Extend cash_tx_type ENUM
-- We use a DO block to safely add types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'cash_tx_type' AND n.nspname = 'public') THEN
        CREATE TYPE cash_tx_type AS ENUM ('in', 'out', 'sale', 'card_sale', 'return', 'opening_balance', 'closing_balance');
    END IF;
END $$;

-- Add new types to existing enum
ALTER TYPE cash_tx_type ADD VALUE IF NOT EXISTS 'purchase';
ALTER TYPE cash_tx_type ADD VALUE IF NOT EXISTS 'purchase_return';
ALTER TYPE cash_tx_type ADD VALUE IF NOT EXISTS 'adjustment';

-- 2. Update shifts table schema
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cash_purchases NUMERIC DEFAULT 0;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cash_purchase_returns NUMERIC DEFAULT 0;

-- 3. Cleanup existing functions to avoid overloading issues
DROP FUNCTION IF EXISTS atomic_increment_shift(uuid, numeric, numeric, numeric, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS atomic_increment_shift(uuid, numeric, numeric, numeric, numeric, numeric, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS process_checkout(jsonb) CASCADE;
DROP FUNCTION IF EXISTS process_checkout(json) CASCADE;
DROP FUNCTION IF EXISTS atomic_increment_stock(uuid, numeric) CASCADE;

-- 4. Final atomic_increment_shift with Balance Lock (Protection above base)
CREATE OR REPLACE FUNCTION atomic_increment_shift(
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
  -- Calculate current balance above opening balance
  SELECT 
    (COALESCE(cash_in, 0) + COALESCE(cash_sales, 0) + COALESCE(cash_purchase_returns, 0)) - 
    (COALESCE(cash_out, 0) + COALESCE(returns, 0) + COALESCE(cash_purchases, 0))
  INTO v_available_above_base
  FROM shifts 
  WHERE id = p_shift_id;

  -- Enforce balance lock for withdrawals and purchases
  IF (p_cash_out > 0 OR p_cash_purchases > 0) THEN
    IF v_available_above_base < (p_cash_out + p_cash_purchases) THEN
      RAISE EXCEPTION 'Insufficient balance: Cannot withdraw more than available cash above base (% available)', v_available_above_base;
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

-- 5. Final process_checkout with stock and cash integration
CREATE OR REPLACE FUNCTION process_checkout(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_branch_id UUID := (p_payload->>'branchId')::UUID;
    v_org_id UUID := (p_payload->>'orgId')::UUID;
    v_performer_auth_id UUID := (p_payload->>'performerId')::UUID;
    v_performer_id UUID;
    v_shift_id UUID;
    v_sale_id UUID;
    v_item JSONB;
    v_payload_id UUID;
    v_drug_id UUID;
    v_batch_record RECORD;
    v_remaining_qty INT;
    v_qty_to_take INT;
    v_order_number INT;
    v_serial_id TEXT;
    v_total DECIMAL := (p_payload->>'total')::DECIMAL;
    v_subtotal DECIMAL := (p_payload->>'subtotal')::DECIMAL;
    v_global_discount DECIMAL := (p_payload->>'globalDiscount')::DECIMAL;
    v_is_walk_in BOOLEAN := (p_payload->>'saleType' = 'walk-in' OR COALESCE((p_payload->>'isWalkIn')::BOOLEAN, false));
BEGIN
    -- Resolve performer
    SELECT id INTO v_performer_id FROM public.employees WHERE auth_user_id = v_performer_auth_id;
    IF v_performer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee record not found');
    END IF;

    -- Resolve active shift
    SELECT id INTO v_shift_id FROM shifts 
    WHERE branch_id = v_branch_id AND status = 'open'
    ORDER BY (opened_by = v_performer_id) DESC LIMIT 1;

    IF v_shift_id IS NULL AND v_is_walk_in THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active shift found. Please open a shift first.');
    END IF;

    -- Generate sequence
    INSERT INTO branch_daily_sequences (branch_id, sale_date, current_value)
    VALUES (v_branch_id, CURRENT_DATE, 1)
    ON CONFLICT (branch_id, sale_date) DO UPDATE SET current_value = branch_daily_sequences.current_value + 1
    RETURNING current_value INTO v_order_number;

    v_serial_id := 'SALE-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_order_number::TEXT, 4, '0');

    -- Insert sale
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
        CASE WHEN v_is_walk_in THEN 'walk-in'::sale_type ELSE 'delivery'::sale_type END,
        'completed',
        v_performer_id, v_shift_id,
        p_payload->>'customerName', p_payload->>'customerPhone', p_payload->'items'
    ) RETURNING id INTO v_sale_id;

    -- Process items and batches
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_payload_id := (v_item->>'id')::UUID;
        IF EXISTS (SELECT 1 FROM drugs WHERE id = v_payload_id) THEN
            v_drug_id := v_payload_id;
        ELSE
            SELECT drug_id INTO v_drug_id FROM stock_batches WHERE id = v_payload_id;
        END IF;
        
        v_remaining_qty := (v_item->>'quantity')::INT;

        -- Sale item record
        INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price)
        VALUES (v_branch_id, v_sale_id, v_drug_id, v_item->>'name', v_remaining_qty, (v_item->>'publicPrice')::DECIMAL);

        -- FIFO Batch deduction
        FOR v_batch_record IN 
            SELECT id, quantity, cost_price, expiry_date FROM stock_batches 
            WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
            ORDER BY (id = v_payload_id) DESC, expiry_date ASC, created_at ASC
        LOOP
            EXIT WHEN v_remaining_qty <= 0;
            v_qty_to_take := LEAST(v_remaining_qty, v_batch_record.quantity);
            
            UPDATE stock_batches SET quantity = quantity - v_qty_to_take WHERE id = v_batch_record.id;
            
            -- Stock movement log
            INSERT INTO stock_movements (
                drug_id, branch_id, type, quantity, previous_stock, new_stock,
                reference_id, transaction_id, batch_id, performed_by, status,
                drug_name_snapshot, performed_by_name_snapshot, 
                public_price_snapshot, cost_price_snapshot, expiry_date
            ) VALUES (
                v_drug_id, v_branch_id, 'sale', -v_qty_to_take,
                (SELECT stock FROM drugs WHERE id = v_drug_id),
                (SELECT stock FROM drugs WHERE id = v_drug_id) - v_qty_to_take,
                v_sale_id, v_sale_id, v_batch_record.id, v_performer_id, 'approved',
                v_item->>'name', p_payload->>'performerName',
                (v_item->>'publicPrice')::DECIMAL, v_batch_record.cost_price, v_batch_record.expiry_date
            );
            
            -- Global stock update
            UPDATE drugs SET stock = stock - v_qty_to_take WHERE id = v_drug_id;
            v_remaining_qty := v_remaining_qty - v_qty_to_take;
        END LOOP;
    END LOOP;

    -- Cash register integration
    IF (p_payload->>'paymentMethod') = 'cash' AND v_shift_id IS NOT NULL THEN
        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
        VALUES (v_branch_id, v_shift_id, 'sale', v_total, 'Sale ' || v_serial_id, v_performer_id, v_sale_id, v_org_id);
        
        -- Use the atomic increment logic
        PERFORM atomic_increment_shift(v_shift_id, 0, 0, v_total, 0, 0, 0, 0);
    END IF;

    RETURN jsonb_build_object('success', true, 'saleId', v_sale_id, 'serialId', v_serial_id);
END;
$$;

-- 6. Atomic stock increment
CREATE OR REPLACE FUNCTION atomic_increment_stock(p_drug_id UUID, p_delta NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_new_stock NUMERIC;
BEGIN
  UPDATE drugs SET stock = COALESCE(stock, 0) + p_delta WHERE id = p_drug_id RETURNING stock INTO v_new_stock;
  RETURN v_new_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
