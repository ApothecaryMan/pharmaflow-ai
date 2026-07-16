-- ═══════════════════════════════════════════
-- Migration: Fix RLS Infinite Recursion
-- 
-- Problem: 'get_user_org_ids' and 'get_user_branch_ids' were defined as 
-- 'LANGUAGE sql SECURITY DEFINER'. Postgres can inline SQL functions, causing 
-- them to execute with the caller's privileges instead of the owner's (SECURITY DEFINER).
-- This triggers the RLS policy on 'org_members' recursively, causing a 42P17 error.
--
-- Fix: Redefine the functions using 'LANGUAGE plpgsql' to prevent inlining.
-- ═══════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT org_id FROM public.org_members WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_branch_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT b.id FROM public.branches b
  WHERE b.org_id IN (SELECT get_user_org_ids());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;
