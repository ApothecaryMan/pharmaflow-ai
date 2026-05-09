-- ═════════════════════════════════════════════════════════════════════════════
-- SOURCE FILE: supabase/audit_logs_setup.sql
-- DESCRIPTION: Sets up the permanent Audit Logging table for Login/Session events.
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. Create the Audit Logs table
CREATE TABLE IF NOT EXISTS public.login_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    username TEXT NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    employee_code TEXT,
    role TEXT NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- login, logout, switch_user, system_login, system_logout, switch_branch
    details TEXT
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.login_audits ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Only Admins/Owners can view logs
-- This ensures regular staff cannot see who else is logging in or their activities.
DROP POLICY IF EXISTS "Admins can view all logs" ON public.login_audits;
CREATE POLICY "Admins can view all logs" ON public.login_audits
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.org_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
      )
    );

-- 4. Policy: All authenticated users can insert their own activity logs
DROP POLICY IF EXISTS "Users can insert logs" ON public.login_audits;
CREATE POLICY "Users can insert logs" ON public.login_audits
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 5. Index for performance (Ordering by date is common)
CREATE INDEX IF NOT EXISTS idx_login_audits_created_at ON public.login_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audits_branch_id ON public.login_audits(branch_id);
