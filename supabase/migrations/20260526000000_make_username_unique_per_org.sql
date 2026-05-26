-- Migration: Make Username Unique Per Organization
-- Scopes the username uniqueness constraint to the organization level (org_id, username) instead of branch level.

BEGIN;

-- 1. Drop the old branch-scoped unique constraint on employees
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_branch_id_username_key;

-- 2. Drop the org-scoped unique constraint if it already exists to ensure idempotency
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_org_id_username_key;

-- 3. Add the new organization-scoped unique constraint on employees
ALTER TABLE public.employees ADD CONSTRAINT employees_org_id_username_key UNIQUE (org_id, username);

COMMIT;
