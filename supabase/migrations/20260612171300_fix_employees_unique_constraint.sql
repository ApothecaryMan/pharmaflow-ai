-- ═══════════════════════════════════════════
-- Migration: Fix Employees Unique Constraint
-- ═══════════════════════════════════════════

BEGIN;

-- Drop the global unique constraint on auth_user_id that prevents 
-- users from joining multiple organizations
ALTER TABLE public.employees 
  DROP CONSTRAINT IF EXISTS employees_auth_user_id_key;

-- Add a composite unique constraint so a user can only have one employee profile per organization
ALTER TABLE public.employees 
  ADD CONSTRAINT employees_org_id_auth_user_id_key UNIQUE (org_id, auth_user_id);

COMMIT;
