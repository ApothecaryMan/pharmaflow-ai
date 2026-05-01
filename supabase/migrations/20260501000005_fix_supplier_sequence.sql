-- ═══════════════════════════════════════════
-- Migration: Fix Supplier Sequence and RPC
-- ═══════════════════════════════════════════

-- 1. Create the sequence for supplier codes if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS public.suppliers_seq;

-- 2. Initialize the sequence based on existing supplier codes
-- This prevents "duplicate key" errors by starting from the next available number
DO $$
DECLARE
    v_max_val INTEGER;
BEGIN
    SELECT MAX(CAST(SUBSTRING(supplier_code FROM 5) AS INTEGER))
    INTO v_max_val
    FROM public.suppliers 
    WHERE supplier_code LIKE 'SUP-%';

    IF v_max_val IS NOT NULL THEN
        PERFORM setval('public.suppliers_seq', v_max_val + 1, false);
    ELSE
        PERFORM setval('public.suppliers_seq', 1, false);
    END IF;
END $$;

-- 3. (Re)Create the Atomic Create Supplier RPC
-- We use CREATE OR REPLACE to ensure the function exists and is valid
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
    COALESCE((p_supplier->>'status'), 'active'),
    now(),
    now()
  ) RETURNING * INTO v_result;

  RETURN to_jsonb(v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure permissions are correct for PostgREST
GRANT EXECUTE ON FUNCTION public.create_supplier(JSONB, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_supplier(JSONB, UUID, UUID) TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.suppliers_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.suppliers_seq TO service_role;
