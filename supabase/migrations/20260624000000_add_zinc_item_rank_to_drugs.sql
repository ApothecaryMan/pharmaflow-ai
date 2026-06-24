-- Migration: Add zinc_item_rank to drugs table
-- Purpose: To enable custom ranking/priority for smart autocomplete suggestions in POS
-- Date: 2026-06-24

ALTER TABLE drugs 
ADD COLUMN IF NOT EXISTS zinc_item_rank INTEGER DEFAULT 0;

-- Optional: Create an index to speed up sorting by zinc_item_rank in the future
CREATE INDEX IF NOT EXISTS idx_drugs_zinc_item_rank ON drugs(zinc_item_rank DESC);
