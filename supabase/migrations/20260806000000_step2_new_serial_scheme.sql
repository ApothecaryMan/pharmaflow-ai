-- ══════════════════════════════════════════════════════════════════
-- STEP 2 — New numbering scheme (ZINK)
--
-- Format:  {BranchCode}-{TypeCode}-{YY}-{Sequence}
-- Example: CAI-SL-26-000482
--
-- * Yearly-reset atomic counter per (tenant, branch, doc_type, year).
-- * Sequence starts at 000001 for each new counter.
-- * Applies ONLY to the document types below; legacy & master-data
--   formats (customer/employee/drug/barcode/transactions/SP) are kept.
-- * TR transfers: two linked numbers — source branch and destination
--   branch each call generate_serial_id('TR'); the two stock_movement rows
--   (transfer_out / transfer_in) are linked via stock_movements.linked_transfer_id
--   (each holds the paired serial) — see the ALTER TABLE below.
--
-- * Counter YEAR follows the document year (p_date), not the entry time:
--   backdated documents number under the year printed on them.
--   increment_sequence gains an optional p_year; all 2-arg callers keep
--   current-year behavior.
--
-- TypeCodes: SL(sale) SR(sale return) QT(quotation) PU(purchase)
--            PR(purchase return) PO(purchase order) TR(transfer)
--            AD(adjustment) DS(disposal) SH(shift) CS(cash)
--            EX(expense) DO(delivery order) RV(review) SB(subscription)
-- ══════════════════════════════════════════════════════════════════

-- ── TR two-linked-numbers schema home ─────────────────────────────────
-- Transfers manifest as paired stock movements (transfer_out at source,
-- transfer_in at destination). Each movement's TR serial is stored in
-- reference_serial_id; linked_transfer_id carries the PAIRED serial so the
-- two sides of one transfer stay linked (Option 2 — agreed design).
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS linked_transfer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_stock_movements_linked_transfer_id
  ON public.stock_movements (linked_transfer_id);

COMMENT ON COLUMN public.stock_movements.linked_transfer_id IS
  'TR transfer pairing: serial of the linked (other side) transfer movement. '
  'Source and destination rows each hold their own TR serial in '
  'reference_serial_id and point to the paired serial here.';

-- ── STEP 2: single source of truth now emits the new numbering scheme ──────
-- Format: {BranchCode}-{TypeCode}-{YY}-{Sequence}   e.g.  CAI-SL-26-000482
-- Yearly-reset counter per (tenant, branch, doc_type, year). Sequence starts
-- at 000001. Legacy / master-data formats are preserved unchanged.
--
-- TR (transfer): two linked numbers — call once for the source branch and once
--                for the destination branch; each keeps its own per-branch
--                TR counter. Link the two rows via stock_movements.linked_transfer_id.
CREATE OR REPLACE FUNCTION public.generate_serial_id(
  p_branch_id   UUID,
  p_doc_type    TEXT,
  p_branch_code TEXT          DEFAULT 'PF',
  p_date        TIMESTAMPTZ   DEFAULT NOW(),
  p_custom_seq  BIGINT        DEFAULT NULL,
  p_zero_pad    INTEGER       DEFAULT 4,
  p_raw         BOOLEAN       DEFAULT false
) RETURNS TEXT AS $$
DECLARE
  v_seq    BIGINT;
  v_year   SMALLINT;
  v_yy     TEXT;
  v_pad    INTEGER;
  v_tenant UUID;
