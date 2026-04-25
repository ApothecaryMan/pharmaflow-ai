-- ═══════════════════════════════════════════
-- Migration: Fix Branch Schema & Recursion-Free RLS
-- Adds missing location columns and stabilizes onboarding permissions
-- ═══════════════════════════════════════════

BEGIN;

-- 1. Add missing location columns to branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS governorate TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS area TEXT;

-- 2. Create recursion-free helper function
-- This function bypasses RLS to break circular dependency loops
CREATE OR REPLACE FUNCTION get_my_orgs()
RETURNS TABLE (org_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT m.org_id FROM public.org_members m WHERE m.user_id = auth.uid()
  UNION
  SELECT o.id FROM public.organizations o WHERE o.owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reset and Apply Clean RLS Policies
-- Clear all potential conflicting policies
DROP POLICY IF EXISTS org_access_policy ON organizations;
DROP POLICY IF EXISTS org_member_access_policy ON org_members;
DROP POLICY IF EXISTS org_member_access_self ON org_members;
DROP POLICY IF EXISTS org_member_owner_access ON org_members;
DROP POLICY IF EXISTS org_member_list ON org_members;
DROP POLICY IF EXISTS branch_access_policy ON branches;
DROP POLICY IF EXISTS org_branch_access ON branches;

-- Organizations: Access if owner or member
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_access_policy ON organizations
FOR ALL USING (id IN (SELECT get_my_orgs()));

-- Org Members: Access to memberships in user's organizations
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_member_access ON org_members
FOR ALL USING (org_id IN (SELECT get_my_orgs()));

-- Branches: Access to branches in user's organizations
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_access_policy ON branches
FOR ALL USING (org_id IN (SELECT get_my_orgs()));

-- 4. Ensure table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

COMMIT;
