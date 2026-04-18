-- Migration: Add Location Fields to Branches
-- Description: Adds governorate, city, and area columns to branches table to match UI and TypeScript types.

ALTER TABLE branches ADD COLUMN IF NOT EXISTS governorate TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS area TEXT;
