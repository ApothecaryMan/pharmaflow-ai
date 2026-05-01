-- Migration to add missing location columns to suppliers table
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS governorate TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS area TEXT;

-- Update the create_supplier function to handle these columns (if not already handled)
-- (Actually the previous RPC already included them, so we just need the columns)
