-- ============================================================
-- Phase 3a: Migrate purchases.items JSONB → purchase_items relational table
-- CRITICAL: purchase_items currently has 0 rows — all items in JSONB
-- ============================================================

BEGIN;

INSERT INTO purchase_items (id, purchase_id, branch_id, drug_id, name, dosage_form, quantity, cost_price, expiry_date, discount, public_price, tax, is_unit, units_per_pack)
SELECT
  gen_random_uuid(),
  p.id,
  p.branch_id,
  (item->>'drugId')::UUID,
  COALESCE(item->>'name', ''),
  item->>'dosageForm',
  COALESCE((item->>'quantity')::INT, 0),
  COALESCE((item->>'costPrice')::NUMERIC, 0),
  CASE
    WHEN NULLIF(item->>'expiryDate', '') IS NULL THEN NULL
    WHEN length(item->>'expiryDate') = 7 THEN ((item->>'expiryDate') || '-01')::DATE
    ELSE (item->>'expiryDate')::DATE
  END,
  COALESCE((item->>'discount')::NUMERIC, 0),
  COALESCE((item->>'publicPrice')::NUMERIC, 0),
  COALESCE((item->>'tax')::NUMERIC, 0),
  COALESCE((item->>'isUnit')::BOOLEAN, false),
  COALESCE((item->>'unitsPerPack')::INT, 1)
FROM purchases p,
     jsonb_array_elements(p.items) AS item
WHERE p.items IS NOT NULL
  AND jsonb_typeof(p.items) = 'array'
  AND jsonb_array_length(p.items) > 0
  AND NOT EXISTS (
    SELECT 1 FROM purchase_items pi WHERE pi.purchase_id = p.id
  );

COMMIT;
