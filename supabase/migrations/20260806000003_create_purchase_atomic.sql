-- ══════════════════════════════════════════════════════════════════
-- Atomic purchase creation: mint PU serial INSIDE the doc-creation
-- transaction, so a failed/incomplete purchase never leaves a row and
-- never consumes a serial number.
--
-- Previously the client minted the number via a separate generate_serial_id
-- RPC call, then inserted the purchase header + items with (two more)
-- untracked client inserts — no transaction boundary, so the number and the
-- document were not atomic; a failed insert burned a serial.
--
-- create_purchase mints the serial and inserts header + items in ONE
-- function (= one transaction). On any failure the EXCEPTION block rolls the
-- whole subtransaction back: no purchases row, no purchase_items, and the
-- sequence counter is unchanged.
-- Pattern mirrors process_checkout (SL).
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_purchase(p_payload JSONB)
 RETURNS JSONB
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_purchase_id UUID;
    v_serial_id   TEXT;
    v_item        JSONB;
    v_branch_id   UUID := (p_payload->>'branchId')::UUID;
    v_org_id      UUID := NULLIF(p_payload->>'orgId', '')::UUID;
    v_supplier_id UUID := (p_payload->>'supplierId')::UUID;
    v_date        TIMESTAMPTZ := COALESCE(NULLIF(p_payload->>'date', '')::TIMESTAMPTZ, now());
    v_status      purchase_status := COALESCE(NULLIF(p_payload->>'status', '')::purchase_status, 'pending');
    v_pay_type    purchase_pay_type := CASE
                        WHEN (p_payload->>'paymentMethod') = 'partial' THEN 'credit'
                        ELSE COALESCE(NULLIF(p_payload->>'paymentMethod', '')::purchase_pay_type, 'credit')
                      END;
    v_supplier_name TEXT := COALESCE(NULLIF(p_payload->>'supplierName', ''),
                                     (SELECT name FROM suppliers WHERE id = v_supplier_id),
                                     'Unknown');
    v_supplier_name_snapshot TEXT := COALESCE(NULLIF(p_payload->>'supplierName', ''), v_supplier_name);
BEGIN
    -- ═══ SECURITY: verify caller has permission on this branch ═══
    IF NOT has_branch_permission(v_branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','pharmacist','cashier','senior_cashier','manager']::employee_role[]) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Unauthorized to create purchase');
    END IF;

    IF v_branch_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'branchId is required');
    END IF;
    IF v_supplier_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'supplierId is required');
    END IF;

    -- Mint the PU serial FROM THE SAME source, inside this transaction.
    v_serial_id := generate_serial_id(v_branch_id, 'PU', NULL, v_date);

    INSERT INTO purchases (
        id, branch_id, date, supplier_id, supplier_name_snapshot, org_id,
        subtotal, discount, total_cost, total_tax, status, payment_type,
        invoice_id, external_invoice_id, created_by, created_by_name,
        notes, due_date
    ) VALUES (
        gen_random_uuid(), v_branch_id, v_date, v_supplier_id, v_supplier_name_snapshot, v_org_id,
        COALESCE((p_payload->>'subtotal')::DECIMAL, 0),
        COALESCE((p_payload->>'discount')::DECIMAL, 0),
        COALESCE((p_payload->>'totalCost')::DECIMAL, 0),
        COALESCE((p_payload->>'totalTax')::DECIMAL, 0),
        v_status, v_pay_type,
        v_serial_id, NULLIF(p_payload->>'externalInvoiceId', ''),
        NULLIF(p_payload->>'createdBy', '')::UUID, NULLIF(p_payload->>'createdByName', ''),
        NULLIF(p_payload->>'notes', ''), NULLIF(p_payload->>'dueDate', '')::DATE
    ) RETURNING id INTO v_purchase_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'items', '[]'::jsonb))
    LOOP
        INSERT INTO purchase_items (
            id, branch_id, purchase_id, drug_id, name, dosage_form, quantity, cost_price,
            expiry_date, discount, public_price, unit_price, unit_cost_price, tax,
            is_unit, units_per_pack, batch_number, org_id
        ) VALUES (
            gen_random_uuid(), v_branch_id, v_purchase_id, (v_item->>'drugId')::UUID,
            COALESCE(NULLIF(v_item->>'name', ''), 'Item'),
            NULLIF(v_item->>'dosageForm', ''),
            (v_item->>'quantity')::INT, COALESCE((v_item->>'costPrice')::DECIMAL, 0),
            NULLIF(v_item->>'expiryDate', '')::DATE,
            COALESCE((v_item->>'discount')::DECIMAL, 0),
            NULLIF(v_item->>'publicPrice', '')::DECIMAL,
            NULLIF(v_item->>'unitPrice', '')::DECIMAL,
            NULLIF(v_item->>'unitCostPrice', '')::DECIMAL,
            COALESCE((v_item->>'tax')::DECIMAL, 0),
            COALESCE((v_item->>'isUnit')::BOOLEAN, false),
            COALESCE((v_item->>'unitsPerPack')::INTEGER, 1),
            NULLIF(v_item->>'batchNumber', ''),
            v_org_id
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'purchaseId', v_purchase_id,
        'invoiceId', v_serial_id,
        'serialId', v_serial_id,
        'purchase', row_to_json((SELECT p FROM purchases p WHERE id = v_purchase_id))
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

COMMENT ON FUNCTION public.create_purchase IS
  'Atomic purchase creation: mints the PU serial via generate_serial_id inside '
  'the same transaction as the purchases + purchase_items inserts, so a failure '
  'leaves no row and consumes no serial.';