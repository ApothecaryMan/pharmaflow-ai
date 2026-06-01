-- Phase 2: Foundational Schema Updates for Employee Portal

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Modify employees table
-- Note: employees already has auth_user_id, we will add user_id to link to user_profiles
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS biometric_credential_id TEXT;

-- 3. Create employment_requests table
CREATE TABLE IF NOT EXISTS public.employment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_username TEXT NOT NULL,
  role TEXT NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Triggers for updated_at
CREATE TRIGGER handle_updated_at_user_profiles 
  BEFORE UPDATE ON public.user_profiles 
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime (updated_at);

CREATE TRIGGER handle_updated_at_employment_requests 
  BEFORE UPDATE ON public.employment_requests 
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime (updated_at);

-- 5. Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_requests ENABLE ROW LEVEL SECURITY;

-- user_profiles RLS:
-- Users can read and update their own profile.
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- employment_requests RLS:
-- Orgs can manage their requests. Users can view/update requests to them.
CREATE POLICY "Orgs can manage their requests" ON public.employment_requests
  FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can view requests targeting their username" ON public.employment_requests
  FOR SELECT USING (target_username = (SELECT username FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update requests targeting their username" ON public.employment_requests
  FOR UPDATE USING (target_username = (SELECT username FROM public.user_profiles WHERE id = auth.uid()));
