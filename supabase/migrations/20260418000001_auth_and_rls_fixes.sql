-- Migration: Auth and RLS Fixes
-- Description: Standardizes employee creation, username resolution, and onboarding RLS policies.

-- 1. Function to handle new user signups with separate name and username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.employees (
    auth_user_id,
    email,
    username,
    name,
    employee_code,
    phone,
    position,
    department,
    role,
    start_date,
    status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'EMP-' || substr(NEW.id::text, 1, 8),
    '0000000000',
    'Owner',
    'it',
    'admin',
    CURRENT_DATE,
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to resolve email from username safely
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM public.employees
  WHERE username = p_username OR employee_code = p_username
  LIMIT 1;
  
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO authenticated;

-- 3. Organizations RLS Updates
DROP POLICY IF EXISTS "allow_org_creation" ON organizations;
CREATE POLICY "allow_org_creation" ON organizations FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "allow_owner_select_org" ON organizations;
CREATE POLICY "allow_owner_select_org" ON organizations FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "allow_owner_update_org" ON organizations;
CREATE POLICY "allow_owner_update_org" ON organizations FOR UPDATE USING (auth.uid() = owner_id);

-- 4. Org Members RLS Updates
DROP POLICY IF EXISTS "allow_member_insertion_by_owner" ON org_members;
CREATE POLICY "allow_member_insertion_by_owner" ON org_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = org_id AND owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "allow_user_select_own_membership" ON org_members;
CREATE POLICY "allow_user_select_own_membership" ON org_members FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "allow_user_update_own_membership" ON org_members;
CREATE POLICY "allow_user_update_own_membership" ON org_members FOR UPDATE USING (auth.uid() = user_id);

-- 5. Subscriptions RLS Updates
DROP POLICY IF EXISTS "allow_subscription_creation_by_owner" ON subscriptions;
CREATE POLICY "allow_subscription_creation_by_owner" ON subscriptions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = org_id AND owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "allow_owner_select_subscription" ON subscriptions;
CREATE POLICY "allow_owner_select_subscription" ON subscriptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = org_id AND owner_id = auth.uid()
  )
);

-- 6. Branches RLS Updates
DROP POLICY IF EXISTS "allow_branch_creation_by_owner" ON branches;
CREATE POLICY "allow_branch_creation_by_owner" ON branches FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = org_id AND owner_id = auth.uid()
  )
);
