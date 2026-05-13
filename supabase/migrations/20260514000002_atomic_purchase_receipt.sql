-- Atomic Purchase Receipt Processing (Phase 2)
-- Date: 2026-05-14
-- Optimizations: Consolidates 55+ frontend DB calls into 1 atomic server-side transaction.

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
    v_current_stock INT;
    v_new_expiry DATE;
    v_earliest_expiry DATE;
    v_global_wac DECIMAL;
    v_performer_name TEXT := p_payload->>'performerName';
BEGIN
    -- 0. Identity & Purchase Check
    SELECT branch_id, org_id INTO v_branch_id, v_org_id FROM purchases WHERE id = v_purchase_id;
    IF v_branch_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase not found');
    END IF;

    SET LOCAL "app.disable_stock_sync" = 'true';

    -- 1. Process Items Loop
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_drug_id := (v_item->>'drugId')::UUID;
        v_units_to_add := (v_item->>'quantity')::INT; -- Units already resolved by FE for safety

        -- A. Create Batch
        INSERT INTO stock_batches (
            drug_id, quantity, expiry_date, cost_price, 
            purchase_id, date_received, branch_id, org_id, version
        ) VALUES (
            v_drug_id, v_units_to_add, (v_item->>'expiryDate')::DATE, 
            (v_item->>'costPrice')::DECIMAL, v_purchase_id, 
            CURRENT_TIMESTAMP, v_branch_id, v_org_id, 1
        ) RETURNING id INTO v_batch_id;

        -- B. Get current stock for movement logging
        SELECT stock INTO v_current_stock FROM drugs WHERE id = v_drug_id;

        -- C. Record Stock Movement
        INSERT INTO stock_movements (
            drug_id, branch_id, org_id, type, quantity, 
            previous_stock, new_stock, reference_id, batch_id, 
            performed_by, performed_by_name_snapshot, status,
            drug_name_snapshot, public_price_snapshot, cost_price_snapshot, expiry_date
        ) VALUES (
            v_drug_id, v_branch_id, v_org_id, 'purchase', v_units_to_add,
            v_current_stock, v_current_stock + v_units_to_add, v_purchase_id, v_batch_id,
            v_performer_id, v_performer_name, 'approved',
            v_item->>'name', (v_item->>'publicPrice')::DECIMAL, 
            (v_item->>'costPrice')::DECIMAL, (v_item->>'expiryDate')::DATE
        );

        -- D. Update Drug Stock
        UPDATE drugs SET stock = stock + v_units_to_add WHERE id = v_drug_id;

        -- E. Re-calculate WAC & Earliest Expiry (Server-side)
        SELECT MIN(expiry_date) INTO v_earliest_expiry 
        FROM stock_batches 
        WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0;

        SELECT SUM(quantity * cost_price) / NULLIF(SUM(quantity), 0) INTO v_global_wac
        FROM stock_batches 
        WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0;

        -- F. Update Drug Metadata (Price & Expiry)
        UPDATE drugs SET
            public_price = (v_item->>'publicPrice')::DECIMAL,
            unit_price = (v_item->>'unitPrice')::DECIMAL,
            cost_price = COALESCE(v_global_wac, (v_item->>'costPrice')::DECIMAL),
            expiry_date = COALESCE(v_earliest_expiry::TEXT, (v_item->>'expiryDate'))
        WHERE id = v_drug_id;
    END LOOP;

    -- 2. Update Purchase Status
    UPDATE purchases SET 
        status = 'received',
        received_by = v_performer_name,
        received_at = CURRENT_TIMESTAMP
    WHERE id = v_purchase_id;

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
