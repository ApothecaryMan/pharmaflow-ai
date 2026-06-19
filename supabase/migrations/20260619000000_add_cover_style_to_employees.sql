-- Add cover_style to employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS cover_style TEXT;

-- Update the synchronization function to include cover_style
CREATE OR REPLACE FUNCTION sync_user_profile_to_employees()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE employees
  SET photo = NEW.image,
      name = NEW.full_name,
      name_arabic = NEW.name_arabic,
      email = NEW.email,
      phone = NEW.phone,
      national_id_card = NEW.national_id_card,
      national_id_card_back = NEW.national_id_card_back,
      main_syndicate_card = NEW.main_syndicate_card,
      sub_syndicate_card = NEW.sub_syndicate_card,
      cover_style = NEW.cover_style
  WHERE auth_user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing out-of-sync employees with the correct profile data
UPDATE employees e
SET cover_style = p.cover_style
FROM user_profiles p
WHERE e.auth_user_id = p.id;
