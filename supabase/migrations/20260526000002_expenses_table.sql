-- Migration: Create Expenses Table & record_expense RPC
-- Date: 2026-05-26

-- 1. Extend cash_tx_type ENUM
ALTER TYPE cash_tx_type ADD VALUE IF NOT EXISTS 'expense';

-- 2. Create expense_category ENUM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'expense_category' AND n.nspname = 'public') THEN
        CREATE TYPE expense_category AS ENUM (
            'utilities', 'rent', 'maintenance', 'supplies',
            'petty_cash', 'transportation', 'salaries', 'misc'
        );
    END IF;
END $$;

-- 3. Core expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    employee_id     UUID NOT NULL REFERENCES employees(id),
    shift_id        UUID REFERENCES shifts(id) ON DELETE SET NULL,
    amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category        expense_category NOT NULL DEFAULT 'misc',
    description     TEXT NOT NULL,
    payment_method  VARCHAR(30) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'card')),
    approved        BOOLEAN NOT NULL DEFAULT true,
    approved_by     UUID REFERENCES employees(id),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Ensure get_user_branch_id helper exists
CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop policy if it exists to allow re-runs
DROP POLICY IF EXISTS branch_isolation ON expenses;
DROP POLICY IF EXISTS tenant_isolation ON expenses;

CREATE POLICY tenant_isolation ON expenses
    FOR ALL USING (branch_id IN (SELECT get_user_branch_ids()));

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_branch_date ON expenses(branch_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_shift ON expenses(shift_id);

-- 6. Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;

-- 7. record_expense RPC Function (handles atomic shift deduction and logs cash transaction)
CREATE OR REPLACE FUNCTION record_expense(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
        payment_method
    ) VALUES (
        v_org_id,
        v_branch_id,
        v_employee_id,
        v_shift_id,
        v_amount,
        v_category::expense_category,
        v_description,
        v_payment_method
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
        'shiftId', v_shift_id,
        'expense', (SELECT row_to_json(e) FROM expenses e WHERE id = v_expense_id)
    );
END;
$$;
