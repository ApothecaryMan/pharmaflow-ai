-- ============================================================
-- Migration: Optimize session system for scalability
-- Adds indexes, cleanup function, and optimized heartbeat RPC
-- ============================================================

-- 1. Composite indexes for faster session queries
-- -------------------------------------------------
-- The RLS subquery already benefits from idx_emp_auth_uid.
-- These additional indexes speed up the main query patterns.

-- Composite index for filtered scans: is_active + user_id
CREATE INDEX IF NOT EXISTS idx_uas_active_user 
  ON public.user_active_sessions(is_active, user_id) 
  WHERE is_active = true;

-- Index for employee-based lookups (EmployeeSessionsTab)
CREATE INDEX IF NOT EXISTS idx_uas_active_employee 
  ON public.user_active_sessions(is_active, employee_id) 
  WHERE is_active = true;

-- Index for heartbeat updates (pingSession)
CREATE INDEX IF NOT EXISTS idx_uas_last_seen 
  ON public.user_active_sessions(last_seen_at) 
  WHERE is_active = true;


-- 2. Cleanup function: deactivate stale sessions
-- ------------------------------------------------
-- Sessions with last_seen_at > 24 hours ago are considered abandoned.
-- This prevents orphan sessions from accumulating.

CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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


-- 3. Optimized heartbeat RPC
-- ---------------------------
-- Single RPC call that pings the session AND cleans up stale sessions
-- in one database round-trip. Returns the number of stale sessions cleaned.

CREATE OR REPLACE FUNCTION public.ping_session(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cleaned integer := 0;
BEGIN
  -- Update the session's last_seen_at
  UPDATE public.user_active_sessions
  SET last_seen_at = now()
  WHERE id = p_session_id AND is_active = true;

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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.ping_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_sessions() TO authenticated;
