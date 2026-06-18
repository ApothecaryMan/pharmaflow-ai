-- Fix process_purchase_receipt function date/text type mismatch
-- Fix fn_log_stock_movement trigger movement_type enum empty string cast

BEGIN;

-- Redefine fn_log_stock_movement with NULLIF on current_setting
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


-- Redefine process_purchase_receipt with correct date conversion/casting
CREATE OR REPLACE FUNCTION process_purchase_receipt(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purchase_id UUID := (p_payload->>'purchaseId')::UUID;
    v_performer_id UUID := (p_payload->>'performerId')::UUID;
    v_branch_id UUID;
    v_org_id UUID;
    v_item JSONB;
    v_drug_id UUID;
    v_units_to_add INT;
    v_batch_id UUID;
    v_earliest_expiry DATE;
    v_global_wac DECIMAL;
    v_performer_name TEXT := p_payload->>'performerName';
BEGIN
    SELECT branch_id, org_id INTO v_branch_id, v_org_id FROM purchases WHERE id = v_purchase_id;
    IF v_branch_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase not found');
    END IF;

    -- 🟢 SET MOVEMENT CONTEXT
    PERFORM set_stock_context('purchase', v_purchase_id, v_performer_id, v_performer_name);

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_drug_id := (v_item->>'drugId')::UUID;
        v_units_to_add := (v_item->>'quantity')::INT;

        -- Trigger will automatically log movement and update drugs.stock
        INSERT INTO stock_batches (
            drug_id, quantity, expiry_date, cost_price, 
            purchase_id, date_received, branch_id, org_id, version
        ) VALUES (
            v_drug_id, v_units_to_add, (v_item->>'expiryDate')::DATE, 
            (v_item->>'costPrice')::DECIMAL, v_purchase_id, 
            CURRENT_TIMESTAMP, v_branch_id, v_org_id, 1
        ) RETURNING id INTO v_batch_id;

        -- Metadata Updates (still needed)
        SELECT MIN(expiry_date) INTO v_earliest_expiry FROM stock_batches 
        WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0;

        SELECT SUM(quantity * cost_price) / NULLIF(SUM(quantity), 0) INTO v_global_wac
        FROM stock_batches WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0;

        UPDATE drugs SET
            public_price = (v_item->>'publicPrice')::DECIMAL,
            unit_price = (v_item->>'unitPrice')::DECIMAL,
            cost_price = COALESCE(v_global_wac, (v_item->>'costPrice')::DECIMAL),
            expiry_date = COALESCE(v_earliest_expiry, (v_item->>'expiryDate')::DATE)
        WHERE id = v_drug_id;
    END LOOP;

    UPDATE purchases SET status = 'received', received_by = v_performer_name, received_at = CURRENT_TIMESTAMP WHERE id = v_purchase_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;
