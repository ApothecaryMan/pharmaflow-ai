-- ============================================================
-- Migration: Dashboard Optimization — Server-Side Aggregation
-- 
-- 1. drug_sales_aggregate table + trigger (leaderboard counter)
-- 2. RPC: get_dashboard_low_stock
-- 3. RPC: get_dashboard_expiring_items
-- 4. RPC: get_dashboard_inventory_valuation
-- 5. Indexes for low-stock / expiring queries
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
-- 1. drug_sales_aggregate — Pre-computed leaderboard counter
--    Updated by trigger on sale_items, eliminating the need
--    to scan ALL sales every time the dashboard loads.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.drug_sales_aggregate (
    drug_id     UUID NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
    branch_id   UUID NOT NULL,
    org_id      UUID,
    total_qty   INT DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (drug_id, branch_id)
);

-- Trigger function: increment on sale_items insert
CREATE OR REPLACE FUNCTION public.update_drug_sales_aggregate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_branch_id UUID;
    v_org_id UUID;
    v_pack_price DECIMAL;
    v_units_per_pack INT;
BEGIN
    -- Resolve branch_id from the parent sale
    SELECT s.branch_id, s.org_id INTO v_branch_id, v_org_id
    FROM public.sales s WHERE s.id = NEW.sale_id;

    -- Resolve effective price (pack or unit)
    SELECT d.public_price, COALESCE(d.units_per_pack, 1)
    INTO v_pack_price, v_units_per_pack
    FROM public.drugs d WHERE d.id = NEW.drug_id;

    INSERT INTO public.drug_sales_aggregate (drug_id, branch_id, org_id, total_qty, total_revenue)
    VALUES (
        NEW.drug_id,
        v_branch_id,
        v_org_id,
        NEW.quantity,
        CASE WHEN NEW.is_unit THEN
            NEW.quantity * (v_pack_price / v_units_per_pack)
        ELSE
            NEW.quantity * v_pack_price
        END
    )
    ON CONFLICT (drug_id, branch_id)
    DO UPDATE SET
        total_qty      = drug_sales_aggregate.total_qty + NEW.quantity,
        total_revenue  = drug_sales_aggregate.total_revenue + EXCLUDED.total_revenue,
        updated_at     = NOW();

    RETURN NULL;
END;
$$;

-- Attach trigger to sale_items
DROP TRIGGER IF EXISTS trg_update_drug_sales_aggregate ON public.sale_items;
CREATE TRIGGER trg_update_drug_sales_aggregate
    AFTER INSERT ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_drug_sales_aggregate();

-- RPC: Read top-selling products from the aggregate table
CREATE OR REPLACE FUNCTION public.get_dashboard_top_selling(
    p_branch_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(sub)
    INTO v_result
    FROM (
        SELECT
            dsa.drug_id    AS product_id,
            d.name         AS product_name,
            d.dosage_form,
            dsa.total_qty  AS quantity_sold,
            dsa.total_revenue AS revenue
        FROM public.drug_sales_aggregate dsa
        JOIN public.drugs d ON d.id = dsa.drug_id
        WHERE dsa.branch_id = p_branch_id
        ORDER BY dsa.total_revenue DESC
        LIMIT p_limit
    ) sub;

    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 2. RPC: get_dashboard_low_stock
--    Returns top N items where stock < min_stock (server-side
--    column comparison that the Supabase JS client cannot do).
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_dashboard_low_stock(
    p_branch_id UUID,
    p_limit INT DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(sub)
    INTO v_result
    FROM (
        SELECT d.id, d.name, d.dosage_form, d.stock, d.category, d.public_price
        FROM public.drugs d
        WHERE d.branch_id = p_branch_id
          AND d.stock > 0
          AND d.stock < COALESCE(d.min_stock, 10)
        ORDER BY d.stock ASC
        LIMIT p_limit
    ) sub;

    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 3. RPC: get_dashboard_expiring_items
--    Returns top N drugs whose batches expire within the next
--    N days, with the earliest expiry and total stock per drug.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_dashboard_expiring_items(
    p_branch_id UUID,
    p_days INT DEFAULT 90,
    p_limit INT DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH ranked_batches AS (
        SELECT
            sb.drug_id,
            sb.id AS batch_id,
            sb.quantity AS batch_quantity,
            sb.expiry_date,
            ROW_NUMBER() OVER (PARTITION BY sb.drug_id ORDER BY sb.expiry_date ASC) AS rn
        FROM public.stock_batches sb
        WHERE sb.branch_id = p_branch_id
          AND sb.quantity > 0
          AND sb.expiry_date >= CURRENT_DATE
          AND sb.expiry_date <= (CURRENT_DATE + p_days)
    )
    SELECT json_agg(sub)
    INTO v_result
    FROM (
        SELECT d.id, d.name, d.dosage_form, d.category, d.public_price, d.stock,
               rb.expiry_date, rb.batch_id, rb.batch_quantity
        FROM ranked_batches rb
        JOIN public.drugs d ON d.id = rb.drug_id
        WHERE rb.rn = 1
          AND d.branch_id = p_branch_id
        ORDER BY rb.expiry_date ASC
        LIMIT p_limit
    ) sub;

    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 4. RPC: get_dashboard_inventory_valuation
--    Returns the total cost-based inventory value
--    (SUM of cost_price × quantity across all batches).
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_dashboard_inventory_valuation(
    p_branch_id UUID
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total DECIMAL;
BEGIN
    SELECT COALESCE(SUM(sb.cost_price * sb.quantity), 0)
    INTO v_total
    FROM public.stock_batches sb
    WHERE sb.branch_id = p_branch_id;

    RETURN v_total;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 5. Indexes for low-stock / expiring queries
-- ════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_drugs_low_stock_dashboard
    ON public.drugs (branch_id, stock)
    WHERE stock > 0 AND stock < COALESCE(min_stock, 10);

CREATE INDEX IF NOT EXISTS idx_batches_expiring_dashboard
    ON public.stock_batches (branch_id, expiry_date)
    WHERE quantity > 0;

COMMIT;
