-- Enable Realtime for employment_requests table
-- Required for the EmployeeSetupScreen waiting phase to receive
-- live updates when an employee accepts/rejects an invitation.
ALTER PUBLICATION supabase_realtime ADD TABLE public.employment_requests;
