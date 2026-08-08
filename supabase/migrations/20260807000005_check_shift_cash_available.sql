-- Preflight check for cash purchases: returns the "cash above base" a shift
-- currently has available (the same figure atomic_increment_shift validates)
-- so the client can abort a cash purchase BEFORE create_purchase mints a serial.
--
-- Without this, a cash purchase that exceeds the drawer float burns a serial in
-- create_purchase (its transaction commits) and only fails later in
-- process_purchase_receipt, producing gaps in the PU sequence.

CREATE OR REPLACE FUNCTION public.check_shift_cash_available(
  p_shift_id UUID,
  p_require_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_available NUMERIC;
  v_shift UUID;
BEGIN
  SELECT id INTO v_shift FROM public.shifts WHERE id = p_shift_id;
  IF v_shift IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'shift not found',
                              'available', 0, 'sufficient', false);
  END IF;

  -- Must mirror atomic_increment_shift's available-above-base exactly:
  --   (cash_in + cash_sales + cash_purchase_returns) - (cash_out + returns + cash_purchases)
  SELECT
    (COALESCE(cash_in, 0) + COALESCE(cash_sales, 0) + COALESCE(cash_purchase_returns, 0))
    -
    (COALESCE(cash_out, 0) + COALESCE(returns, 0) + COALESCE(cash_purchases, 0))
  INTO v_available
  FROM public.shifts
  WHERE id = p_shift_id;

  RETURN jsonb_build_object(
    'success',    true,
    'available',  COALESCE(v_available, 0),
    'sufficient', COALESCE(v_available, 0) >= COALESCE(p_amount, 0)
  );
END;
$function$;

COMMENT ON FUNCTION public.check_shift_cash_available IS
  'Reads the shift cash-above-base available and whether it covers p_amount, '
  'so cash purchase flow can abort before a serial is minted.';