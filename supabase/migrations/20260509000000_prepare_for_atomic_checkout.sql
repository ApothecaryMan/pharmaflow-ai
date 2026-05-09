-- Migration: Prepare for Atomic Checkout
-- 1. Disable the legacy sync trigger (we will handle stock updates explicitly in the RPC)
DROP TRIGGER IF EXISTS trg_sync_stock ON stock_movements;

-- 2. Create the branch_daily_sequences table for atomic daily order numbers
CREATE TABLE IF NOT EXISTS branch_daily_sequences (
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    sale_date DATE NOT NULL,
    current_value INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (branch_id, sale_date)
);

-- 3. Enable RLS on the new table
ALTER TABLE branch_daily_sequences ENABLE ROW LEVEL SECURITY;

-- 4. Simple policy: only accessible via security definer functions (like our future RPC)
CREATE POLICY internal_access ON branch_daily_sequences 
    FOR ALL USING (false); -- No direct access

-- 5. Helper function to get and increment daily sequence
CREATE OR REPLACE FUNCTION get_next_daily_order_number_atomic(p_branch_id UUID, p_date DATE)
RETURNS INTEGER AS $$
DECLARE
    next_val INTEGER;
BEGIN
    INSERT INTO branch_daily_sequences (branch_id, sale_date, current_value)
    VALUES (p_branch_id, p_date, 1)
    ON CONFLICT (branch_id, sale_date)
    DO UPDATE SET 
        current_value = branch_daily_sequences.current_value + 1,
        updated_at = NOW()
    RETURNING current_value INTO next_val;
    
    RETURN next_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE branch_daily_sequences IS 'Atomic daily sequences for order numbering, reset every day per branch.';
