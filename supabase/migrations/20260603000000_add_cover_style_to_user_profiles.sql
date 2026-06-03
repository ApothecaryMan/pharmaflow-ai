ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS cover_style TEXT DEFAULT 'pattern';
