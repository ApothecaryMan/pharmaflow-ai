-- Migration: Convert existing employee usernames to local sequential numbers
-- This updates old employees whose username was set to their global username or full EMP code.
-- It extracts the digit suffix from employee_code (e.g., 'EMP-15' -> '15') and updates the username.

UPDATE public.employees
SET username = substring(employee_code from 'EMP-([0-9]+)')
WHERE employee_code IS NOT NULL 
  AND employee_code LIKE 'EMP-%'
  -- Only update if it's not already just a plain number
  AND username !~ '^[0-9]+$';
