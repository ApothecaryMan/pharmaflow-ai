-- Drop the previous UPDATE policy
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_active_sessions;

-- Create a more robust UPDATE policy with explicit WITH CHECK to allow setting employee_id to null
CREATE POLICY "Users can update their own sessions"
    ON public.user_active_sessions
    FOR UPDATE
    USING (
        auth.uid() = user_id OR
        employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid() OR user_id = auth.uid())
    )
    WITH CHECK (
        auth.uid() = user_id OR
        employee_id IS NULL OR
        employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid() OR user_id = auth.uid())
    );
