-- Migration: 20260705000000_fix_audit_rpc_employee_id_type
-- Description: Fixes p_employee_id parameter type from TEXT to UUID in log_audit_event RPC
-- to prevent 42804 Datatype Mismatch when inserting into login_audits.employee_id (which is UUID).

CREATE OR REPLACE FUNCTION log_audit_event(
  p_username      TEXT,
  p_employee_id   UUID      DEFAULT NULL,
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
SECURITY DEFINER
SET search_path = public
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
    auth.uid()
  );
END;
$$;
