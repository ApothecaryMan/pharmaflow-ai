-- ============================================================
-- Migration: Atomic session upsert via RPC
-- Replaces the client-side SELECT→UPDATE/INSERT race condition
-- with a single atomic database operation.
-- ============================================================

-- 0. Clean up existing duplicates before creating the unique index
-- Keep only the most recently seen session for each (user_id, user_agent)
UPDATE public.user_active_sessions
SET is_active = false, logged_out_at = now()
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           row_number() OVER (PARTITION BY user_id, user_agent ORDER BY last_seen_at DESC) as rn
    FROM public.user_active_sessions
    WHERE is_active = true
  ) t
  WHERE t.rn > 1
);

-- 1. Partial unique index: one active session per (user_id, user_agent)
-- This is the foundation that makes ON CONFLICT work correctly.
-- Only enforced on active sessions — inactive (logged out) sessions are historical.
CREATE UNIQUE INDEX IF NOT EXISTS idx_uas_unique_active_session
  ON public.user_active_sessions(user_id, user_agent)
  WHERE is_active = true;


-- 2. Atomic upsert RPC — does INSERT ON CONFLICT UPDATE in one round-trip
-- SECURITY DEFINER bypasses RLS, so we enforce auth manually.
CREATE OR REPLACE FUNCTION public.upsert_active_session(
  p_user_id    uuid,
  p_org_id     uuid    DEFAULT NULL,
  p_branch_id  uuid    DEFAULT NULL,
  p_employee_id uuid   DEFAULT NULL,
  p_device_info text   DEFAULT NULL,
  p_user_agent  text   DEFAULT NULL,
  p_ip_address  text   DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Authorization: caller must own the session they're registering
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized to register a session for this user';
  END IF;

  INSERT INTO public.user_active_sessions (
    user_id, org_id, branch_id, employee_id,
    device_info, user_agent, ip_address,
    is_active, last_seen_at
  )
  VALUES (
    p_user_id, p_org_id, p_branch_id, p_employee_id,
    p_device_info, p_user_agent, p_ip_address,
    true, now()
  )
  ON CONFLICT (user_id, user_agent) WHERE is_active = true
  DO UPDATE SET
    org_id       = EXCLUDED.org_id,
    branch_id    = EXCLUDED.branch_id,
    employee_id  = EXCLUDED.employee_id,
    device_info  = COALESCE(EXCLUDED.device_info, user_active_sessions.device_info),
    ip_address   = COALESCE(EXCLUDED.ip_address,  user_active_sessions.ip_address),
    last_seen_at = now()
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_active_session(uuid, uuid, uuid, uuid, text, text, text) TO authenticated;


-- 3. Harden ping_session: add auth check + SET search_path
-- The original (from 20260703) was SECURITY DEFINER without either.
-- Auth is enforced via WHERE clause — single UPDATE, no extra SELECT.
CREATE OR REPLACE FUNCTION public.ping_session(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleaned integer := 0;
BEGIN
  -- Update only if the caller owns this session (auth check + update in one query)
  UPDATE public.user_active_sessions
  SET last_seen_at = now()
  WHERE id = p_session_id AND user_id = auth.uid() AND is_active = true;

  -- Opportunistic cleanup: ~1% chance per ping to clean stale sessions
  -- This distributes cleanup load across all devices instead of a single cron
  IF random() < 0.01 THEN
    UPDATE public.user_active_sessions
    SET is_active = false, logged_out_at = now()
    WHERE is_active = true AND last_seen_at < now() - interval '24 hours';

    GET DIAGNOSTICS v_cleaned = ROW_COUNT;
  END IF;

  RETURN v_cleaned;
END;
$$;

-- 4. Harden cleanup_stale_sessions: add SET search_path
CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.user_active_sessions
  SET 
    is_active = false,
    logged_out_at = now()
  WHERE 
    is_active = true 
    AND last_seen_at < now() - interval '24 hours';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
