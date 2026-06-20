-- Migration: RLS Security Audit & Stock Isolation Hardening
-- Date: 2026-06-19
-- Description: Converts stock_batches and stock_movements RLS policies to SELECT-only, ensuring stock mutations can only occur via SECURITY DEFINER database RPCs.

BEGIN;

-- 1. Drop existing permissive and select policies
DROP POLICY IF EXISTS batch_tenant_policy ON public.stock_batches;
DROP POLICY IF EXISTS movement_tenant_policy ON public.stock_movements;
DROP POLICY IF EXISTS batch_select_policy ON public.stock_batches;
DROP POLICY IF EXISTS movement_select_policy ON public.stock_movements;

-- 2. Create select-only policies for stock_batches
CREATE POLICY batch_select_policy ON public.stock_batches
  FOR SELECT USING (branch_id IN (SELECT get_user_branch_ids()));

-- 3. Create select-only policies for stock_movements
CREATE POLICY movement_select_policy ON public.stock_movements
  FOR SELECT USING (branch_id IN (SELECT get_user_branch_ids()));

COMMIT;
