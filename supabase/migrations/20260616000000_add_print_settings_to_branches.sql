-- Migration: Add print_settings JSONB field to branches
-- This enables saving branch-specific print templates (receipts, labels) 
-- directly in the database instead of local storage to prevent bloat and enable syncing.

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS print_settings JSONB DEFAULT '{}'::jsonb;
