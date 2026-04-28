-- Migration: Add unit pricing for precision math
-- Description: Adds unit_price and unit_cost_price columns to drugs table
-- Date: 2026-04-25

ALTER TABLE drugs 
ADD COLUMN IF NOT EXISTS unit_price INTEGER,
ADD COLUMN IF NOT EXISTS unit_cost_price INTEGER;

COMMENT ON COLUMN drugs.unit_price IS 'Selling price per unit in Piastres (manual entry)';
COMMENT ON COLUMN drugs.unit_cost_price IS 'Cost price per unit in Piastres (manual entry)';

-- Optional: Backfill existing data if unitsPerPack exists
-- UPDATE drugs 
-- SET unit_price = ROUND(price / NULLIF(unitsPerPack, 0)) 
-- WHERE unit_price IS NULL AND unitsPerPack > 0;
