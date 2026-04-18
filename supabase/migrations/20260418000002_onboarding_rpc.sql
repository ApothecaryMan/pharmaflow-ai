-- Migration: Atomic Onboarding RPC
-- Description: Handles organization, membership, and subscription creation in a single transaction.

CREATE OR REPLACE FUNCTION public.setup_initial_organization(
  p_name TEXT,
  p_slug TEXT,
  p_owner_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_org RECORD;
  v_member RECORD;
  v_sub RECORD;
  v_trial_end TIMESTAMPTZ;
BEGIN
  -- 1. Create Organization (SECURITY DEFINER allows bypassing initial RLS blocks)
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (p_name, p_slug, p_owner_id)
  RETURNING * INTO v_org;

  -- 2. Create Owner Membership
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_org.id, p_owner_id, 'owner')
  RETURNING * INTO v_member;

  -- 3. Create Default Subscription
  v_trial_end := now() + interval '14 days';
  INSERT INTO public.subscriptions (
    org_id, 
    plan, 
    status, 
    max_branches, 
    max_employees, 
    max_drugs, 
    trial_ends_at
  )
  VALUES (
    v_org.id, 
    'free', 
    'trial', 
    1, 
    5, 
    500, 
    v_trial_end
  )
  RETURNING * INTO v_sub;

  -- 4. Return combined result
  RETURN jsonb_build_object(
    'org', to_jsonb(v_org),
    'membership', to_jsonb(v_member),
    'subscription', to_jsonb(v_sub)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.setup_initial_organization(TEXT, TEXT, UUID) TO authenticated;
