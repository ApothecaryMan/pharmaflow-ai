-- ═════════════════════════════════════════════════════════════════════════════
-- SOURCE FILE: supabase/attendance_report_rpc.sql
-- SUPABASE RPC: get_monthly_attendance_report (v2 - Robust Pairing)
-- ═════════════════════════════════════════════════════════════════════════════
-- Used by: services/hr/attendanceReportService.ts
-- Description: 
--   Calculates daily attendance summaries. This version handles multiple 
--   sessions per day and is resistant to duplicate/redundant logs (e.g. IN -> IN).
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_monthly_attendance_report(
  p_branch_id UUID,
  p_employee_id UUID,
  p_year INT,
  p_month INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_month_start TIMESTAMP;
    v_month_end TIMESTAMP;
    v_shift_start_time TIME;
    v_result JSONB;
BEGIN
    -- 1. Date Range
    v_month_start := make_date(p_year, p_month, 1)::TIMESTAMP;
    v_month_end := (v_month_start + interval '1 month' - interval '1 day')::TIMESTAMP;
    v_month_end := v_month_end + interval '23 hours 59 minutes 59 seconds';

    -- 2. Shift Time
    SELECT shift_start_time INTO v_shift_start_time FROM branches WHERE id = p_branch_id;
    IF v_shift_start_time IS NULL THEN v_shift_start_time := '09:00:00'::TIME; END IF;

    -- 3. Advanced Calculation logic
    WITH 
    calendar AS (
      SELECT generate_series(v_month_start, v_month_end, '1 day')::date as day_date
    ),
    -- Step A: Get all events for the range
    raw_events AS (
      SELECT timestamp, event_type
      FROM attendance_events
      WHERE employee_id = p_employee_id AND branch_id = p_branch_id
        AND timestamp >= (v_month_start - interval '1 day')
        AND timestamp <= (v_month_end + interval '1 day')
      ORDER BY timestamp ASC
    ),
    -- Step B: Filter redundant events (Only keep IN if prev was OUT, only keep OUT if prev was IN)
    filtered_events AS (
      SELECT * FROM (
        SELECT 
          timestamp, event_type,
          LAG(event_type) OVER (ORDER BY timestamp) as prev_type
        FROM raw_events
      ) t
      WHERE prev_type IS NULL OR prev_type != event_type
    ),
    -- Step C: Pair them (Now we have a clean IN -> OUT -> IN -> OUT sequence)
    paired_sessions AS (
      SELECT 
        timestamp as in_time,
        LEAD(timestamp) OVER (ORDER BY timestamp) as out_time,
        event_type
      FROM filtered_events
    ),
    -- Step D: Keep only the IN records (which now have their matching OUT in out_time)
    final_sessions AS (
      SELECT 
        in_time, 
        out_time,
        date_trunc('day', in_time)::date as session_date
      FROM paired_sessions
      WHERE event_type = 'IN'
    ),
    -- Step E: Group by day
    daily_stats AS (
      SELECT 
        session_date,
        MIN(in_time) as first_in,
        MAX(out_time) as last_out,
        SUM(
          COALESCE(
            EXTRACT(EPOCH FROM (out_time - in_time))/60, 
            CASE WHEN session_date = CURRENT_DATE THEN EXTRACT(EPOCH FROM (now() - in_time))/60 ELSE 0 END
          )
        ) as total_minutes,
        BOOL_OR(out_time IS NULL AND session_date = CURRENT_DATE) as is_ongoing
      FROM final_sessions
      WHERE session_date >= v_month_start::date AND session_date <= v_month_end::date
      GROUP BY session_date
    )
    SELECT jsonb_build_object(
      'days', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'date', c.day_date,
            'isPresent', d.first_in IS NOT NULL,
            'firstIn', d.first_in,
            'lastOut', d.last_out,
            'totalMinutes', ROUND(COALESCE(d.total_minutes, 0)),
            'isOngoing', COALESCE(d.is_ongoing, false),
            'lateMinutes', CASE 
              WHEN d.first_in IS NOT NULL AND (d.first_in::time > v_shift_start_time + interval '5 minutes')
              THEN ROUND(EXTRACT(EPOCH FROM (d.first_in::time - v_shift_start_time))/60)
              ELSE 0 
            END
          ) ORDER BY c.day_date ASC
        )
        FROM calendar c
        LEFT JOIN daily_stats d ON c.day_date = d.session_date
      )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
