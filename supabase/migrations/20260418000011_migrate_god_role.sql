-- Migration: Add the god role to the postgres ENUM
-- Note: Enum values must be committed before they can be used, so we split this into a separate file.
ALTER TYPE public.employee_role ADD VALUE IF NOT EXISTS 'god';
