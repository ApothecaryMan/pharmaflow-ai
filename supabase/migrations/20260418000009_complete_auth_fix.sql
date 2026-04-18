-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  COMPLETE FIX: Super Admin Auth + Linking + God Mode         ║
-- ║  Run this ONCE in the Supabase SQL Editor                    ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- Step 0: Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_auth_id uuid := '00000000-0000-4000-a000-000000000001';
  v_org_id uuid;
  v_branch_id uuid;
BEGIN

  -- ═══════════════════════════════════════════
  -- STEP 1: Fix Password (bcrypt with cost 10)
  -- ═══════════════════════════════════════════
  UPDATE auth.users
  SET 
    encrypted_password = crypt('Super@123', gen_salt('bf', 10)),
    updated_at = now()
  WHERE id = v_auth_id;

  RAISE NOTICE '✅ Step 1: Password updated';

  -- ═══════════════════════════════════════════
  -- STEP 2: Ensure auth.identities record exists
  -- GoTrue REQUIRES this for email/password login!
  -- ═══════════════════════════════════════════
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    v_auth_id,
    v_auth_id,
    jsonb_build_object(
      'sub', v_auth_id::text,
      'email', 'super@zinc.co',
      'email_verified', true
    ),
    'email',
    v_auth_id::text,
    now(), now(), now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  RAISE NOTICE '✅ Step 2: Identity record ensured';

  -- ═══════════════════════════════════════════
  -- STEP 3: Organization + Membership
  -- ═══════════════════════════════════════════
  -- Find existing org or create one
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  
  IF v_org_id IS NULL THEN
    v_org_id := gen_random_uuid();
    INSERT INTO public.organizations (id, name, slug, owner_id, status)
    VALUES (v_org_id, 'PharmaFlow Global', 'pharmaflow-global', v_auth_id, 'active');
    RAISE NOTICE '✅ Step 3a: Created new organization %', v_org_id;
  ELSE
    RAISE NOTICE '✅ Step 3a: Using existing organization %', v_org_id;
  END IF;

  -- Add as owner
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_org_id, v_auth_id, 'owner')
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = 'owner';

  RAISE NOTICE '✅ Step 3b: org_members linked';

  -- ═══════════════════════════════════════════
  -- STEP 4: Link Employee Record
  -- ═══════════════════════════════════════════
  -- Find the first branch for this org
  SELECT id INTO v_branch_id FROM public.branches WHERE org_id = v_org_id LIMIT 1;

  -- Update the Super Admin employee (match by username OR known ID)
  UPDATE public.employees
  SET 
    auth_user_id = v_auth_id,
    org_id = v_org_id,
    branch_id = COALESCE(branch_id, v_branch_id),
    -- SHA-256 hash of 'Super@123' for Quick Login (StatusBar)
    password = encode(digest('Super@123', 'sha256'), 'hex')
  WHERE LOWER(username) = 'super' 
     OR id = '00000000-0000-4000-a000-000000000002';

  RAISE NOTICE '✅ Step 4: Employee linked (branch: %)', v_branch_id;

  -- ═══════════════════════════════════════════
  -- STEP 5: God Mode — Super Admin sees ALL data
  -- ═══════════════════════════════════════════
  EXECUTE 'CREATE OR REPLACE FUNCTION public.get_user_org_ids()
  RETURNS SETOF UUID AS $func$
  BEGIN
    IF auth.uid() = ''00000000-0000-4000-a000-000000000001'' THEN
      RETURN QUERY SELECT id FROM public.organizations;
    ELSE
      RETURN QUERY SELECT org_id FROM public.org_members WHERE user_id = auth.uid();
    END IF;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER STABLE';

  EXECUTE 'CREATE OR REPLACE FUNCTION public.get_user_branch_ids()
  RETURNS SETOF UUID AS $func$
  BEGIN
    IF auth.uid() = ''00000000-0000-4000-a000-000000000001'' THEN
      RETURN QUERY SELECT id FROM public.branches;
    ELSE
      RETURN QUERY SELECT b.id FROM public.branches b
      WHERE b.org_id IN (SELECT public.get_user_org_ids());
    END IF;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER STABLE';

  RAISE NOTICE '✅ Step 5: God Mode functions updated';

  -- ═══════════════════════════════════════════
  -- STEP 6: Case-insensitive username resolver
  -- ═══════════════════════════════════════════
  EXECUTE 'CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
  RETURNS TEXT AS $func$
  DECLARE
    v_email TEXT;
  BEGIN
    SELECT email INTO v_email
    FROM public.employees
    WHERE LOWER(username) = LOWER(p_username) 
       OR LOWER(employee_code) = LOWER(p_username)
    LIMIT 1;
    RETURN v_email;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER';

  RAISE NOTICE '✅ Step 6: Username resolver updated';
  RAISE NOTICE '🎉 ALL DONE! Try logging in with Super / Super@123';

END $$;
