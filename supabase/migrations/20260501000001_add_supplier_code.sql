-- Add supplier_code column to suppliers table
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS supplier_code TEXT;

-- Update existing suppliers with serial codes (SUP-0001, SUP-0002...)
DO $$
DECLARE
    r RECORD;
    counter INT := 1;
BEGIN
    FOR r IN SELECT id FROM public.suppliers WHERE supplier_code IS NULL OR supplier_code = '' ORDER BY created_at ASC LOOP
        UPDATE public.suppliers 
        SET supplier_code = 'SUP-' || LPAD(counter::TEXT, 4, '0')
        WHERE id = r.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Make it NOT NULL and UNIQUE
ALTER TABLE public.suppliers ALTER COLUMN supplier_code SET NOT NULL;
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_supplier_code_key UNIQUE (supplier_code);

-- ═══════════════════════════════════════════
-- ATOMIC CREATE SUPPLIER RPC
-- ═══════════════════════════════════════════

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

-- Note: RLS policies already cover the table, no changes needed for RLS.
