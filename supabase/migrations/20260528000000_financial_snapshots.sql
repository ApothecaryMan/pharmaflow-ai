-- Migration: Financial Snapshots and RPCs
-- Date: 2026-05-28

-- 1. Create financial_snapshots table
CREATE TABLE IF NOT EXISTS public.financial_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id           UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    org_id              UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    period_type         TEXT NOT NULL CHECK (period_type IN ('monthly', 'daily')),
    period_key          TEXT NOT NULL, -- '2026-01' or '2026-05-28'
    gross_revenue       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_refunds       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_revenue         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gross_cogs          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    return_cogs         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_cogs            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gross_profit        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    expenses_total      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_profit          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_transactions  INTEGER NOT NULL DEFAULT 0,
    total_units_sold    INTEGER NOT NULL DEFAULT 0,
    total_returns_count INTEGER NOT NULL DEFAULT 0,
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_finalized        BOOLEAN DEFAULT FALSE,
    UNIQUE(branch_id, org_id, period_type, period_key)
);

-- RLS
ALTER TABLE public.financial_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.financial_snapshots;
CREATE POLICY tenant_isolation ON public.financial_snapshots
    FOR ALL USING (org_id IN (SELECT get_user_org_ids()) AND branch_id IN (SELECT get_user_branch_ids()));

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_snapshots;

-- 2. RPC: compute_financial_summary
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
        WHERE status = 'completed'
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

