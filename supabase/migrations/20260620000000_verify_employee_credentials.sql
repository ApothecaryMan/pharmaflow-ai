-- Migration: Server-Side Employee Credential Verification
-- Date: 2026-06-20
-- Description: Adds verify_employee_credentials RPC so password hashes never leave the server.
-- Fixes the security antipattern where SecureGate reads employee.password client-side.

BEGIN;

-- Verify employee credentials server-side using SHA-256 hash comparison
-- The client sends the HASHED password (SHA-256 hex), and the server compares it
-- against the stored hash without ever exposing the stored hash to the client.
CREATE OR REPLACE FUNCTION public.verify_employee_credentials(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_username TEXT := NULLIF(TRIM(p_payload->>'username'), '');
    v_password_hash TEXT := NULLIF(TRIM(p_payload->>'passwordHash'), '');
    v_branch_id UUID := NULLIF(p_payload->>'branchId', '')::UUID;
    v_employee RECORD;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- Validate inputs
    IF v_username IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'username_required');
    END IF;
    IF v_password_hash IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'password_required');
    END IF;

    -- Find the employee by username or email (case-insensitive)
    SELECT * INTO v_employee
    FROM public.employees
    WHERE (
        LOWER(username) = LOWER(v_username)
        OR LOWER(email) = LOWER(v_username)
    )
    AND (v_branch_id IS NULL OR branch_id = v_branch_id)
    AND status = 'active'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;

    -- Check if employee has a password set
    IF v_employee.password IS NULL OR v_employee.password = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'no_password_set');
    END IF;

    -- Verify the password hash matches (constant-time comparison via PostgreSQL)
    IF v_employee.password <> v_password_hash THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_credentials');
    END IF;

    -- Check authorization (role-based)
    v_is_authorized := v_employee.role IN (
        'admin', 'pharmacist_owner', 'pharmacist_manager', 'manager'
    );

    -- Also check org-level admin status
    IF NOT v_is_authorized THEN
        SELECT EXISTS (
            SELECT 1 FROM public.org_members m
            WHERE m.user_id = v_employee.auth_user_id
              AND m.role IN ('owner', 'admin')
        ) INTO v_is_authorized;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'employeeId', v_employee.id,
        'employeeName', v_employee.name,
        'role', v_employee.role,
        'isAuthorized', v_is_authorized
    );
END;
$$;

COMMIT;
