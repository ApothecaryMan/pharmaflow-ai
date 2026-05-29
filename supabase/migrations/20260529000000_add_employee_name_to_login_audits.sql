-- YYYYMMDDHHMMSS: 20260529000000
-- Add employee_name TEXT column to login_audits to capture display name at execution time.

ALTER TABLE public.login_audits ADD COLUMN IF NOT EXISTS employee_name TEXT;

-- Backfill existing rows with employee names from the employees table
UPDATE public.login_audits la
SET employee_name = e.name
FROM public.employees e
WHERE la.employee_id = e.id
AND la.employee_name IS NULL;
