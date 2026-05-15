-- Add sale_item_id to return_items table for traceability
ALTER TABLE return_items ADD COLUMN IF NOT EXISTS sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_return_items_sale_item ON return_items(sale_item_id);
