-- Harden purchase receipt processing:
-- - fail atomically on any error
-- - lock the purchase row to prevent double receipt
-- - read purchase items from the persisted purchase record instead of trusting client payload items

BEGIN;

CREATE OR REPLACE FUNCTION process_purchase_receipt(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purchase_id UUID := (p_payload->>'purchaseId')::UUID;
    v_performer_id UUID := NULLIF(p_payload->>'performerId', '')::UUID;
    v_performer_name TEXT := NULLIF(p_payload->>'performerName', '');
    v_purchase RECORD;
    v_item JSONB;
    v_drug RECORD;
    v_drug_id UUID;
    v_item_quantity INT;
    v_units_per_pack INT;
    v_units_to_add INT;
    v_expiry_date DATE;
    v_unit_cost_price DECIMAL;
    v_public_price DECIMAL;
    v_unit_price DECIMAL;
    v_earliest_expiry DATE;
    v_global_unit_wac DECIMAL;
BEGIN
    IF v_purchase_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing purchaseId');
    END IF;

    SELECT *
    INTO v_purchase
    FROM purchases
    WHERE id = v_purchase_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase not found');
    END IF;

    IF v_purchase.branch_id NOT IN (SELECT get_user_branch_ids()) THEN
        RAISE EXCEPTION 'Access denied to branch %', v_purchase.branch_id;
    END IF;

    IF v_purchase.status IN ('received', 'completed') THEN
        RETURN jsonb_build_object('success', true, 'alreadyReceived', true);
    END IF;

    IF v_purchase.status = 'rejected' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rejected purchases cannot be received');
    END IF;

    IF v_purchase.items IS NULL OR jsonb_typeof(v_purchase.items) <> 'array' OR jsonb_array_length(v_purchase.items) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase has no items to receive');
    END IF;

    PERFORM set_stock_context('purchase', v_purchase_id, v_performer_id, v_performer_name);

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_purchase.items)
    LOOP
        v_drug_id := NULLIF(v_item->>'drugId', '')::UUID;
        v_item_quantity := NULLIF(v_item->>'quantity', '')::INT;

        IF v_drug_id IS NULL OR v_item_quantity IS NULL OR v_item_quantity <= 0 THEN
            RAISE EXCEPTION 'Invalid purchase item payload for purchase %', v_purchase_id;
        END IF;

        SELECT *
        INTO v_drug
        FROM drugs
        WHERE id = v_drug_id
          AND branch_id = v_purchase.branch_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Drug % not found in purchase branch %', v_drug_id, v_purchase.branch_id;
        END IF;

        v_units_per_pack := COALESCE(NULLIF(NULLIF(v_item->>'unitsPerPack', '')::INT, 0), NULLIF(v_drug.units_per_pack, 0), 1);
        v_units_to_add := CASE
            WHEN COALESCE(NULLIF(v_item->>'isUnit', '')::BOOLEAN, false) THEN v_item_quantity
            ELSE v_item_quantity * v_units_per_pack
        END;
        v_expiry_date := CASE
            WHEN NULLIF(v_item->>'expiryDate', '') IS NULL THEN (CURRENT_DATE + INTERVAL '1 year')::DATE
            WHEN length(v_item->>'expiryDate') = 7 THEN ((v_item->>'expiryDate') || '-01')::DATE
            ELSE (v_item->>'expiryDate')::DATE
        END;
        v_unit_cost_price := COALESCE(
            NULLIF(v_item->>'unitCostPrice', '')::DECIMAL,
            NULLIF(v_item->>'costPrice', '')::DECIMAL / v_units_per_pack
        );
        v_public_price := COALESCE(NULLIF(v_item->>'publicPrice', '')::DECIMAL, v_drug.public_price);
        v_unit_price := COALESCE(NULLIF(v_item->>'unitPrice', '')::DECIMAL, v_drug.unit_price);

        IF v_unit_cost_price IS NULL THEN
            RAISE EXCEPTION 'Missing unit cost for drug % in purchase %', v_drug_id, v_purchase_id;
        END IF;

        INSERT INTO stock_batches (
            drug_id,
            quantity,
            expiry_date,
            cost_price,
            purchase_id,
            date_received,
            branch_id,
            org_id,
            version
        ) VALUES (
            v_drug_id,
            v_units_to_add,
            v_expiry_date,
            v_unit_cost_price,
            v_purchase_id,
            CURRENT_TIMESTAMP,
            v_purchase.branch_id,
            v_purchase.org_id,
            1
        );

        SELECT MIN(expiry_date)
        INTO v_earliest_expiry
        FROM stock_batches
        WHERE drug_id = v_drug_id
          AND branch_id = v_purchase.branch_id
          AND quantity > 0;

        SELECT SUM(quantity * cost_price) / NULLIF(SUM(quantity), 0)
        INTO v_global_unit_wac
        FROM stock_batches
        WHERE drug_id = v_drug_id
          AND branch_id = v_purchase.branch_id
          AND quantity > 0;

        UPDATE drugs
        SET
            public_price = v_public_price,
            unit_price = v_unit_price,
            cost_price = COALESCE(v_global_unit_wac * COALESCE(NULLIF(units_per_pack, 0), 1), NULLIF(v_item->>'costPrice', '')::DECIMAL, cost_price),
            unit_cost_price = COALESCE(v_global_unit_wac, v_unit_cost_price, unit_cost_price),
            expiry_date = COALESCE(v_earliest_expiry, v_expiry_date)
        WHERE id = v_drug_id;
    END LOOP;

    UPDATE purchases
    SET
        status = 'received',
        received_by = v_performer_name,
        received_at = CURRENT_TIMESTAMP
    WHERE id = v_purchase_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;
