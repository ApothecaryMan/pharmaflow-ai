-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  PHARMAFLOW AI - ULTIMATE MASTER SETUP SCRIPT (2026-04-24)  ║
-- ║  Includes: Schema, Recursion-Free RLS, and Auto-Employee    ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════
-- 1. EXTENSIONS & TYPES
-- ═══════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'branch_status') THEN
        CREATE TYPE branch_status AS ENUM ('active', 'inactive');
        CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'holiday');
        CREATE TYPE employee_dept AS ENUM ('sales', 'pharmacy', 'marketing', 'hr', 'it', 'logistics');
        CREATE TYPE employee_role AS ENUM ('admin', 'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 'inventory_officer', 'assistant', 'hr_manager', 'cashier', 'senior_cashier', 'delivery', 'delivery_pharmacist', 'officeboy', 'manager');
        CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');
        CREATE TYPE org_status AS ENUM ('active', 'suspended', 'deleted');
        CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'pro', 'enterprise');
        CREATE TYPE subscription_status AS ENUM ('active', 'trial', 'past_due', 'cancelled');
    END IF;
END $$;

-- ═══════════════════════════════════════════
-- 2. CORE TABLES
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url    TEXT,
  status      org_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL UNIQUE,
  address       TEXT,
  phone         TEXT,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  status        branch_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.org_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        org_role NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan            subscription_plan NOT NULL DEFAULT 'free',
  status          subscription_status NOT NULL DEFAULT 'trial',
  max_branches    INTEGER NOT NULL DEFAULT 1,
  max_employees   INTEGER NOT NULL DEFAULT 5,
  max_drugs       INTEGER NOT NULL DEFAULT 500,
  trial_ends_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

CREATE TABLE IF NOT EXISTS public.employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  auth_user_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_code   TEXT NOT NULL,
  name            TEXT NOT NULL,
  name_arabic     TEXT,
  phone           TEXT,
  email           TEXT,
  position        TEXT NOT NULL,
  department      employee_dept NOT NULL DEFAULT 'pharmacy',
  role            employee_role NOT NULL DEFAULT 'admin',
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  status          employee_status NOT NULL DEFAULT 'active',
  salary          NUMERIC(10,2),
  username        TEXT,
  photo           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 3. CORE RPC FUNCTIONS (Auto-Onboarding)
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.setup_initial_organization(
  p_name TEXT,
  p_owner_id UUID,
  p_slug TEXT,
  p_plan TEXT DEFAULT 'starter'
) RETURNS JSONB AS $$
DECLARE
  v_org RECORD;
  v_branch RECORD;
  v_member RECORD;
  v_sub RECORD;
  v_emp RECORD;
  v_max_branches INT;
  v_max_employees INT;
  v_max_drugs INT;
BEGIN
  -- Determine limits based on plan
  IF p_plan = 'free' THEN
    v_max_branches := 1; v_max_employees := 3; v_max_drugs := 100;
  ELSIF p_plan = 'pro' THEN
    v_max_branches := 5; v_max_employees := 20; v_max_drugs := 5000;
  ELSIF p_plan = 'enterprise' THEN
    v_max_branches := 99; v_max_employees := 999; v_max_drugs := 99999;
  ELSE -- starter (default)
    v_max_branches := 1; v_max_employees := 10; v_max_drugs := 1000;
  END IF;

  -- 1. Create Organization
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (p_name, p_slug, p_owner_id)
  RETURNING * INTO v_org;

  -- 2. Create Owner Membership
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_org.id, p_owner_id, 'owner')
  RETURNING * INTO v_member;

  -- 3. Create Subscription
  INSERT INTO public.subscriptions (
    org_id, plan, status, trial_ends_at, 
    max_branches, max_employees, max_drugs
  )
  VALUES (
    v_org.id, p_plan, 'trial', now() + interval '14 days',
    v_max_branches, v_max_employees, v_max_drugs
  )
  RETURNING * INTO v_sub;

  -- 4. Auto-create Main Branch
  INSERT INTO public.branches (org_id, name, code, status)
  VALUES (v_org.id, 'الفرع الرئيسي', 'MAIN-01', 'active')
  RETURNING * INTO v_branch;

  -- 5. Auto-create Employee for Owner
  INSERT INTO public.employees (
    org_id, branch_id, auth_user_id, employee_code, name, position, role, username, status, department
  )
  VALUES (
    v_org.id, v_branch.id, p_owner_id, 'OWNER-001', 'د. ' || p_name, 'المدير العام', 'admin', 'admin', 'active', 'pharmacy'
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET 
    org_id = EXCLUDED.org_id,
    branch_id = EXCLUDED.branch_id,
    status = 'active'
  RETURNING * INTO v_emp;

  RETURN jsonb_build_object(
    'org', to_jsonb(v_org),
    'branch', to_jsonb(v_branch),
    'membership', to_jsonb(v_member),
    'subscription', to_jsonb(v_sub),
    'employee', to_jsonb(v_emp)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.setup_initial_organization(TEXT, UUID, TEXT) TO authenticated;

-- ═══════════════════════════════════════════
-- 4. RECURSION-FREE RLS POLICIES
-- ═══════════════════════════════════════════

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Organizations: Direct check on owner_id or org_members
DROP POLICY IF EXISTS org_access_policy ON public.organizations;
CREATE POLICY org_access_policy ON public.organizations
FOR ALL USING (
  owner_id = auth.uid() OR 
  id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
);

-- Org Members: Avoid self-querying org_members recursively
DROP POLICY IF EXISTS org_member_access_self ON public.org_members;
DROP POLICY IF EXISTS org_member_owner_access ON public.org_members;
CREATE POLICY org_member_access_self ON public.org_members FOR ALL USING (user_id = auth.uid());
CREATE POLICY org_member_owner_access ON public.org_members
FOR ALL USING (org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

-- Branches: Use organizations or org_members
DROP POLICY IF EXISTS branch_access_policy ON public.branches;
CREATE POLICY branch_access_policy ON public.branches
FOR ALL USING (
  org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()) OR
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
);

-- Employees
DROP POLICY IF EXISTS employee_access_policy ON public.employees;
CREATE POLICY employee_access_policy ON public.employees
FOR ALL USING (
  auth_user_id = auth.uid() OR
  org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()) OR
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
);


