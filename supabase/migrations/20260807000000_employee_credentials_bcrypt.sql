-- Migration: Server-Side Employee Credential Verification (bcrypt)
-- Date: 2026-08-07
-- Description: Supersedes 20260620000000_verify_employee_credentials.sql.
--
-- Why this change:
--   * Password hashes are bcrypt ($2a$...), which is non-deterministic (random salt).
--     The old RPC compared hash-to-hash, which cannot work with bcrypt. The client
--     now sends the PLAIN password and the server verifies it with pgcrypto.crypt().
--   * No legacy SHA-256 path: employee passwords/PINs are reset to bcrypt by
--     20260807000001_reset_employee_passwords.sql before this contract matters.
--   * HARD CUTOVER: this RPC only accepts p_payload.password. Builds older than
--     this migration send `passwordHash` (SHA-256 hex) and will fail login
--     (`password_required`) — deploy the client update together with this migration.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.verify_employee_credentials(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_username TEXT := NULLIF(TRIM(p_payload->>'username'), '');
    -- NOTE: password is NOT trimmed. Spaces are significant in passwords; the
    -- write path hashes the raw value, so trimming here would reject a password
    -- that was stored with leading/trailing spaces (silent lockout).
    v_password TEXT := NULLIF(p_payload->>'password', '');
    v_branch_id UUID := NULLIF(p_payload->>'branchId', '')::UUID;
    v_employee RECORD;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- Validate inputs
    IF v_username IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'username_required');
    END IF;
    IF v_password IS NULL THEN
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

    -- Verify the stored bcrypt hash with crypt() (constant-time).
    -- Only `$2a$` is accepted: both hashPassword (via salt rewrite) and the reset
    -- migration force `$2a$`, and pgcrypto's crypt() reliably supports that variant.
    IF v_employee.password LIKE '$2a$%' THEN
        IF v_employee.password <> crypt(v_password, v_employee.password) THEN
            RETURN jsonb_build_object('success', false, 'error', 'invalid_credentials');
        END IF;
    ELSE
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