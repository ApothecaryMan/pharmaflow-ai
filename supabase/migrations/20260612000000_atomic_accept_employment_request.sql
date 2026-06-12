-- ═══════════════════════════════════════════
-- Migration: Atomic Employment Request Acceptance
-- Converts the 3-step frontend acceptance process into a single atomic RPC
-- to eliminate race conditions and partial failures.
-- ═══════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION accept_employment_request(p_request_id UUID, p_user_id UUID, p_username TEXT)
RETURNS JSON AS $$
DECLARE
  v_request RECORD;
  v_profile RECORD;
  v_seq BIGINT;
  v_employee_code TEXT;
  v_employee_id UUID;
  v_existing_id UUID;
BEGIN
  -- 1. Fetch & lock request
  SELECT * INTO v_request FROM public.employment_requests WHERE id = p_request_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is already processed';
  END IF;
  
  IF v_request.target_username != p_username THEN
    RAISE EXCEPTION 'Username mismatch';
  END IF;
  
  -- 2. Check for duplicate
  SELECT id INTO v_existing_id FROM public.employees 
  WHERE org_id = v_request.org_id AND auth_user_id = p_user_id;
  
  IF FOUND THEN
    RAISE EXCEPTION 'You are already an employee in this organization';
  END IF;
  
  -- 3. Fetch profile
  SELECT * INTO v_profile FROM public.user_profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  
  -- 4. Get Sequence (using the existing atomic incrementer)
  -- The increment_sequence uses branch_id, but for employees it was passed org_id
  -- We pass org_id as it was done in employeeService.create()
  SELECT public.increment_sequence(v_request.org_id, 'employees') INTO v_seq;
  v_employee_code := 'EMP-' || v_seq::TEXT;
  
  -- 5. Insert Employee
  INSERT INTO public.employees (
    org_id,
    branch_id,
    auth_user_id,
    user_id,
    employee_code,
    username,
    name,
    name_arabic,
    phone,
    email,
    position,
    department,
    role,
    start_date,
    status,
    salary,
    photo
  ) VALUES (
    v_request.org_id,
    v_request.branch_id,
    p_user_id,
    p_user_id,
    v_employee_code,
    v_seq::TEXT, -- Using numeric sequence as username for POS fast login
    v_profile.full_name,
    v_profile.name_arabic,
    COALESCE(v_profile.phone, ''),
    v_profile.email,
    v_request.role,
    'pharmacy',
    v_request.role::public.employee_role,
    CURRENT_DATE,
    'active',
    0,
    v_profile.image
  ) RETURNING id INTO v_employee_id;
  
  -- 6. Update request status
  UPDATE public.employment_requests 
  SET status = 'accepted', updated_at = NOW() 
  WHERE id = p_request_id;
  
  RETURN json_build_object('employee_id', v_employee_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
