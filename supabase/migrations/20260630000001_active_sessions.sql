-- Migration: Create user_active_sessions table

CREATE TABLE IF NOT EXISTS public.user_active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    device_info TEXT, -- e.g., 'Chrome on Windows 11'
    user_agent TEXT,
    ip_address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    logged_out_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_user_id ON public.user_active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_is_active ON public.user_active_sessions(is_active);

-- Enable RLS
ALTER TABLE public.user_active_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own sessions"
    ON public.user_active_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
    ON public.user_active_sessions
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
    ON public.user_active_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_active_sessions;
