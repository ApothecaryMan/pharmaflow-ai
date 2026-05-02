-- ═══════════════════════════════════════════
-- Migration: Add STABLE to RLS Helper Functions
-- 
-- Problem: Without the STABLE volatility marker, PostgreSQL calls
-- get_my_orgs() and get_my_branches() once PER ROW during RLS evaluation.
-- On a table with 10,000 rows, that's 10,000 redundant calls to auth.uid()
-- and org_members lookups — all returning the same result.
--
-- Fix: STABLE tells the planner "this function's result won't change within
-- the same SQL statement", so it caches the result and reuses it.
--
-- Impact: Performance only — no security or data changes.
-- ═══════════════════════════════════════════

BEGIN;

-- Redefine get_my_orgs() with STABLE
CREATE OR REPLACE FUNCTION get_my_orgs()
RETURNS TABLE (org_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT m.org_id FROM public.org_members m WHERE m.user_id = auth.uid()
  UNION
  SELECT o.id FROM public.organizations o WHERE o.owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Redefine get_my_branches() with STABLE
CREATE OR REPLACE FUNCTION get_my_branches()
RETURNS TABLE (branch_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id FROM public.branches b WHERE b.org_id IN (SELECT org_id FROM get_my_orgs());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;
