-- ═══════════════════════════════════════════
-- Migration: Add items JSONB column to sales
-- Stores cart items directly on the sale record
-- ═══════════════════════════════════════════

BEGIN;

-- Add items as JSONB to sales table for direct access
ALTER TABLE sales ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Also add missing columns that the frontend uses
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax NUMERIC(10,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_street_address TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_employee_id UUID REFERENCES employees(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS shift_transaction_recorded BOOLEAN DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS net_total NUMERIC(12,2);

-- Same for purchases — add items JSONB
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS received_by TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

COMMIT;
