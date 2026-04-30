-- Migration: Rename Drug Columns for Consistency
-- Created: 2026-04-30
-- Description: Renames 'name_arabic' to 'name_ar' to match the updated TypeScript interfaces.

-- 1. Update 'drugs' table (Inventory)
ALTER TABLE drugs RENAME COLUMN name_arabic TO name_ar;

-- 2. Update 'global_drugs' table (Master Catalog) if exists
-- Note: Check your specific table name for global catalog
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'global_drugs') THEN
        ALTER TABLE global_drugs RENAME COLUMN name_en TO name;
        ALTER TABLE global_drugs RENAME COLUMN name_arabic TO name_ar;
    END IF;
END $$;

-- 3. Update 'inventory_movements' or 'sales' if they have cached names
-- Add other tables if needed