BEGIN
  -- Resolve branch code: explicit (non-default) > branch.code > 'PF'
  -- NOTE: 'PF' is only a fallback — if the caller relied on the default
  -- (e.g. RPCs calling generate_serial_id(branch_id, type) without a code),
  -- the real branch code is looked up here so serials carry the true branch.
  IF p_branch_code IS NULL OR p_branch_code = 'PF' THEN
    SELECT code INTO p_branch_code FROM branches WHERE id = p_branch_id;
  END IF;
  p_branch_code := COALESCE(NULLIF(p_branch_code, ''), 'PF');

  -- p_date's DEFAULT NOW() only applies when the argument is OMITTED.
  -- PostgREST forwards an explicit JSON `null`, which bypasses the default;
  -- treat it as "now" so every caller (RPC, SQL, client) is robust.
  p_date := COALESCE(p_date, NOW());

  v_year := date_part('year', p_date)::smallint;
  v_yy := RIGHT(v_year::TEXT, 2);

  -- ── Sequence value ───────────────────────────────────────────
  IF p_custom_seq IS NOT NULL THEN
    v_seq := p_custom_seq;
  ELSIF p_doc_type = 'SB' THEN
    -- Tenant-level: counter keyed WITHOUT a branch.
    -- NOTE: NULLs are distinct in unique indexes, so tenant-level counters
    -- are enforced by a PARTIAL unique index on (tenant_id, doc_type, year)
    -- WHERE branch_id IS NULL; the ON CONFLICT target carries that predicate.
    v_tenant := resolve_tenant_id(p_branch_id);
    INSERT INTO sequence_counters (tenant_id, branch_id, doc_type, year, last_number)
    VALUES (v_tenant, NULL, 'SB', v_year, 1)
    ON CONFLICT (tenant_id, doc_type, year) WHERE branch_id IS NULL
    DO UPDATE SET last_number = sequence_counters.last_number + 1, updated_at = NOW()
    RETURNING last_number INTO v_seq;
  ELSE
    -- Counter year follows the document year (v_year from p_date) so
    -- backdated documents number under the year printed on them.
    SELECT increment_sequence(p_branch_id, p_doc_type, v_year) INTO v_seq;
  END IF;

  IF p_raw THEN
    RETURN v_seq::TEXT;
  END IF;

  v_pad := GREATEST(p_zero_pad, 0);

  -- ── NEW: document types → {code}-{TYPE}-{YY}-{000001} ────────
  IF p_doc_type IN ('SL','SR','QT','PU','PR','PO','TR','AD','DS','SH','CS','EX','DO','RV') THEN
    RETURN p_branch_code || '-' || p_doc_type || '-' || v_yy || '-' || LPAD(v_seq::TEXT, 6, '0');
  ELSIF p_doc_type = 'SB' THEN
    RETURN '-SB-' || v_yy || '-' || LPAD(v_seq::TEXT, 6, '0');
  END IF;

  -- ── LEGACY / master-data formats (UNCHANGED) ─────────────────
  IF p_doc_type = 'sales' THEN
    RETURN p_branch_code || '-' || to_char(p_date, 'YYYYMMDD') || '-' || LPAD(v_seq::TEXT, 4, '0');
  ELSIF p_doc_type = 'returns' THEN
    RETURN 'RET-' || to_char(p_date, 'YYYYMMDD') || LPAD(v_seq::TEXT, 3, '0');
  ELSIF p_doc_type = 'purchase_returns' THEN
    RETURN 'PR-' || to_char(p_date, 'YYYYMMDD') || LPAD(v_seq::TEXT, 3, '0');
  ELSIF p_doc_type = 'supplier_payments' THEN
    RETURN 'SP-' || to_char(p_date, 'YYYYMMDD') || LPAD(v_seq::TEXT, 3, '0');
  ELSIF p_doc_type = 'inventory' THEN
    RETURN 'DRUG-' || v_seq;
  ELSIF p_doc_type = 'barcodes' THEN
    RETURN (v_seq + 999)::TEXT;
  ELSIF p_doc_type = 'employees' THEN
    RETURN 'EMP-' || v_seq;
  ELSIF p_doc_type = 'customers-serial' THEN
    RETURN p_branch_code || '-' ||
      CASE WHEN v_pad > 0 THEN LPAD(v_seq::TEXT, v_pad, '0') ELSE v_seq::TEXT END;
  ELSE
    RETURN p_branch_code || '-' || LPAD(v_seq::TEXT, v_pad, '0');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_serial_id IS
  'Single source for serial generation. Document types use '
  '{BranchCode}-{TypeCode}-{YY}-{000001} with a per-(tenant,branch,type,year) '
  'yearly-reset counter. Legacy/master-data formats preserved.';

-- ── Tenant-level counters (branch_id NULL) uniqueness ──────────────────
-- PK treats NULL as distinct, so SB (tenant-level) counters get a partial
-- unique index; generate_serial_id uses it in its ON CONFLICT target.
-- (Index already created by 20260805000010_serial_centralization.)

