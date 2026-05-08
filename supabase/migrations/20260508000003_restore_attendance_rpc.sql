-- 1. Function to validate terminal token
CREATE OR REPLACE FUNCTION validate_terminal_token(
    p_branch_id UUID,
    p_terminal_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM branches 
        WHERE id = p_branch_id 
        AND attendance_terminal_token = p_terminal_token
    );
END;
$$;

-- 2. Function to log attendance event with server-side token validation
CREATE OR REPLACE FUNCTION log_attendance_event(
    p_employee_id UUID,
    p_branch_id UUID,
    p_org_id UUID,
    p_event_type TEXT,
    p_terminal_token TEXT,
    p_is_biometric BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id UUID;
    v_timestamp TIMESTAMPTZ;
BEGIN
    -- Layer 2 Check: Proves WHERE (Terminal Token)
    IF NOT EXISTS (
        SELECT 1 FROM branches 
        WHERE id = p_branch_id 
        AND attendance_terminal_token = p_terminal_token
    ) THEN
        RAISE EXCEPTION 'INVALID_TERMINAL_TOKEN';
    END IF;

    -- Layer 3: Proves WHEN (Server-side NOW())
    v_timestamp := NOW();

    -- Insert Event
    INSERT INTO attendance_events (
        employee_id,
        branch_id,
        org_id,
        event_type,
        timestamp,
        is_biometric
    )
    VALUES (
        p_employee_id,
        p_branch_id,
        p_org_id,
        p_event_type::attendance_event_type,
        v_timestamp,
        p_is_biometric
    )
    RETURNING id INTO v_event_id;

    -- Return JSON of the created event
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

-- 3. Ensure permissions for RPC functions
GRANT EXECUTE ON FUNCTION validate_terminal_token(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_attendance_event(UUID, UUID, UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_terminal_token(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION log_attendance_event(UUID, UUID, UUID, TEXT, TEXT, BOOLEAN) TO anon;
