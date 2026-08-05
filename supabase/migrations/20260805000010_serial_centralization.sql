-- ══════════════════════════════════════════════════════════════════
-- Serial / Sequence Centralization
--
-- Goal: single source of truth for ALL sequential ID counters, without
-- changing any existing numbering format or value.
--
-- Strategy (zero body-change migration):
--   * Existing RPCs (process_checkout, process_return, purchase_returns,
--     supplier_payments, employees...) already call increment_sequence().
--   * We re-define increment_sequence() to increment a new, richer
--     sequence_counters table (tenant_id, branch_id, doc_type, year)
--     instead of the legacy `sequences` table.
--   * sequence_counters is seeded from the legacy `sequences` so the
--     next generated number continues from where it left off (no dupes).
--   * generate_serial_id() is the single canonical FORMATTING function
--     used by the client and by callers that want a ready-made serial.
-- ══════════════════════════════════════════════════════════════════

-- 1. New central counter table (branch_id nullable => tenant-level ops)
-- NOTE: branch_id is NOT part of the PK — a PK column is forced NOT NULL in
-- Postgres, which would forbid NULL branch_id for tenant-level counters.
-- Uniqueness is enforced by partial unique indexes (see below).
CREATE TABLE IF NOT EXISTS sequence_counters (
  tenant_id    UUID        NOT NULL,
  branch_id    UUID,                      -- NULL for tenant-level (e.g. subscriptions)
  doc_type     TEXT        NOT NULL,
  year         SMALLINT    NOT NULL,
  last_number  BIGINT      NOT NULL DEFAULT 1,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Branch-scoped counters: unique per (tenant, branch, doc_type, year)
CREATE UNIQUE INDEX IF NOT EXISTS uq_sequence_counters_branch_scope
  ON sequence_counters (tenant_id, branch_id, doc_type, year)
  WHERE branch_id IS NOT NULL;

-- Tenant-level counters: unique per (tenant, doc_type, year).
-- Required because NULL branch_id rows would otherwise be considered distinct.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sequence_counters_tenant_scope
  ON sequence_counters (tenant_id, doc_type, year)
  WHERE branch_id IS NULL;

ALTER TABLE sequence_counters ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER functions bypass RLS; block direct writes for safety.
REVOKE ALL ON sequence_counters FROM PUBLIC;
REVOKE ALL ON sequence_counters FROM anon, authenticated;

COMMENT ON TABLE sequence_counters IS
  'Single atomic per-(tenant, branch, doc_type, year) serial counter.';

-- 2. Seed from the legacy `sequences` table so numbering continues unchanged.
DO $$
BEGIN
  IF to_regclass('public.sequences') IS NOT NULL THEN
    INSERT INTO sequence_counters (tenant_id, branch_id, doc_type, year, last_number)
    SELECT
      -- If branch_id matches a real branch, tenant = branch.org_id,
      -- otherwise (org-scoped counters like employees) tenant = branch_id.
      COALESCE(b.org_id, s.branch_id) AS tenant_id,
      s.branch_id,
      s.entity_type,
      date_part('year', now())::smallint,
      s.current_value
    FROM sequences s
    LEFT JOIN branches b ON b.id = s.branch_id
    ON CONFLICT (tenant_id, branch_id, doc_type, year) WHERE branch_id IS NOT NULL DO NOTHING;
  END IF;
END $$;

-- Optional: backfill the sequence_counters schema if a fresh env skipped
-- the legacy table entirely. Ensures a (branch, doc_type) row always exists.
INSERT INTO sequence_counters (tenant_id, branch_id, doc_type, year, last_number)
SELECT DISTINCT
  b.org_id,
  b.id,
  'sales',
  date_part('year', now())::smallint,
  0
FROM branches b
WHERE b.org_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sequence_counters sc
    WHERE sc.branch_id = b.id AND sc.doc_type = 'sales'
      AND sc.year = date_part('year', now())::smallint
  );