-- ══════════════════════════════════════════════════════════════════
-- RPCs now format via generate_serial_id (SL / SR / PR)
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.process_checkout(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 DECLARE
     v_branch_id UUID := (p_payload->>'branchId')::UUID;
     v_org_id UUID := (p_payload->>'orgId')::UUID;
     v_performer_id UUID := (p_payload->>'performerId')::UUID;
     v_shift_id UUID;
     v_sale_id UUID;
     v_item JSONB;
     v_payload_id UUID;
     v_drug_id UUID;
     v_drug_record RECORD;
     v_batch_record RECORD;
     v_remaining_qty INT;
     v_qty_to_take INT;
     v_order_number INT;
     v_serial_id TEXT;
     v_branch_code TEXT;
     v_drug_display_name TEXT;
     v_total DECIMAL := (p_payload->>'total')::DECIMAL;
     v_subtotal DECIMAL := (p_payload->>'subtotal')::DECIMAL;
     v_global_discount DECIMAL := (p_payload->>'globalDiscount')::DECIMAL;
     v_sale_item_id UUID;
     v_first_expiry DATE;
     v_cost_price DECIMAL;
     v_earned_points INTEGER := COALESCE(ROUND((p_payload->>'earnedPoints')::DECIMAL), 0)::INTEGER;
     v_phone_clean TEXT;
 BEGIN
     -- ═══ SECURITY FIX: verify caller has permission on this branch ═══
     -- Replaces the weak "employee exists" check with proper auth.uid() verification
     IF NOT has_branch_permission(v_branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','pharmacist','cashier','senior_cashier','manager']::employee_role[]) THEN
         RETURN jsonb_build_object('success', false, 'error', 'Access denied: Unauthorized to process checkout');
     END IF;

     v_shift_id := (p_payload->>'shiftId')::UUID;
     IF v_shift_id IS NULL THEN
         SELECT id INTO v_shift_id FROM shifts
         WHERE branch_id = v_branch_id AND status = 'open'
         ORDER BY (opened_by = v_performer_id) DESC LIMIT 1;
     END IF;

     INSERT INTO branch_daily_sequences (branch_id, sale_date, current_value)
     VALUES (v_branch_id, CURRENT_DATE, 1)
     ON CONFLICT (branch_id, sale_date) DO UPDATE SET current_value = branch_daily_sequences.current_value + 1
     RETURNING current_value INTO v_order_number;

     SELECT code INTO v_branch_code FROM branches WHERE id = v_branch_id;
     v_branch_code := COALESCE(v_branch_code, 'SALE');
     v_serial_id := generate_serial_id(v_branch_id, 'SL', v_branch_code, CURRENT_TIMESTAMP);

     INSERT INTO sales (
         org_id, branch_id, serial_id, daily_order_number,
         total, subtotal, global_discount,
         payment_method, sale_type, status,
         sold_by_employee_id, shift_id,
         customer_name, customer_code, customer_phone,
         customer_address, customer_street_address,
         earned_points
     ) VALUES (
         v_org_id, v_branch_id, v_serial_id, v_order_number,
         v_total, v_subtotal, v_global_discount,
         (p_payload->>'paymentMethod')::payment_method,
         (p_payload->>'saleType')::sale_type,
         COALESCE((p_payload->>'status')::sale_status, 'completed'),
         v_performer_id, v_shift_id,
         p_payload->>'customerName', p_payload->>'customerCode', p_payload->>'customerPhone',
         p_payload->>'customerAddress', p_payload->>'customerStreetAddress',
         v_earned_points
     ) RETURNING id INTO v_sale_id;

     PERFORM set_stock_context('sale', v_sale_id, v_performer_id, p_payload->>'performerName');

     FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
     LOOP
         v_payload_id := (v_item->>'id')::UUID;
         v_first_expiry := NULL;

         SELECT d.id, d.name, d.dosage_form, d.cost_price, d.unit_cost_price, d.units_per_pack
         INTO v_drug_record
         FROM drugs d
         LEFT JOIN stock_batches b ON b.id = v_payload_id
         WHERE d.id = v_payload_id OR d.id = b.drug_id
         LIMIT 1;

         v_drug_id := v_drug_record.id;
         v_drug_display_name := v_drug_record.name || COALESCE(' ' || v_drug_record.dosage_form, '');

         IF COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE) THEN
             v_cost_price := COALESCE(
                 v_drug_record.unit_cost_price,
                 v_drug_record.cost_price / NULLIF(v_drug_record.units_per_pack, 0),
                 0
             );
             v_remaining_qty := (v_item->>'quantity')::INT;
         ELSE
             v_cost_price := COALESCE(v_drug_record.cost_price, 0);
             v_remaining_qty := (v_item->>'quantity')::INT * COALESCE(v_drug_record.units_per_pack, 1);
         END IF;

         INSERT INTO sale_items (branch_id, sale_id, drug_id, name, quantity, public_price, cost_price, is_unit, units_per_pack)
         VALUES (v_branch_id, v_sale_id, v_drug_id, v_drug_display_name, (v_item->>'quantity')::INT, (v_item->>'publicPrice')::DECIMAL, v_cost_price, COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE), COALESCE(v_drug_record.units_per_pack, 1))
         RETURNING id INTO v_sale_item_id;

         FOR v_batch_record IN
             SELECT id, quantity, expiry_date, batch_number FROM stock_batches
             WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
             ORDER BY (id = v_payload_id) DESC, expiry_date ASC, created_at ASC
         LOOP
             EXIT WHEN v_remaining_qty <= 0;
             v_qty_to_take := LEAST(v_remaining_qty, v_batch_record.quantity);

             IF v_first_expiry IS NULL THEN v_first_expiry := v_batch_record.expiry_date; END IF;

             UPDATE stock_batches SET quantity = quantity - v_qty_to_take WHERE id = v_batch_record.id;
             
             -- Fix: properly insert into sale_item_batches to link the batch to the sale item
             INSERT INTO sale_item_batches (branch_id, sale_item_id, batch_id, quantity, expiry_date) 
             VALUES (v_branch_id, v_sale_item_id, v_batch_record.id, v_qty_to_take, v_batch_record.expiry_date);

             v_remaining_qty := v_remaining_qty - v_qty_to_take;
         END LOOP;

         IF v_remaining_qty > 0 THEN
             RAISE EXCEPTION 'Insufficient stock for %', v_drug_display_name;
         END IF;
     END LOOP;

     v_phone_clean := REGEXP_REPLACE(p_payload->>'customerPhone', '\D', '', 'g');

     IF v_phone_clean IS NOT NULL AND v_phone_clean != '' THEN
         UPDATE customers
         SET
            last_visit = CURRENT_TIMESTAMP,
            total_purchases = COALESCE(total_purchases, 0) + v_total,
            points = points + v_earned_points,
            visit_count = COALESCE(visit_count, 0) + 1
         WHERE
            (phone = v_phone_clean OR code = p_payload->>'customerCode')
            AND org_id = v_org_id;
     END IF;

     IF v_shift_id IS NOT NULL AND COALESCE(p_payload->>'status', 'completed') = 'completed' THEN
         IF (p_payload->>'paymentMethod') = 'cash' THEN
             INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
             VALUES (v_branch_id, v_shift_id, 'sale', v_total, 'Sale ' || v_serial_id, v_performer_id, v_sale_id, v_org_id);

             PERFORM atomic_increment_shift(v_shift_id, 0, 0, v_total, 0, 0, 0, 0);
         ELSIF (p_payload->>'paymentMethod') = 'visa' THEN
             INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, related_sale_id, org_id)
             VALUES (v_branch_id, v_shift_id, 'card_sale', v_total, 'Sale ' || v_serial_id, v_performer_id, v_sale_id, v_org_id);

             PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, v_total, 0, 0, 0);
         END IF;
     END IF;

     RETURN jsonb_build_object(
         'success', true,
         'sale', row_to_json((SELECT s FROM sales s WHERE id = v_sale_id))::jsonb ||
                 jsonb_build_object('items', COALESCE(
                     (SELECT jsonb_agg(
                         jsonb_build_object(
                             'id', si.drug_id,
                             'name', si.name,
                             'quantity', si.quantity,
                             'publicPrice', si.public_price,
                             'isUnit', si.is_unit,
                             'costPrice', si.cost_price,
                             'saleItemId', si.id,
                             'unitsPerPack', si.units_per_pack,
                             'batchAllocations', (
                                 SELECT jsonb_agg(
                                     jsonb_build_object(
                                         'batchId', sib.batch_id,
                                         'quantity', sib.quantity,
                                         'expiryDate', sib.expiry_date,
                                         'batchNumber', sb.batch_number
                                     )
                                 )
                                 FROM sale_item_batches sib
                                 JOIN stock_batches sb ON sb.id = sib.batch_id
                                 WHERE sib.sale_item_id = si.id
                             )
                         )
                     ) FROM sale_items si WHERE si.sale_id = v_sale_id),
                     '[]'::JSONB
                 ))
     );
 END;
 $function$;


