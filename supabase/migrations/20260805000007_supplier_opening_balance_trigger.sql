-- ============================================================
-- T2.5 — fn_sync_supplier_opening_balance trigger
-- Date: 2026-08-05
--
-- Keeps the opening balance flowing through the SAME ledger as every
-- other movement: inserting/updating suppliers.opening_balance upserts
-- a single ('opening_balance', amount) ledger entry so the supplier
-- statement always starts from the right base.
-- get_supplier_balance() counts s.opening_balance directly and excludes
-- the ledger opening row, so nothing is double-counted.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_sync_supplier_opening_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO supplier_ledger_entries (
        branch_id, org_id, supplier_id, entry_type, source_table, source_id, date, amount
    ) VALUES (
        NEW.branch_id, NEW.org_id, NEW.id, 'opening_balance', 'suppliers', NEW.id,
        CURRENT_DATE, COALESCE(NEW.opening_balance, 0)
    )
    ON CONFLICT (source_table, source_id, entry_type)
    DO UPDATE SET amount = EXCLUDED.amount, date = EXCLUDED.date;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_supplier_opening_balance ON suppliers;
CREATE TRIGGER trg_sync_supplier_opening_balance
AFTER INSERT OR UPDATE OF opening_balance ON suppliers
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_supplier_opening_balance();

COMMIT;
