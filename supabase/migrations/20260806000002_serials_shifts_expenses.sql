-- ══════════════════════════════════════════════════════════════════
-- Serial coverage for remaining real documents: shifts (SH) + expenses (EX)
--
-- These documents previously had NO serial (only a UUID PK), so their
-- UI fell back to showing a UUID fragment. This migration:
--   1. Adds serial_id columns to shifts and expenses.
--   2. Mints SH / EX serials from the single source (generate_serial_id)
--      inside open_shift and record_expense, so numbering is atomic and
--      server-authoritative.
-- Format: {BranchCode}-{TypeCode}-{YY}-{000001}, e.g. CAI-SH-26-000001.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.shifts  ADD COLUMN IF NOT EXISTS serial_id TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS serial_id TEXT;

COMMENT ON COLUMN public.shifts.serial_id IS
  'Shift serial (SH) minted from generate_serial_id at shift open.';
COMMENT ON COLUMN public.expenses.serial_id IS
  'Expense serial (EX) minted from generate_serial_id at record time.';

-- ── open_shift: mint SH serial ─────────────────────────────────────
-- Body identical to 20260804000001_authorization_hardening.sql except the
-- serial line, the serial_id column, and the serialId return field.
CREATE OR REPLACE FUNCTION public.open_shift(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_shift_id UUID := COALESCE(NULLIF(p_payload->>'id', '')::UUID, gen_random_uuid());
    v_branch_id UUID := NULLIF(p_payload->>'branchId', '')::UUID;
    v_opened_by UUID := NULLIF(p_payload->>'openedBy', '')::UUID;
    v_opening_balance NUMERIC := COALESCE(NULLIF(p_payload->>'openingBalance', '')::NUMERIC, 0);
    v_open_time TIMESTAMPTZ := COALESCE(NULLIF(p_payload->>'openTime', '')::TIMESTAMPTZ, now());
    v_serial_id TEXT;
BEGIN
    IF v_branch_id IS NULL THEN RAISE EXCEPTION 'branchId is required'; END IF;
    IF v_opened_by IS NULL THEN RAISE EXCEPTION 'openedBy is required'; END IF;

    -- Mint the shift serial from the single source (after branch validation).
    v_serial_id := generate_serial_id(v_branch_id, 'SH');

    -- ═══ SECURITY FIX: verify caller has permission on this branch ═══
    IF NOT has_branch_permission(v_branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','pharmacist','cashier','senior_cashier','manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to open shift';
    END IF;

    -- Defence-in-depth: the partial unique index on (branch_id) WHERE status = 'open'
    -- is the real guard. This check catches the error earlier with a clearer message.
    IF EXISTS (SELECT 1 FROM public.shifts WHERE branch_id = v_branch_id AND status = 'open') THEN
        RAISE EXCEPTION 'An open shift already exists for this branch';
    END IF;

    INSERT INTO public.shifts (
        id, branch_id, status, open_time, opened_by, opening_balance, serial_id,
        cash_in, cash_out, cash_sales, card_sales, returns, cash_purchases, cash_purchase_returns
    ) VALUES (
        v_shift_id, v_branch_id, 'open', v_open_time, v_opened_by, v_opening_balance, v_serial_id,
        0, 0, 0, 0, 0, 0, 0
    );

    INSERT INTO public.cash_transactions (
        branch_id, shift_id, type, amount, reason, user_id, time
    ) VALUES (
        v_branch_id, v_shift_id, 'opening_balance', v_opening_balance, 'Start of shift', v_opened_by, v_open_time
    );

    RETURN jsonb_build_object('success', true, 'shiftId', v_shift_id, 'serialId', v_serial_id);

EXCEPTION
    WHEN SQLSTATE '23505' THEN
        RETURN jsonb_build_object('success', false, 'error', 'An open shift already exists for this branch');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- ── record_expense: mint EX serial ─────────────────────────────────
-- Body identical to 20260526000002_expenses_table.sql except the serial
-- line, the serial_id column, and the serialId return field.
CREATE OR REPLACE FUNCTION record_expense(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expense_id UUID;
    v_serial_id TEXT;
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

    -- SECURITY: SECURITY DEFINER — verify the caller is allowed on this branch
    -- BEFORE minting a serial, so denied calls don't consume counter numbers.
    IF NOT has_branch_permission(v_branch_id, ARRAY['admin','pharmacist_owner','pharmacist_manager','pharmacist','cashier','senior_cashier','manager']::employee_role[]) THEN
        RAISE EXCEPTION 'Access denied: Unauthorized to record expense';
    END IF;

    -- Mint the expense serial from the single source.
    v_serial_id := generate_serial_id(v_branch_id, 'EX');

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
                0,             -- p_cash_sales
                0,             -- p_card_sales
                0,             -- p_returns
                0,             -- p_cash_purchases
                0              -- p_cash_purchase_returns
            );
        END IF;
    END IF;

    -- Insert the expense record
    INSERT INTO expenses (
        org_id,
        branch_id,
        employee_id,
        shift_id,
        amount,
        category,
        description,
        payment_method,
        serial_id
    ) VALUES (
        v_org_id,
        v_branch_id,
        v_employee_id,
        v_shift_id,
        v_amount,
        v_category::expense_category,
        v_description,
        v_payment_method,
        v_serial_id
    ) RETURNING id INTO v_expense_id;

    -- Log corresponding cash transaction if linked to shift
    IF v_shift_id IS NOT NULL AND v_payment_method = 'cash' THEN
        INSERT INTO cash_transactions (
            branch_id,
            shift_id,
            type,
            amount,
            reason,
            user_id,
            org_id
        ) VALUES (
            v_branch_id,
            v_shift_id,
            'expense',
            v_amount,
            'Expense: ' || v_description,
            v_employee_id,
            v_org_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'expenseId', v_expense_id,
        'serialId', v_serial_id,
        'shiftId', v_shift_id,
        'expense', (SELECT row_to_json(e) FROM expenses e WHERE id = v_expense_id)
    );
END;
$$;
