-- Migration: Add password to employees
-- Description: Allows syncing encrypted passwords across local sessions.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS password TEXT;
