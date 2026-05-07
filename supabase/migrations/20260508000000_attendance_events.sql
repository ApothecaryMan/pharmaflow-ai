-- ═══════════════════════════════════════════
-- Attendance Events (Biometric Clock In/Out)
-- ═══════════════════════════════════════════
-- Architecture: Event-based log (IN/OUT) with server-side timing.
-- Security: 3 layers — WebAuthn biometric, Terminal UUID token, Supabase now().
-- No GPS, No IP, No LocalStorage. Terminal token lives in React state only.

-- 1. Event type enum
CREATE TYPE attendance_event_type AS ENUM ('IN', 'OUT');

-- 2. Core attendance events table
CREATE TABLE attendance_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES employees(id),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  org_id        UUID,
  event_type    attendance_event_type NOT NULL,
  is_biometric  BOOLEAN NOT NULL DEFAULT false,
  -- ⚠️ CRITICAL: timestamp is ALWAYS server-generated via now().
  -- The client MUST NOT pass a timestamp. This prevents clock tampering.
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Add terminal token column to branches table
-- This stores the auto-generated UUID that the owner/IT enters into the pharmacy device.
ALTER TABLE branches ADD COLUMN IF NOT EXISTS attendance_terminal_token TEXT;

-- 4. Indexes for fast timeline queries
CREATE INDEX idx_attendance_employee_date ON attendance_events(employee_id, timestamp DESC);
CREATE INDEX idx_attendance_branch_date ON attendance_events(branch_id, timestamp DESC);

-- 5. RLS — Org-based isolation (matches existing project pattern)
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_org_policy ON attendance_events
  FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));

-- 6. RPC: Server-side validated attendance event insertion
-- This function validates the terminal token before allowing an event to be recorded.
-- The timestamp is generated inside the function (now()), never from the client.
CREATE OR REPLACE FUNCTION log_attendance_event(
  p_employee_id UUID,
  p_branch_id UUID,
  p_org_id UUID,
  p_event_type TEXT,
  p_terminal_token TEXT,
  p_is_biometric BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stored_token TEXT;
  v_event_id UUID;
  v_timestamp TIMESTAMPTZ;
BEGIN
  -- Step 1: Validate terminal token against the branch's stored token
  SELECT attendance_terminal_token INTO v_stored_token
  FROM branches WHERE id = p_branch_id;

  IF v_stored_token IS NULL OR v_stored_token != p_terminal_token THEN
    RAISE EXCEPTION 'INVALID_TERMINAL_TOKEN: Terminal token does not match the branch token.';
  END IF;

  -- Step 2: Insert event with server-generated timestamp
  v_timestamp := now();
  INSERT INTO attendance_events (employee_id, branch_id, org_id, event_type, is_biometric, timestamp)
  VALUES (p_employee_id, p_branch_id, p_org_id, p_event_type::attendance_event_type, p_is_biometric, v_timestamp)
  RETURNING id INTO v_event_id;

  -- Step 3: Return the created event
  RETURN json_build_object(
    'id', v_event_id,
    'employee_id', p_employee_id,
    'branch_id', p_branch_id,
    'event_type', p_event_type,
    'is_biometric', p_is_biometric,
    'timestamp', v_timestamp
  );
END;
$$;

-- 7. RPC: Validate terminal token (used when activating the terminal UI)
CREATE OR REPLACE FUNCTION validate_terminal_token(
  p_branch_id UUID,
  p_terminal_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stored_token TEXT;
BEGIN
  SELECT attendance_terminal_token INTO v_stored_token
  FROM branches WHERE id = p_branch_id;

  RETURN v_stored_token IS NOT NULL AND v_stored_token = p_terminal_token;
END;
$$;