-- 3. RPC: finalize_month_snapshot
CREATE OR REPLACE FUNCTION public.finalize_month_snapshot(
    p_branch_id UUID,
    p_month_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_date_from TIMESTAMPTZ;
    v_date_to TIMESTAMPTZ;
    v_summary JSON;
BEGIN
    -- Resolve org_id
    SELECT org_id INTO v_org_id FROM public.branches WHERE id = p_branch_id;
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Branch % not found', p_branch_id;
    END IF;

    -- Calculate start and end date of the month in UTC
    v_date_from := date_trunc('month', (p_month_key || '-01')::DATE)::TIMESTAMPTZ;
    v_date_to := (date_trunc('month', v_date_from) + INTERVAL '1 month' - INTERVAL '1 microsecond')::TIMESTAMPTZ;

    -- Calculate metrics using compute_financial_summary
    v_summary := public.compute_financial_summary(p_branch_id, v_date_from, v_date_to);

    -- Insert or update
    INSERT INTO public.financial_snapshots (
        branch_id,
        org_id,
        period_type,
        period_key,
        gross_revenue,
        total_refunds,
        net_revenue,
        gross_cogs,
        return_cogs,
        net_cogs,
        gross_profit,
        expenses_total,
        net_profit,
        total_transactions,
        total_units_sold,
        total_returns_count,
        is_finalized
    ) VALUES (
        p_branch_id,
        v_org_id,
        'monthly',
        p_month_key,
        (v_summary->>'gross_revenue')::NUMERIC,
        (v_summary->>'total_refunds')::NUMERIC,
        (v_summary->>'net_revenue')::NUMERIC,
        (v_summary->>'gross_cogs')::NUMERIC,
        (v_summary->>'return_cogs')::NUMERIC,
        (v_summary->>'net_cogs')::NUMERIC,
        (v_summary->>'gross_profit')::NUMERIC,
        (v_summary->>'expenses_total')::NUMERIC,
        (v_summary->>'net_profit')::NUMERIC,
        (v_summary->>'total_transactions')::INTEGER,
        (v_summary->>'total_units_sold')::INTEGER,
        (v_summary->>'total_returns_count')::INTEGER,
        TRUE
    )
    ON CONFLICT (branch_id, org_id, period_type, period_key) DO UPDATE
    SET
        gross_revenue = EXCLUDED.gross_revenue,
        total_refunds = EXCLUDED.total_refunds,
        net_revenue = EXCLUDED.net_revenue,
        gross_cogs = EXCLUDED.gross_cogs,
        return_cogs = EXCLUDED.return_cogs,
        net_cogs = EXCLUDED.net_cogs,
        gross_profit = EXCLUDED.gross_profit,
        expenses_total = EXCLUDED.expenses_total,
        net_profit = EXCLUDED.net_profit,
        total_transactions = EXCLUDED.total_transactions,
        total_units_sold = EXCLUDED.total_units_sold,
        total_returns_count = EXCLUDED.total_returns_count,
        computed_at = NOW(),
        is_finalized = TRUE;
END;
$$;

-- 4. RPC: compute_financial_summary_with_snapshots
CREATE OR REPLACE FUNCTION public.compute_financial_summary_with_snapshots(
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
    v_user_branch_ids UUID[];
    v_month RECORD;
    v_month_start TIMESTAMPTZ;
    v_month_end TIMESTAMPTZ;
    v_month_key TEXT;
    
    -- Accumulators
    v_gross_revenue NUMERIC(12,2) := 0;
    v_total_refunds NUMERIC(12,2) := 0;
    v_net_revenue NUMERIC(12,2) := 0;
    v_gross_cogs NUMERIC(12,2) := 0;
    v_return_cogs NUMERIC(12,2) := 0;
    v_net_cogs NUMERIC(12,2) := 0;
    v_gross_profit NUMERIC(12,2) := 0;
    v_expenses_total NUMERIC(12,2) := 0;
    v_net_profit NUMERIC(12,2) := 0;
    v_total_transactions INTEGER := 0;
    v_total_units_sold INTEGER := 0;
    v_total_returns_count INTEGER := 0;
    
    -- Temp storage
    v_temp_summary JSON;
    v_branch_id_item UUID;
BEGIN
    v_target_branch_id := p_branch_id;
    
    -- Check permissions
    IF v_target_branch_id IS NOT NULL AND v_target_branch_id NOT IN (SELECT get_user_branch_ids()) THEN
        RAISE EXCEPTION 'Access denied to branch %', v_target_branch_id;
    END IF;

    -- Get list of branch IDs to compute for
    IF v_target_branch_id IS NOT NULL THEN
        v_user_branch_ids := ARRAY[v_target_branch_id];
    ELSE
        SELECT ARRAY_AGG(id) INTO v_user_branch_ids FROM public.branches WHERE org_id IN (SELECT get_user_org_ids());
    END IF;

    -- Loop through each month in the range
    FOR v_month IN 
        SELECT DISTINCT date_trunc('month', g)::TIMESTAMPTZ as m
        FROM generate_series(date_trunc('month', p_date_from), date_trunc('month', p_date_to), INTERVAL '1 month') g
    LOOP
        v_month_start := v_month.m;
        v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 microsecond')::TIMESTAMPTZ;
        v_month_key := to_char(v_month_start, 'YYYY-MM');

        -- Check if this month is fully within the range and is in the past
        IF v_month_start >= p_date_from AND v_month_end <= p_date_to AND v_month_end < date_trunc('month', NOW()) THEN
            -- Yes! Use snapshots.
            -- First, ensure snapshot exists for all branches we care about
            FOREACH v_branch_id_item IN ARRAY v_user_branch_ids LOOP
                IF NOT EXISTS (
                    SELECT 1 FROM public.financial_snapshots 
                    WHERE branch_id = v_branch_id_item AND period_type = 'monthly' AND period_key = v_month_key
                ) THEN
                    -- Compute and store snapshot lazily
                    PERFORM public.finalize_month_snapshot(v_branch_id_item, v_month_key);
                END IF;
            END LOOP;

            -- Now aggregate from snapshots
            SELECT 
                COALESCE(v_gross_revenue + SUM(gross_revenue), v_gross_revenue),
                COALESCE(v_total_refunds + SUM(total_refunds), v_total_refunds),
                COALESCE(v_net_revenue + SUM(net_revenue), v_net_revenue),
                COALESCE(v_gross_cogs + SUM(gross_cogs), v_gross_cogs),
                COALESCE(v_return_cogs + SUM(return_cogs), v_return_cogs),
                COALESCE(v_net_cogs + SUM(net_cogs), v_net_cogs),
                COALESCE(v_gross_profit + SUM(gross_profit), v_gross_profit),
                COALESCE(v_expenses_total + SUM(expenses_total), v_expenses_total),
                COALESCE(v_net_profit + SUM(net_profit), v_net_profit),
                COALESCE(v_total_transactions + SUM(total_transactions), v_total_transactions),
                COALESCE(v_total_units_sold + SUM(total_units_sold), v_total_units_sold),
                COALESCE(v_total_returns_count + SUM(total_returns_count), v_total_returns_count)
            INTO
                v_gross_revenue, v_total_refunds, v_net_revenue, v_gross_cogs, v_return_cogs, v_net_cogs,
                v_gross_profit, v_expenses_total, v_net_profit, v_total_transactions, v_total_units_sold, v_total_returns_count
            FROM public.financial_snapshots
            WHERE branch_id = ANY(v_user_branch_ids)
              AND period_type = 'monthly'
              AND period_key = v_month_key;

        ELSE
            -- No! This month is either partial or current. Calculate live.
            -- Determine the sub-range for this month that falls within [p_date_from, p_date_to]
            DECLARE
                v_calc_start TIMESTAMPTZ;
                v_calc_end TIMESTAMPTZ;
            BEGIN
                v_calc_start := GREATEST(p_date_from, v_month_start);
                v_calc_end := LEAST(p_date_to, v_month_end);

                v_temp_summary := public.compute_financial_summary(v_target_branch_id, v_calc_start, v_calc_end);

                v_gross_revenue := v_gross_revenue + COALESCE((v_temp_summary->>'gross_revenue')::NUMERIC, 0);
                v_total_refunds := v_total_refunds + COALESCE((v_temp_summary->>'total_refunds')::NUMERIC, 0);
                v_net_revenue := v_net_revenue + COALESCE((v_temp_summary->>'net_revenue')::NUMERIC, 0);
                v_gross_cogs := v_gross_cogs + COALESCE((v_temp_summary->>'gross_cogs')::NUMERIC, 0);
                v_return_cogs := v_return_cogs + COALESCE((v_temp_summary->>'return_cogs')::NUMERIC, 0);
                v_net_cogs := v_net_cogs + COALESCE((v_temp_summary->>'net_cogs')::NUMERIC, 0);
                v_gross_profit := v_gross_profit + COALESCE((v_temp_summary->>'gross_profit')::NUMERIC, 0);
                v_expenses_total := v_expenses_total + COALESCE((v_temp_summary->>'expenses_total')::NUMERIC, 0);
                v_net_profit := v_net_profit + COALESCE((v_temp_summary->>'net_profit')::NUMERIC, 0);
                v_total_transactions := v_total_transactions + COALESCE((v_temp_summary->>'total_transactions')::INTEGER, 0);
                v_total_units_sold := v_total_units_sold + COALESCE((v_temp_summary->>'total_units_sold')::INTEGER, 0);
                v_total_returns_count := v_total_returns_count + COALESCE((v_temp_summary->>'total_returns_count')::INTEGER, 0);
            END;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'gross_revenue', v_gross_revenue,
        'total_refunds', v_total_refunds,
        'net_revenue', v_net_revenue,
        'gross_cogs', v_gross_cogs,
        'return_cogs', v_return_cogs,
        'net_cogs', v_net_cogs,
        'gross_profit', v_gross_profit,
        'expenses_total', v_expenses_total,
        'net_profit', v_net_profit,
        'total_transactions', v_total_transactions,
        'total_units_sold', v_total_units_sold,
        'total_returns_count', v_total_returns_count
    );
END;
$$;

-- 5. RPC: get_daily_financial_breakdown
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
            date::date as day, 
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
            date::date as day, 
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
        ) ORDER BY day ASC
    ) INTO v_result
    FROM daily_sales s
    FULL OUTER JOIN daily_returns r ON s.day = r.day;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 6. RPC: get_top_products_financial
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
            SUM(si.quantity * si.unit_price) as gross_rev,
            SUM(si.quantity * si.cost_price) as gross_cogs
        FROM public.sale_items si
        JOIN public.sales s ON si.sale_id = s.id
        WHERE s.status = 'completed'
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

-- 7. RPC: get_category_financial_breakdown
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
            SUM(si.quantity * si.unit_price) as gross_revenue,
            SUM(si.quantity * si.cost_price) as gross_cogs
        FROM public.sale_items si
        JOIN public.sales s ON si.sale_id = s.id
        LEFT JOIN public.drugs d ON si.drug_id = d.id
        WHERE s.status = 'completed'
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
