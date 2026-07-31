-- =============================================================================
-- Security Hardening Migration
-- Fixes all critical, high, and medium security vulnerabilities
-- identified in the ZINC Supabase security audit (2026-07-30)
-- =============================================================================

-- =============================================================================
-- PHASE 1: Enable RLS on drug_sales_aggregate
-- CRITICAL — table is publicly queryable without any row filtering
-- =============================================================================

ALTER TABLE public.drug_sales_aggregate ENABLE ROW LEVEL SECURITY;

-- Authenticated users can only see aggregate data for their own orgs
CREATE POLICY "Org members can view drug sales aggregates"
ON public.drug_sales_aggregate FOR SELECT
TO authenticated
USING (org_id IN (SELECT public.get_user_org_ids()));

-- Only internal processes (SECURITY DEFINER trigger: update_drug_sales_aggregate)
-- should write to this table. Block all direct user writes.
CREATE POLICY "No direct inserts to drug sales aggregate"
ON public.drug_sales_aggregate FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No direct updates to drug sales aggregate"
ON public.drug_sales_aggregate FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No direct deletes from drug sales aggregate"
ON public.drug_sales_aggregate FOR DELETE
TO authenticated
USING (false);


-- =============================================================================
-- PHASE 2: Fix permissive 'true' RLS policies
-- CRITICAL — these policies effectively bypass Row Level Security
-- =============================================================================

-- ─── attendance_events ───────────────────────────────────────────────────────
-- Current: attendance_org_policy (ALL, public, USING true, WITH CHECK true)
-- Fix: Replace with org-scoped policies

DROP POLICY IF EXISTS "attendance_org_policy" ON public.attendance_events;

CREATE POLICY "Org members can view attendance events"
ON public.attendance_events FOR SELECT
TO authenticated
USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Org members can insert attendance events"
ON public.attendance_events FOR INSERT
TO authenticated
WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

-- Attendance events are an immutable audit trail — no updates or deletes
CREATE POLICY "No updates on attendance events"
ON public.attendance_events FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No deletes on attendance events"
ON public.attendance_events FOR DELETE
TO authenticated
USING (false);


-- ─── holidays ────────────────────────────────────────────────────────────────
-- holidays is global reference data (no org_id column)
-- Current: "Allow authenticated users to write holidays" (ALL, authenticated, USING true)
-- Fix: Only admins/owners can write. Public read stays (already exists as separate policy).

DROP POLICY IF EXISTS "Allow authenticated users to write holidays" ON public.holidays;

CREATE POLICY "Only admins can manage holidays"
ON public.holidays FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin')
  )
);


-- ─── login_audits ────────────────────────────────────────────────────────────
-- Drop 4 overly permissive policies:
-- 1. "Allow audit log inserts" (INSERT, authenticated, WITH CHECK true)
-- 2. "Users insert own audit logs" (INSERT, authenticated, WITH CHECK true)
-- 3. "Admins read audit logs" (SELECT, authenticated, USING true) — misleading name
-- 4. "Users can insert logs" (INSERT, public, WITH CHECK auth.role()='authenticated')
--    ^ This bypasses org scoping via PERMISSIVE OR with any new org-scoped policy

DROP POLICY IF EXISTS "Allow audit log inserts" ON public.login_audits;
DROP POLICY IF EXISTS "Users insert own audit logs" ON public.login_audits;
DROP POLICY IF EXISTS "Admins read audit logs" ON public.login_audits;
DROP POLICY IF EXISTS "Users can insert logs" ON public.login_audits;

-- Add properly scoped insert policy
-- Note: Most inserts go through log_audit_event() SECURITY DEFINER which bypasses RLS.
-- This policy covers any direct inserts.
CREATE POLICY "Org members can insert audit logs"
ON public.login_audits FOR INSERT
TO authenticated
WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

-- Existing kept policies:
-- "Authenticated read audit logs" → SELECT, authenticated, USING (org_id IN get_user_org_ids()) ✓
-- "Admins can view all logs" → SELECT, public, USING (EXISTS org_members owner/admin check) ✓
-- "No deletes on audit logs" → DELETE, authenticated, USING (false) ✓
-- "No updates on audit logs" → UPDATE, authenticated, USING (false) ✓


-- =============================================================================
-- PHASE 3: Revoke anon EXECUTE from SECURITY DEFINER functions
-- CRITICAL — 71 functions callable without authentication
-- =============================================================================

-- Strategy:
--   1. Revoke PUBLIC + anon from ALL SECURITY DEFINER functions
--   2. Re-grant to authenticated for RPC-callable functions
--   3. Trigger-only functions get NO user-level execute (triggers fire as owner)

DO $$
DECLARE
  fn record;
  -- Trigger-only functions: invoked by DB triggers, never via RPC
  -- Safe to revoke from authenticated — triggers fire as the function owner
  trigger_fns text[] := ARRAY[
    'auto_create_employee_stats',
    'fn_log_stock_movement',
    'fn_populate_org_id',
    'handle_new_user',
    'sync_global_catalog_to_new_branch',
    'sync_new_global_drug_to_all_branches',
    'sync_new_global_drug_to_approvals',
    'sync_user_profile_to_employees',
    'update_drug_sales_aggregate',
    'update_employee_stats_on_return',
    'update_employee_stats_on_sale',
    'update_employee_stats_on_sale_item',
    'update_employee_stats_on_shift'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    -- Revoke from PUBLIC (default grant) and anon
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      fn.proname, fn.args
    );

    -- Re-grant to authenticated for non-trigger functions (RPC-callable)
    IF fn.proname != ALL(trigger_fns) THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
        fn.proname, fn.args
      );
    END IF;
  END LOOP;
END $$;

-- Secure-by-default: prevent future functions from being auto-executable by PUBLIC
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO authenticated;


-- =============================================================================
-- PHASE 4: Fix search_path on SECURITY DEFINER functions
-- HIGH — search_path hijacking vulnerability on 44 functions
-- =============================================================================

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND (p.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
    ))
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public',
      fn.proname, fn.args
    );
  END LOOP;
END $$;



-- =============================================================================
-- PHASE 5: pg_net extension
-- NOTE: pg_net does NOT support SET SCHEMA — this is a known limitation.
-- The extension must remain in the public schema. This is a low-risk issue
-- as pg_net's API surface is minimal (http request functions).
-- =============================================================================
-- Skipped: ALTER EXTENSION pg_net SET SCHEMA extensions;

