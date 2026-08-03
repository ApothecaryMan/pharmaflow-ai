-- ============================================================
-- T5.1 — create_supplier RPC: accept payables master data
-- Date: 2026-08-06
--
-- Extends create_supplier so the SuppliersList add/edit form can
-- persist opening_balance, payment_type, credit_days, credit_limit.
-- This is a separate migration (not an edit to 20260501000005) so
-- environments where the original RPC already ran pick up the new
-- signature via CREATE OR REPLACE.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_supplier(
  p_supplier JSONB,
  p_branch_id UUID,
  p_org_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_new_code TEXT;
  v_result RECORD;
BEGIN
  -- 1. Generate the sequence code within the same transaction
  SELECT 'SUP-' || LPAD(nextval('public.suppliers_seq')::TEXT, 4, '0') INTO v_new_code;

  -- 2. Insert the record
  INSERT INTO public.suppliers (
    id,
    org_id,
    branch_id,
    supplier_code,
    name,
    contact_person,
    phone,
    email,
    address,
    governorate,
    city,
    area,
    status,
    opening_balance,
    payment_type,
    credit_days,
    credit_limit,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_org_id,
    p_branch_id,
    v_new_code,
    (p_supplier->>'name'),
    (p_supplier->>'contactPerson'),
    (p_supplier->>'phone'),
    (p_supplier->>'email'),
    (p_supplier->>'address'),
    (p_supplier->>'governorate'),
    (p_supplier->>'city'),
    (p_supplier->>'area'),
    COALESCE((p_supplier->>'status'), 'active')::public.supplier_status,
    COALESCE(NULLIF((p_supplier->>'openingBalance'), ''), 0)::NUMERIC,
    COALESCE(NULLIF((p_supplier->>'paymentType'), ''), 'credit')::public.purchase_pay_type,
    COALESCE(NULLIF((p_supplier->>'creditDays'), ''), 0)::INTEGER,
    NULLIF((p_supplier->>'creditLimit'), '')::NUMERIC,
    now(),
    now()
  ) RETURNING * INTO v_result;

  RETURN to_jsonb(v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_supplier(JSONB, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_supplier(JSONB, UUID, UUID) TO service_role;

COMMIT;
