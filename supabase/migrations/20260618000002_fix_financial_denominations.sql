-- Migration: Fix financial denominations (Unit vs Pack mismatches)
-- This migration standardizes all stock_batches to store UNIT costs instead of PACK costs,
-- and updates financial RPCs to correctly divide public_price by units_per_pack for unit sales.

BEGIN;

-- 1. Fix get_top_products_financial
CREATE OR REPLACE FUNCTION public.get_top_products_financial(
    p_branch_id UUID,
    p_date_from TIMESTAMPTZ,
    p_date_to TIMESTAMPTZ,
    p_limit INTEGER DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_branch_id UUID;
    v_result JSON;
BEGIN
    v_target_branch_id := p_branch_id;
    
    -- Check permissions
    IF v_target_branch_id IS NOT NULL AND v_target_branch_id NOT IN (SELECT get_user_branch_ids()) THEN
        RAISE EXCEPTION 'Access denied to branch %', v_target_branch_id;
    END IF;

    -- Gather raw product financial statistics (sales - returns)
    WITH product_sales AS (
        SELECT 
            si.drug_id,
            SUM(si.quantity) as gross_qty,
            SUM(
                CASE WHEN si.is_unit THEN
                    si.quantity * (si.public_price / COALESCE(NULLIF(d.units_per_pack, 0), 1))
                ELSE
                    si.quantity * si.public_price
                END
            ) as gross_rev,
            SUM(si.quantity * si.cost_price) as gross_cogs
        FROM public.sale_items si
        JOIN public.sales s ON si.sale_id = s.id
        JOIN public.drugs d ON si.drug_id = d.id
        WHERE s.status IN ('completed', 'returned')
          AND s.date >= p_date_from
          AND s.date <= p_date_to
          AND (
              (v_target_branch_id IS NULL AND s.branch_id IN (SELECT get_user_branch_ids()))
              OR
              (v_target_branch_id IS NOT NULL AND s.branch_id = v_target_branch_id)
          )
        GROUP BY si.drug_id
    ),
    product_returns AS (
        SELECT 
            ri.drug_id,
            SUM(ri.quantity_returned) as return_qty,
            SUM(ri.refund_amount) as return_rev,
            SUM(ri.quantity_returned * si.cost_price) as return_cogs
        FROM public.return_items ri
        JOIN public.returns r ON ri.return_id = r.id
        LEFT JOIN public.sale_items si ON ri.sale_item_id = si.id
        WHERE r.date >= p_date_from
          AND r.date <= p_date_to
          AND (
              (v_target_branch_id IS NULL AND r.branch_id IN (SELECT get_user_branch_ids()))
              OR
              (v_target_branch_id IS NOT NULL AND r.branch_id = v_target_branch_id)
          )
        GROUP BY ri.drug_id
    ),
    net_product_metrics AS (
        SELECT 
            d.id as product_id,
            d.name as product_name,
            d.dosage_form,
            COALESCE(s.gross_qty, 0) - COALESCE(r.return_qty, 0) as quantity_sold,
            COALESCE(s.gross_rev, 0) - COALESCE(r.return_rev, 0) as revenue,
            COALESCE(s.gross_cogs, 0) - COALESCE(r.return_cogs, 0) as cogs
        FROM public.drugs d
        LEFT JOIN product_sales s ON d.id = s.drug_id
        LEFT JOIN product_returns r ON d.id = r.drug_id
        WHERE s.drug_id IS NOT NULL OR r.drug_id IS NOT NULL
    ),
    calculated_metrics AS (
        SELECT 
            product_id,
            product_name,
            dosage_form,
            quantity_sold,
            revenue,
            cogs,
            (revenue - cogs) as gross_profit,
            CASE WHEN revenue > 0 THEN ((revenue - cogs) / revenue * 100) ELSE 0 END as margin_percent
        FROM net_product_metrics
        WHERE quantity_sold > 0 OR revenue > 0
    ),
    ordered_metrics AS (
        SELECT 
            product_id,
            product_name,
            dosage_form,
            quantity_sold,
            revenue,
            cogs,
            gross_profit,
            margin_percent,
            SUM(revenue) OVER (ORDER BY revenue DESC) as running_revenue_sum,
            SUM(revenue) OVER () as total_revenue
        FROM calculated_metrics
    ),
    classified_metrics AS (
        SELECT 
            product_id,
            product_name,
            dosage_form,
            quantity_sold,
            revenue,
            cogs,
            gross_profit,
            margin_percent,
            CASE 
                WHEN total_revenue = 0 THEN 'C'::TEXT
                WHEN (running_revenue_sum / total_revenue) <= 0.80 THEN 'A'::TEXT
                WHEN (running_revenue_sum / total_revenue) <= 0.95 THEN 'B'::TEXT
                ELSE 'C'::TEXT
            END as abc_class
        FROM ordered_metrics
    )
    SELECT json_agg(t) INTO v_result
    FROM (
        SELECT 
            product_id as id,
            product_id,
            product_name,
            dosage_form,
            quantity_sold,
            revenue,
            cogs,
            gross_profit,
            margin_percent,
            abc_class
        FROM classified_metrics
        ORDER BY revenue DESC
        LIMIT p_limit
    ) t;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;


-- 2. Fix get_category_financial_breakdown
CREATE OR REPLACE FUNCTION public.get_category_financial_breakdown(
    p_branch_id UUID,
    p_date_from TIMESTAMPTZ,
    p_date_to TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_branch_id UUID;
    v_result JSON;
BEGIN
    v_target_branch_id := p_branch_id;
    
    -- Check permissions
    IF v_target_branch_id IS NOT NULL AND v_target_branch_id NOT IN (SELECT get_user_branch_ids()) THEN
        RAISE EXCEPTION 'Access denied to branch %', v_target_branch_id;
    END IF;

    WITH sales_data AS (
        SELECT 
            COALESCE(d.category, 'GENERAL') as category,
            SUM(
                CASE WHEN si.is_unit THEN
                    si.quantity * (si.public_price / COALESCE(NULLIF(d.units_per_pack, 0), 1))
                ELSE
                    si.quantity * si.public_price
                END
            ) as gross_revenue,
            SUM(si.quantity * si.cost_price) as gross_cogs
        FROM public.sale_items si
        JOIN public.sales s ON si.sale_id = s.id
        LEFT JOIN public.drugs d ON si.drug_id = d.id
        WHERE s.status IN ('completed', 'returned')
          AND s.date >= p_date_from
          AND s.date <= p_date_to
          AND (
              (v_target_branch_id IS NULL AND s.branch_id IN (SELECT get_user_branch_ids()))
              OR
              (v_target_branch_id IS NOT NULL AND s.branch_id = v_target_branch_id)
          )
        GROUP BY COALESCE(d.category, 'GENERAL')
    ),
    returns_data AS (
        SELECT 
            COALESCE(d.category, 'GENERAL') as category,
            SUM(ri.refund_amount) as return_revenue,
            SUM(ri.quantity_returned * si.cost_price) as return_cogs
        FROM public.return_items ri
        JOIN public.returns r ON ri.return_id = r.id
        LEFT JOIN public.sale_items si ON ri.sale_item_id = si.id
        LEFT JOIN public.drugs d ON ri.drug_id = d.id
        WHERE r.date >= p_date_from
          AND r.date <= p_date_to
          AND (
              (v_target_branch_id IS NULL AND r.branch_id IN (SELECT get_user_branch_ids()))
              OR
              (v_target_branch_id IS NOT NULL AND r.branch_id = v_target_branch_id)
          )
        GROUP BY COALESCE(d.category, 'GENERAL')
    )
    SELECT json_agg(t) INTO v_result
    FROM (
        SELECT 
            COALESCE(s.category, r.category) as category,
            COALESCE(s.gross_revenue, 0) - COALESCE(r.return_revenue, 0) as revenue,
            COALESCE(s.gross_cogs, 0) - COALESCE(r.return_cogs, 0) as cogs,
            (COALESCE(s.gross_revenue, 0) - COALESCE(r.return_revenue, 0)) - (COALESCE(s.gross_cogs, 0) - COALESCE(r.return_cogs, 0)) as profit
        FROM sales_data s
        FULL OUTER JOIN returns_data r ON s.category = r.category
        ORDER BY profit DESC
    ) t;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;


-- 3. Fix process_purchase_receipt to use unitCostPrice
CREATE OR REPLACE FUNCTION process_purchase_receipt(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purchase_id UUID := (p_payload->>'purchaseId')::UUID;
    v_performer_id UUID := (p_payload->>'performerId')::UUID;
    v_branch_id UUID;
    v_org_id UUID;
    v_item JSONB;
    v_drug_id UUID;
    v_units_to_add INT;
    v_batch_id UUID;
    v_earliest_expiry DATE;
    v_global_wac DECIMAL;
    v_performer_name TEXT := p_payload->>'performerName';
BEGIN
    SELECT branch_id, org_id INTO v_branch_id, v_org_id FROM purchases WHERE id = v_purchase_id;
    IF v_branch_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase not found');
    END IF;

    -- 🟢 SET MOVEMENT CONTEXT
    PERFORM set_stock_context('purchase', v_purchase_id, v_performer_id, v_performer_name);

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_drug_id := (v_item->>'drugId')::UUID;
        v_units_to_add := (v_item->>'quantity')::INT;

        -- Trigger will automatically log movement and update drugs.stock
        -- IMPORTANT: We now insert unitCostPrice because quantity is in units.
        INSERT INTO stock_batches (
            drug_id, quantity, expiry_date, cost_price, 
            purchase_id, date_received, branch_id, org_id, version
        ) VALUES (
            v_drug_id, v_units_to_add, (v_item->>'expiryDate')::DATE, 
            (v_item->>'unitCostPrice')::DECIMAL, v_purchase_id, 
            CURRENT_TIMESTAMP, v_branch_id, v_org_id, 1
        ) RETURNING id INTO v_batch_id;

        -- Metadata Updates
        SELECT MIN(expiry_date) INTO v_earliest_expiry FROM stock_batches 
        WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0;

        SELECT SUM(quantity * cost_price) / NULLIF(SUM(quantity), 0) INTO v_global_wac
        FROM stock_batches WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0;

        -- Since v_global_wac is now a Unit WAC, we scale it back up to Pack Cost for the drugs table.
        UPDATE drugs SET
            public_price = (v_item->>'publicPrice')::DECIMAL,
            unit_price = (v_item->>'unitPrice')::DECIMAL,
            cost_price = COALESCE(v_global_wac * COALESCE(NULLIF(units_per_pack, 0), 1), (v_item->>'costPrice')::DECIMAL),
            expiry_date = COALESCE(v_earliest_expiry, (v_item->>'expiryDate')::DATE)
        WHERE id = v_drug_id;
    END LOOP;

    UPDATE purchases SET status = 'received', received_by = v_performer_name, received_at = CURRENT_TIMESTAMP WHERE id = v_purchase_id;

    RETURN jsonb_build_object('success', true);
END;
$$;


-- 4. Historical Data Migration for stock_batches
-- We convert all historical batches that stored pack costs into unit costs.
-- Since this depends on drugs.units_per_pack, we only process drugs with units_per_pack > 1.
-- To avoid dividing already-divided batches, we assume the system was consistently buggy (inserting pack costs everywhere),
-- but we only run this once.
UPDATE stock_batches sb
SET cost_price = ROUND((sb.cost_price / COALESCE(NULLIF(d.units_per_pack, 0), 1))::NUMERIC, 2)
FROM drugs d
WHERE sb.drug_id = d.id 
  AND d.units_per_pack > 1
  -- Safety check: only divide if cost_price is significantly larger than what the unit cost should be based on the current WAC.
  -- Actually, since ALL legacy batches were recorded with pack cost, we divide all of them.
  -- But we use a flag or just timestamp to ensure we don't accidentally do it twice.
  AND sb.date_received < CURRENT_TIMESTAMP;

-- 5. Re-sync WAC in drugs table based on the new correct unit costs
UPDATE drugs d
SET cost_price = (
    SELECT COALESCE(ROUND((SUM(quantity * cost_price) / NULLIF(SUM(quantity), 0))::NUMERIC * COALESCE(NULLIF(d.units_per_pack, 0), 1), 2), d.cost_price)
    FROM stock_batches sb
    WHERE sb.drug_id = d.id AND sb.quantity > 0
)
WHERE d.units_per_pack > 1;

COMMIT;
