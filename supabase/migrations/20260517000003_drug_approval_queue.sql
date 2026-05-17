-- ══════════════════════════════════════════════════════════════
-- Migration: Drug Approval Queue
-- Created: 2026-05-17
-- Description: Staging table and workflow for global drug additions.
--              New global drugs are staged first in a pending state,
--              requiring pharmacy approval before entering local stock.
-- ══════════════════════════════════════════════════════════════

-- 1. Create drug approval status enum and table
CREATE TYPE drug_approval_status AS ENUM ('pending', 'approved', 'suspended');

CREATE TABLE IF NOT EXISTS drug_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_drug_id  UUID NOT NULL REFERENCES global_drugs(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status          drug_approval_status NOT NULL DEFAULT 'pending',
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Unique index to prevent duplicate approvals for the same global drug per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_drug_approvals_unique ON drug_approvals (global_drug_id, org_id);
CREATE INDEX IF NOT EXISTS idx_drug_approvals_org ON drug_approvals (org_id);
CREATE INDEX IF NOT EXISTS idx_drug_approvals_status ON drug_approvals (status);

-- Enable RLS
ALTER TABLE drug_approvals ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policy
DROP POLICY IF EXISTS tenant_isolation ON drug_approvals;
CREATE POLICY tenant_isolation ON drug_approvals 
  FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Trigger handle_updated_at_drug_approvals
DROP TRIGGER IF EXISTS handle_updated_at_drug_approvals ON drug_approvals;
CREATE TRIGGER handle_updated_at_drug_approvals BEFORE UPDATE ON drug_approvals
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- 2. Drop old automatic sync trigger that was bypassing approval
DROP TRIGGER IF EXISTS trg_sync_new_global_drug ON global_drugs;

-- 3. Create the function that registers new global drugs as pending approvals for all orgs
CREATE OR REPLACE FUNCTION sync_new_global_drug_to_approvals()
RETURNS TRIGGER AS $$
DECLARE
    v_org RECORD;
BEGIN
    FOR v_org IN (SELECT id FROM organizations) LOOP
        INSERT INTO drug_approvals (global_drug_id, org_id, status)
        VALUES (NEW.id, v_org.id, 'pending')
        ON CONFLICT (global_drug_id, org_id) DO NOTHING;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebind trigger to global_drugs
DROP TRIGGER IF EXISTS trg_sync_new_global_drug_approvals ON global_drugs;
CREATE TRIGGER trg_sync_new_global_drug_approvals
AFTER INSERT ON global_drugs
FOR EACH ROW
EXECUTE FUNCTION sync_new_global_drug_to_approvals();

-- 4. Create atomic database function to approve drug approvals into active inventory
CREATE OR REPLACE FUNCTION approve_global_drugs(
  p_approval_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
  v_approval RECORD;
  v_branch RECORD;
  v_global RECORD;
BEGIN
  -- Loop through each approval
  FOR v_approval IN (
    SELECT da.id, da.global_drug_id, da.org_id 
    FROM drug_approvals da
    WHERE da.id = ANY(p_approval_ids)
      AND da.status = 'pending'
      -- Security check: user must belong to this org
      AND da.org_id IN (SELECT get_user_org_ids())
  ) LOOP
    
    -- Get global drug info
    SELECT * INTO v_global FROM global_drugs WHERE id = v_approval.global_drug_id;
    
    -- Mark approval as approved
    UPDATE drug_approvals 
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = v_approval.id;
    
    -- Loop through all branches of this organization and insert the drug
    FOR v_branch IN (
      SELECT id FROM branches WHERE org_id = v_approval.org_id
    ) LOOP
      INSERT INTO drugs (
          global_drug_id, 
          branch_id, 
          org_id, 
          name, 
          name_arabic, 
          generic_name, 
          category, 
          public_price, 
          cost_price, 
          stock, 
          barcode, 
          dosage_form, 
          manufacturer, 
          status,
          item_rank
      )
      VALUES (
          v_global.id, 
          v_branch.id, 
          v_approval.org_id, 
          v_global.name_en, 
          v_global.name_ar,
          CASE 
              WHEN v_global.active_substance IS NOT NULL AND v_global.active_substance <> '' 
              THEN ARRAY(SELECT trim(s) FROM unnest(string_to_array(v_global.active_substance, ',')) s)
              ELSE ARRAY[]::TEXT[]
          END,
          COALESCE(v_global.category, 'غير مصنف'), 
          COALESCE(v_global.public_price, 0), 
          0, -- cost_price = 0
          0, -- stock = 0
          v_global.barcode, 
          v_global.dosage_form, 
          v_global.manufacturer, 
          'active',
          'normal'
      )
      ON CONFLICT (branch_id, barcode) DO UPDATE 
      SET global_drug_id = EXCLUDED.global_drug_id,
          name = EXCLUDED.name,
          name_arabic = EXCLUDED.name_arabic;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
