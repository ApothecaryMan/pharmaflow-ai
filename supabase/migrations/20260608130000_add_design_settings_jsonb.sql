-- Migration: Add design_settings JSONB field to user_profiles and employees
-- This enables saving avatar customization (frame, ring style, thickness, animations)
-- and banner properties (zoom, offset X/Y) in a flexible single JSON column.

-- 1. Add design_settings column to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS design_settings JSONB DEFAULT '{}'::jsonb;

-- 2. Add design_settings column to employees to cache the design for organization view
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS design_settings JSONB DEFAULT '{}'::jsonb;

-- 3. Update the sync trigger function to sync design_settings
-- CRITICAL ARCHITECTURAL WARNING: DO NOT sync OR update the 'username' column here.
-- The local employee username MUST remain as the sequential branch code (e.g., '1', '2') 
-- for quick POS login, while the global user profile uses the global '@username'.
-- Syncing username here will OVERWRITE and break local quick login.
CREATE OR REPLACE FUNCTION public.sync_user_profile_to_employees()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.employees
  SET photo = NEW.image,
      name = NEW.full_name,
      name_arabic = NEW.name_arabic,
      email = NEW.email,
      phone = NEW.phone,
      national_id_card = NEW.national_id_card,
      national_id_card_back = NEW.national_id_card_back,
      main_syndicate_card = NEW.main_syndicate_card,
      sub_syndicate_card = NEW.sub_syndicate_card,
      design_settings = NEW.design_settings
  WHERE auth_user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
