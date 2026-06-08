-- Migration: 20260608000000_login_audits_rls_policies
-- Description: Add user_id tracking column and RLS policies to login_audits table.
-- Previously only GRANT was applied (20260604130000) but RLS policies were missing,
-- causing 42501 permission denied errors on INSERT.

-- Step 1: Add user_id column with auto-populated default from auth context
ALTER TABLE public.login_audits 
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

-- Step 2: Enable RLS (idempotent — safe if already enabled)
ALTER TABLE public.login_audits ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop any conflicting policies first (idempotent)
DROP POLICY IF EXISTS "Users insert own audit logs" ON public.login_audits;
DROP POLICY IF EXISTS "No updates on audit logs" ON public.login_audits;
DROP POLICY IF EXISTS "No deletes on audit logs" ON public.login_audits;
DROP POLICY IF EXISTS "Authenticated read audit logs" ON public.login_audits;

-- Step 4: INSERT — any authenticated user can write audit logs
CREATE POLICY "Users insert own audit logs"
ON public.login_audits FOR INSERT TO authenticated
WITH CHECK (true);

-- Step 5: UPDATE — audit logs are immutable
CREATE POLICY "No updates on audit logs"
ON public.login_audits FOR UPDATE TO authenticated
USING (false);

-- Step 6: DELETE — audit logs are immutable
CREATE POLICY "No deletes on audit logs"
ON public.login_audits FOR DELETE TO authenticated
USING (false);

-- Step 7: SELECT — any authenticated user can read (app filters by branch in code)
CREATE POLICY "Authenticated read audit logs"
ON public.login_audits FOR SELECT TO authenticated
USING (true);
