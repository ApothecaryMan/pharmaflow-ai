-- ═══════════════════════════════════════════════════════════════
-- Migration: Clean Up Duplicate & Unsafe RLS Policies
--
-- After converting get_user_org_ids/get_user_branch_ids to plpgsql
-- (20260717000000), some tables still have:
--   1. Stale tenant_isolation policies from 20260329 that were never
--      properly cleaned up (stock_batches, stock_movements, etc.)
--   2. Duplicate/overlapping policies on sales (3 policies)
--   3. Policies still referencing branch_id with get_user_branch_ids
--      instead of org_id with get_user_org_ids (now safe after fix)
--
-- This migration consolidates to ONE clean policy per table.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════
-- 1. Drop stale tenant_isolation policies (from 20260329)
--    All are replaced below with clean single-policy definitions.
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS tenant_isolation ON sale_items;
DROP POLICY IF EXISTS tenant_isolation ON sale_item_batches;
DROP POLICY IF EXISTS tenant_isolation ON return_items;
DROP POLICY IF EXISTS tenant_isolation ON purchase_returns;
DROP POLICY IF EXISTS tenant_isolation ON purchase_return_items;
DROP POLICY IF EXISTS tenant_isolation ON purchase_items;
DROP POLICY IF EXISTS tenant_isolation ON stock_batches;
DROP POLICY IF EXISTS tenant_isolation ON stock_movements;

-- ═══════════════════════════════════════════════
-- 2. Clean up duplicate policies on "sales"
--    It had 3 overlapping policies:
--     - tenant_isolation (20260329) → DROPPED by 20260425
--     - sale_tenant_policy (20260425) → uses get_my_orgs() ✅
--     - "Employees can view branch sales" (20260515) → direct query ✅
--    Safe to drop both old ones and keep one clean policy.
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS "Employees can view branch sales" ON sales;
DROP POLICY IF EXISTS sale_tenant_policy ON sales;

-- Single clean policy using get_user_org_ids (now plpgsql, safe from inlining)
CREATE POLICY sales_isolation ON sales
  FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- ═══════════════════════════════════════════════
-- 3. Clean up duplicate policies on "branches"
--    Had: org_branch_access (20260329, dropped by 20260425)
--         branch_access_policy (20260425) ✅
-- ═══════════════════════════════════════════════

-- branch_access_policy from 20260425 already uses get_my_orgs() ✅
-- Nothing to do here unless we want to unify naming.

-- ═══════════════════════════════════════════════
-- 4. Consolidate stock_batches to ONE policy
--    Had: tenant_isolation (20260329, missed in cleanup)
--         batch_tenant_policy (20260425, dropped by 20260619)
--         batch_select_policy (20260619, dropped by 20260620)
--         batch_select_policy (20260620, current)
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS batch_select_policy ON stock_batches;
DROP POLICY IF EXISTS batch_tenant_policy ON stock_batches;

-- Use org_id isolation where possible
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE stock_batches sb SET org_id = b.org_id FROM branches b WHERE sb.branch_id = b.id AND sb.org_id IS NULL;

CREATE POLICY batch_isolation ON stock_batches
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

-- ═══════════════════════════════════════════════
-- 5. Consolidate stock_movements to ONE policy
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS movement_select_policy ON stock_movements;
DROP POLICY IF EXISTS movement_tenant_policy ON stock_movements;

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE stock_movements sm SET org_id = b.org_id FROM branches b WHERE sm.branch_id = b.id AND sm.org_id IS NULL;

CREATE POLICY movement_isolation ON stock_movements
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

-- ═══════════════════════════════════════════════
-- 6. Clean up remaining child tables (branch_id only)
--    Use safe get_user_branch_ids() which is now plpgsql
-- ═══════════════════════════════════════════════

DROP POLICY IF EXISTS tenant_isolation ON sale_items;
CREATE POLICY sale_items_isolation ON sale_items
  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

DROP POLICY IF EXISTS tenant_isolation ON sale_item_batches;
CREATE POLICY sale_item_batches_isolation ON sale_item_batches
  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

DROP POLICY IF EXISTS tenant_isolation ON return_items;
CREATE POLICY return_items_isolation ON return_items
  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

DROP POLICY IF EXISTS tenant_isolation ON purchase_items;
CREATE POLICY purchase_items_isolation ON purchase_items
  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

DROP POLICY IF EXISTS tenant_isolation ON purchase_returns;
CREATE POLICY purchase_returns_isolation ON purchase_returns
  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

DROP POLICY IF EXISTS tenant_isolation ON purchase_return_items;
CREATE POLICY purchase_return_items_isolation ON purchase_return_items
  FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

-- ═══════════════════════════════════════════════
-- 7. Ensure all tables have org_id where possible
--    (for future-proofing, add org_id columns)
-- ═══════════════════════════════════════════════

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE sale_items si SET org_id = s.org_id FROM sales s WHERE si.sale_id = s.id AND si.org_id IS NULL;

ALTER TABLE sale_item_batches ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE sale_item_batches sib SET org_id = s.org_id FROM sales s JOIN sale_items si ON si.sale_id = s.id WHERE sib.sale_item_id = si.id AND sib.org_id IS NULL;

ALTER TABLE return_items ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE return_items ri SET org_id = r.org_id FROM returns r WHERE ri.return_id = r.id AND ri.org_id IS NULL;

ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE purchase_items pi SET org_id = p.org_id FROM purchases p WHERE pi.purchase_id = p.id AND pi.org_id IS NULL;

ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE purchase_returns pr SET org_id = p.org_id FROM purchases p WHERE pr.purchase_id = p.id AND pr.org_id IS NULL;

ALTER TABLE purchase_return_items ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE purchase_return_items pri SET org_id = pr.org_id FROM purchase_returns pr WHERE pri.purchase_return_id = pr.id AND pri.org_id IS NULL;

COMMIT;
