-- ============================================================
-- T2.4 — Supplier account read functions
-- Date: 2026-08-05
--
-- get_supplier_balance    → live payable balance.
-- get_supplier_statement  → chronological ledger rows for a supplier
--                           with running balance (period-aware start).
-- get_supplier_aging      → per-purchase REMAINING amount bucketed by
--                           due_date. remaining = total_cost
--                           − Σ(allocations, not voided)
--                           − Σ(credit notes on the invoice).
--                           NEVER the raw total_cost, NEVER a naive SUM
--                           of ledger entries.
--
-- All three are invoker-rights + RLS-filtered (org isolation via
-- get_my_orgs() on the underlying tables).
--
-- The opening balance is carried by suppliers.opening_balance only: the
-- trigger-written ('opening_balance', …) ledger row is EXCLUDED from the
-- statement's prior/period sets (like get_supplier_balance) so it is not
-- counted twice — running balance = s.opening_balance + Σ(non-opening).
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_supplier_balance(p_supplier_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(s.opening_balance, 0)
         + COALESCE((
               SELECT SUM(l.amount) FROM supplier_ledger_entries l
               WHERE l.supplier_id = s.id AND l.entry_type <> 'opening_balance'
           ), 0)
    FROM suppliers s
    WHERE s.id = p_supplier_id;
$$;

-- ── Statement ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_supplier_statement(
    p_supplier_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    entry_date DATE,
    entry_type TEXT,
    source_table TEXT,
    source_id UUID,
    debit NUMERIC,
    credit NUMERIC,
    running_balance NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    WITH base AS (
        SELECT s.id AS supplier_id,
               COALESCE(s.opening_balance, 0) AS opening,
               COALESCE(p_date_from, '1900-01-01'::DATE) AS d_from,
               COALESCE(p_date_to, '9999-12-31'::DATE) AS d_to
        FROM suppliers s
        WHERE s.id = p_supplier_id
    ),
    prior AS (
        SELECT COALESCE(SUM(l.amount), 0) AS prior_amount
        FROM supplier_ledger_entries l
        WHERE l.supplier_id = (SELECT supplier_id FROM base)
          AND l.entry_type <> 'opening_balance'
          AND l.date < (SELECT d_from FROM base)
    ),
    period AS (
        SELECT l.date, l.entry_type, l.source_table, l.source_id, l.amount, l.created_at
        FROM supplier_ledger_entries l
        WHERE l.supplier_id = (SELECT supplier_id FROM base)
          AND l.entry_type <> 'opening_balance'
          AND l.date BETWEEN (SELECT d_from FROM base) AND (SELECT d_to FROM base)
    )
    SELECT
        p.date AS entry_date,
        p.entry_type::text,
        p.source_table::text,
        p.source_id,
        CASE WHEN p.amount >= 0 THEN p.amount ELSE 0 END AS debit,
        CASE WHEN p.amount < 0 THEN -p.amount ELSE 0 END AS credit,
        (SELECT b.opening + r.prior_amount FROM base b, prior r)
        + SUM(p.amount) OVER (ORDER BY p.date, p.created_at, p.source_id ROWS UNBOUNDED PRECEDING) AS running_balance
    FROM period p
    ORDER BY p.date, p.created_at, p.source_id;
$$;

-- ── Aging ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_supplier_aging(
    p_branch_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    supplier_id UUID,
    supplier_name TEXT,
    current_amount NUMERIC,
    due_1_30 NUMERIC,
    due_31_60 NUMERIC,
    due_61_90 NUMERIC,
    due_over_90 NUMERIC,
    total_open NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        s.id AS supplier_id,
        s.name AS supplier_name,
        COALESCE(SUM(CASE WHEN (COALESCE(p_as_of_date, CURRENT_DATE) - COALESCE(p.due_date, p.date::DATE)) <= 0 THEN o.open_amount ELSE 0 END), 0) AS current_amount,
        COALESCE(SUM(CASE WHEN (COALESCE(p_as_of_date, CURRENT_DATE) - COALESCE(p.due_date, p.date::DATE)) BETWEEN 1 AND 30 THEN o.open_amount ELSE 0 END), 0) AS due_1_30,
        COALESCE(SUM(CASE WHEN (COALESCE(p_as_of_date, CURRENT_DATE) - COALESCE(p.due_date, p.date::DATE)) BETWEEN 31 AND 60 THEN o.open_amount ELSE 0 END), 0) AS due_31_60,
        COALESCE(SUM(CASE WHEN (COALESCE(p_as_of_date, CURRENT_DATE) - COALESCE(p.due_date, p.date::DATE)) BETWEEN 61 AND 90 THEN o.open_amount ELSE 0 END), 0) AS due_61_90,
        COALESCE(SUM(CASE WHEN (COALESCE(p_as_of_date, CURRENT_DATE) - COALESCE(p.due_date, p.date::DATE)) > 90 THEN o.open_amount ELSE 0 END), 0) AS due_over_90,
        COALESCE(SUM(o.open_amount), 0) AS total_open
    FROM suppliers s
    JOIN purchases p
      ON p.supplier_id = s.id
     AND p.branch_id = p_branch_id
     AND p.status IN ('received', 'completed')
    JOIN LATERAL (SELECT fn_purchase_open_amount(p.id) AS open_amount) o ON o.open_amount > 0
    WHERE s.branch_id = p_branch_id
    GROUP BY s.id, s.name
    ORDER BY s.name;
$$;

COMMIT;
