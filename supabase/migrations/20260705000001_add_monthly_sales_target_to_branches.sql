-- Migration: Add monthly_sales_target column to branches table
-- Description: Enables branch-specific monthly sales target stored on the server.
-- Created At: 2026-07-05

ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS monthly_sales_target DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN branches.monthly_sales_target IS 'Monthly sales target for this branch in EGP';
