-- Migration: 20260618105154_add_org_id_indexes.sql
-- Description: Adds indexes on org_id for primary data tables to prevent sequential scans during multi-tenant queries.
-- These indexes drastically improve the performance of `getAll()` methods that filter by `org_id`.

CREATE INDEX IF NOT EXISTS idx_drugs_org_id ON public.drugs(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_id ON public.sales(org_id);
CREATE INDEX IF NOT EXISTS idx_purchases_org_id ON public.purchases(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON public.customers(org_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON public.suppliers(org_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_org_id ON public.stock_batches(org_id);
CREATE INDEX IF NOT EXISTS idx_employees_org_id ON public.employees(org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON public.expenses(org_id);

-- Also add composite indexes for org_id + branch_id for queries that use both
CREATE INDEX IF NOT EXISTS idx_drugs_org_branch ON public.drugs(org_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_branch ON public.sales(org_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_org_branch ON public.stock_batches(org_id, branch_id);
