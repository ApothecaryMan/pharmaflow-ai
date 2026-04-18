-- Migration: Apply God role logic
-- Run after the ENUM has been updated in the previous migration file

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employees 
    WHERE auth_user_id = auth.uid() 
      AND (role = 'god')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ensure existing super admin user (if any) is updated to 'god' role for parity
UPDATE public.employees 
SET role = 'god', department = 'it' 
WHERE username = 'Super' OR LOWER(username) = 'super';

-- Comment: The God role now has absolute power via ROLE_PERMISSIONS and is_super_admin() RLS bypass.