CREATE OR REPLACE FUNCTION public.process_return(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_return_id UUID;
    v_branch_id UUID := (p_payload->>'branchId')::UUID;
    v_org_id UUID := (p_payload->>'orgId')::UUID;
    v_sale_id UUID := (p_payload->>'saleId')::UUID;
    v_performer_id UUID := (p_payload->>'performerId')::UUID;
    v_shift_id UUID;
    v_item JSONB;
    v_running_total_refund DECIMAL := 0;
    v_item_refund DECIMAL;
    v_batch_id UUID;
    v_expiry_date DATE;
    v_drug_id UUID;
    v_sale_item_id UUID;
    v_qty INT;
    v_return_serial TEXT;
    v_payment_method TEXT;
    v_drug_record RECORD;
    v_sale_item_record RECORD;
    v_already_returned INT;
    v_available_to_return INT;
    v_return_key TEXT;
    v_sale_record RECORD;
    v_customer_phone TEXT;
    v_customer_code TEXT;
    v_sale_earned_points INTEGER;
    v_points_to_deduct INTEGER;
    v_phone_clean TEXT;
BEGIN
    -- ═══ SECURITY FIX: verify caller has permission on this branch ═══
    -- Replaces the weak "employee exists" check with proper auth.uid() verification
    IF NOT has_branch_permission(v_branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','pharmacist','cashier','senior_cashier','manager']::employee_role[]) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Unauthorized to process return');
    END IF;

    SELECT * INTO v_sale_record FROM sales WHERE id = v_sale_id FOR UPDATE;
    IF v_sale_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sale not found');
    END IF;

    v_payment_method := v_sale_record.payment_method;
    v_customer_phone := v_sale_record.customer_phone;
    v_customer_code := v_sale_record.customer_code;
    v_sale_earned_points := COALESCE(v_sale_record.earned_points, 0);

    SELECT id INTO v_shift_id FROM shifts
    WHERE branch_id = v_branch_id AND status = 'open'
    LIMIT 1
    FOR UPDATE;

    IF v_shift_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active shift found');
    END IF;

    v_return_serial := generate_serial_id(v_branch_id, 'SR', NULL, CURRENT_TIMESTAMP);

    INSERT INTO public.returns (
        org_id, branch_id, sale_id, serial_id,
        total_refund, return_type, reason, notes,
        processed_by, date
    ) VALUES (
        v_org_id, v_branch_id, v_sale_id, v_return_serial,
        0,
        (p_payload->>'returnType')::text::return_type,
        (p_payload->>'reason')::text::return_reason,
        p_payload->>'notes',
        v_performer_id, CURRENT_TIMESTAMP
    ) RETURNING id INTO v_return_id;

    PERFORM set_stock_context('return_customer', v_return_id, v_performer_id, p_payload->>'performerName');

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_drug_id := (v_item->>'drugId')::UUID;
        v_qty := (v_item->>'quantity')::INT;
        v_sale_item_id := (v_item->>'saleItemId')::UUID;

        IF v_sale_item_id IS NOT NULL THEN
            SELECT * INTO v_sale_item_record FROM sale_items WHERE id = v_sale_item_id;
        ELSE
            SELECT * INTO v_sale_item_record FROM sale_items
            WHERE sale_id = v_sale_id AND drug_id = v_drug_id
            AND is_unit = COALESCE((v_item->>'isUnit')::BOOLEAN, FALSE)
            LIMIT 1;
        END IF;

        IF v_sale_item_record.id IS NULL THEN
            RAISE EXCEPTION 'Sale item not found for drug %', v_drug_id;
        END IF;

        v_drug_id := v_sale_item_record.drug_id;
        v_return_key := CASE WHEN v_sale_item_record.is_unit THEN v_sale_item_record.id::TEXT || '_unit' ELSE v_sale_item_record.id::TEXT || '_pack' END;
        v_already_returned := COALESCE((v_sale_record.item_returned_quantities->>v_return_key)::INT, 0);
        v_available_to_return := v_sale_item_record.quantity - v_already_returned;

        IF v_qty > v_available_to_return THEN
            RAISE EXCEPTION 'Cannot return % units of %. Only % units available to return.', v_qty, v_sale_item_record.name, v_available_to_return;
        END IF;

        v_item_refund := ROUND(v_qty * v_sale_item_record.public_price * (v_sale_record.total / NULLIF(v_sale_record.subtotal, 0)), 2);
        v_running_total_refund := v_running_total_refund + v_item_refund;

        SELECT name, dosage_form, units_per_pack INTO v_drug_record FROM drugs WHERE id = v_drug_id;

        SELECT batch_id, expiry_date INTO v_batch_id, v_expiry_date
        FROM stock_movements
        WHERE reference_id = v_sale_id AND drug_id = v_drug_id AND type = 'sale'
        ORDER BY timestamp DESC LIMIT 1
        FOR UPDATE;

        INSERT INTO return_items (
            branch_id, return_id, drug_id, sale_item_id, name,
            quantity_returned, is_unit, public_price, refund_amount,
            condition, dosage_form, expiry_date
        ) VALUES (
            v_branch_id, v_return_id, v_drug_id, v_sale_item_record.id, v_drug_record.name,
            v_qty, v_sale_item_record.is_unit, v_sale_item_record.public_price,
            v_item_refund,
            (v_item->>'condition')::text::item_condition, v_drug_record.dosage_form, v_expiry_date
        );

        IF (v_item->>'condition') = 'sellable' AND v_batch_id IS NOT NULL THEN
            DECLARE
                v_return_units INT;
            BEGIN
                IF v_sale_item_record.is_unit THEN
                    v_return_units := v_qty;
                ELSE
                    v_return_units := v_qty * COALESCE(v_drug_record.units_per_pack, 1);
                END IF;
                UPDATE stock_batches SET quantity = quantity + v_return_units WHERE id = v_batch_id;
            END;
        END IF;

        UPDATE sales SET item_returned_quantities =
            COALESCE(item_returned_quantities, '{}'::JSONB) ||
            jsonb_build_object(v_return_key, v_already_returned + v_qty)
        WHERE id = v_sale_id;
    END LOOP;

    UPDATE public.returns SET total_refund = v_running_total_refund WHERE id = v_return_id;

    UPDATE sales
    SET net_total = COALESCE(net_total, total) - v_running_total_refund,
        status = CASE WHEN (p_payload->>'returnType') = 'full' THEN 'returned'::sale_status ELSE status END
    WHERE id = v_sale_id;

    v_points_to_deduct := ROUND(v_sale_earned_points * (v_running_total_refund / NULLIF(v_sale_record.total, 0)))::INTEGER;

    v_phone_clean := REGEXP_REPLACE(v_customer_phone, '[\s\-\(\)]', '', 'g');

    IF v_phone_clean IS NOT NULL AND v_phone_clean != '' THEN
        UPDATE customers
        SET
            total_purchases = GREATEST(COALESCE(total_purchases, 0) - v_running_total_refund, 0),
            points = GREATEST(COALESCE(points, 0) - v_points_to_deduct, 0)
        WHERE branch_id = v_branch_id
        AND REGEXP_REPLACE(phone, '[\s\-\(\)\+]', '', 'g') = v_phone_clean;
    END IF;

    IF v_customer_code IS NOT NULL AND v_customer_code != '' THEN
        UPDATE customers
        SET
            total_purchases = GREATEST(COALESCE(total_purchases, 0) - v_running_total_refund, 0),
            points = GREATEST(COALESCE(points, 0) - v_points_to_deduct, 0)
        WHERE code = v_customer_code AND branch_id = v_branch_id
        AND (v_phone_clean IS NULL OR v_phone_clean = ''
             OR NOT EXISTS (
                 SELECT 1 FROM customers
                 WHERE branch_id = v_branch_id
                 AND REGEXP_REPLACE(phone, '[\s\-\(\)\+]', '', 'g') = v_phone_clean
             ));
    END IF;

    -- Record the return in cash_transactions and update shift counters
    -- for BOTH cash and card payments
    IF v_shift_id IS NOT NULL THEN
        IF v_payment_method = 'cash' THEN
            INSERT INTO cash_transactions (
                branch_id, shift_id, type, amount, reason,
                user_id, related_sale_id, org_id
            ) VALUES (
                v_branch_id, v_shift_id, 'return', -v_running_total_refund,
                'Return ' || v_return_serial, v_performer_id, v_sale_id, v_org_id
            );
            PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, 0, v_running_total_refund, 0, 0, 0);
        ELSIF v_payment_method = 'visa' THEN
            INSERT INTO cash_transactions (
                branch_id, shift_id, type, amount, reason,
                user_id, related_sale_id, org_id
            ) VALUES (
                v_branch_id, v_shift_id, 'card_return', -v_running_total_refund,
                'Return ' || v_return_serial, v_performer_id, v_sale_id, v_org_id
            );
            PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, 0, 0, 0, 0, v_running_total_refund);
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'returnId', v_return_id,
        'serialId', v_return_serial,
        'totalRefund', v_running_total_refund
    );
