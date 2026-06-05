-- ═══════════════════════════════════════════
-- Migration: Employee Portal — RPC for Workspace Data
-- Instead of granting SELECT on organizations/branches (which causes
-- an RLS circular dependency), we expose a SECURITY DEFINER RPC that
-- returns the employee's own workspace rows with org/branch names joined.
-- ═══════════════════════════════════════════

-- 1. Clean up the old broken RLS policies that were already pushed
DROP POLICY IF EXISTS "Employees can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Employees can view their branches" ON public.branches;

-- 2. Create the RPC function
CREATE OR REPLACE FUNCTION get_my_workspaces()
RETURNS TABLE (
  id                      UUID,
  org_id                  UUID,
  org_name                TEXT,
  branch_id               UUID,
  branch_name             TEXT,
  employee_code           TEXT,
  "name"                  TEXT,
  name_arabic             TEXT,
  phone                   TEXT,
  email                   TEXT,
  "position"              TEXT,
  department              TEXT,
  "role"                  TEXT,
  start_date              DATE,
  status                  TEXT,
  salary                  NUMERIC,
  notes                   TEXT,
  username                TEXT,
  auth_user_id            UUID,
  "password"              TEXT,
  biometric_credential_id TEXT,
  biometric_public_key    TEXT,
  photo                   TEXT,
  national_id_card        TEXT,
  national_id_card_back   TEXT,
  main_syndicate_card     TEXT,
  sub_syndicate_card      TEXT,
  created_at              TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.org_id,
    o.name        AS org_name,
    e.branch_id,
    b.name        AS branch_name,
    e.employee_code,
    e.name,
    e.name_arabic,
    e.phone,
    e.email,
    e.position,
    e.department::TEXT,
    e.role::TEXT,
    e.start_date,
    e.status::TEXT,
    e.salary,
    e.notes,
    e.username,
    e.auth_user_id,
    e.password,
    e.biometric_credential_id,
    e.biometric_public_key,
    e.photo,
    e.national_id_card,
    e.national_id_card_back,
    e.main_syndicate_card,
    e.sub_syndicate_card,
    e.created_at,
    e.updated_at
  FROM public.employees e
  LEFT JOIN public.organizations o ON o.id = e.org_id
  LEFT JOIN public.branches      b ON b.id = e.branch_id
  WHERE e.auth_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
