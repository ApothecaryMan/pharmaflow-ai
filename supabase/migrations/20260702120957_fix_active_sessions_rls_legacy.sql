-- Drop the previous policy
DROP POLICY IF EXISTS "Users can view their own sessions and employee sessions" ON public.user_active_sessions;

-- Create a more robust policy checking both auth_user_id and user_id for legacy compatibility
CREATE POLICY "Users can view their own sessions and employee sessions"
    ON public.user_active_sessions
    FOR SELECT
    USING (
        auth.uid() = user_id OR
        employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid() OR user_id = auth.uid())
    );
