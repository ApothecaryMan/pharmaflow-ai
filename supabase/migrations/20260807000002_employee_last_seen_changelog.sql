-- Track the highest app version whose changelog each employee has seen.
-- Per-employee (not per-device) so shared POS devices and cache clears
-- never reset the stamp.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS last_seen_changelog_version text;
