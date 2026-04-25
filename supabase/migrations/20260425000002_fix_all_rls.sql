-- ═══════════════════════════════════════════
-- Migration: Fix All RLS Policies (Multi-Tenant)
-- Standardizes isolation using org_id and get_my_orgs()
-- ═══════════════════════════════════════════

BEGIN;

-- 1. Helper function for branch isolation (Standardized)
-- This ensures that even if a table only has branch_id, it can still be isolated via org ownership
CREATE OR REPLACE FUNCTION get_my_branches()
RETURNS TABLE (branch_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id FROM public.branches b WHERE b.org_id IN (SELECT org_id FROM get_my_orgs());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clear old restrictive policies
DROP POLICY IF EXISTS tenant_isolation ON employees;
DROP POLICY IF EXISTS employee_access_policy ON employees;
DROP POLICY IF EXISTS tenant_isolation ON drugs;
DROP POLICY IF EXISTS tenant_isolation ON sales;
DROP POLICY IF EXISTS tenant_isolation ON purchases;
DROP POLICY IF EXISTS tenant_isolation ON customers;
DROP POLICY IF EXISTS tenant_isolation ON suppliers;
DROP POLICY IF EXISTS tenant_isolation ON shifts;
DROP POLICY IF EXISTS tenant_isolation ON cash_transactions;
DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
DROP POLICY IF EXISTS tenant_isolation ON returns;

-- 3. Apply Standardized Policies (Using org_id where possible)

-- Employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY employee_tenant_policy ON employees
FOR ALL USING (
  auth_user_id = auth.uid() OR
  org_id IN (SELECT org_id FROM get_my_orgs())
);

-- Drugs
ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY drug_tenant_policy ON drugs
FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));

-- Sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY sale_tenant_policy ON sales
FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));

-- Purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY purchase_tenant_policy ON purchases
FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));

-- Customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_tenant_policy ON customers
FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));

-- Suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_tenant_policy ON suppliers
FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));

-- Shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY shift_tenant_policy ON shifts
FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));

-- Cash Transactions
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_tx_tenant_policy ON cash_transactions
FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));

-- Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_tenant_policy ON audit_logs
FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));

-- Returns
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY return_tenant_policy ON returns
FOR ALL USING (org_id IN (SELECT org_id FROM get_my_orgs()));

-- 4. Handle child tables without org_id (Isolated via branch_id)
-- These still use branch_id but benefit from the fixed get_my_branches() which includes owner context

DROP POLICY IF EXISTS tenant_isolation ON stock_batches;
CREATE POLICY batch_tenant_policy ON stock_batches
FOR ALL USING (branch_id IN (SELECT branch_id FROM get_my_branches()));

DROP POLICY IF EXISTS tenant_isolation ON stock_movements;
CREATE POLICY movement_tenant_policy ON stock_movements
FOR ALL USING (branch_id IN (SELECT branch_id FROM get_my_branches()));

COMMIT;
