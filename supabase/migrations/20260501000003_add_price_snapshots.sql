ALTER TABLE stock_movements
ADD COLUMN public_price_snapshot DECIMAL(10, 2),
ADD COLUMN unit_price_snapshot DECIMAL(10, 2),
ADD COLUMN cost_price_snapshot DECIMAL(10, 2),
ADD COLUMN unit_cost_price_snapshot DECIMAL(10, 2);
