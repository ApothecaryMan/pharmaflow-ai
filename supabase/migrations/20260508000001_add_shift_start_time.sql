-- Add shift_start_time to branches table for late arrival detection
ALTER TABLE branches ADD COLUMN IF NOT EXISTS shift_start_time TIME DEFAULT '09:00';
