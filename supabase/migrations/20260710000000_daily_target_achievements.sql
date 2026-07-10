-- Migration: Daily Target Achievements
-- Description: Pre-computed per-branch, per-day revenue vs target for the monthly heatmap widget.
-- Created At: 2026-07-10

CREATE TABLE IF NOT EXISTS public.daily_target_achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    revenue         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    target          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    achievement_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
    is_future       BOOLEAN NOT NULL DEFAULT FALSE,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(branch_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_achievements_branch_date
    ON public.daily_target_achievements(branch_id, date DESC);

ALTER TABLE public.daily_target_achievements ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.daily_target_achievements IS 'Pre-computed daily revenue vs. monthly-target breakdown per branch. Populated by the compute-daily-achievements Edge Function.';

COMMENT ON COLUMN public.daily_target_achievements.achievement_pct IS 'Percentage of daily target achieved (revenue / target * 100)';
COMMENT ON COLUMN public.daily_target_achievements.is_future IS 'True for calendar days after today (no sales data yet)';

-- RLS: tenant isolation via org_id
DROP POLICY IF EXISTS tenant_isolation ON public.daily_target_achievements;
CREATE POLICY tenant_isolation ON public.daily_target_achievements
    FOR ALL
    USING (
        org_id IN (SELECT get_user_org_ids())
        AND branch_id IN (SELECT get_user_branch_ids())
    );

-- Grant usage
GRANT SELECT ON public.daily_target_achievements TO authenticated;
GRANT INSERT, UPDATE ON public.daily_target_achievements TO service_role;
