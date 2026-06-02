-- Function to resolve employee email by username for login
CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT email FROM employees WHERE username = p_username LIMIT 1;
$$;
