-- ═══════════════════════════════════════════
-- Migration: Atomic Operations for Concurrency Safety
-- Prevents race conditions when multiple devices operate simultaneously
-- ═══════════════════════════════════════════

BEGIN;

-- 1. Atomic Stock Increment/Decrement
-- Instead of read-then-write, this does SET stock = stock + delta atomically
CREATE OR REPLACE FUNCTION atomic_increment_stock(p_drug_id UUID, p_delta INTEGER)
RETURNS INTEGER AS $$
DECLARE
  result_stock INTEGER;
BEGIN
  UPDATE drugs 
  SET stock = GREATEST(0, COALESCE(stock, 0) + p_delta)
  WHERE id = p_drug_id
  RETURNING stock INTO result_stock;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drug not found: %', p_drug_id;
  END IF;
  
  RETURN result_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Atomic Batch Quantity Update
CREATE OR REPLACE FUNCTION atomic_increment_batch(p_batch_id UUID, p_delta INTEGER)
RETURNS TABLE(new_qty INTEGER, new_ver INTEGER) AS $$
BEGIN
  RETURN QUERY
  UPDATE stock_batches 
  SET quantity = GREATEST(0, quantity + p_delta),
      version = COALESCE(version, 0) + 1
  WHERE id = p_batch_id
  RETURNING quantity::INTEGER, version::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Atomic Shift Totals Update
-- Safely increments shift counters without read-then-write
CREATE OR REPLACE FUNCTION atomic_increment_shift(
  p_shift_id UUID,
  p_cash_in NUMERIC DEFAULT 0,
  p_cash_out NUMERIC DEFAULT 0,
  p_cash_sales NUMERIC DEFAULT 0,
  p_card_sales NUMERIC DEFAULT 0,
  p_returns NUMERIC DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE shifts SET
    cash_in     = COALESCE(cash_in, 0)     + p_cash_in,
    cash_out    = COALESCE(cash_out, 0)    + p_cash_out,
    cash_sales  = COALESCE(cash_sales, 0)  + p_cash_sales,
    card_sales  = COALESCE(card_sales, 0)  + p_card_sales,
    returns     = COALESCE(returns, 0)     + p_returns
  WHERE id = p_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
