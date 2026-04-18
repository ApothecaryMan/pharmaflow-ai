-- Migration: Fix RLS helpers + case-insensitive username lookup
-- Fixes:
--   1. get_user_org_ids() — include orgs where user is owner (not just member)
--   2. get_email_by_username() — case-insensitive comparison to match frontend normalization

-- ═══════════════════════════════════════════
-- 1. Fix get_user_org_ids() to include org owners
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
  UNION
  SELECT id FROM public.organizations WHERE owner_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════
-- 2. Fix get_email_by_username() — case-insensitive
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM public.employees
  WHERE LOWER(username) = LOWER(p_username) 
     OR LOWER(employee_code) = LOWER(p_username)
  LIMIT 1;
  
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
