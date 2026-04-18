-- Migration: Seed Super Admin Account
-- Ensures the Super Admin user always exists in the database and has the correct password hash

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ 
DECLARE
  first_branch_id uuid;
BEGIN
  -- Fetch the first available branch, if any
  SELECT id INTO first_branch_id FROM branches ORDER BY created_at ASC LIMIT 1;
  
  INSERT INTO employees (
    id, 
    employee_code, 
    name, 
    username, 
    password, 
    role, 
    position, 
    department, 
    status, 
    branch_id,
    phone,
    start_date
  )
  VALUES (
    '00000000-0000-4000-a000-000000000002',
    'EMP-000',
    'SUPER',
    'Super',
    encode(digest('Super@123', 'sha256'), 'hex'),
    'admin',
    'Super Admin',
    'it',
    'active',
    first_branch_id,
    '00000000000',
    CURRENT_DATE
  )
  ON CONFLICT (id) DO UPDATE SET
    password = EXCLUDED.password;
END $$;
