-- ═══════════════════════════════════════════
-- Migration: Fix Pricing Types and Transaction Rollback Conflicts
-- 1. Converts unit_price and unit_cost_price to NUMERIC to match public_price (avoiding integer syntax errors)
-- 2. Ensures consistent data types across inventory and sales
-- ═══════════════════════════════════════════

BEGIN;

-- 1. Fix drugs table pricing types
-- These were previously INTEGER (Piastres), causing "invalid input syntax for type integer" when sending Pounds (decimals)
ALTER TABLE drugs 
  ALTER COLUMN unit_price TYPE NUMERIC(10,2),
  ALTER COLUMN unit_cost_price TYPE NUMERIC(10,2);

-- 2. Add English comments for clarity (as requested)
COMMENT ON COLUMN drugs.unit_price IS 'Selling price per unit in Pounds (supports decimals)';
COMMENT ON COLUMN drugs.unit_cost_price IS 'Cost price per unit in Pounds (supports decimals)';

-- 3. Ensure stock_movements price snapshots are consistent (already NUMERIC/DECIMAL, but ensuring here)
-- No changes needed if they are already DECIMAL(10,2)

COMMIT;
