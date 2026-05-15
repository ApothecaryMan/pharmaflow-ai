-- Add expiry_date to return_items table
ALTER TABLE return_items ADD COLUMN IF NOT EXISTS expiry_date DATE;
