-- ============================================================
-- T1.2 — Supplier account ledger, payments, and allocations
-- Date: 2026-08-05
--
-- supplier_ledger_entries  — SINGLE SOURCE OF TRUTH for the supplier
--   payable. Every balance movement is one signed row (+ = we owe,
--   − = reduces debt), written atomically inside its RPC. Balance,
--   statement, and aging are all SUM derivations over this table.
--   entry_type / source_table are ENUMs (not free TEXT) and include
--   dedicated *_reversal values so the UNIQUE(source, entry_type)
--   guard survives reversals. reversal_of links a reversing entry to
--   the original it cancels.
--
-- supplier_payments        — one payment record (receipt-time immediate
--   payment or later settlement). Allocation to invoices is REQUIRED
--   (see record_supplier_payment) so aging stays exact.
--
-- supplier_payment_allocations — ties each paid unit to a specific
--   purchase. Required for per-invoice aging math.
-- ============================================================

BEGIN;

-- ── 1. ENUMs ─────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'supplier_ledger_entry_type') THEN
        CREATE TYPE supplier_ledger_entry_type AS ENUM (
            'opening_balance', 'purchase', 'credit_note', 'payment',
            'purchase_reversal', 'credit_note_reversal', 'payment_reversal'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'supplier_ledger_source') THEN
        CREATE TYPE supplier_ledger_source AS ENUM (
            'suppliers', 'purchases', 'purchase_returns', 'supplier_payments'
        );
    END IF;
END $$;

-- ── 2. supplier_ledger_entries ───────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_ledger_entries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    org_id        UUID REFERENCES organizations(id),
    supplier_id   UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    entry_type    supplier_ledger_entry_type NOT NULL,
    source_table  supplier_ledger_source NOT NULL,
    source_id     UUID NOT NULL,
    date          DATE NOT NULL,
    amount        NUMERIC(12,2) NOT NULL,
    due_date      DATE,
    reversal_of   UUID REFERENCES supplier_ledger_entries(id),
    created_by    UUID REFERENCES employees(id),
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE (source_table, source_id, entry_type)
);

CREATE INDEX IF NOT EXISTS idx_sle_supplier_date ON supplier_ledger_entries(supplier_id, date);
CREATE INDEX IF NOT EXISTS idx_sle_supplier_id ON supplier_ledger_entries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sle_source ON supplier_ledger_entries(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_sle_due_date ON supplier_ledger_entries(due_date);

-- ── 3. supplier_payments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_payments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id        UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    org_id           UUID REFERENCES organizations(id),
    serial_id        TEXT,
    supplier_id      UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    date             DATE NOT NULL,
    amount           NUMERIC(12,2) NOT NULL,
    payment_method   payment_method NOT NULL DEFAULT 'cash',
    reference        TEXT,
    notes            TEXT,
    voided_at        TIMESTAMPTZ,
    created_by       UUID REFERENCES employees(id),
    created_by_name  TEXT,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now(),
    version          INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_date ON supplier_payments(supplier_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_payments_serial_branch ON supplier_payments(branch_id, serial_id) WHERE serial_id IS NOT NULL;

-- ── 4. supplier_payment_allocations ──────────────────────────
CREATE TABLE IF NOT EXISTS supplier_payment_allocations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
    payment_id   UUID NOT NULL REFERENCES supplier_payments(id) ON DELETE CASCADE,
    purchase_id  UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    amount       NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spa_payment_id ON supplier_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_spa_purchase_id ON supplier_payment_allocations(purchase_id);
CREATE INDEX IF NOT EXISTS idx_spa_org_id ON supplier_payment_allocations(org_id);

-- ── 5. RLS (same org-isolation pattern as purchases/suppliers) ─
ALTER TABLE supplier_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY sle_tenant_policy ON supplier_ledger_entries
FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));
CREATE POLICY sp_tenant_policy ON supplier_payments
FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));
CREATE POLICY spa_tenant_policy ON supplier_payment_allocations
FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));

COMMIT;
