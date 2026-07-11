-- Migration: Fix achievements permissions and add cron job
-- Description: Grants SELECT on branches and sales to service_role, and schedules the daily achievement calculation.
-- Created At: 2026-07-11

-- 1. Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Grant permissions required for the upsert logic in the edge function
GRANT SELECT ON public.branches TO service_role;
GRANT SELECT ON public.sales TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_target_achievements TO service_role;

-- 3. Schedule the edge function to run every night at 23:55 Egypt time (20:55 UTC)
SELECT cron.schedule(
  'compute-achievements-nightly',
  '55 20 * * *',
  $$
    SELECT net.http_post(
      url:='https://vhewcoumaxicnfsjwcai.supabase.co/functions/v1/compute-daily-achievements',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_AnYJ6lxnHEktPH0RdDOL6g_RyYTpqvX'
      )
    );
  $$
);