END;
$function$;


CREATE OR REPLACE FUNCTION public.process_purchase_return(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_return_id UUID := COALESCE(NULLIF(p_payload->>'id', '')::UUID, gen_random_uuid());
    v_branch_id UUID := NULLIF(p_payload->>'branchId', '')::UUID;
    v_purchase_id UUID := NULLIF(p_payload->>'purchaseId', '')::UUID;
    v_supplier_id UUID := NULLIF(p_payload->>'supplierId', '')::UUID;
    v_supplier_name TEXT := p_payload->>'supplierName';
    v_date TIMESTAMPTZ := COALESCE(NULLIF(p_payload->>'date', '')::TIMESTAMPTZ, now());
    v_total_refund NUMERIC := COALESCE(NULLIF(p_payload->>'totalRefund', '')::NUMERIC, 0);
    v_status purchase_status := COALESCE(NULLIF(p_payload->>'status', '')::purchase_status, 'completed');
    v_notes TEXT := NULLIF(p_payload->>'notes', '');
    v_performer_id UUID := NULLIF(p_payload->>'processedBy', '')::UUID;
    v_shift_id UUID := NULLIF(p_payload->>'shiftId', '')::UUID;
    v_payment_method VARCHAR := p_payload->>'paymentMethod';
    v_org_id UUID;
    v_serial_id TEXT;
    v_item JSONB;
    v_drug RECORD;
    v_batch RECORD;
    v_drug_id UUID;
    v_quantity INT;
    v_remaining INT;
    v_take INT;
    v_reason purchase_ret_reason;
    v_condition item_condition;
    v_items_count INT := 0;
BEGIN
    IF v_branch_id IS NULL THEN RAISE EXCEPTION 'branchId is required'; END IF;

    IF NOT has_branch_permission(v_branch_id, ARRAY['admin', 'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 'inventory_officer', 'manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to process purchase returns';
    END IF;

    IF v_purchase_id IS NULL THEN RAISE EXCEPTION 'purchaseId is required'; END IF;
    IF v_supplier_id IS NULL THEN RAISE EXCEPTION 'supplierId is required'; END IF;

    SELECT org_id INTO v_org_id FROM public.purchases WHERE id = v_purchase_id AND branch_id = v_branch_id;
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Purchase % not found in branch %', v_purchase_id, v_branch_id;
    END IF;

    IF jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'items must be an array'; END IF;
    IF jsonb_array_length(p_payload->'items') = 0 THEN RAISE EXCEPTION 'purchase return must contain at least one item'; END IF;

    -- PR serial: {BranchCode}-PR-{YY}-{000001} via single source
    v_serial_id := generate_serial_id(v_branch_id, 'PR', NULL, v_date);

    INSERT INTO public.purchase_returns (
        id, branch_id, org_id, purchase_id, supplier_id, supplier_name_snapshot, date, total_refund, status, notes, serial_id, payment_method
    ) VALUES (
        v_return_id, v_branch_id, v_org_id, v_purchase_id, v_supplier_id, COALESCE(v_supplier_name, ''), v_date, v_total_refund, v_status, v_notes, v_serial_id,
        COALESCE(NULLIF(v_payment_method, '')::purchase_pay_type, 'cash')
    );

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
    LOOP
        v_drug_id := NULLIF(v_item->>'drugId', '')::UUID;
        v_quantity := NULLIF(v_item->>'quantityReturned', '')::INT;
        v_reason := COALESCE(NULLIF(v_item->>'reason', '')::purchase_ret_reason, 'other');
        v_condition := COALESCE(NULLIF(v_item->>'condition', '')::item_condition, 'other');

        IF v_drug_id IS NULL THEN RAISE EXCEPTION 'Return item drugId is required'; END IF;
        IF v_quantity IS NULL OR v_quantity <= 0 THEN RAISE EXCEPTION 'Return quantity must be positive for drug %', v_drug_id; END IF;

        SELECT * INTO v_drug FROM public.drugs WHERE id = v_drug_id AND branch_id = v_branch_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Drug % not found in branch %', v_drug_id, v_branch_id; END IF;

        PERFORM set_stock_context('return_supplier', v_return_id, v_performer_id, p_payload->>'processedByName', v_reason::TEXT, v_notes);

        INSERT INTO public.purchase_return_items (
            id, branch_id, purchase_return_id, drug_id, name, quantity_returned, is_unit, units_per_pack, cost_price, refund_amount, dosage_form, reason, condition
        ) VALUES (
            gen_random_uuid(), v_branch_id, v_return_id, v_drug_id, COALESCE(NULLIF(v_item->>'name', ''), v_drug.name),
            v_quantity, COALESCE(NULLIF(v_item->>'isUnit', '')::BOOLEAN, false), NULLIF(v_item->>'unitsPerPack', '')::INT,
            COALESCE(NULLIF(v_item->>'costPrice', '')::NUMERIC, 0), COALESCE(NULLIF(v_item->>'refundAmount', '')::NUMERIC, 0),
            NULLIF(v_item->>'dosageForm', ''), v_reason, v_condition
        );

        v_remaining := v_quantity;
        FOR v_batch IN
            SELECT * FROM public.stock_batches WHERE drug_id = v_drug_id AND branch_id = v_branch_id AND quantity > 0
            ORDER BY expiry_date ASC, created_at ASC FOR UPDATE
        LOOP
            EXIT WHEN v_remaining <= 0;
            v_take := LEAST(v_remaining, v_batch.quantity);
            UPDATE public.stock_batches SET quantity = quantity - v_take, version = version + 1 WHERE id = v_batch.id;
            v_remaining := v_remaining - v_take;
        END LOOP;

        IF v_remaining > 0 THEN RAISE EXCEPTION 'Insufficient stock for drug %', v_drug_id; END IF;
        v_items_count := v_items_count + 1;
    END LOOP;

    -- ── Refund settlement ────────────────────────────────────
    IF v_payment_method = 'cash' THEN
        IF v_shift_id IS NULL THEN
            RAISE EXCEPTION 'shiftId is required for cash purchase returns';
        END IF;

        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, time, org_id, related_purchase_id, related_supplier_id)
        VALUES (v_branch_id, v_shift_id, 'purchase_return', v_total_refund, 'Purchase Return ' || v_serial_id, v_performer_id, CURRENT_TIMESTAMP, v_org_id, v_purchase_id, v_supplier_id);

        PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, 0, 0, 0, v_total_refund);
    ELSIF v_payment_method = 'credit' THEN
        -- Credit note: reduces the supplier's payable + the invoice's open amount
        INSERT INTO supplier_ledger_entries (
            branch_id, org_id, supplier_id, entry_type, source_table, source_id, date, amount, created_by
        ) VALUES (
            v_branch_id, v_org_id, v_supplier_id, 'credit_note', 'purchase_returns', v_return_id, v_date::DATE, -v_total_refund, v_performer_id
        )
        ON CONFLICT (source_table, source_id, entry_type) DO NOTHING;
    END IF;

    RETURN jsonb_build_object('success', true, 'purchaseReturnId', v_return_id, 'serialId', v_serial_id, 'itemsCount', v_items_count);
END;
$$;
