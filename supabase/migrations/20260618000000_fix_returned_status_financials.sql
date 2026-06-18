-- Migration: Fix returned status excluding sales from financial calculations
-- When a sale is fully returned, its status changes to 'returned'.
-- Previously, financial breakdown queries were filtering `status = 'completed'`,
-- which completely removed the original sale's revenue from gross revenue,
-- while the refund was still being subtracted. This resulted in negative net revenue
-- and negative profit.
-- This migration updates the queries to include `status IN ('completed', 'returned')`.

BEGIN;

-- 1. RPC: compute_financial_summary
CREATE OR REPLACE FUNCTION public.compute_financial_summary(
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
    v_expenses_total NUMERIC(12, 2);
    v_result JSON;
BEGIN
    v_target_branch_id := p_branch_id;
    
    -- Check permissions
    IF v_target_branch_id IS NOT NULL AND v_target_branch_id NOT IN (SELECT get_user_branch_ids()) THEN
        RAISE EXCEPTION 'Access denied to branch %', v_target_branch_id;
    END IF;

    -- Calculate total expenses in the selected date range
    SELECT COALESCE(SUM(amount), 0) INTO v_expenses_total
    FROM public.expenses
    WHERE recorded_at >= p_date_from
      AND recorded_at <= p_date_to
      AND (
          (v_target_branch_id IS NULL AND branch_id IN (SELECT get_user_branch_ids()))
          OR
          (v_target_branch_id IS NOT NULL AND branch_id = v_target_branch_id)
      );

    -- Calculate sales and returns metrics
    WITH sales_filtered AS (
        SELECT id, total
        FROM public.sales
        WHERE status IN ('completed', 'returned')
          AND date >= p_date_from
          AND date <= p_date_to
          AND (
              (v_target_branch_id IS NULL AND branch_id IN (SELECT get_user_branch_ids()))
              OR
              (v_target_branch_id IS NOT NULL AND branch_id = v_target_branch_id)
          )
    ),
    returns_filtered AS (
        SELECT id, total_refund
        FROM public.returns
        WHERE date >= p_date_from
          AND date <= p_date_to
          AND (
              (v_target_branch_id IS NULL AND branch_id IN (SELECT get_user_branch_ids()))
              OR
              (v_target_branch_id IS NOT NULL AND branch_id = v_target_branch_id)
          )
    ),
    sale_item_metrics AS (
        SELECT 
            COALESCE(SUM(si.quantity * si.cost_price), 0) as gross_cogs,
            COALESCE(SUM(si.quantity), 0) as total_units_sold
        FROM public.sale_items si
        WHERE si.sale_id IN (SELECT id FROM sales_filtered)
    ),
    return_item_metrics AS (
        SELECT 
            COALESCE(SUM(ri.quantity_returned * si.cost_price), 0) as return_cogs
        FROM public.return_items ri
        LEFT JOIN public.sale_items si ON ri.sale_item_id = si.id
        WHERE ri.return_id IN (SELECT id FROM returns_filtered)
    )
    SELECT json_build_object(
        'gross_revenue', COALESCE((SELECT SUM(total) FROM sales_filtered), 0),
        'total_refunds', COALESCE((SELECT SUM(total_refund) FROM returns_filtered), 0),
        'net_revenue', COALESCE((SELECT SUM(total) FROM sales_filtered), 0) - COALESCE((SELECT SUM(total_refund) FROM returns_filtered), 0),
        'gross_cogs', sm.gross_cogs,
        'return_cogs', rm.return_cogs,
        'net_cogs', sm.gross_cogs - rm.return_cogs,
        'gross_profit', (COALESCE((SELECT SUM(total) FROM sales_filtered), 0) - COALESCE((SELECT SUM(total_refund) FROM returns_filtered), 0)) - (sm.gross_cogs - rm.return_cogs),
        'expenses_total', v_expenses_total,
        'net_profit', ((COALESCE((SELECT SUM(total) FROM sales_filtered), 0) - COALESCE((SELECT SUM(total_refund) FROM returns_filtered), 0)) - (sm.gross_cogs - rm.return_cogs)) - v_expenses_total,
        'total_transactions', COALESCE((SELECT COUNT(*) FROM sales_filtered), 0),
        'total_units_sold', sm.total_units_sold,
        'total_returns_count', COALESCE((SELECT COUNT(*) FROM returns_filtered), 0)
    ) INTO v_result
    FROM sale_item_metrics sm, return_item_metrics rm;

    RETURN v_result;
END;
$$;

-- 2. RPC: get_daily_financial_breakdown
CREATE OR REPLACE FUNCTION public.get_daily_financial_breakdown(
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

    WITH daily_sales AS (
        SELECT 
            (date AT TIME ZONE 'Africa/Cairo')::date as day, 
            SUM(total) as revenue, 
            COUNT(*) as sale_count
        FROM public.sales
        WHERE status IN ('completed', 'returned')
          AND date >= p_date_from
          AND date <= p_date_to
          AND (
              (v_target_branch_id IS NULL AND branch_id IN (SELECT get_user_branch_ids()))
              OR
              (v_target_branch_id IS NOT NULL AND branch_id = v_target_branch_id)
          )
        GROUP BY 1
    ),
    daily_returns AS (
        SELECT 
            (date AT TIME ZONE 'Africa/Cairo')::date as day, 
            SUM(total_refund) as refund,
            COUNT(*) as return_count
        FROM public.returns
        WHERE date >= p_date_from
          AND date <= p_date_to
          AND (
              (v_target_branch_id IS NULL AND branch_id IN (SELECT get_user_branch_ids()))
              OR
              (v_target_branch_id IS NOT NULL AND branch_id = v_target_branch_id)
          )
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
        ) ORDER BY COALESCE(s.day, r.day) ASC
    ) INTO v_result
    FROM daily_sales s
    FULL OUTER JOIN daily_returns r ON s.day = r.day;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 3. RPC: get_top_products_financial
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
            SUM(si.quantity * si.public_price) as gross_rev,
            SUM(si.quantity * si.cost_price) as gross_cogs
        FROM public.sale_items si
        JOIN public.sales s ON si.sale_id = s.id
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

-- 4. RPC: get_category_financial_breakdown
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
            SUM(si.quantity * si.public_price) as gross_revenue,
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

COMMIT;
