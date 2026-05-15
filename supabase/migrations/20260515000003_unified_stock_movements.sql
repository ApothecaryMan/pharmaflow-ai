-- ═══════════════════════════════════════════
-- Unified Stock Movement System
-- Centralizes all inventory logic in the database using Triggers
-- ═══════════════════════════════════════════

BEGIN;

-- 1. Schema Fixes: Add org_id to missing inventory tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_batches' AND column_name = 'org_id') THEN
        ALTER TABLE stock_batches ADD COLUMN org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'org_id') THEN
        ALTER TABLE stock_movements ADD COLUMN org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_item_batches' AND column_name = 'org_id') THEN
        ALTER TABLE sale_item_batches ADD COLUMN org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Ensure org_id auto-population
DROP TRIGGER IF EXISTS trg_populate_org_id_stock_batches ON stock_batches;
CREATE TRIGGER trg_populate_org_id_stock_batches
BEFORE INSERT ON stock_batches
FOR EACH ROW EXECUTE FUNCTION fn_populate_org_id();

DROP TRIGGER IF EXISTS trg_populate_org_id_stock_movements ON stock_movements;
CREATE TRIGGER trg_populate_org_id_stock_movements
BEFORE INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION fn_populate_org_id();

-- 3. Stock Movement Trigger Function
CREATE OR REPLACE FUNCTION fn_log_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_type movement_type;
    v_ref_id UUID;
    v_perf_id UUID;
    v_perf_name TEXT;
    v_reason TEXT;
    v_notes TEXT;
    v_prev_stock INT;
    v_diff INT;
    v_drug_name TEXT;
    v_public_price DECIMAL;
    v_cost_price DECIMAL;
    v_units_per_pack INT;
    v_unit_public_price DECIMAL;
    v_unit_cost_price DECIMAL;
BEGIN
    -- 0. Get Context from Session Variables
    v_type := COALESCE(current_setting('app.movement_type', true)::movement_type, 'adjustment');
    v_ref_id := NULLIF(current_setting('app.movement_reference_id', true), '')::UUID;
    v_perf_id := NULLIF(current_setting('app.movement_performer_id', true), '')::UUID;
    v_perf_name := current_setting('app.movement_performer_name', true);
    v_reason := current_setting('app.movement_reason', true);
    v_notes := current_setting('app.movement_notes', true);

    -- 1. Identify Actor if not set (fallback to auth.uid)
    IF v_perf_id IS NULL THEN
        SELECT id, name INTO v_perf_id, v_perf_name 
        FROM public.employees 
        WHERE auth_user_id = auth.uid() 
        LIMIT 1;
    END IF;

    -- 2. Get Drug Metadata for Snapshot
    SELECT 
        TRIM(COALESCE(name, '') || ' ' || COALESCE(dosage_form, '')),
        public_price, cost_price, stock, units_per_pack 
    INTO v_drug_name, v_public_price, v_cost_price, v_prev_stock, v_units_per_pack
    FROM public.drugs WHERE id = COALESCE(NEW.drug_id, OLD.drug_id);

    -- 2.1 Calculate Unit Prices
    v_units_per_pack := COALESCE(NULLIF(v_units_per_pack, 0), 1);
    v_unit_public_price := v_public_price / v_units_per_pack;
    v_unit_cost_price := v_cost_price / v_units_per_pack;

    -- 3. Calculate Difference
    IF TG_OP = 'INSERT' THEN
        v_diff := NEW.quantity;
    ELSIF TG_OP = 'UPDATE' THEN
        v_diff := NEW.quantity - OLD.quantity;
    ELSE -- DELETE
        v_diff := -OLD.quantity;
    END IF;

    -- Skip if no change
    IF v_diff = 0 THEN RETURN NEW; END IF;

    -- 4. Record Movement
    INSERT INTO public.stock_movements (
        drug_id, 
        branch_id, 
        org_id,
        type, 
        quantity, 
        previous_stock, 
        new_stock,
        reference_id, 
        batch_id, 
        performed_by, 
        performed_by_name_snapshot,
        drug_name_snapshot,
        public_price_snapshot,
        cost_price_snapshot,
        unit_price_snapshot,
        unit_cost_price_snapshot,
        reason,
        notes,
        expiry_date,
        status,
        timestamp
    ) VALUES (
        COALESCE(NEW.drug_id, OLD.drug_id),
        COALESCE(NEW.branch_id, OLD.branch_id),
        COALESCE(NEW.org_id, OLD.org_id),
        v_type,
        v_diff,
        v_prev_stock,
        v_prev_stock + v_diff,
        v_ref_id,
        COALESCE(NEW.id, OLD.id),
        COALESCE(v_perf_id, (SELECT id FROM employees LIMIT 1)), -- Safety fallback
        v_perf_name,
        v_drug_name,
        v_public_price,
        v_cost_price,
        v_unit_public_price,
        v_unit_cost_price,
        v_reason,
        v_notes,
        COALESCE(NEW.expiry_date, OLD.expiry_date),
        'approved',
        now()
    );

    -- 5. Auto-Sync Aggregate Stock in drugs table
    UPDATE public.drugs 
    SET stock = stock + v_diff 
    WHERE id = COALESCE(NEW.drug_id, OLD.drug_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply Unified Trigger to stock_batches
DROP TRIGGER IF EXISTS trg_stock_batches_movement ON stock_batches;
CREATE TRIGGER trg_stock_batches_movement
AFTER INSERT OR UPDATE OR DELETE ON stock_batches
FOR EACH ROW EXECUTE FUNCTION fn_log_stock_movement();

-- 5. Cleanup Old Sync Triggers (to avoid duplication)
DROP TRIGGER IF EXISTS trg_sync_stock ON stock_movements;

-- 6. Context Helper Function for App Use
-- First, drop ALL possible old versions to avoid "function not unique" error
DROP FUNCTION IF EXISTS set_stock_context(TEXT, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS set_stock_context(TEXT, UUID, UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION set_stock_context(
    p_type TEXT, 
    p_ref_id UUID DEFAULT NULL, 
    p_perf_id UUID DEFAULT NULL, 
    p_perf_name TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.movement_type', p_type, true);
    IF p_ref_id IS NOT NULL THEN
        PERFORM set_config('app.movement_reference_id', p_ref_id::TEXT, true);
    ELSE
        PERFORM set_config('app.movement_reference_id', '', true);
    END IF;
    IF p_perf_id IS NOT NULL THEN
        PERFORM set_config('app.movement_performer_id', p_perf_id::TEXT, true);
    ELSE
        PERFORM set_config('app.movement_performer_id', '', true);
    END IF;
    IF p_perf_name IS NOT NULL THEN
        PERFORM set_config('app.movement_performer_name', p_perf_name, true);
    ELSE
        PERFORM set_config('app.movement_performer_name', '', true);
    END IF;
    IF p_reason IS NOT NULL THEN
        PERFORM set_config('app.movement_reason', p_reason, true);
    ELSE
        PERFORM set_config('app.movement_reason', '', true);
    END IF;
    IF p_notes IS NOT NULL THEN
        PERFORM set_config('app.movement_notes', p_notes, true);
    ELSE
        PERFORM set_config('app.movement_notes', '', true);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
