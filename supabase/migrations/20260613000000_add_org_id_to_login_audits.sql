-- Migration: 20260613000000_add_org_id_to_login_audits
-- Description: Add org_id to login_audits table and enforce multi-tenant isolation via RLS

-- 1. Add org_id column
ALTER TABLE public.login_audits 
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Retroactively populate org_id from branches if null (for existing data)
UPDATE public.login_audits la
SET org_id = b.org_id
FROM public.branches b
WHERE la.branch_id = b.id AND la.org_id IS NULL;

-- 3. Update RLS policy to enforce org_id
DROP POLICY IF EXISTS "Authenticated read audit logs" ON public.login_audits;

CREATE POLICY "Authenticated read audit logs"
ON public.login_audits FOR SELECT TO authenticated
USING (org_id IN (SELECT get_user_org_ids()));

-- 4. Recreate index for faster querying
CREATE INDEX IF NOT EXISTS idx_login_audits_org_id ON public.login_audits(org_id);
