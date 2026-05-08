-- 1. Re-create attendance event type
DO $$ BEGIN
    CREATE TYPE attendance_event_type AS ENUM ('IN', 'OUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Re-create attendance_events table
CREATE TABLE IF NOT EXISTS attendance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    event_type attendance_event_type NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_biometric BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add columns back to branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS attendance_terminal_token TEXT UNIQUE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS shift_start_time TEXT DEFAULT '09:00';

-- 4. Enable RLS and add basic policy
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_org_policy ON attendance_events
    FOR ALL
    USING (TRUE) -- Adjust this based on your org_id logic later
    WITH CHECK (TRUE);

-- 5. Restore All Grants (The fix you requested)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- 6. Add indexes for performance (Crucial for reports)
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_events(employee_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_branch_date ON attendance_events(branch_id, timestamp);
