-- Fix shortages and predictive alerts RPC unit/pack mismatch
-- Name: get_shortages(UUID)
-- Redefines the function to compare stock (units) with min_stock * units_per_pack (units)
-- and compute suggested order quantities in full packs accurately.

CREATE OR REPLACE FUNCTION public.get_shortages(p_branch_id UUID)
RETURNS TABLE (
  drug_id UUID,
  name TEXT,
  name_arabic TEXT,
  generic_name TEXT[],
  category TEXT,
  barcode TEXT,
  dosage_form TEXT,
  units_per_pack INTEGER,
  min_stock INTEGER,
  stock INTEGER,
  public_price NUMERIC,
  cost_price NUMERIC,
  unit_price NUMERIC,
  unit_cost_price NUMERIC,
  avg_daily_sales NUMERIC,
  stock_days NUMERIC,
  suggested_order_qty INTEGER,
  abc_class TEXT,
  alert_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH sales_velocity AS (
    -- Sum of units sold normalized in last 30 days
    SELECT 
      si.drug_id,
      COALESCE(SUM(
        CASE 
          WHEN si.is_unit = TRUE THEN si.quantity 
          ELSE si.quantity * COALESCE(d.units_per_pack, 1) 
        END
      ), 0) / 30.0 AS avg_daily_sales
    FROM public.sale_items si
    JOIN public.sales s ON s.id = si.sale_id
    JOIN public.drugs d ON d.id = si.drug_id
    WHERE s.branch_id = p_branch_id
      AND s.status = 'completed'
      AND s.date >= (NOW() - INTERVAL '30 days')
    GROUP BY si.drug_id
  ),
  pareto_cums AS (
    -- Compute sales totals for Pareto ABC
    SELECT
      d.id AS drug_id,
      COALESCE(sv.avg_daily_sales, 0) AS avg_daily_sales,
      COALESCE(sv.avg_daily_sales, 0) * 30.0 AS estimated_revenue,
      SUM(COALESCE(sv.avg_daily_sales, 0) * 30.0) OVER (ORDER BY COALESCE(sv.avg_daily_sales, 0) DESC) AS cumulative_revenue,
      SUM(COALESCE(sv.avg_daily_sales, 0) * 30.0) OVER () AS total_revenue
    FROM public.drugs d
    LEFT JOIN sales_velocity sv ON sv.drug_id = d.id
    WHERE d.branch_id = p_branch_id
      AND d.status != 'discontinued'
  ),
  abc_classified AS (
    -- Rank items ABC based on sales contribution
    SELECT
      pc.drug_id,
      pc.avg_daily_sales,
      CASE 
        WHEN pc.total_revenue = 0 THEN 'C'
        WHEN (pc.cumulative_revenue / pc.total_revenue) * 100.0 <= 80.0 THEN 'A'
        WHEN (pc.cumulative_revenue / pc.total_revenue) * 100.0 <= 95.0 THEN 'B'
        ELSE 'C'
      END AS abc_class
    FROM pareto_cums pc
  ),
  shortage_calculations AS (
    -- Main query with metrics and dynamic alert type categorization
    SELECT
      d.id AS c_drug_id,
      d.name AS c_name,
      d.name_arabic AS c_name_arabic,
      d.generic_name AS c_generic_name,
      d.category AS c_category,
      d.barcode AS c_barcode,
      d.dosage_form AS c_dosage_form,
      d.units_per_pack AS c_units_per_pack,
      d.min_stock AS c_min_stock,
      d.stock AS c_stock,
      d.public_price AS c_public_price,
      d.cost_price AS c_cost_price,
      d.unit_price AS c_unit_price,
      d.unit_cost_price AS c_unit_cost_price,
      ROUND(abc.avg_daily_sales, 2) AS c_avg_daily_sales,
      CASE 
        WHEN abc.avg_daily_sales > 0 THEN ROUND(d.stock::numeric / abc.avg_daily_sales, 1)
        ELSE NULL
      END AS c_stock_days,
      GREATEST(
        0,
        -- 1. Safety stock packs (based on velocity)
        CASE 
          WHEN abc.avg_daily_sales > 0 THEN
            CEIL(GREATEST(0, (14.0 * abc.avg_daily_sales * 1.5) - d.stock::numeric) / COALESCE(d.units_per_pack, 1))::integer
          ELSE 0
        END,
        -- 2. Min stock replenishment packs (based on manual minimum)
        CASE 
          WHEN COALESCE(d.min_stock, 0) > 0 AND d.stock <= COALESCE(d.min_stock, 0) * COALESCE(d.units_per_pack, 1) THEN
            GREATEST(0, COALESCE(d.min_stock, 0) - FLOOR(d.stock::numeric / COALESCE(d.units_per_pack, 1))::integer)
          WHEN d.stock <= 0 THEN
            COALESCE(d.min_stock, 10)
          ELSE 0
        END
      ) AS c_suggested_order_qty,
      abc.abc_class AS c_abc_class,
      CASE
        WHEN d.stock <= 0 AND abc.avg_daily_sales > 0 THEN 'OUT_OF_STOCK_SOLD'
        WHEN d.stock <= COALESCE(d.min_stock, 0) * COALESCE(d.units_per_pack, 1) AND d.stock > 0 THEN 'MANUAL_MINIMUM_REACHED'
        WHEN d.stock > COALESCE(d.min_stock, 0) * COALESCE(d.units_per_pack, 1) AND d.stock > 0 AND abc.avg_daily_sales > 0 AND (d.stock::numeric / abc.avg_daily_sales) < 14.0 THEN 'PREDICTIVE_SHORTAGE'
        WHEN d.stock <= 0 AND abc.avg_daily_sales = 0 THEN 'OUT_OF_STOCK_DEFAULT'
        ELSE 'NORMAL'
      END AS c_alert_type
    FROM public.drugs d
    JOIN abc_classified abc ON abc.drug_id = d.id
    WHERE d.branch_id = p_branch_id
      AND d.status != 'discontinued'
  )
  SELECT 
    c_drug_id,
    c_name,
    c_name_arabic,
    c_generic_name,
    c_category,
    c_barcode,
    c_dosage_form,
    c_units_per_pack,
    c_min_stock,
    c_stock,
    c_public_price,
    c_cost_price,
    c_unit_price,
    c_unit_cost_price,
    c_avg_daily_sales,
    c_stock_days,
    c_suggested_order_qty,
    c_abc_class,
    c_alert_type
  FROM shortage_calculations
  WHERE c_alert_type != 'NORMAL';
END;
$$;

-- Grant permissions so standard users can execute this securely
GRANT EXECUTE ON FUNCTION public.get_shortages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shortages(UUID) TO anon;
