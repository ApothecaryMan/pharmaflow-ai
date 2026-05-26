-- Migration: Update get_financial_report RPC with operating expenses
-- Date: 2026-05-26

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
    v_expenses_total NUMERIC(12, 2);
BEGIN
    -- Resolve branch ID
    v_target_branch_id := COALESCE(p_branch_id, get_user_branch_id());

    -- Calculate total expenses in the selected date range
    SELECT COALESCE(SUM(amount), 0) INTO v_expenses_total
    FROM expenses
    WHERE recorded_at >= p_date_from
      AND recorded_at <= p_date_to
      AND (v_target_branch_id IS NULL OR branch_id = v_target_branch_id);

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
        'gross_profit', (COALESCE((SELECT SUM(total) FROM sales_filtered), 0) - COALESCE((SELECT SUM(total_refund) FROM returns_filtered), 0)) - (sm.gross_cogs - rm.return_cogs),
        'expenses_total', v_expenses_total,
        'net_profit', ((COALESCE((SELECT SUM(total) FROM sales_filtered), 0) - COALESCE((SELECT SUM(total_refund) FROM returns_filtered), 0)) - (sm.gross_cogs - rm.return_cogs)) - v_expenses_total
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

    -- 3. Calculate Category Breakdown (Top performance)
    SELECT json_agg(t) INTO v_category_breakdown
    FROM (
        SELECT 
            d.category,
            SUM(si.quantity * si.unit_price) as revenue,
            SUM(si.quantity * si.cost_price) as cogs,
            SUM(si.quantity * si.unit_price) - SUM(si.quantity * si.cost_price) as profit
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
