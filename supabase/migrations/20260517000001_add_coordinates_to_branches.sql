-- Add coordinates columns to branches table for geolocation mapping
ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude double precision;
