-- Enrich user_profiles with missing employee-like fields
-- These fields are not pharmacy-specific and belong on the global profile

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS name_arabic TEXT,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS national_id_card TEXT,
  ADD COLUMN IF NOT EXISTS national_id_card_back TEXT,
  ADD COLUMN IF NOT EXISTS main_syndicate_card TEXT,
  ADD COLUMN IF NOT EXISTS sub_syndicate_card TEXT;