-- 3. Resolve tenant for a given (possibly branch) id.
CREATE OR REPLACE FUNCTION resolve_tenant_id(p_branch_id UUID)
RETURNS UUID AS $$
  SELECT COALESCE(
    (SELECT org_id FROM branches WHERE id = p_branch_id),
    p_branch_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Atomic increment — now backed by sequence_counters (single source).
-- Preserves the exact legacy signature so all existing RPCs keep working
-- with no body changes and identical output numbers.
-- NOTE: the legacy 2-arg increment_sequence (from 20260425000000_fix_ui_schema.sql)
-- must be DROPPED first — the new optional p_year param is a different signature,
-- and leaving both would make every existing 2-arg call ambiguous.
DROP FUNCTION IF EXISTS public.increment_sequence(uuid, text);
CREATE OR REPLACE FUNCTION increment_sequence(
  p_branch_id   UUID,
  p_entity_type TEXT,
  p_year        SMALLINT DEFAULT NULL  -- counter year; NULL = current year
)
RETURNS BIGINT AS $$
DECLARE
  v_next BIGINT;
  v_year SMALLINT;
BEGIN
  -- The counter year defaults to the CURRENT year (entry order). generate_serial_id
  -- passes the document's business year (p_date) when provided, so backdated
  -- documents number under the year printed on them. All existing 2-arg callers
  -- keep current-year behavior.
  v_year := COALESCE(p_year, date_part('year', now())::smallint);

  INSERT INTO sequence_counters (tenant_id, branch_id, doc_type, year, last_number)
  VALUES (
    resolve_tenant_id(p_branch_id),
    p_branch_id,
    p_entity_type,
    v_year,
    1
  )
  ON CONFLICT (tenant_id, branch_id, doc_type, year) WHERE branch_id IS NOT NULL
  DO UPDATE SET
    last_number = sequence_counters.last_number + 1,
    updated_at  = NOW()
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Canonical serial FORMATTING. All caller sites (client + future RPC
-- refactors) generate numbers here so layout lives in exactly one place.
--   * p_custom_seq : use a caller-owned sequence (e.g. daily sales number)
--                    instead of incrementing sequence_counters.
--   * p_zero_pad   : zero-pad the sequence to N digits (0 = no padding).
--   * p_raw        : return the raw sequence number as text (no prefix).
CREATE OR REPLACE FUNCTION generate_serial_id(
  p_branch_id   UUID,
  p_doc_type    TEXT,
  p_branch_code TEXT          DEFAULT 'PF',
  p_date        TIMESTAMPTZ   DEFAULT NOW(),
  p_custom_seq  BIGINT        DEFAULT NULL,
  p_zero_pad    INTEGER       DEFAULT 4,
  p_raw         BOOLEAN       DEFAULT false
) RETURNS TEXT AS $$
DECLARE
  v_seq   BIGINT;
  v_year  SMALLINT;
  v_pad   INTEGER;
BEGIN
  -- Get the sequence value (caller-provided, or atomic increment)
  IF p_custom_seq IS NOT NULL THEN
    v_seq := p_custom_seq;
  ELSE
    SELECT increment_sequence(p_branch_id, p_doc_type) INTO v_seq;
  END IF;

  -- Raw passthrough (used by e.g. employees to build EMP-<n> locally)
  IF p_raw THEN
    RETURN v_seq::TEXT;
  END IF;

  v_pad := GREATEST(p_zero_pad, 0);
  v_year := date_part('year', p_date)::smallint;

  -- ── Layout: CURRENT formats, deliberately unchanged ──────────────
  IF p_doc_type = 'sales' THEN
    -- {branchCode}-{YYYYMMDD}-{NNNN} (daily order number)
    RETURN p_branch_code || '-' || to_char(p_date, 'YYYYMMDD') || '-' || LPAD(v_seq::TEXT, 4, '0');

  ELSIF p_doc_type = 'returns' THEN
    -- RET-{YYYYMMDD}-{NNN}
    RETURN 'RET-' || to_char(p_date, 'YYYYMMDD') || LPAD(v_seq::TEXT, 3, '0');

  ELSIF p_doc_type = 'purchase_returns' THEN
    -- PR-{YYYYMMDD}-{NNN}
    RETURN 'PR-' || to_char(p_date, 'YYYYMMDD') || LPAD(v_seq::TEXT, 3, '0');

  ELSIF p_doc_type = 'supplier_payments' THEN
    -- SP-{YYYYMMDD}-{NNN}
    RETURN 'SP-' || to_char(p_date, 'YYYYMMDD') || LPAD(v_seq::TEXT, 3, '0');

  ELSIF p_doc_type = 'inventory' THEN
    -- DRUG-{N}
    RETURN 'DRUG-' || v_seq;

  ELSIF p_doc_type = 'barcodes' THEN
    -- starts at 1000
    RETURN (v_seq + 999)::TEXT;

  ELSIF p_doc_type = 'employees' THEN
    -- EMP-{N}
    RETURN 'EMP-' || v_seq;

  ELSIF p_doc_type = 'customers-serial' THEN
    -- {branchCode}-{N} (pad controlled by caller: serialId=4, code=0)
    RETURN p_branch_code || '-' ||
      CASE WHEN v_pad > 0 THEN LPAD(v_seq::TEXT, v_pad, '0') ELSE v_seq::TEXT END;

  ELSE
    -- generic default: {branchCode}-{NNNN}
    RETURN p_branch_code || '-' || LPAD(v_seq::TEXT, v_pad, '0');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_serial_id IS
  'Single source of truth for serial generation. Layout variants map to '
  'their current formats. Call increment_sequence() for raw numbers when '
  'the caller formats independently (daily sales / employees).';