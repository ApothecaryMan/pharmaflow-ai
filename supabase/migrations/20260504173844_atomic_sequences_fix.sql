-- Atomic Sequence Management Migration
-- Ensures ID generation is race-condition safe and consistent across concurrent users.

-- 1. Create the sequences table if it doesn't exist
CREATE TABLE IF NOT EXISTS sequences (
    branch_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    current_value BIGINT DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (branch_id, entity_type)
);

-- 2. Enable RLS on sequences (but we'll use SECURITY DEFINER for the function)
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

-- 3. Create or replace the atomic increment function
CREATE OR REPLACE FUNCTION increment_sequence(p_branch_id UUID, p_entity_type TEXT)
RETURNS BIGINT AS $$
DECLARE
  next_val BIGINT;
BEGIN
  -- Use INSERT with ON CONFLICT for atomic upsert and lock
  INSERT INTO sequences (branch_id, entity_type, current_value)
  VALUES (p_branch_id, p_entity_type, 1)
  ON CONFLICT (branch_id, entity_type)
  DO UPDATE SET 
    current_value = sequences.current_value + 1,
    updated_at = NOW()
  RETURNING current_value INTO next_val;
  
  RETURN next_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add comments for documentation
COMMENT ON TABLE sequences IS 'Stores sequential ID counters for various entities per branch.';
COMMENT ON FUNCTION increment_sequence IS 'Atomically increments and returns the next sequence value for a given branch and entity type.';
