-- Migration: Add missing tables to realtime publication

BEGIN;

DO $$
BEGIN
    -- Add stock_batches if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'stock_batches'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE stock_batches;
    END IF;

    -- Add sale_items if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'sale_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE sale_items;
    END IF;
END $$;

COMMIT;
