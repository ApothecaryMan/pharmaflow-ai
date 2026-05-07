-- Migration: Add delivery_fee column to branches table
-- Description: Enables branch-specific delivery fee configuration stored on the server.
-- Created At: 2026-05-07

ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 5.00;

-- Optional: Comment on the column for documentation
COMMENT ON COLUMN branches.delivery_fee IS 'The default and minimum delivery fee for this branch in EGP';
