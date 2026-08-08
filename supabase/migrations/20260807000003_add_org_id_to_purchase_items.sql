-- Add denormalized tenant (org_id) to purchase_items.
--
-- create_purchase (20260806000003_create_purchase_atomic.sql) already inserts
-- `org_id` into purchase_items, but the column never existed on the live table,
-- so completing a direct purchase failed with:
--   column "org_id" of relation "purchase_items" does not exist
--
-- `purchases` already carries org_id; mirror it here for tenant isolation + audit.

ALTER TABLE public.purchase_items
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

COMMENT ON COLUMN public.purchase_items.org_id IS
  'Denormalized tenant (organization) id for tenant isolation and audit.';

CREATE INDEX IF NOT EXISTS idx_purchase_items_org_id ON public.purchase_items (org_id);