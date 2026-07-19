-- ============================================================
-- Phase 1: Add Missing Foreign Key Indexes
-- Risk: ZERO — indexes are additive, never break existing queries
-- ============================================================

-- === sale_items ===
CREATE INDEX IF NOT EXISTS idx_sale_items_drug_id ON public.sale_items (drug_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_branch_id ON public.sale_items (branch_id);
-- NOTE: idx_sale_items_sale (sale_id) already exists ✅

-- === purchase_items ===
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_drug_id ON public.purchase_items (drug_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_branch_id ON public.purchase_items (branch_id);

-- === cash_transactions ===
CREATE INDEX IF NOT EXISTS idx_cash_transactions_shift_id ON public.cash_transactions (shift_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_branch_id ON public.cash_transactions (branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_user_id ON public.cash_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_related_sale_id ON public.cash_transactions (related_sale_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_org_id ON public.cash_transactions (org_id);

-- === returns ===
CREATE INDEX IF NOT EXISTS idx_returns_branch_id ON public.returns (branch_id);
CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON public.returns (sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_org_id ON public.returns (org_id);

-- === return_items ===
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON public.return_items (return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_drug_id ON public.return_items (drug_id);
CREATE INDEX IF NOT EXISTS idx_return_items_branch_id ON public.return_items (branch_id);

-- === purchase_returns ===
CREATE INDEX IF NOT EXISTS idx_purchase_returns_branch_id ON public.purchase_returns (branch_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_purchase_id ON public.purchase_returns (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier_id ON public.purchase_returns (supplier_id);

-- === purchase_return_items ===
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return_id ON public.purchase_return_items (purchase_return_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_drug_id ON public.purchase_return_items (drug_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_branch_id ON public.purchase_return_items (branch_id);

-- === stock_movements ===
CREATE INDEX IF NOT EXISTS idx_stock_movements_branch_id ON public.stock_movements (branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_id ON public.stock_movements (batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_id ON public.stock_movements (org_id);

-- === sale_item_batches ===
CREATE INDEX IF NOT EXISTS idx_sale_item_batches_sale_item_id ON public.sale_item_batches (sale_item_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_batches_batch_id ON public.sale_item_batches (batch_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_batches_branch_id ON public.sale_item_batches (branch_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_batches_org_id ON public.sale_item_batches (org_id);

-- === sales ===
CREATE INDEX IF NOT EXISTS idx_sales_shift_id ON public.sales (shift_id);
CREATE INDEX IF NOT EXISTS idx_sales_sold_by_employee_id ON public.sales (sold_by_employee_id);

-- === shifts ===
CREATE INDEX IF NOT EXISTS idx_shifts_org_id ON public.shifts (org_id);

-- === audit_logs ===
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_id ON public.audit_logs (branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs (org_id);

-- === drugs (missing FK indexes) ===
CREATE INDEX IF NOT EXISTS idx_drugs_supplier_id ON public.drugs (supplier_id);
CREATE INDEX IF NOT EXISTS idx_drugs_global_drug_id ON public.drugs (global_drug_id);

-- === suppliers ===
CREATE INDEX IF NOT EXISTS idx_suppliers_branch_id ON public.suppliers (branch_id);

-- === employees ===
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON public.employees (branch_id);
-- NOTE: idx_employees_org_id + idx_employees_org_branch already exist ✅

-- === expenses ===
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id_v2 ON public.expenses (branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_id_v2 ON public.expenses (org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON public.expenses (employee_id);

-- === purchases ===
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_by ON public.purchases (created_by);
-- NOTE: idx_purchases_branch_date + idx_purchases_org_id already exist ✅
