-- Security Audit: Ensure sales table RLS is restrictive
-- The process_checkout RPC is SECURITY DEFINER, so it bypasses RLS.
-- We must ensure users cannot bypass the RPC by INSERTing directly into 'sales'.

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Remove any overly permissive policies if they exist (Example cleanup)
-- DROP POLICY IF EXISTS "Employees can insert sales" ON public.sales;

-- Standard View Policy
CREATE POLICY "Employees can view branch sales" 
ON public.sales FOR SELECT 
TO authenticated 
USING (branch_id IN (SELECT branch_id FROM public.employees WHERE auth_user_id = auth.uid()));

-- RESTRICTIVE INSERT: No direct insert allowed, must use RPC
-- (By not defining an INSERT policy, or making it only for service_role)
