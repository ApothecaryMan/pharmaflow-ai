-- Migration: One-Time Password/PIN Reset (pre-production)
-- Date: 2026-08-07
--
-- This replaces the legacy SHA-256 lazy-migration machinery. Because pre-existing
-- hashes may have been written by the old broken JS SHA-256 fallback (which cannot
-- be reproduced server-side), only rows still in a LEGACY format are reset to a
-- known bcrypt value. Credentials already stored as bcrypt ($2a$...) are left
-- untouched, so this never silently overwrites a password a user set themselves.
--
-- Defaults for reset rows (change before deploying to real environments!):
--   * password        -> '123456'
--   * attendance_pin  -> '1234'
--
-- Run this only if you are sure resetting broken credentials is acceptable.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Reset passwords only for employees not already on bcrypt (i.e. legacy hashes)
UPDATE public.employees
SET password = crypt('123456', gen_salt('bf', 10))
WHERE password IS NOT NULL
  AND password <> ''
  AND password !~ '^\$2[aby]\$';

-- Reset attendance PINs only for employees not already on bcrypt
UPDATE public.employees
SET attendance_pin = crypt('1234', gen_salt('bf', 10))
WHERE attendance_pin IS NOT NULL
  AND attendance_pin <> ''
  AND attendance_pin !~ '^\$2[aby]\$';

COMMIT;