-- Fix stale purchase serials in stock_movements after the purchase invoice_id
-- backfill (20260807000004). Purchase stock movements reference the purchase
-- number via reference_serial_id, which still carried the legacy INV-0000NN
-- format. Rewrite them to the canonical {Branch}-PU-{YY}-{0000NN} scheme.
--
-- The mapping is exact: legacy invoices were numbered chronologically and the
-- backfill renamed purchases in the same chronological order, so
-- INV-0000NN -> PH01-PU-26-0000NN.

UPDATE public.stock_movements
SET reference_serial_id =
      'PH01-PU-26-' || lpad(substring(reference_serial_id FROM 'INV-([0-9]+)$')::int::text, 6, '0')
WHERE type = 'purchase'
  AND reference_serial_id ~ '^INV-[0-9]+$';