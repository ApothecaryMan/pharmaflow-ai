-- Add reference_serial_id to stock_movements for displaying real serial numbers
-- instead of UUIDs in stock movement tables/timelines

BEGIN;

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_serial_id TEXT;

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_serial_id ON stock_movements(reference_serial_id);

-- Redefine fn_log_stock_movement to also capture reference_serial_id
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
    v_ref_serial TEXT;
BEGIN
    -- 0. Get Context from Session Variables
    v_type := COALESCE(NULLIF(current_setting('app.movement_type', true), ''), 'adjustment')::movement_type;
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

    -- 2.2 Look up human-readable serial ID from the referenced entity
    IF v_ref_id IS NOT NULL THEN
        CASE v_type
            WHEN 'sale' THEN
                SELECT serial_id INTO v_ref_serial FROM public.sales WHERE id = v_ref_id;
            WHEN 'purchase' THEN
                SELECT invoice_id INTO v_ref_serial FROM public.purchases WHERE id = v_ref_id;
            WHEN 'return_customer' THEN
                SELECT serial_id INTO v_ref_serial FROM public.returns WHERE id = v_ref_id;
            WHEN 'return_supplier' THEN
                SELECT serial_id INTO v_ref_serial FROM public.purchase_returns WHERE id = v_ref_id;
            ELSE
                v_ref_serial := NULL;
        END CASE;
    END IF;

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
        reference_serial_id,
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
        v_ref_serial,
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

-- Backfill existing records
UPDATE stock_movements sm
SET reference_serial_id = s.serial_id
FROM sales s
WHERE sm.reference_id = s.id AND sm.type = 'sale' AND sm.reference_serial_id IS NULL;

UPDATE stock_movements sm
SET reference_serial_id = p.invoice_id
FROM purchases p
WHERE sm.reference_id = p.id AND sm.type = 'purchase' AND sm.reference_serial_id IS NULL;

UPDATE stock_movements sm
SET reference_serial_id = r.serial_id
FROM returns r
WHERE sm.reference_id = r.id AND sm.type = 'return_customer' AND sm.reference_serial_id IS NULL;

UPDATE stock_movements sm
SET reference_serial_id = pr.serial_id
FROM purchase_returns pr
WHERE sm.reference_id = pr.id AND sm.type = 'return_supplier' AND sm.reference_serial_id IS NULL;

COMMIT;
