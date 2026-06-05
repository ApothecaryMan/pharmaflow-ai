-- 1. Add new column target_user_id
ALTER TABLE public.employment_requests 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES public.user_profiles(id);

-- 2. Backfill target_user_id for existing requests
UPDATE public.employment_requests e
SET target_user_id = u.id
FROM public.user_profiles u
WHERE e.target_username = u.username
  AND e.target_user_id IS NULL;

-- Make target_user_id NOT NULL for future integrity (optional but recommended if all are matched)
-- Wait, some requests might be sent to usernames that don't exist yet (if the system allows inviting before registration).
-- Actually, the current system checks if the profile exists first: `const targetProfile = await employeeProfileRepository.getByUsername(request.targetUsername);`
-- But to be safe and avoid breaking existing dangling requests, we won't set NOT NULL just yet.

-- 3. Add an Index on target_user_id to ensure lightning-fast reads
CREATE INDEX IF NOT EXISTS idx_employment_requests_target_user_id ON public.employment_requests(target_user_id);

-- 4. Drop the old slow RLS policies
DROP POLICY IF EXISTS "Users can view requests targeting their username" ON public.employment_requests;
DROP POLICY IF EXISTS "Users can update requests targeting their username" ON public.employment_requests;

-- 5. Create new ultra-fast O(1) RLS policies based on UUID
CREATE POLICY "Users can view requests targeting their UUID" ON public.employment_requests
  FOR SELECT USING (target_user_id = auth.uid());

CREATE POLICY "Users can update requests targeting their UUID" ON public.employment_requests
  FOR UPDATE USING (target_user_id = auth.uid());
