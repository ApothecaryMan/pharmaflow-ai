-- 1. Create the synchronization function
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
      sub_syndicate_card = NEW.sub_syndicate_card
  WHERE auth_user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger on user_profiles
DROP TRIGGER IF EXISTS trg_sync_user_profile ON user_profiles;
CREATE TRIGGER trg_sync_user_profile
AFTER UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_user_profile_to_employees();

-- 3. Backfill existing out-of-sync employees with the correct profile data
UPDATE employees e
SET photo = p.image,
    username = p.username,
    name = p.full_name,
    name_arabic = p.name_arabic,
    email = p.email,
    phone = p.phone,
    national_id_card = p.national_id_card,
    national_id_card_back = p.national_id_card_back,
    main_syndicate_card = p.main_syndicate_card,
    sub_syndicate_card = p.sub_syndicate_card
FROM user_profiles p
WHERE e.auth_user_id = p.id;
