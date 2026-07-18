-- Migration: Patch close_shift and RLS Policies
-- Date: 2026-06-20
-- Description: Applies fixes to already-deployed migrations from 2026-06-19.
-- 1. Updates close_shift to calculate expected balance server-side.
-- 2. Standardizes RLS policies to use get_my_branches() for stock tables.

BEGIN;

-- 1. Update close_shift with server-side expected balance calculation
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
    v_expected_balance NUMERIC;
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

    -- Calculate expected balance from server-side shift totals (P2 §6 requirement)
    -- Formula: opening + cash_in + cash_sales + cash_purchase_returns - cash_out - returns - cash_purchases
    v_expected_balance := COALESCE(v_shift.opening_balance, 0)
        + COALESCE(v_shift.cash_in, 0)
        + COALESCE(v_shift.cash_sales, 0)
        + COALESCE(v_shift.cash_purchase_returns, 0)
        - COALESCE(v_shift.cash_out, 0)
        - COALESCE(v_shift.returns, 0)
        - COALESCE(v_shift.cash_purchases, 0);

    UPDATE public.shifts SET
        status = 'closed',
        close_time = v_close_time,
        closed_by = v_closed_by,
        closing_balance = v_closing_balance,
        expected_balance = v_expected_balance,
        notes = v_notes,
        handover_receipt_number = v_handover_receipt_number
    WHERE id = v_shift_id;

    INSERT INTO public.cash_transactions (
        branch_id, shift_id, type, amount, reason, user_id, time
    ) VALUES (
        v_shift.branch_id, v_shift_id, 'closing_balance', v_closing_balance, 'End of shift', v_closed_by, v_close_time
    );

    RETURN jsonb_build_object(
        'success', true,
        'shiftId', v_shift_id,
        'expectedBalance', v_expected_balance,
        'closingBalance', v_closing_balance,
        'difference', v_closing_balance - v_expected_balance
    );
END;
$$;

-- 2. Update RLS policies to use get_my_branches() (plpgsql, safe from inlining)
DROP POLICY IF EXISTS batch_select_policy ON public.stock_batches;
CREATE POLICY batch_select_policy ON public.stock_batches
  FOR SELECT USING (branch_id IN (SELECT branch_id FROM get_my_branches()));

DROP POLICY IF EXISTS movement_select_policy ON public.stock_movements;
CREATE POLICY movement_select_policy ON public.stock_movements
  FOR SELECT USING (branch_id IN (SELECT branch_id FROM get_my_branches()));

COMMIT;
