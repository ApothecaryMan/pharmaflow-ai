-- ═══════════════════════════════════════════
-- Global Drug Catalog — Local-First Search Infrastructure
-- ═══════════════════════════════════════════

-- 1. Create the Global Catalog Table
-- This table stores non-branch-specific data for all known medications.
CREATE TABLE global_drugs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en             TEXT NOT NULL,
  name_ar             TEXT,
  active_substance    TEXT,      -- Comma-separated or single string for fast searching
  barcode             TEXT UNIQUE,
  category            TEXT,
  public_price        NUMERIC(10,2),
  manufacturer        TEXT,
  dosage_form         TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- 2. Performance & Sync Indexes
-- Optimized for Delta Sync (getting only changes since last visit)
CREATE INDEX idx_global_drugs_updated_at ON global_drugs (updated_at DESC);
-- Optimized for Barcode lookups
CREATE INDEX idx_global_drugs_barcode ON global_drugs (barcode);
-- Trigram index for partial name search (optional, if we query server-side)
CREATE INDEX idx_global_drugs_name_en ON global_drugs USING gin(to_tsvector('simple', name_en));
CREATE INDEX idx_global_drugs_name_ar ON global_drugs USING gin(to_tsvector('simple', COALESCE(name_ar, '')));

-- 3. Automate updated_at column
CREATE TRIGGER handle_updated_at_global_drugs 
BEFORE UPDATE ON global_drugs 
FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- 4. Enable RLS (Read-only for all authenticated users)
ALTER TABLE global_drugs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read-only access to global catalog"
ON global_drugs FOR SELECT
TO authenticated
USING (true);

-- 5. Link local drugs to global catalog (Optional Bridge)
-- This allows local branches to reference the master record while keeping their stock data.
ALTER TABLE drugs ADD COLUMN IF NOT EXISTS global_drug_id UUID REFERENCES global_drugs(id);

-- 6. Add to Realtime Publication (if needed for instant updates)
-- ALTER PUBLICATION supabase_realtime ADD TABLE global_drugs;
