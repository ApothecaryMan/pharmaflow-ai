-- ═══════════════════════════════════════════
-- Migration: Fix Schema to match UI Requirements
-- Adds missing columns used in the frontend
-- ═══════════════════════════════════════════

BEGIN;

-- 1. Drugs Table Fixes
ALTER TABLE drugs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE drugs ADD COLUMN IF NOT EXISTS additional_barcodes JSONB DEFAULT '[]';
ALTER TABLE drugs ADD COLUMN IF NOT EXISTS item_rank TEXT DEFAULT 'normal';

-- 2. Purchases Table Fixes
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS invoice_id TEXT;

-- 3. Employees Table Fixes
-- Sync with UI and avoid hallucinated names
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS national_id_card TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS national_id_card_back TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS main_syndicate_card TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sub_syndicate_card TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS biometric_credential_id TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS biometric_public_key TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password TEXT; 

-- 4. Adding org_id to core tables to support multi-tenant isolation in code
ALTER TABLE drugs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS modification_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE returns ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- 5. Atomic Sequence Management for Online-Only Serial IDs
CREATE TABLE IF NOT EXISTS branch_sequences (
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    last_value BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (branch_id, entity_type)
);

-- Function to get the next sequence value atomically
CREATE OR REPLACE FUNCTION increment_sequence(p_branch_id UUID, p_entity_type TEXT)
RETURNS BIGINT AS $$
DECLARE
    next_val BIGINT;
BEGIN
    INSERT INTO branch_sequences (branch_id, entity_type, last_value)
    VALUES (p_branch_id, p_entity_type, 1)
    ON CONFLICT (branch_id, entity_type)
    DO UPDATE SET last_value = branch_sequences.last_value + 1, updated_at = now()
    RETURNING last_value INTO next_val;
    
    RETURN next_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
