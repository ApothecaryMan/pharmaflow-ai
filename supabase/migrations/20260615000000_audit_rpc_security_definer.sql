-- Migration: 20260615000000_audit_rpc_security_definer
-- Description: Create a SECURITY DEFINER RPC for login_audits INSERT.
-- This bypasses RLS so audit writes never fail due to session timing or missing org membership.
-- The function is callable by any authenticated user but enforces auth.uid() internally.

CREATE OR REPLACE FUNCTION log_audit_event(
  p_username      TEXT,
  p_employee_id   TEXT      DEFAULT NULL,
  p_employee_code TEXT      DEFAULT NULL,
  p_employee_name TEXT      DEFAULT NULL,
  p_role          TEXT      DEFAULT NULL,
  p_branch_id     UUID      DEFAULT NULL,
  p_org_id        UUID      DEFAULT NULL,
  p_action        TEXT      DEFAULT NULL,
  p_details       TEXT      DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER          -- bypasses RLS
SET search_path = public  -- security best practice for DEFINER functions
AS $$
BEGIN
  INSERT INTO public.login_audits (
    username,
    employee_id,
    employee_code,
    employee_name,
    role,
    branch_id,
    org_id,
    action,
    details,
    user_id
  ) VALUES (
    p_username,
    p_employee_id,
    p_employee_code,
    p_employee_name,
    p_role,
    p_branch_id,
    p_org_id,
    p_action,
    p_details,
    auth.uid()  -- auto-capture the calling user, even if session is still propagating
  );
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION log_audit_event FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;
