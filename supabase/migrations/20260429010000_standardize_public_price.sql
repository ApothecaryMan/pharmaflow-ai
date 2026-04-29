-- Migration: Standardize Pricing Fields to public_price
-- Description: Renames legacy 'price' columns across all tables to 'public_price' and migrates JSONB data.
-- Date: 2026-04-29

BEGIN;

-- 1. Standardize 'drugs' table
ALTER TABLE drugs RENAME COLUMN price TO public_price;

-- 2. Standardize 'sale_items' table
ALTER TABLE sale_items RENAME COLUMN price TO public_price;

-- 3. Standardize 'purchase_items' table
ALTER TABLE purchase_items RENAME COLUMN sale_price TO public_price;

-- 4. Standardize 'return_items' table
ALTER TABLE return_items RENAME COLUMN original_price TO public_price;

-- 5. Migrate JSONB items in 'sales' table
-- This query renames 'price', 'salePrice', or 'originalPrice' keys to 'publicPrice' inside the items array.
UPDATE sales
SET items = (
  SELECT jsonb_agg(
    CASE 
      WHEN item ? 'price' THEN (item - 'price') || jsonb_build_object('publicPrice', item->'price')
      WHEN item ? 'salePrice' THEN (item - 'salePrice') || jsonb_build_object('publicPrice', item->'salePrice')
      WHEN item ? 'originalPrice' THEN (item - 'originalPrice') || jsonb_build_object('publicPrice', item->'originalPrice')
      ELSE item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE items IS NOT NULL AND jsonb_typeof(items) = 'array' AND (
  EXISTS (SELECT 1 FROM jsonb_array_elements(items) AS item WHERE item ? 'price') OR
  EXISTS (SELECT 1 FROM jsonb_array_elements(items) AS item WHERE item ? 'salePrice') OR
  EXISTS (SELECT 1 FROM jsonb_array_elements(items) AS item WHERE item ? 'originalPrice')
);

-- 6. Migrate JSONB items in 'purchases' table
-- Same logic as sales, ensuring 'publicPrice' is standardized in purchase order items.
UPDATE purchases
SET items = (
  SELECT jsonb_agg(
    CASE 
      WHEN item ? 'price' THEN (item - 'price') || jsonb_build_object('publicPrice', item->'price')
      WHEN item ? 'salePrice' THEN (item - 'salePrice') || jsonb_build_object('publicPrice', item->'salePrice')
      WHEN item ? 'originalPrice' THEN (item - 'originalPrice') || jsonb_build_object('publicPrice', item->'originalPrice')
      ELSE item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE items IS NOT NULL AND jsonb_typeof(items) = 'array' AND (
  EXISTS (SELECT 1 FROM jsonb_array_elements(items) AS item WHERE item ? 'price') OR
  EXISTS (SELECT 1 FROM jsonb_array_elements(items) AS item WHERE item ? 'salePrice') OR
  EXISTS (SELECT 1 FROM jsonb_array_elements(items) AS item WHERE item ? 'originalPrice')
);

-- 7. Add comments for clarity
COMMENT ON COLUMN drugs.public_price IS 'Selling price per pack/unit (public price)';
COMMENT ON COLUMN sale_items.public_price IS 'Price at which the item was sold';
COMMENT ON COLUMN purchase_items.public_price IS 'Suggested selling price at time of purchase';
COMMENT ON COLUMN return_items.public_price IS 'Original selling price of the item being returned';

COMMIT;
