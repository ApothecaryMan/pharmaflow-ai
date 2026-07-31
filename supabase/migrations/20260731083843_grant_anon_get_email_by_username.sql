-- Grant EXECUTE permission on get_email_by_username to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO authenticated;
