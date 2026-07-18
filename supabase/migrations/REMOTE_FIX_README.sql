-- ═══════════════════════════════════════════════════════════════════════
-- REMOTE FIX: RLS Infinite Recursion
-- ═══════════════════════════════════════════════════════════════════════
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- Alternatively, run: npx supabase db push  (if Docker is running)
-- ═══════════════════════════════════════════════════════════════════════

-- ============================================================
-- PART 1: Fix the root cause — convert SQL functions to plpgsql
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT org_id FROM public.org_members WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_branch_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT b.id FROM public.branches b
  WHERE b.org_id IN (SELECT get_user_org_ids());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;

-- ============================================================
-- PART 2: Clean up duplicate/overlapping RLS policies on "sales"
-- ============================================================
BEGIN;

DROP POLICY IF EXISTS "Employees can view branch sales" ON sales;
DROP POLICY IF EXISTS sale_tenant_policy ON sales;

-- Single clean policy (get_user_org_ids is now safe — plpgsql)
CREATE POLICY sales_isolation ON sales
  FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

COMMIT;

-- ============================================================
-- PART 3: Clean up stale tenant_isolation policies on other tables
-- ============================================================
BEGIN;

DROP POLICY IF EXISTS tenant_isolation ON sale_items;
DROP POLICY IF EXISTS tenant_isolation ON sale_item_batches;
DROP POLICY IF EXISTS tenant_isolation ON return_items;
DROP POLICY IF EXISTS tenant_isolation ON purchase_returns;
DROP POLICY IF EXISTS tenant_isolation ON purchase_return_items;
DROP POLICY IF EXISTS tenant_isolation ON purchase_items;
DROP POLICY IF EXISTS tenant_isolation ON stock_batches;
DROP POLICY IF EXISTS tenant_isolation ON stock_movements;

DROP POLICY IF EXISTS batch_select_policy ON stock_batches;
DROP POLICY IF EXISTS batch_tenant_policy ON stock_batches;
DROP POLICY IF EXISTS movement_select_policy ON stock_movements;
DROP POLICY IF EXISTS movement_tenant_policy ON stock_movements;

CREATE POLICY sale_items_isolation ON sale_items
  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

CREATE POLICY sale_item_batches_isolation ON sale_item_batches
  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

CREATE POLICY return_items_isolation ON return_items
  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

CREATE POLICY purchase_items_isolation ON purchase_items
  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

CREATE POLICY purchase_returns_isolation ON purchase_returns
  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

CREATE POLICY purchase_return_items_isolation ON purchase_return_items
  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

-- stock_batches: use org_id (add column if needed)
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE stock_batches sb SET org_id = b.org_id FROM branches b WHERE sb.branch_id = b.id AND sb.org_id IS NULL;
CREATE POLICY batch_isolation ON stock_batches
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

-- stock_movements: use org_id (add column if needed)
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE stock_movements sm SET org_id = b.org_id FROM branches b WHERE sm.branch_id = b.id AND sm.org_id IS NULL;
CREATE POLICY movement_isolation ON stock_movements
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

COMMIT;

-- ═══════════════════════════════════════════
-- VERIFICATION: Run these queries to confirm the fix
-- ═══════════════════════════════════════════

-- Check function volatility (should show plpgsql, not sql)
SELECT proname, prolang::regproc, prosecdef
FROM pg_proc
WHERE proname IN ('get_user_org_ids', 'get_user_branch_ids');

-- Check sales policies (should show only 1: sales_isolation)
SELECT schemaname, tablename, policyname, permissive
FROM pg_policies
WHERE tablename = 'sales';

-- Check for any remaining tenant_isolation policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE policyname LIKE 'tenant_isolation%';
