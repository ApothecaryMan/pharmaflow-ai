-- Fix the get_email_by_username RPC to use SECURITY DEFINER and check both tables

CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_clean_username TEXT;
  v_prefixed_username TEXT;
BEGIN
  -- Normalize username formats
  v_clean_username := regexp_replace(p_username, '^@', '');
  v_prefixed_username := '@' || v_clean_username;

  -- 1. Try user_profiles first (it's the master record for auth)
  SELECT email INTO v_email
  FROM user_profiles
  WHERE username = v_prefixed_username OR username = v_clean_username
  LIMIT 1;

  IF v_email IS NOT NULL THEN
    RETURN v_email;
  END IF;

  -- 2. Fallback to employees table (for legacy or unlinked accounts)
  SELECT email INTO v_email
  FROM employees
  WHERE username = v_clean_username OR username = p_username
  LIMIT 1;

  RETURN v_email;
END;
$$;
