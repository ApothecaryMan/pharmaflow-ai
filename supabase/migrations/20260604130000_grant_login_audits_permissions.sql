-- YYYYMMDDHHMMSS: 20260604130000
-- Description: Grant INSERT, SELECT permissions on login_audits to authenticated users

GRANT SELECT, INSERT ON TABLE public.login_audits TO authenticated;
GRANT ALL ON TABLE public.login_audits TO service_role;
