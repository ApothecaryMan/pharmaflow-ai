-- Migration: Atomic Cash and Shift Operations (P2 Remediation)
-- Date: 2026-06-19
-- Description: Moves open_shift, close_shift, process_cash_transaction, and delete_expense logic server-side to prevent race conditions.

BEGIN;

-- 1. Atomic Shift Opening
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

    -- Ensure no open shift already exists for this branch (optional business rule, but good practice)
    -- IF EXISTS (SELECT 1 FROM public.shifts WHERE branch_id = v_branch_id AND status = 'open') THEN
    --     RAISE EXCEPTION 'An open shift already exists for this branch';
    -- END IF;

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

-- 2. Atomic Shift Closing
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

-- 3. Process Generic Cash Transaction (Cash In / Out)
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

-- 4. Delete Expense Atomically
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

    -- If this expense was linked to a shift, revert the cash out and remove the cash transaction
    IF v_expense.shift_id IS NOT NULL AND v_expense.payment_method = 'cash' THEN
        -- Revert cash_out in shifts (pass negative amount)
        PERFORM atomic_increment_shift(
            v_expense.shift_id,
            0,             -- p_cash_in
            -v_expense.amount, -- p_cash_out (revert)
            0, 0, 0, 0, 0
        );

        -- Find and delete the matching cash transaction (limit 1 to avoid deleting duplicates if they exist)
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

COMMIT;
