-- Migration: Enable Realtime for missing tables
-- Date: 2026-07-31
--
-- Problem: The registry (services/realtime/registry.ts) subscribes to
-- postgres_changes for these tables, but they were never added to the
-- supabase_realtime publication. Without being in the publication,
-- Supabase will never broadcast change events for them.
--
-- Already in publication (from earlier migrations):
--   sales, drugs, stock_batches, stock_movements, expenses,
--   organizations, branches, user_active_sessions,
--   employment_requests, financial_snapshots, holidays
--
-- Missing (added safely below if not exist):
--   returns, purchases, customers, suppliers, shifts, cash_transactions

DO $$
DECLARE
    tbl text;
    tables_to_add text[] := ARRAY['returns', 'purchases', 'customers', 'suppliers', 'shifts', 'cash_transactions'];
BEGIN
    FOR tbl IN SELECT unnest(tables_to_add)
    LOOP
        -- Check if the table is already in the supabase_realtime publication
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND tablename = tbl
            AND schemaname = 'public'
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END $$;
