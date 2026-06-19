-- Migration: Server-Side Authorization and RLS Hardening (P3 Remediation)
-- Date: 2026-06-19
-- Description: Introduces has_branch_permission SQL helper, secures all financial/inventory RPCs with role checks, and tightens RLS to block direct client writes.

BEGIN;

-- 1. Helper function to verify auth, branch access, and role permissions
CREATE OR REPLACE FUNCTION public.has_branch_permission(
  p_branch_id UUID,
  p_required_roles employee_role[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_org_admin BOOLEAN;
  v_role employee_role;
  v_status employee_status;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if the user is an owner or admin of the branch's organization
  SELECT EXISTS (
    SELECT 1 FROM public.org_members m
    JOIN public.branches b ON b.org_id = m.org_id
    WHERE m.user_id = auth.uid() 
      AND b.id = p_branch_id 
      AND m.role IN ('owner', 'admin')
  ) INTO v_is_org_admin;
  
  IF v_is_org_admin THEN
    RETURN TRUE;
  END IF;

  -- Check if they are an active employee in this branch with an allowed role
  SELECT role, status INTO v_role, v_status FROM public.employees 
  WHERE auth_user_id = auth.uid() 
    AND branch_id = p_branch_id
  LIMIT 1;
  
  IF v_role IS NOT NULL AND v_status = 'active' THEN
    IF p_required_roles IS NULL OR v_role = ANY(p_required_roles) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;


-- 2. Update open_shift with authorization checks
CREATE OR REPLACE FUNCTION public.open_shift(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shift_id UUID := COALESCE(NULLIF(p_payload->>'id', '')::UUID, gen_random_uuid());
    v_branch_id UUID := NULLIF(p_payload->>'branchId', '')::UUID;
    v_opened_by UUID := NULLIF(p_payload->>'openedBy', '')::UUID;
    v_opening_balance NUMERIC := COALESCE(NULLIF(p_payload->>'openingBalance', '')::NUMERIC, 0);
    v_open_time TIMESTAMPTZ := COALESCE(NULLIF(p_payload->>'openTime', '')::TIMESTAMPTZ, now());
BEGIN
    IF v_branch_id IS NULL THEN RAISE EXCEPTION 'branchId is required'; END IF;
    IF v_opened_by IS NULL THEN RAISE EXCEPTION 'openedBy is required'; END IF;

    -- Enforce server-side authorization
    IF NOT has_branch_permission(v_branch_id, ARRAY['admin', 'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 'cashier', 'senior_cashier', 'manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to open shift';
    END IF;

    -- Ensure no open shift already exists for this branch
    IF EXISTS (SELECT 1 FROM public.shifts WHERE branch_id = v_branch_id AND status = 'open') THEN
        RAISE EXCEPTION 'An open shift already exists for this branch';
    END IF;

    INSERT INTO public.shifts (
        id, branch_id, status, open_time, opened_by, opening_balance,
        cash_in, cash_out, cash_sales, card_sales, returns, cash_purchases, cash_purchase_returns
    ) VALUES (
        v_shift_id, v_branch_id, 'open', v_open_time, v_opened_by, v_opening_balance,
        0, 0, 0, 0, 0, 0, 0
    );

    INSERT INTO public.cash_transactions (
        branch_id, shift_id, type, amount, reason, user_id, time
    ) VALUES (
        v_branch_id, v_shift_id, 'opening_balance', v_opening_balance, 'Start of shift', v_opened_by, v_open_time
    );

    RETURN jsonb_build_object('success', true, 'shiftId', v_shift_id);
END;
$$;


-- 3. Update close_shift with authorization checks
CREATE OR REPLACE FUNCTION public.close_shift(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shift_id UUID := NULLIF(p_payload->>'id', '')::UUID;
    v_closed_by UUID := NULLIF(p_payload->>'closedBy', '')::UUID;
    v_closing_balance NUMERIC := COALESCE(NULLIF(p_payload->>'closingBalance', '')::NUMERIC, 0);
    v_close_time TIMESTAMPTZ := COALESCE(NULLIF(p_payload->>'closeTime', '')::TIMESTAMPTZ, now());
    v_notes TEXT := p_payload->>'notes';
    v_handover_receipt_number INT := COALESCE(NULLIF(p_payload->>'handoverReceiptNumber', '')::INT, 1);
    v_shift RECORD;
BEGIN
    IF v_shift_id IS NULL THEN RAISE EXCEPTION 'shift id is required'; END IF;
    IF v_closed_by IS NULL THEN RAISE EXCEPTION 'closedBy is required'; END IF;

    SELECT * INTO v_shift FROM public.shifts WHERE id = v_shift_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shift % not found', v_shift_id;
    END IF;

    -- Enforce server-side authorization
    IF NOT has_branch_permission(v_shift.branch_id, ARRAY['admin', 'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 'cashier', 'senior_cashier', 'manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to close shift';
    END IF;

    IF v_shift.status = 'closed' THEN
        RAISE EXCEPTION 'Shift is already closed';
    END IF;

    UPDATE public.shifts SET
        status = 'closed',
        close_time = v_close_time,
        closed_by = v_closed_by,
        closing_balance = v_closing_balance,
        notes = v_notes,
        handover_receipt_number = v_handover_receipt_number
    WHERE id = v_shift_id;

    INSERT INTO public.cash_transactions (
        branch_id, shift_id, type, amount, reason, user_id, time
    ) VALUES (
        v_shift.branch_id, v_shift_id, 'closing_balance', v_closing_balance, 'End of shift', v_closed_by, v_close_time
    );

    RETURN jsonb_build_object('success', true, 'shiftId', v_shift_id);
END;
$$;


-- 4. Update process_cash_transaction with authorization checks
CREATE OR REPLACE FUNCTION public.process_cash_transaction(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tx_id UUID := COALESCE(NULLIF(p_payload->>'id', '')::UUID, gen_random_uuid());
    v_shift_id UUID := NULLIF(p_payload->>'shiftId', '')::UUID;
    v_branch_id UUID := NULLIF(p_payload->>'branchId', '')::UUID;
    v_type public.cash_tx_type := (p_payload->>'type')::public.cash_tx_type;
    v_amount NUMERIC := (p_payload->>'amount')::NUMERIC;
    v_reason TEXT := p_payload->>'reason';
    v_user_id UUID := NULLIF(p_payload->>'userId', '')::UUID;
    v_time TIMESTAMPTZ := COALESCE(NULLIF(p_payload->>'time', '')::TIMESTAMPTZ, now());
BEGIN
    IF v_shift_id IS NULL THEN RAISE EXCEPTION 'shiftId is required'; END IF;
    IF v_amount IS NULL OR v_amount < 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

    -- Enforce server-side authorization
    IF NOT has_branch_permission(v_branch_id, ARRAY['admin', 'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 'cashier', 'senior_cashier', 'manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to process cash transactions';
    END IF;

    INSERT INTO public.cash_transactions (
        id, branch_id, shift_id, type, amount, reason, user_id, time
    ) VALUES (
        v_tx_id, v_branch_id, v_shift_id, v_type, v_amount, v_reason, v_user_id, v_time
    );

    IF v_type = 'in' THEN
        PERFORM atomic_increment_shift(v_shift_id, v_amount, 0, 0, 0, 0, 0, 0);
    ELSIF v_type = 'out' THEN
        PERFORM atomic_increment_shift(v_shift_id, 0, v_amount, 0, 0, 0, 0, 0);
    END IF;

    RETURN jsonb_build_object('success', true, 'transactionId', v_tx_id);
END;
$$;


-- 5. Update delete_expense with authorization checks
CREATE OR REPLACE FUNCTION public.delete_expense(p_expense_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expense RECORD;
    v_tx_id UUID;
BEGIN
    -- Lock the expense
    SELECT * INTO v_expense FROM public.expenses WHERE id = p_expense_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Expense not found');
    END IF;

    -- Enforce server-side authorization
    IF NOT has_branch_permission(v_expense.branch_id, ARRAY['admin', 'pharmacist_owner', 'pharmacist_manager', 'manager', 'senior_cashier']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to delete expenses';
    END IF;

    -- If this expense was linked to a shift, revert the cash out and remove the cash transaction
    IF v_expense.shift_id IS NOT NULL AND v_expense.payment_method = 'cash' THEN
        PERFORM atomic_increment_shift(
            v_expense.shift_id,
            0,             -- p_cash_in
            -v_expense.amount, -- p_cash_out (revert)
            0, 0, 0, 0, 0
        );

        SELECT id INTO v_tx_id
        FROM public.cash_transactions
        WHERE shift_id = v_expense.shift_id
          AND type = 'expense'
          AND amount = v_expense.amount
          AND reason = 'Expense: ' || v_expense.description
        LIMIT 1;

        IF v_tx_id IS NOT NULL THEN
            DELETE FROM public.cash_transactions WHERE id = v_tx_id;
        END IF;
    END IF;

    -- Finally, delete the expense record
    DELETE FROM public.expenses WHERE id = p_expense_id;

    RETURN jsonb_build_object('success', true);
END;
$$;


-- 6. Update record_expense with authorization checks
CREATE OR REPLACE FUNCTION record_expense(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expense_id UUID;
    v_shift_id UUID;
    v_amount NUMERIC;
    v_branch_id UUID;
    v_org_id UUID;
    v_employee_id UUID;
    v_payment_method VARCHAR;
    v_category VARCHAR;
    v_description TEXT;
BEGIN
    v_amount          := (p_payload->>'amount')::NUMERIC;
    v_branch_id       := (p_payload->>'branchId')::UUID;
    v_org_id          := (p_payload->>'orgId')::UUID;
    v_employee_id     := (p_payload->>'employeeId')::UUID;
    v_payment_method  := p_payload->>'paymentMethod';
    v_category        := p_payload->>'category';
    v_description     := p_payload->>'description';

    IF v_branch_id IS NULL THEN RAISE EXCEPTION 'branchId is required'; END IF;

    -- Enforce server-side authorization
    IF NOT has_branch_permission(v_branch_id, ARRAY['admin', 'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 'cashier', 'senior_cashier', 'manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to record expenses';
    END IF;

    -- Resolve active shift (if cash payment method)
    IF v_payment_method = 'cash' THEN
        SELECT id INTO v_shift_id
        FROM shifts
        WHERE branch_id = v_branch_id AND status = 'open'
        LIMIT 1;

        -- If an active shift exists, perform the atomic decrement
        IF v_shift_id IS NOT NULL THEN
            PERFORM atomic_increment_shift(
                v_shift_id,
                0,             -- p_cash_in
                v_amount,      -- p_cash_out (acts as deduction with balance lock check)
                0, 0, 0, 0, 0
            );
        END IF;
    END IF;

    -- Insert the expense record
    INSERT INTO expenses (
        org_id, branch_id, employee_id, shift_id, amount, category, description, payment_method
    ) VALUES (
        v_org_id, v_branch_id, v_employee_id, v_shift_id, v_amount, v_category::expense_category, v_description, v_payment_method
    ) RETURNING id INTO v_expense_id;

    -- Log corresponding cash transaction if linked to shift
    IF v_shift_id IS NOT NULL AND v_payment_method = 'cash' THEN
        INSERT INTO cash_transactions (
            branch_id, shift_id, type, amount, reason, user_id, org_id
        ) VALUES (
            v_branch_id, v_shift_id, 'expense', v_amount, 'Expense: ' || v_description, v_employee_id, v_org_id
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'expenseId', v_expense_id);
END;
$$;


-- 7. Update process_purchase_receipt with authorization checks
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
    v_shift_id UUID := NULLIF(p_payload->>'shiftId', '')::UUID;
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

    SELECT * INTO v_purchase FROM purchases WHERE id = v_purchase_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Purchase not found');
    END IF;

    -- Enforce server-side authorization
    IF NOT has_branch_permission(v_purchase.branch_id, ARRAY['admin', 'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 'inventory_officer', 'manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to process purchase receipt';
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

        SELECT * INTO v_drug FROM drugs WHERE id = v_drug_id AND branch_id = v_purchase.branch_id FOR UPDATE;

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
            drug_id, quantity, expiry_date, cost_price, purchase_id, date_received, branch_id, org_id, version
        ) VALUES (
            v_drug_id, v_units_to_add, v_expiry_date, v_unit_cost_price, v_purchase_id, CURRENT_TIMESTAMP, v_purchase.branch_id, v_purchase.org_id, 1
        );

        SELECT MIN(expiry_date) INTO v_earliest_expiry FROM stock_batches WHERE drug_id = v_drug_id AND branch_id = v_purchase.branch_id AND quantity > 0;
        SELECT SUM(quantity * cost_price) / NULLIF(SUM(quantity), 0) INTO v_global_unit_wac FROM stock_batches WHERE drug_id = v_drug_id AND branch_id = v_purchase.branch_id AND quantity > 0;

        UPDATE drugs
        SET public_price = v_public_price,
            unit_price = v_unit_price,
            cost_price = COALESCE(v_global_unit_wac * COALESCE(NULLIF(units_per_pack, 0), 1), NULLIF(v_item->>'costPrice', '')::DECIMAL, cost_price),
            unit_cost_price = COALESCE(v_global_unit_wac, v_unit_cost_price, unit_cost_price),
            expiry_date = COALESCE(v_earliest_expiry, v_expiry_date)
        WHERE id = v_drug_id;
    END LOOP;

    UPDATE purchases
    SET status = 'received', received_by = v_performer_name, received_at = CURRENT_TIMESTAMP
    WHERE id = v_purchase_id;

    -- Atomic Cash Transaction handling
    IF v_purchase.payment_method = 'cash' THEN
        IF v_shift_id IS NULL THEN
            RAISE EXCEPTION 'shiftId is required for cash purchases';
        END IF;

        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, time, org_id)
        VALUES (v_purchase.branch_id, v_shift_id, 'purchase', v_purchase.total_cost, 'Purchase #' || v_purchase.id, v_performer_id, CURRENT_TIMESTAMP, v_purchase.org_id);
        
        PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, 0, 0, v_purchase.total_cost, 0);
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;


-- 8. Update process_purchase_return with authorization checks
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

    -- Enforce server-side authorization
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

    INSERT INTO public.purchase_returns (
        id, branch_id, purchase_id, supplier_id, supplier_name_snapshot, date, total_refund, status, notes
    ) VALUES (
        v_return_id, v_branch_id, v_purchase_id, v_supplier_id, COALESCE(v_supplier_name, ''), v_date, v_total_refund, v_status, v_notes
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

    -- Atomic Cash Transaction handling
    IF v_payment_method = 'cash' THEN
        IF v_shift_id IS NULL THEN
            RAISE EXCEPTION 'shiftId is required for cash purchase returns';
        END IF;

        INSERT INTO cash_transactions (branch_id, shift_id, type, amount, reason, user_id, time, org_id)
        VALUES (v_branch_id, v_shift_id, 'purchase_return', v_total_refund, 'Purchase Return #' || v_return_id, v_performer_id, CURRENT_TIMESTAMP, v_org_id);
        
        PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, 0, 0, 0, v_total_refund);
    END IF;

    RETURN jsonb_build_object('success', true, 'purchaseReturnId', v_return_id, 'itemsCount', v_items_count);
END;
$$;


-- 9. Update finalize_delivery_order with authorization checks
CREATE OR REPLACE FUNCTION public.finalize_delivery_order(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale_id UUID := (p_payload->>'saleId')::UUID;
    v_shift_id UUID := NULLIF(p_payload->>'shiftId', '')::UUID;
    v_performer_id UUID := NULLIF(p_payload->>'performerId', '')::UUID;
    v_performer_name TEXT := (p_payload->>'performerName');
    v_sale RECORD;
BEGIN
    IF v_sale_id IS NULL THEN RAISE EXCEPTION 'saleId is required'; END IF;
    IF v_shift_id IS NULL THEN RAISE EXCEPTION 'shiftId is required'; END IF;

    SELECT * INTO v_sale FROM public.sales WHERE id = v_sale_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Sale not found'); END IF;

    -- Enforce server-side authorization
    IF NOT has_branch_permission(v_sale.branch_id, ARRAY['admin', 'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 'cashier', 'senior_cashier', 'manager', 'assistant', 'delivery']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to finalize delivery order';
    END IF;
    
    IF v_sale.status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'alreadyCompleted', true);
    END IF;

    UPDATE public.sales SET 
        status = 'completed', 
        shift_transaction_recorded = true,
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = v_sale_id;

    IF v_sale.payment_method = 'cash' THEN
        INSERT INTO public.cash_transactions (branch_id, shift_id, type, amount, reason, user_id, time, related_sale_id, org_id)
        VALUES (v_sale.branch_id, v_shift_id, 'sale', v_sale.total, 'Delivery Finalized #' || COALESCE(v_sale.serial_id, v_sale.id::text), v_performer_id, CURRENT_TIMESTAMP, v_sale_id, v_sale.org_id);
        
        PERFORM atomic_increment_shift(v_shift_id, 0, 0, v_sale.total, 0, 0, 0, 0);
    ELSIF v_sale.payment_method = 'visa' THEN
        INSERT INTO public.cash_transactions (branch_id, shift_id, type, amount, reason, user_id, time, related_sale_id, org_id)
        VALUES (v_sale.branch_id, v_shift_id, 'card_sale', v_sale.total, 'Delivery Finalized #' || COALESCE(v_sale.serial_id, v_sale.id::text), v_performer_id, CURRENT_TIMESTAMP, v_sale_id, v_sale.org_id);
        
        PERFORM atomic_increment_shift(v_shift_id, 0, 0, 0, v_sale.total, 0, 0, 0);
    END IF;

    RETURN jsonb_build_object('success', true, 'saleId', v_sale_id);
END;
$$;


-- 10. Update process_stock_adjustment with authorization checks
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
    IF v_branch_id IS NULL THEN RAISE EXCEPTION 'branchId is required'; END IF;

    -- Enforce server-side authorization
    IF NOT has_branch_permission(v_branch_id, ARRAY['admin', 'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 'inventory_officer', 'manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to process stock adjustments';
    END IF;

    IF jsonb_typeof(p_payload->'adjustments') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'adjustments must be an array';
    END IF;

    IF v_movement_id IS NOT NULL THEN
        SELECT * INTO v_pending_movement FROM public.stock_movements
        WHERE id = v_movement_id AND branch_id = v_branch_id AND type = 'adjustment' AND status = 'pending' FOR UPDATE;

        IF NOT FOUND THEN RAISE EXCEPTION 'Pending adjustment movement % not found', v_movement_id; END IF;
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

        IF v_drug_id IS NULL THEN RAISE EXCEPTION 'Adjustment drugId is required'; END IF;
        IF v_quantity IS NULL OR v_quantity = 0 THEN CONTINUE; END IF;
        IF v_movement_type NOT IN ('adjustment', 'damage', 'return_supplier') THEN
            RAISE EXCEPTION 'Unsupported stock adjustment movement type %', v_movement_type;
        END IF;

        SELECT * INTO v_drug FROM public.drugs WHERE id = v_drug_id AND branch_id = v_branch_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Drug % not found in branch %', v_drug_id, v_branch_id; END IF;

        PERFORM set_stock_context(v_movement_type, COALESCE(v_transaction_id, v_movement_id, v_drug_id), v_performer_id, v_performer_name, v_reason, v_notes);

        IF v_quantity > 0 THEN
            IF v_batch_id IS NOT NULL THEN
                SELECT * INTO v_batch FROM public.stock_batches WHERE id = v_batch_id AND drug_id = v_drug_id AND branch_id = v_branch_id FOR UPDATE;
                IF NOT FOUND THEN RAISE EXCEPTION 'Batch % not found for drug %', v_batch_id, v_drug_id; END IF;

                UPDATE public.stock_batches SET quantity = quantity + v_quantity, version = version + 1 WHERE id = v_batch_id;
            ELSE
                INSERT INTO public.stock_batches (
                    branch_id, org_id, drug_id, quantity, expiry_date, cost_price, date_received, batch_number, version
                ) VALUES (
                    v_branch_id, COALESCE(v_org_id, v_drug.org_id), v_drug_id, v_quantity, COALESCE(v_expiry_date, v_drug.expiry_date::DATE, (CURRENT_DATE + INTERVAL '1 year')::DATE),
                    COALESCE(v_drug.cost_price, 0), CURRENT_DATE, 'MANUAL-ADJUST', 1
                );
            END IF;
        ELSE
            v_remaining := ABS(v_quantity);
            IF v_batch_id IS NOT NULL THEN
                SELECT * INTO v_batch FROM public.stock_batches WHERE id = v_batch_id AND drug_id = v_drug_id AND branch_id = v_branch_id FOR UPDATE;
                IF NOT FOUND THEN RAISE EXCEPTION 'Batch % not found for drug %', v_batch_id, v_drug_id; END IF;
                IF v_batch.quantity < v_remaining THEN RAISE EXCEPTION 'Insufficient stock in batch % for drug %', v_batch_id, v_drug_id; END IF;

                UPDATE public.stock_batches SET quantity = quantity - v_remaining, version = version + 1 WHERE id = v_batch_id;
            ELSE
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
            END IF;
        END IF;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    IF v_movement_id IS NOT NULL THEN
        UPDATE public.stock_movements SET status = 'approved', reviewed_by = COALESCE(v_performer_id, reviewed_by), reviewed_at = now() WHERE id = v_movement_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'processedCount', v_processed_count);
END;
$$;


-- 11. Tighten Row Level Security (RLS) on Shifts, Cash Transactions, and Expenses
-- Restrict direct mutations from the client, keeping them strictly Read-Only.
DROP POLICY IF EXISTS tenant_isolation ON shifts;
DROP POLICY IF EXISTS tenant_isolation ON cash_transactions;
DROP POLICY IF EXISTS tenant_isolation ON expenses;

CREATE POLICY tenant_isolation ON shifts 
  FOR SELECT USING (branch_id IN (SELECT get_user_branch_ids()));

CREATE POLICY tenant_isolation ON cash_transactions 
  FOR SELECT USING (branch_id IN (SELECT get_user_branch_ids()));

CREATE POLICY tenant_isolation ON expenses 
  FOR SELECT USING (branch_id IN (SELECT get_user_branch_ids()));

COMMIT;
