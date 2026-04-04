-- ═══════════════════════════════════════════
-- Multi-Tenant Architecture Migration
-- Adds Organization layer above Branches
-- ═══════════════════════════════════════════

-- ═══════════════════════════════════════════
-- New ENUM Types
-- ═══════════════════════════════════════════

CREATE TYPE org_role         AS ENUM ('owner', 'admin', 'member');
CREATE TYPE org_status       AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE subscription_plan   AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'trial', 'past_due', 'cancelled');

-- ═══════════════════════════════════════════
-- 1. Organizations Table (Tenant Root)
-- ═══════════════════════════════════════════

CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  owner_id    UUID NOT NULL REFERENCES auth.users(id),
  logo_url    TEXT,
  status      org_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orgs_owner ON organizations(owner_id);
CREATE INDEX idx_orgs_slug ON organizations(slug);

-- ═══════════════════════════════════════════
-- 2. Organization Members (User ↔ Org Link)
-- ═══════════════════════════════════════════

CREATE TABLE org_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        org_role NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);

-- ═══════════════════════════════════════════
-- 3. Subscriptions Table (Billing/Limits)
-- ═══════════════════════════════════════════

CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan            subscription_plan NOT NULL DEFAULT 'free',
  status          subscription_status NOT NULL DEFAULT 'trial',
  max_branches    INTEGER NOT NULL DEFAULT 1,
  max_employees   INTEGER NOT NULL DEFAULT 5,
  max_drugs       INTEGER NOT NULL DEFAULT 500,
  trial_ends_at   TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);

-- ═══════════════════════════════════════════
-- 4. Alter Branches — Add org_id
-- ═══════════════════════════════════════════

ALTER TABLE branches ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX idx_branches_org ON branches(org_id);

-- ═══════════════════════════════════════════
-- 5. Updated Helper Functions
-- ═══════════════════════════════════════════

-- Get all org IDs the current user belongs to
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get all branch IDs accessible to the current user (via org membership)
CREATE OR REPLACE FUNCTION get_user_branch_ids()
RETURNS SETOF UUID AS $$
  SELECT b.id FROM branches b
  WHERE b.org_id IN (SELECT get_user_org_ids());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Keep backward-compatible single-branch helper for existing code
-- Returns the first branch (used by employee-level users)
CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════
-- 6. RLS for New Tables
-- ═══════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Organizations: users can see orgs they belong to
CREATE POLICY org_member_access ON organizations
  FOR ALL USING (id IN (SELECT get_user_org_ids()));

-- Org Members: users can see members of orgs they belong to
CREATE POLICY org_member_list ON org_members
  FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Subscriptions: users can see subscription of their orgs
CREATE POLICY subscription_access ON subscriptions
  FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Branches: update to use org-aware access (drop old, create new)
-- Users can access branches in their organizations
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_isolation ON branches;
CREATE POLICY org_branch_access ON branches
  FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- ═══════════════════════════════════════════
-- 7. Update Existing RLS Policies
-- Replace single-branch isolation with org-aware multi-branch
-- ═══════════════════════════════════════════

-- Drop old single-branch policies
DROP POLICY IF EXISTS branch_isolation ON drugs;
DROP POLICY IF EXISTS branch_isolation ON stock_batches;
DROP POLICY IF EXISTS branch_isolation ON stock_movements;
DROP POLICY IF EXISTS branch_isolation ON sales;
DROP POLICY IF EXISTS branch_isolation ON sale_items;
DROP POLICY IF EXISTS branch_isolation ON sale_item_batches;
DROP POLICY IF EXISTS branch_isolation ON customers;
DROP POLICY IF EXISTS branch_isolation ON employees;
DROP POLICY IF EXISTS branch_isolation ON purchases;
DROP POLICY IF EXISTS branch_isolation ON purchase_items;
DROP POLICY IF EXISTS branch_isolation ON suppliers;
DROP POLICY IF EXISTS branch_isolation ON shifts;
DROP POLICY IF EXISTS branch_isolation ON cash_transactions;
DROP POLICY IF EXISTS branch_isolation ON audit_logs;
DROP POLICY IF EXISTS branch_isolation ON returns;
DROP POLICY IF EXISTS branch_isolation ON return_items;
DROP POLICY IF EXISTS branch_isolation ON purchase_returns;
DROP POLICY IF EXISTS branch_isolation ON purchase_return_items;

-- Create new org-aware policies (user sees all branches in their orgs)
CREATE POLICY tenant_isolation ON drugs          FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON stock_batches  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON stock_movements FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON sales          FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON sale_items     FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON sale_item_batches FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON customers      FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON employees      FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON purchases      FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON purchase_items FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON suppliers      FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON shifts         FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON cash_transactions FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON audit_logs     FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON returns        FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON return_items   FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON purchase_returns FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));
CREATE POLICY tenant_isolation ON purchase_return_items FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

-- ═══════════════════════════════════════════
-- 8. Triggers
-- ═══════════════════════════════════════════

CREATE TRIGGER handle_updated_at_organizations BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER handle_updated_at_subscriptions BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- ═══════════════════════════════════════════
-- 9. Add to Realtime Publication
-- ═══════════════════════════════════════════

BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE organizations, branches;
COMMIT;
