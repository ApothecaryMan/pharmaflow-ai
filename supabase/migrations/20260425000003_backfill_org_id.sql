-- ═══════════════════════════════════════════
-- Migration: Backfill org_id and Auto-Population Trigger
-- Ensures all multi-tenant tables have correct org_id based on branch_id
-- ═══════════════════════════════════════════

BEGIN;

-- 1. Helper Function to populate org_id from branch_id
CREATE OR REPLACE FUNCTION fn_populate_org_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.org_id IS NULL AND NEW.branch_id IS NOT NULL THEN
        SELECT org_id INTO NEW.org_id FROM public.branches WHERE id = NEW.branch_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply Trigger to all relevant tables
-- This ensures that even if the frontend misses org_id, the DB fills it correctly

-- Shifts
DROP TRIGGER IF EXISTS trg_populate_org_id_shifts ON shifts;
CREATE TRIGGER trg_populate_org_id_shifts
BEFORE INSERT ON shifts
FOR EACH ROW EXECUTE FUNCTION fn_populate_org_id();

-- Cash Transactions
DROP TRIGGER IF EXISTS trg_populate_org_id_cash_tx ON cash_transactions;
CREATE TRIGGER trg_populate_org_id_cash_tx
BEFORE INSERT ON cash_transactions
FOR EACH ROW EXECUTE FUNCTION fn_populate_org_id();

-- Drugs
DROP TRIGGER IF EXISTS trg_populate_org_id_drugs ON drugs;
CREATE TRIGGER trg_populate_org_id_drugs
BEFORE INSERT ON drugs
FOR EACH ROW EXECUTE FUNCTION fn_populate_org_id();

-- Sales
DROP TRIGGER IF EXISTS trg_populate_org_id_sales ON sales;
CREATE TRIGGER trg_populate_org_id_sales
BEFORE INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION fn_populate_org_id();

-- Purchases
DROP TRIGGER IF EXISTS trg_populate_org_id_purchases ON purchases;
CREATE TRIGGER trg_populate_org_id_purchases
BEFORE INSERT ON purchases
FOR EACH ROW EXECUTE FUNCTION fn_populate_org_id();

-- Customers
DROP TRIGGER IF EXISTS trg_populate_org_id_customers ON customers;
CREATE TRIGGER trg_populate_org_id_customers
BEFORE INSERT ON customers
FOR EACH ROW EXECUTE FUNCTION fn_populate_org_id();

-- Employees
DROP TRIGGER IF EXISTS trg_populate_org_id_employees ON employees;
CREATE TRIGGER trg_populate_org_id_employees
BEFORE INSERT ON employees
FOR EACH ROW EXECUTE FUNCTION fn_populate_org_id();

-- Suppliers
DROP TRIGGER IF EXISTS trg_populate_org_id_suppliers ON suppliers;
CREATE TRIGGER trg_populate_org_id_suppliers
BEFORE INSERT ON suppliers
FOR EACH ROW EXECUTE FUNCTION fn_populate_org_id();

-- Audit Logs
DROP TRIGGER IF EXISTS trg_populate_org_id_audit_logs ON audit_logs;
CREATE TRIGGER trg_populate_org_id_audit_logs
BEFORE INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION fn_populate_org_id();

-- Returns
DROP TRIGGER IF EXISTS trg_populate_org_id_returns ON returns;
CREATE TRIGGER trg_populate_org_id_returns
BEFORE INSERT ON returns
FOR EACH ROW EXECUTE FUNCTION fn_populate_org_id();


-- 3. Backfill existing data
UPDATE drugs SET org_id = (SELECT org_id FROM branches WHERE branches.id = drugs.branch_id) WHERE org_id IS NULL;
UPDATE sales SET org_id = (SELECT org_id FROM branches WHERE branches.id = sales.branch_id) WHERE org_id IS NULL;
UPDATE purchases SET org_id = (SELECT org_id FROM branches WHERE branches.id = purchases.branch_id) WHERE org_id IS NULL;
UPDATE customers SET org_id = (SELECT org_id FROM branches WHERE branches.id = customers.branch_id) WHERE org_id IS NULL;
UPDATE employees SET org_id = (SELECT org_id FROM branches WHERE branches.id = employees.branch_id) WHERE org_id IS NULL;
UPDATE suppliers SET org_id = (SELECT org_id FROM branches WHERE branches.id = suppliers.branch_id) WHERE org_id IS NULL;
UPDATE shifts SET org_id = (SELECT org_id FROM branches WHERE branches.id = shifts.branch_id) WHERE org_id IS NULL;
UPDATE cash_transactions SET org_id = (SELECT org_id FROM branches WHERE branches.id = cash_transactions.branch_id) WHERE org_id IS NULL;
UPDATE audit_logs SET org_id = (SELECT org_id FROM branches WHERE branches.id = audit_logs.branch_id) WHERE org_id IS NULL;
UPDATE returns SET org_id = (SELECT org_id FROM branches WHERE branches.id = returns.branch_id) WHERE org_id IS NULL;

COMMIT;
