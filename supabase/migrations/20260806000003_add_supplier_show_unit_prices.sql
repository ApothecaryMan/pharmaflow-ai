-- Add show_unit_prices toggle to suppliers table
ALTER TABLE suppliers
ADD COLUMN show_unit_prices BOOLEAN DEFAULT false;
