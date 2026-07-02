-- Create an RPC to safely remove an employee from a session without RLS Update issues
CREATE OR REPLACE FUNCTION public.logout_employee_from_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.user_active_sessions;
    v_is_authorized boolean := false;
BEGIN
    -- 1. Fetch the session
    SELECT * INTO v_session FROM public.user_active_sessions WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    -- 2. Verify authorization:
    -- The user must either be the owner of the session (user_id = auth.uid())
    -- OR the employee assigned to the session (employee_id's auth_user_id = auth.uid())
    IF v_session.user_id = auth.uid() THEN
        v_is_authorized := true;
    ELSIF v_session.employee_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.employees 
            WHERE id = v_session.employee_id 
            AND (auth_user_id = auth.uid() OR user_id = auth.uid())
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Not authorized to log out this session';
    END IF;

    -- 3. Perform the update
    UPDATE public.user_active_sessions
    SET 
        employee_id = null,
        last_seen_at = now()
    WHERE id = p_session_id;

END;
$$;
