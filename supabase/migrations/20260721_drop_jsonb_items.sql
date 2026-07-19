-- ============================================================
-- Phase 3c: Drop JSONB items columns
-- WARNING: ONLY RUN AFTER PHASE 3b IS VERIFIED WORKING
-- ============================================================

BEGIN;

ALTER TABLE purchases DROP COLUMN IF EXISTS items;
ALTER TABLE sales DROP COLUMN IF EXISTS items;

COMMIT;
