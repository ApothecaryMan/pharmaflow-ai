-- Add item_returned_quantities to sales table to track returns at item level
-- This prevents returning the same item multiple times and ensures inventory integrity.

ALTER TABLE sales ADD COLUMN IF NOT EXISTS item_returned_quantities JSONB DEFAULT '{}'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN sales.item_returned_quantities IS 'Stores a mapping of item line keys to their total returned quantities (e.g., {"drug_id_pack": 2}).';
