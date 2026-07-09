-- Fix: The sync trigger lost design_settings when 20260619 re-defined the function
-- without including it. This migration restores design_settings to the sync.

CREATE OR REPLACE FUNCTION public.sync_user_profile_to_employees()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.employees
  SET photo = NEW.image,
      name = NEW.full_name,
      name_arabic = NEW.name_arabic,
      email = NEW.email,
      phone = NEW.phone,
      national_id_card = NEW.national_id_card,
      national_id_card_back = NEW.national_id_card_back,
      main_syndicate_card = NEW.main_syndicate_card,
      sub_syndicate_card = NEW.sub_syndicate_card,
      cover_style = NEW.cover_style,
      design_settings = NEW.design_settings
  WHERE auth_user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill: sync current user_profiles.design_settings into employees
UPDATE public.employees e
SET design_settings = p.design_settings
FROM public.user_profiles p
WHERE e.auth_user_id = p.id
  AND (e.design_settings IS DISTINCT FROM p.design_settings);

-- Fix: get_my_workspaces RPC was missing design_settings and cover_style columns
-- Must DROP first because adding OUT columns changes the return type
DROP FUNCTION IF EXISTS get_my_workspaces();
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
  cover_style             TEXT,
  design_settings         JSONB,
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
    e.cover_style,
    e.design_settings,
    e.created_at,
    e.updated_at
  FROM public.employees e
  LEFT JOIN public.organizations o ON o.id = e.org_id
  LEFT JOIN public.branches      b ON b.id = e.branch_id
  WHERE e.auth_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
