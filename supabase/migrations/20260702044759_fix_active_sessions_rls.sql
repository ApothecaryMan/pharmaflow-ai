-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_active_sessions;

-- Create a new policy that allows viewing if the user owns the session OR if the session belongs to an employee profile owned by the user
CREATE POLICY "Users can view their own sessions and employee sessions"
    ON public.user_active_sessions
    FOR SELECT
    USING (
        auth.uid() = user_id OR
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );
