-- Migration: Fix Employees RLS Policy
-- Description: Allows users to insert/update their own employee record matching their auth UI, preventing new row violates RLS error

DROP POLICY IF EXISTS tenant_isolation ON employees;
CREATE POLICY tenant_isolation ON employees 
  FOR ALL USING (
    branch_id IN (SELECT get_user_branch_ids())
    OR auth_user_id = auth.uid()
  );
