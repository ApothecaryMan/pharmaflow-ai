-- ==========================================
-- SERVER-SIDE AUTO-INCREMENT FOR PURCHASE IDs
-- ==========================================
-- This script ensures that every purchase gets a unique, sequential ID
-- per branch, even if multiple users save at the same time.

-- 1. Ensure a Unique Constraint per Branch + Invoice ID
-- This is a safety net to prevent any accidental duplicates at the DB level.
ALTER TABLE purchases 
ADD CONSTRAINT unique_invoice_per_branch UNIQUE (branch_id, invoice_id);

-- 2. Create the Generation Function
-- This function finds the maximum existing ID for the current branch
-- and increments it by 1.
CREATE OR REPLACE FUNCTION generate_next_purchase_id()
RETURNS TRIGGER AS $$
DECLARE
    max_num INTEGER;
    next_id TEXT;
BEGIN
    -- Search for the maximum number currently in this branch
    -- We extract the numeric part from 'INV-000001' using regex
    SELECT COALESCE(MAX(CAST(substring(invoice_id FROM 'INV-([0-9]+)') AS INTEGER)), 0)
    INTO max_num
    FROM purchases
    WHERE branch_id = NEW.branch_id;

    -- Construct the new ID with 6-digit padding
    next_id := 'INV-' || LPAD((max_num + 1)::TEXT, 6, '0');
    
    -- Assign the generated ID to the record before insertion
    -- This overrides any ID sent by the client to ensure server-side truth
    NEW.invoice_id := next_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create/Replace the Trigger
-- This trigger fires BEFORE INSERT on every row
DROP TRIGGER IF EXISTS trg_generate_purchase_id ON purchases;
CREATE TRIGGER trg_generate_purchase_id
BEFORE INSERT ON purchases
FOR EACH ROW
EXECUTE FUNCTION generate_next_purchase_id();

-- ==========================================
-- INSTRUCTIONS:
-- 1. Copy this entire script.
-- 2. Go to Supabase Dashboard -> SQL Editor.
-- 3. Paste and click "Run".
-- ==========================================
