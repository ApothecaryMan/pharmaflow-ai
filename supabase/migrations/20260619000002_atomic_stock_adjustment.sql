BEGIN;

CREATE OR REPLACE FUNCTION public.process_stock_adjustment(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_branch_id UUID := NULLIF(p_payload->>'branchId', '')::UUID;
    v_org_id UUID := NULLIF(p_payload->>'orgId', '')::UUID;
    v_performer_id UUID := NULLIF(p_payload->>'performerId', '')::UUID;
    v_performer_name TEXT := p_payload->>'performerName';
    v_transaction_id UUID := NULLIF(p_payload->>'transactionId', '')::UUID;
    v_movement_id UUID := NULLIF(p_payload->>'movementId', '')::UUID;
    v_adjustment JSONB;
    v_pending_movement RECORD;
    v_drug RECORD;
    v_batch RECORD;
    v_drug_id UUID;
    v_batch_id UUID;
    v_quantity INT;
    v_remaining INT;
    v_take INT;
    v_movement_type TEXT;
    v_reason TEXT;
    v_notes TEXT;
    v_expiry_date DATE;
    v_processed_count INT := 0;
BEGIN
    IF v_branch_id IS NULL THEN
        RAISE EXCEPTION 'branchId is required';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM get_user_branch_ids() b WHERE b = v_branch_id) THEN
        RAISE EXCEPTION 'Access denied to branch %', v_branch_id;
    END IF;

    IF jsonb_typeof(p_payload->'adjustments') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'adjustments must be an array';
    END IF;

    IF v_movement_id IS NOT NULL THEN
        SELECT *
        INTO v_pending_movement
        FROM public.stock_movements
        WHERE id = v_movement_id
          AND branch_id = v_branch_id
          AND type = 'adjustment'
          AND status = 'pending'
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Pending adjustment movement % not found', v_movement_id;
        END IF;
    END IF;

    FOR v_adjustment IN SELECT * FROM jsonb_array_elements(p_payload->'adjustments')
    LOOP
        v_drug_id := NULLIF(v_adjustment->>'drugId', '')::UUID;
        v_batch_id := NULLIF(v_adjustment->>'batchId', '')::UUID;
        v_quantity := NULLIF(v_adjustment->>'quantity', '')::INT;
        v_movement_type := COALESCE(NULLIF(v_adjustment->>'movementType', ''), 'adjustment');
        v_reason := NULLIF(v_adjustment->>'reason', '');
        v_notes := NULLIF(v_adjustment->>'notes', '');
        v_expiry_date := NULLIF(v_adjustment->>'expiryDate', '')::DATE;

        IF v_drug_id IS NULL THEN
            RAISE EXCEPTION 'Adjustment drugId is required';
        END IF;

        IF v_quantity IS NULL OR v_quantity = 0 THEN
            CONTINUE;
        END IF;

        IF v_movement_type NOT IN ('adjustment', 'damage', 'return_supplier') THEN
            RAISE EXCEPTION 'Unsupported stock adjustment movement type %', v_movement_type;
        END IF;

        SELECT *
        INTO v_drug
        FROM public.drugs
        WHERE id = v_drug_id
          AND branch_id = v_branch_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Drug % not found in branch %', v_drug_id, v_branch_id;
        END IF;

        PERFORM set_stock_context(
            v_movement_type,
            COALESCE(v_transaction_id, v_movement_id, v_drug_id),
            v_performer_id,
            v_performer_name,
            v_reason,
            v_notes
        );

        IF v_quantity > 0 THEN
            IF v_batch_id IS NOT NULL THEN
                SELECT *
                INTO v_batch
                FROM public.stock_batches
                WHERE id = v_batch_id
                  AND drug_id = v_drug_id
                  AND branch_id = v_branch_id
                FOR UPDATE;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Batch % not found for drug %', v_batch_id, v_drug_id;
                END IF;

                UPDATE public.stock_batches
                SET quantity = quantity + v_quantity,
                    version = version + 1
                WHERE id = v_batch_id;
            ELSE
                INSERT INTO public.stock_batches (
                    branch_id,
                    org_id,
                    drug_id,
                    quantity,
                    expiry_date,
                    cost_price,
                    date_received,
                    batch_number,
                    version
                ) VALUES (
                    v_branch_id,
                    COALESCE(v_org_id, v_drug.org_id),
                    v_drug_id,
                    v_quantity,
                    COALESCE(v_expiry_date, v_drug.expiry_date::DATE, (CURRENT_DATE + INTERVAL '1 year')::DATE),
                    COALESCE(v_drug.cost_price, 0),
                    CURRENT_DATE,
                    'MANUAL-ADJUST',
                    1
                );
            END IF;
        ELSE
            v_remaining := ABS(v_quantity);

            IF v_batch_id IS NOT NULL THEN
                SELECT *
                INTO v_batch
                FROM public.stock_batches
                WHERE id = v_batch_id
                  AND drug_id = v_drug_id
                  AND branch_id = v_branch_id
                FOR UPDATE;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Batch % not found for drug %', v_batch_id, v_drug_id;
                END IF;

                IF v_batch.quantity < v_remaining THEN
                    RAISE EXCEPTION 'Insufficient stock in batch % for drug %', v_batch_id, v_drug_id;
                END IF;

                UPDATE public.stock_batches
                SET quantity = quantity - v_remaining,
                    version = version + 1
                WHERE id = v_batch_id;
            ELSE
                FOR v_batch IN
                    SELECT *
                    FROM public.stock_batches
                    WHERE drug_id = v_drug_id
                      AND branch_id = v_branch_id
                      AND quantity > 0
                    ORDER BY expiry_date ASC, created_at ASC
                    FOR UPDATE
                LOOP
                    EXIT WHEN v_remaining <= 0;

                    v_take := LEAST(v_remaining, v_batch.quantity);

                    UPDATE public.stock_batches
                    SET quantity = quantity - v_take,
                        version = version + 1
                    WHERE id = v_batch.id;

                    v_remaining := v_remaining - v_take;
                END LOOP;

                IF v_remaining > 0 THEN
                    RAISE EXCEPTION 'Insufficient stock for drug %', v_drug_id;
                END IF;
            END IF;
        END IF;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    IF v_movement_id IS NOT NULL THEN
        UPDATE public.stock_movements
        SET status = 'approved',
            reviewed_by = COALESCE(v_performer_id, reviewed_by),
            reviewed_at = now()
        WHERE id = v_movement_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'processedCount', v_processed_count);
END;
$$;

COMMIT;
