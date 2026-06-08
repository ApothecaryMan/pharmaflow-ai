-- Migration: Fix ambiguous "day" column in get_daily_financial_breakdown
-- The ORDER BY clause inside json_agg() references bare "day" which is ambiguous
-- because both daily_sales and daily_returns CTEs define a "day" column.
-- Fix: use COALESCE(s.day, r.day) consistently.

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
        WHERE status = 'completed'
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
