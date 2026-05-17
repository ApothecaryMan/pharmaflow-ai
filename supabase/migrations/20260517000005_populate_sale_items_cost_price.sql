-- ═══════════════════════════════════════════
-- Migration: Populate Sale Items Cost Price & Fix Financial Report
-- Date: 2026-05-17
-- Description: 
--  1. Updates process_checkout to calculate and populate cost_price in sale_items.
--  2. Updates process_order_modification to do the same.
--  3. Fixes get_financial_report RPC to refer to public_price instead of unit_price.
--  4. Backfills historical sale_items records that currently have cost_price = NULL.
-- ═══════════════════════════════════════════

BEGIN;

-- 1. Redefine process_checkout to populate cost_price
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
        v_remaining_qty := (v_item->>'quantity')::INT;
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
        ELSE
            v_cost_price := COALESCE(v_drug_record.cost_price, 0);
        END IF;

        -- Record Sale Item
        INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price, cost_price, is_unit)
        VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, v_remaining_qty, (v_item->>'publicPrice')::DECIMAL, v_cost_price, COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE))
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

-- 2. Redefine process_order_modification to populate cost_price
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

        -- Upsert sale_items
        SELECT id, quantity INTO v_old_qty FROM sale_items WHERE sale_id = v_sale_id AND drug_id = v_drug_id;
        
        IF v_old_qty IS NULL THEN
            INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price, cost_price, is_unit)
            VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, v_new_qty, (v_new_item->>'publicPrice')::DECIMAL, v_cost_price, COALESCE((v_new_item->>'isUnit')::BOOLEAN, FALSE))
            RETURNING id INTO v_sale_item_id;
            v_modifications := v_modifications || jsonb_build_object('type', 'item_added', 'name', v_drug_display_name);
            v_diff := v_new_qty;
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

-- 3. Redefine get_financial_report to fix column name mismatch (unit_price -> public_price)
CREATE OR REPLACE FUNCTION get_financial_report(
    p_date_from TIMESTAMPTZ,
    p_date_to TIMESTAMPTZ,
    p_branch_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_summary JSON;
    v_daily_breakdown JSON;
    v_category_breakdown JSON;
    v_target_branch_id UUID;
BEGIN
    -- Resolve branch ID: Use provided or fallback to user's branch
    v_target_branch_id := COALESCE(p_branch_id, get_user_branch_id());

    -- 1. Calculate Summary Metrics
    WITH sales_filtered AS (
        SELECT id, total, date::date as day
        FROM sales
        WHERE status = 'completed'
          AND date >= p_date_from
          AND date <= p_date_to
          AND (v_target_branch_id IS NULL OR branch_id = v_target_branch_id)
    ),
    returns_filtered AS (
        SELECT id, total_refund, date::date as day
        FROM returns
        WHERE date >= p_date_from
          AND date <= p_date_to
          AND (v_target_branch_id IS NULL OR branch_id = v_target_branch_id)
    ),
    sale_item_metrics AS (
        SELECT 
            COALESCE(SUM(si.quantity * si.cost_price), 0) as gross_cogs
        FROM sale_items si
        WHERE si.sale_id IN (SELECT id FROM sales_filtered)
    ),
    return_item_metrics AS (
        SELECT 
            COALESCE(SUM(ri.quantity_returned * si.cost_price), 0) as return_cogs
        FROM return_items ri
        LEFT JOIN sale_items si ON ri.sale_item_id = si.id
        WHERE ri.return_id IN (SELECT id FROM returns_filtered)
    )
    SELECT json_build_object(
        'gross_revenue', COALESCE((SELECT SUM(total) FROM sales_filtered), 0),
        'return_revenue', COALESCE((SELECT SUM(total_refund) FROM returns_filtered), 0),
        'net_revenue', COALESCE((SELECT SUM(total) FROM sales_filtered), 0) - COALESCE((SELECT SUM(total_refund) FROM returns_filtered), 0),
        'gross_cogs', sm.gross_cogs,
        'return_cogs', rm.return_cogs,
        'net_cogs', sm.gross_cogs - rm.return_cogs,
        'gross_profit', (COALESCE((SELECT SUM(total) FROM sales_filtered), 0) - COALESCE((SELECT SUM(total_refund) FROM returns_filtered), 0)) - (sm.gross_cogs - rm.return_cogs)
    ) INTO v_summary
    FROM sale_item_metrics sm, return_item_metrics rm;

    -- 2. Calculate Daily Breakdown
    WITH daily_sales AS (
        SELECT 
            date::date as day, 
            SUM(total) as revenue, 
            COUNT(*) as sale_count
        FROM sales
        WHERE status = 'completed'
          AND date >= p_date_from
          AND date <= p_date_to
          AND (v_target_branch_id IS NULL OR branch_id = v_target_branch_id)
        GROUP BY 1
    ),
    daily_returns AS (
        SELECT 
            date::date as day, 
            SUM(total_refund) as refund,
            COUNT(*) as return_count
        FROM returns
        WHERE date >= p_date_from
          AND date <= p_date_to
          AND (v_target_branch_id IS NULL OR branch_id = v_target_branch_id)
        GROUP BY 1
    )
    SELECT json_agg(
        json_build_object(
            'day', COALESCE(s.day, r.day),
            'revenue', COALESCE(s.revenue, 0),
            'refund', COALESCE(r.refund, 0),
            'net', COALESCE(s.revenue, 0) - COALESCE(r.refund, 0),
            'sale_count', COALESCE(s.sale_count, 0),
            'return_count', COALESCE(r.return_count, 0)
        ) ORDER BY day ASC
    ) INTO v_daily_breakdown
    FROM daily_sales s
    FULL OUTER JOIN daily_returns r ON s.day = r.day;

    -- 3. Calculate Category Breakdown (using standardized public_price field)
    SELECT json_agg(t) INTO v_category_breakdown
    FROM (
        SELECT 
            d.category,
            SUM(si.quantity * si.public_price) as revenue,
            SUM(si.quantity * si.cost_price) as cogs,
            SUM(si.quantity * si.public_price) - SUM(si.quantity * si.cost_price) as profit
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN drugs d ON si.drug_id = d.id
        WHERE s.status = 'completed'
          AND s.date >= p_date_from
          AND s.date <= p_date_to
          AND (v_target_branch_id IS NULL OR s.branch_id = v_target_branch_id)
        GROUP BY d.category
        ORDER BY profit DESC
        LIMIT 10
    ) t;

    RETURN json_build_object(
        'summary', v_summary,
        'daily', COALESCE(v_daily_breakdown, '[]'::json),
        'categories', COALESCE(v_category_breakdown, '[]'::json),
        'generated_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Backfill historical sale_items where cost_price IS NULL
UPDATE sale_items si
SET cost_price = COALESCE(
    CASE 
        WHEN si.is_unit THEN COALESCE(d.unit_cost_price, d.cost_price / NULLIF(d.units_per_pack, 0))
        ELSE d.cost_price
    END,
    0
)
FROM drugs d
WHERE si.drug_id = d.id AND si.cost_price IS NULL;

COMMIT;
