-- PharmaFlow Seed Part 2
-- Branch: 20864e85-6a6e-4b4b-a44c-b87fe50ecb7b

DO $$
DECLARE
  v_bid UUID := '20864e85-6a6e-4b4b-a44c-b87fe50ecb7b';
  v_oid UUID;
  v_gid UUID;
  v_did UUID;
BEGIN
  SELECT org_id INTO v_oid FROM branches WHERE id = v_bid;

  -- Item: iliadin 0.05 % adult 10 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('iliadin 0.05 % adult 10 ml', 'اليادين 0.05% محلول الأنف 10 مل', 'oxymetazoline', '6221025013170', 'Medicine', 3.35, 'amoun > merck kgaa f.r.germany', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'iliadin 0.05 % adult 10 ml', 'اليادين 0.05% محلول الأنف 10 مل', '{"oxymetazoline"}', 'Medicine', 3.35, 3, 23, '2026-12-01', '6221025013170', 1, 'Drops', 'local', 'amoun > merck kgaa f.r.germany', '39', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 23, '2026-12-01', 3, 'INITIAL-IMPORT', now());

  -- Item: kapritage soap 100 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('kapritage soap 100 gm', 'كبريتاج صابون 100 جم', 'sulfokonzentrol', '6220201389627', 'Medicine', 55, 'abo el-hool', 'Piece')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'kapritage soap 100 gm', 'كبريتاج صابون 100 جم', '{"sulfokonzentrol"}', 'Medicine', 55, 41.14, 53, '2027-07-01', '6220201389627', 1, 'Piece', 'local', 'abo el-hool', '186', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 53, '2027-07-01', 41.14, 'INITIAL-IMPORT', now());

  -- Item: kast 10mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('kast 10mg 10', 'كاست 10مجم 10', 'montelukast', '6221000000867', 'Medicine', 59, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'kast 10mg 10', 'كاست 10مجم 10', '{"montelukast"}', 'Medicine', 59, 43.15, 24, '2027-12-01', '6221000000867', 1, 'Tablet', 'local', 'hikma pharma', '1257', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 24, '2027-12-01', 43.15, 'INITIAL-IMPORT', now());

  -- Item: ketolgin 100mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ketolgin 100mg 5', 'كيتولجين 100مجم 5', 'ketoprofen', '6221025008824', 'Medicine', 4.5, 'amoun', 'Suppository')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ketolgin 100mg 5', 'كيتولجين 100مجم 5', '{"ketoprofen"}', 'Medicine', 4.5, 3.53, 104, '2028-07-01', '6221025008824', 1, 'Suppository', 'local', 'amoun', '55', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 104, '2028-07-01', 3.53, 'INITIAL-IMPORT', now());

  -- Item: ketolgin 2.5% 15 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ketolgin 2.5% 15 gm', 'كيتولجين 2.5% 15 جم', 'ketoprofen', '6221025008862', 'Medicine', 14, 'amoun', 'Gel')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ketolgin 2.5% 15 gm', 'كيتولجين 2.5% 15 جم', '{"ketoprofen"}', 'Medicine', 14, 12.09, 94, '2028-09-01', '6221025008862', 1, 'Gel', 'local', 'amoun', '49', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 94, '2028-09-01', 12.09, 'INITIAL-IMPORT', now());

  -- Item: ketolgin 2.5% 40 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ketolgin 2.5% 40 gm', 'كيتولجين 2.5% 40 جم', 'ketoprofen', '6221025018502', 'Medicine', 26, 'amoun', 'Gel')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ketolgin 2.5% 40 gm', 'كيتولجين 2.5% 40 جم', '{"ketoprofen"}', 'Medicine', 26, 18.34, 149, '2026-11-01', '6221025018502', 1, 'Gel', 'local', 'amoun', '59', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 149, '2026-11-01', 18.34, 'INITIAL-IMPORT', now());

  -- Item: ketolgin 200mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ketolgin 200mg 10', 'كيتولجين 200مجم 10', 'ketoprofen', '6221025009654', 'Medicine', 26, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ketolgin 200mg 10', 'كيتولجين 200مجم 10', '{"ketoprofen"}', 'Medicine', 26, 21.49, 65, '2027-11-01', '6221025009654', 1, 'Capsule', 'local', 'amoun', '132', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 65, '2027-11-01', 21.49, 'INITIAL-IMPORT', now());

  -- Item: klozepam 2.5mg/ml 15ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('klozepam 2.5mg/ml 15ml', 'كلوزيبام 2.5مجم/مل 15 مل فم', 'clonazepam', '6221025008329', 'Medicine', 40, 'sigma', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'klozepam 2.5mg/ml 15ml', 'كلوزيبام 2.5مجم/مل 15 مل فم', '{"clonazepam"}', 'Medicine', 40, 26.21, 130, '2028-07-01', '6221025008329', 1, 'Drops', 'local', 'sigma', '129', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 130, '2028-07-01', 26.21, 'INITIAL-IMPORT', now());

  -- Item: leil 100gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('leil 100gm', 'ليل 100 جم', 'caffeine, l.carnitine, peanut, coconut, wheat germ, green tea, aloe vera', '6211020993744', 'Medicine', 160, 'revano pharmaceuticals and cosmetics', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'leil 100gm', 'ليل 100 جم', '{"caffeine","l.carnitine","peanut","coconut","wheat germ","green tea","aloe vera"}', 'Medicine', 160, 100.05, 153, '2028-01-01', '6211020993744', 1, 'Cream', 'local', 'revano pharmaceuticals and cosmetics', '50', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 153, '2028-01-01', 100.05, 'INITIAL-IMPORT', now());

  -- Item: levoxin 250 mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('levoxin 250 mg 5', 'ليفوكسين 250 مجم 5', 'levofloxacin', '6221025011831', 'Medicine', 45, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'levoxin 250 mg 5', 'ليفوكسين 250 مجم 5', '{"levofloxacin"}', 'Medicine', 45, 33.03, 127, '2028-12-01', '6221025011831', 1, 'Tablet', 'local', 'amoun', '145', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 127, '2028-12-01', 33.03, 'INITIAL-IMPORT', now());

  -- Item: levoxin 500mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('levoxin 500mg 5', 'ليفوكسين 500 مجم 5', 'levofloxacin', '6221025011824', 'Medicine', 76, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'levoxin 500mg 5', 'ليفوكسين 500 مجم 5', '{"levofloxacin"}', 'Medicine', 76, 66.26, 16, '2027-07-01', '6221025011824', 1, 'Tablet', 'local', 'amoun', '937', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 16, '2027-07-01', 66.26, 'INITIAL-IMPORT', now());

  -- Item: levoxin 500mg 100 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('levoxin 500mg 100 ml', 'ليفوكسين 500مجم 100 مل', 'levofloxacin', '6221025017185', 'Medicine', 72, 'amoun', 'Vial')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'levoxin 500mg 100 ml', 'ليفوكسين 500مجم 100 مل', '{"levofloxacin"}', 'Medicine', 72, 45.88, 103, '2028-04-01', '6221025017185', 1, 'Vial', 'local', 'amoun', '219', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 103, '2028-04-01', 45.88, 'INITIAL-IMPORT', now());

  -- Item: levoxin 5mg 5 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('levoxin 5mg 5 ml', 'ليفوكسين 5مجم للعين 5 مل', 'levofloxacin', '6221025019042', 'Medicine', 12.75, 'amoun', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'levoxin 5mg 5 ml', 'ليفوكسين 5مجم للعين 5 مل', '{"levofloxacin"}', 'Medicine', 12.75, 8.05, 81, '2028-01-01', '6221025019042', 1, 'Drops', 'local', 'amoun', '54', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 81, '2028-01-01', 8.05, 'INITIAL-IMPORT', now());

  -- Item: lopral 30mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('lopral 30mg 5', 'لوبرال 30 مجم 5', 'lansoprazole', '6221014000112', 'Medicine', 27.5, 't3a pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'lopral 30mg 5', 'لوبرال 30 مجم 5', '{"lansoprazole"}', 'Medicine', 27.5, 22.06, 78, '2027-05-01', '6221014000112', 1, 'Capsule', 'local', 't3a pharma', '53', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 78, '2027-05-01', 22.06, 'INITIAL-IMPORT', now());

  -- Item: loratan 5mg/5ml 100 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('loratan 5mg/5ml 100 ml', 'لوراتان 5مجم/5مل 100 مل', 'loratadine', '6221014000464', 'Medicine', 15, 't3a pharma', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'loratan 5mg/5ml 100 ml', 'لوراتان 5مجم/5مل 100 مل', '{"loratadine"}', 'Medicine', 15, 9.36, 118, '2028-08-01', '6221014000464', 1, 'Syrup', 'local', 't3a pharma', '41', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 118, '2028-08-01', 9.36, 'INITIAL-IMPORT', now());

  -- Item: m.p.a 40mg/ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('m.p.a 40mg/ml', 'ام بي ايه 40مجم/مل', 'methylprednisolone', '6221025009357', 'Medicine', 8.5, 'amoun', 'Vial')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'm.p.a 40mg/ml', 'ام بي ايه 40مجم/مل', '{"methylprednisolone"}', 'Medicine', 8.5, 6.91, 72, '2027-05-01', '6221025009357', 1, 'Vial', 'local', 'amoun', '62', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 72, '2027-05-01', 6.91, 'INITIAL-IMPORT', now());

  -- Item: marcofen 100mg/5ml 120 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('marcofen 100mg/5ml 120 ml', 'ماركوفين 100مجم/5مل 120 مل', 'ibuprofen', '6221025001047', 'Medicine', 5.85, 'glaxo smithkline', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'marcofen 100mg/5ml 120 ml', 'ماركوفين 100مجم/5مل 120 مل', '{"ibuprofen"}', 'Medicine', 5.85, 4.12, 28, '2027-12-01', '6221025001047', 1, 'Suspension', 'local', 'glaxo smithkline', '50', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 28, '2027-12-01', 4.12, 'INITIAL-IMPORT', now());

  -- Item: megalase 125 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('megalase 125 ml', 'ميجاليز 125 مل', 'alpha amylase', '6221025015488', 'Medicine', 31, 'amoun', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'megalase 125 ml', 'ميجاليز 125 مل', '{"alpha amylase"}', 'Medicine', 31, 22.55, 22, '2028-05-01', '6221025015488', 1, 'Syrup', 'local', 'amoun', '2165', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 22, '2028-05-01', 22.55, 'INITIAL-IMPORT', now());

  -- Item: melocam 15mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('melocam 15mg 5', 'ميلوكام 15مجم 5', 'meloxicam', '6221025009555', 'Medicine', 8.5, 'amoun', 'Suppository')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'melocam 15mg 5', 'ميلوكام 15مجم 5', '{"meloxicam"}', 'Medicine', 8.5, 5.47, 140, '2027-12-01', '6221025009555', 1, 'Suppository', 'local', 'amoun', '63', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 140, '2027-12-01', 5.47, 'INITIAL-IMPORT', now());

  -- Item: mepadrenal 50 carpules
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('mepadrenal 50 carpules', 'ميبادرينال 50 كربوله', 'adrenaline, mepivacaine', '6221025017109', 'Medicine', 480, 'alexandria', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'mepadrenal 50 carpules', 'ميبادرينال 50 كربوله', '{"adrenaline","mepivacaine"}', 'Medicine', 480, 289.23, 148, '2028-06-01', '6221025017109', 1, 'Ampoule', 'local', 'alexandria', '32', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 148, '2028-06-01', 289.23, 'INITIAL-IMPORT', now());

  -- Item: midathetic 7.5mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('midathetic 7.5mg 10', 'ميداثيتك 7.5مجم 10', 'midazolam', '6221025019349', 'Medicine', 9, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'midathetic 7.5mg 10', 'ميداثيتك 7.5مجم 10', '{"midazolam"}', 'Medicine', 9, 6.51, 47, '2028-08-01', '6221025019349', 1, 'Tablet', 'local', 'amoun', '63', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 47, '2028-08-01', 6.51, 'INITIAL-IMPORT', now());

  -- Item: minalax 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('minalax 10', 'مينالاكس 10', 'bisacodyl, docusate sodium', '6221025001603', 'Medicine', 20, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'minalax 10', 'مينالاكس 10', '{"bisacodyl","docusate sodium"}', 'Medicine', 20, 16.16, 18, '2028-05-01', '6221025001603', 1, 'Tablet', 'local', 'amoun', '3420', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 18, '2028-05-01', 16.16, 'INITIAL-IMPORT', now());

  -- Item: mobilat 20 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('mobilat 20 gm', 'موبيلات 20جرام', 'mucopolysacharide polysulfuric acid, salicylic acid', '6221014000518', 'Medicine', 9.25, 't3a pharma', 'Gel')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'mobilat 20 gm', 'موبيلات 20جرام', '{"mucopolysacharide polysulfuric acid","salicylic acid"}', 'Medicine', 9.25, 7.85, 94, '2028-08-01', '6221014000518', 1, 'Gel', 'local', 't3a pharma', '42', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 94, '2028-08-01', 7.85, 'INITIAL-IMPORT', now());

  -- Item: mosedin 5mg/5ml 60ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('mosedin 5mg/5ml 60ml', 'موسيدين 5مجم/5مل 60 مل', 'loratadine', '6221025008237', 'Medicine', 22, 'amoun', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'mosedin 5mg/5ml 60ml', 'موسيدين 5مجم/5مل 60 مل', '{"loratadine"}', 'Medicine', 22, 14.99, 139, '2027-06-01', '6221025008237', 1, 'Syrup', 'local', 'amoun', '304', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 139, '2027-06-01', 14.99, 'INITIAL-IMPORT', now());

  -- Item: mosedin 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('mosedin 10', 'موسيدين بلاس اس ار 10', 'loratadine, pseudoephedrine', '6221025016614', 'Medicine', 13.5, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'mosedin 10', 'موسيدين بلاس اس ار 10', '{"loratadine","pseudoephedrine"}', 'Medicine', 13.5, 8.29, 44, '2026-09-01', '6221025016614', 1, 'Capsule', 'local', 'amoun', '260', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 44, '2026-09-01', 8.29, 'INITIAL-IMPORT', now());

  -- Item: motil fast 10 mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('motil fast 10 mg 10', 'موتيل فاست 10', 'domperidone', '6221025020147', 'Medicine', 26, 'amoun', 'Sachet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'motil fast 10 mg 10', 'موتيل فاست 10', '{"domperidone"}', 'Medicine', 26, 22.21, 16, '2026-09-01', '6221025020147', 1, 'Sachet', 'local', 'amoun', '334', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 16, '2026-09-01', 22.21, 'INITIAL-IMPORT', now());

  -- Item: mucosol ped. 125mg/5ml 120ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('mucosol ped. 125mg/5ml 120ml', 'ميوكوسول 125مجم/5مل 120مل', 'carbocysteine', '6221025014597', 'Medicine', 23, 'mup', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'mucosol ped. 125mg/5ml 120ml', 'ميوكوسول 125مجم/5مل 120مل', '{"carbocysteine"}', 'Medicine', 23, 20.34, 25, '2027-06-01', '6221025014597', 1, 'Syrup', 'local', 'mup', '1595', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 25, '2027-06-01', 20.34, 'INITIAL-IMPORT', now());

  -- Item: myorelax 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('myorelax 10', 'ميوريلاكس 10', 'carisoprodol, paracetamol(acetaminophen)', '6221025009432', 'Medicine', 4.5, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'myorelax 10', 'ميوريلاكس 10', '{"carisoprodol","paracetamol(acetaminophen)"}', 'Medicine', 4.5, 3.57, 37, '2028-07-01', '6221025009432', 1, 'Capsule', 'local', 'amoun', '86', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 37, '2028-07-01', 3.57, 'INITIAL-IMPORT', now());

  -- Item: nasotal 2gm/100ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('nasotal 2gm/100ml', 'نازوتال 2جم/100مل', 'sodium cromoglycate', '6221025004048', 'Medicine', 8, 'amoun', 'Spray')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'nasotal 2gm/100ml', 'نازوتال 2جم/100مل', '{"sodium cromoglycate"}', 'Medicine', 8, 5.14, 151, '2027-08-01', '6221025004048', 1, 'Spray', 'local', 'amoun', '142', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 151, '2027-08-01', 5.14, 'INITIAL-IMPORT', now());

  -- Item: nasotal compound 15 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('nasotal compound 15 ml', 'نازوتال مركب 15 مل للانف', 'sodium cromoglycate, xylometazoline', '6221025004062', 'Medicine', 8.6, 'amoun', 'Spray')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'nasotal compound 15 ml', 'نازوتال مركب 15 مل للانف', '{"sodium cromoglycate","xylometazoline"}', 'Medicine', 8.6, 7.36, 25, '2028-12-01', '6221025004062', 1, 'Spray', 'local', 'amoun', '72', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 25, '2028-12-01', 7.36, 'INITIAL-IMPORT', now());

  -- Item: neo-michaelon 120ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('neo-michaelon 120ml', 'نيو مايكليون 120 مل', 'chlorpheniramine, paracetamol(acetaminophen), pseudoephedrine', '6221025017239', 'Medicine', 8.25, 'amoun', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'neo-michaelon 120ml', 'نيو مايكليون 120 مل', '{"chlorpheniramine","paracetamol(acetaminophen)","pseudoephedrine"}', 'Medicine', 8.25, 6.41, 107, '2026-12-01', '6221025017239', 1, 'Syrup', 'local', 'amoun', '42', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 107, '2026-12-01', 6.41, 'INITIAL-IMPORT', now());

  -- Item: neozoline
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('neozoline', 'نيوزولين للعين والانف', 'chlorpheniramine, naphazoline', '6221025017086', 'Medicine', 4.25, 'amoun', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'neozoline', 'نيوزولين للعين والانف', '{"chlorpheniramine","naphazoline"}', 'Medicine', 4.25, 2.92, 128, '2027-07-01', '6221025017086', 1, 'Drops', 'local', 'amoun', '62', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 128, '2027-07-01', 2.92, 'INITIAL-IMPORT', now());

  -- Item: nestogen 3 milk 200 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('nestogen 3 milk 200 gm', 'نيستوجين 3 200 جم', 'milk formula stage 3', '6221007033042', 'Medicine', 125, 'nestle', 'Piece')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'nestogen 3 milk 200 gm', 'نيستوجين 3 200 جم', '{"milk formula stage 3"}', 'Medicine', 125, 78.09, 46, '2026-11-01', '6221007033042', 1, 'Piece', 'imported', 'nestle', '248', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 46, '2026-11-01', 78.09, 'INITIAL-IMPORT', now());

  -- Item: nido-1 milk 288 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('nido-1 milk 288 gm', 'نيدو 1 بلس 288 جم', 'milk formula stage 3', '6221007034513', 'Medicine', 165, 'nestle', 'Piece')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'nido-1 milk 288 gm', 'نيدو 1 بلس 288 جم', '{"milk formula stage 3"}', 'Medicine', 165, 132.27, 83, '2028-03-01', '6221007034513', 1, 'Piece', 'local', 'nestle', '146', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 83, '2028-03-01', 132.27, 'INITIAL-IMPORT', now());

  -- Item: no-migrain z 2.5mg 2
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('no-migrain z 2.5mg 2', 'نو-ميجران زد 2.5مجم 2', 'zolmitriptan', '6221025017147', 'Medicine', 21.6, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'no-migrain z 2.5mg 2', 'نو-ميجران زد 2.5مجم 2', '{"zolmitriptan"}', 'Medicine', 21.6, 19.05, 52, '2027-05-01', '6221025017147', 1, 'Tablet', 'local', 'amoun', '69', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 52, '2027-05-01', 19.05, 'INITIAL-IMPORT', now());

  -- Item: oracure 15 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('oracure 15 gm', 'اواكيور 15 جم', 'cetylpyridinium chloride, lidocaine', '6221025016812', 'Medicine', 17, 'amoun', 'Gel')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'oracure 15 gm', 'اواكيور 15 جم', '{"cetylpyridinium chloride","lidocaine"}', 'Medicine', 17, 11.74, 142, '2027-03-01', '6221025016812', 1, 'Gel', 'local', 'amoun', '747', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 142, '2027-03-01', 11.74, 'INITIAL-IMPORT', now());

  -- Item: oracure 30 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('oracure 30 gm', 'اوراكيور 30 جم', 'cetylpyridinium chloride, lidocaine', '6221025004550', 'Medicine', 24, 'amoun', 'Gel')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'oracure 30 gm', 'اوراكيور 30 جم', '{"cetylpyridinium chloride","lidocaine"}', 'Medicine', 24, 17.49, 62, '2026-08-01', '6221025004550', 1, 'Gel', 'local', 'amoun', '1449', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 62, '2026-08-01', 17.49, 'INITIAL-IMPORT', now());

  -- Item: otal 5 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('otal 5 ml', 'اوتال اذن 5 مل', 'cinchocaine, dexamethasone, framycetin, gramicidin', '6221025013743', 'Medicine', 19, 'amoun', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'otal 5 ml', 'اوتال اذن 5 مل', '{"cinchocaine","dexamethasone","framycetin","gramicidin"}', 'Medicine', 19, 16.58, 158, '2028-10-01', '6221025013743', 1, 'Drops', 'local', 'amoun', '2246', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 158, '2028-10-01', 16.58, 'INITIAL-IMPORT', now());

  -- Item: pentolate 1% 10 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('pentolate 1% 10 ml', 'بنتولات قطرة عين 10 مل', 'cyclopentolate', '6221025017000', 'Medicine', 8, 'amoun', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'pentolate 1% 10 ml', 'بنتولات قطرة عين 10 مل', '{"cyclopentolate"}', 'Medicine', 8, 6.49, 125, '2028-05-01', '6221025017000', 1, 'Drops', 'local', 'amoun', '50', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 125, '2028-05-01', 6.49, 'INITIAL-IMPORT', now());

  -- Item: pepzol 20 mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('pepzol 20 mg 14', 'بيبزول 20مجم 14', 'omeprazole', '6221000001000', 'Medicine', 47, 'hikma pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'pepzol 20 mg 14', 'بيبزول 20مجم 14', '{"omeprazole"}', 'Medicine', 47, 38.4, 103, '2027-12-01', '6221000001000', 1, 'Capsule', 'local', 'hikma pharma', '1372', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 103, '2027-12-01', 38.4, 'INITIAL-IMPORT', now());

  -- Item: pepzol 40mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('pepzol 40mg 14', 'بيبزول 40مجم 14', 'omeprazole', '6221000001017', 'Medicine', 81, 'hikma pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'pepzol 40mg 14', 'بيبزول 40مجم 14', '{"omeprazole"}', 'Medicine', 81, 60.41, 120, '2028-05-01', '6221000001017', 1, 'Capsule', 'local', 'hikma pharma', '2301', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 120, '2028-05-01', 60.41, 'INITIAL-IMPORT', now());

  -- Item: philozac 10mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('philozac 10mg 10', 'فيلوزاك 10مجم 10', 'fluoxetine', '6221025008213', 'Medicine', 9, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'philozac 10mg 10', 'فيلوزاك 10مجم 10', '{"fluoxetine"}', 'Medicine', 9, 7.86, 141, '2026-10-01', '6221025008213', 1, 'Capsule', 'local', 'amoun', '172', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 141, '2026-10-01', 7.86, 'INITIAL-IMPORT', now());

  -- Item: philozac 20mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('philozac 20mg 10', 'فيلوزاك 20مجم 10', 'fluoxetine', '6221025008220', 'Medicine', 11, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'philozac 20mg 10', 'فيلوزاك 20مجم 10', '{"fluoxetine"}', 'Medicine', 11, 7.68, 37, '2028-06-01', '6221025008220', 1, 'Capsule', 'local', 'amoun', '315', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 37, '2028-06-01', 7.68, 'INITIAL-IMPORT', now());

  -- Item: polyfresh 0.2% 30*0.4 ml sdu
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('polyfresh 0.2% 30*0.4 ml sdu', 'بولي فريش 0.2% قطرة للعين 30*0.4مل', 'sodium hyaluronate', '6211000219369', 'Medicine', 95, 'orchidia pharmaceutical industries', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'polyfresh 0.2% 30*0.4 ml sdu', 'بولي فريش 0.2% قطرة للعين 30*0.4مل', '{"sodium hyaluronate"}', 'Medicine', 95, 85.05, 159, '2027-02-01', '6211000219369', 1, 'Drops', 'imported', 'orchidia pharmaceutical industries', '418', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 159, '2027-02-01', 85.05, 'INITIAL-IMPORT', now());

  -- Item: procto-4 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('procto-4 5', 'بروكتو 4 5', 'aesculin, cinchocaine, framycetin, hydrocortisone', '6221025013569', 'Medicine', 4.5, 'amoun', 'Suppository')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'procto-4 5', 'بروكتو 4 5', '{"aesculin","cinchocaine","framycetin","hydrocortisone"}', 'Medicine', 4.5, 3.14, 154, '2026-12-01', '6221025013569', 1, 'Suppository', 'local', 'amoun', '102', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 154, '2026-12-01', 3.14, 'INITIAL-IMPORT', now());

  -- Item: procto-4 15 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('procto-4 15 gm', 'بروكتو-فور 15 جرام', 'aesculin, cinchocaine, framycetin, hydrocortisone', '6221025013545', 'Medicine', 6.5, 'amoun', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'procto-4 15 gm', 'بروكتو-فور 15 جرام', '{"aesculin","cinchocaine","framycetin","hydrocortisone"}', 'Medicine', 6.5, 4.63, 118, '2028-04-01', '6221025013545', 1, 'Cream', 'local', 'amoun', '360', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 118, '2028-04-01', 4.63, 'INITIAL-IMPORT', now());

  -- Item: procto-4 30 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('procto-4 30 gm', 'بروكتو-4 30 جرام', 'aesculin, cinchocaine, framycetin, hydrocortisone', '6221025014108', 'Medicine', 10, 'amoun', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'procto-4 30 gm', 'بروكتو-4 30 جرام', '{"aesculin","cinchocaine","framycetin","hydrocortisone"}', 'Medicine', 10, 8.72, 115, '2028-09-01', '6221025014108', 1, 'Cream', 'local', 'amoun', '116', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 115, '2028-09-01', 8.72, 'INITIAL-IMPORT', now());

  -- Item: quinidine sulphate 200mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('quinidine sulphate 200mg 10', 'كينيدين سلفات 200مجم 10', 'quinidine sulphate', '6221025008350', 'Medicine', 6, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'quinidine sulphate 200mg 10', 'كينيدين سلفات 200مجم 10', '{"quinidine sulphate"}', 'Medicine', 6, 4.02, 29, '2028-11-01', '6221025008350', 1, 'Tablet', 'local', 'amoun', '74', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 29, '2028-11-01', 4.02, 'INITIAL-IMPORT', now());

  -- Item: ribavirin 200mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ribavirin 200mg 10', 'ريبافيرين 200مجم 10', 'ribavirin', '6221014000198', 'Medicine', 50, 't3a pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ribavirin 200mg 10', 'ريبافيرين 200مجم 10', '{"ribavirin"}', 'Medicine', 50, 34.34, 33, '2027-08-01', '6221014000198', 1, 'Capsule', 'local', 't3a pharma', '41', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 33, '2027-08-01', 34.34, 'INITIAL-IMPORT', now());

  -- Item: rowapraxin 10mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('rowapraxin 10mg 5', 'روابراكسين 10مجم 5', 'pipoxolan', '6221025005526', 'Medicine', 4.85, 'amoun', 'Suppository')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'rowapraxin 10mg 5', 'روابراكسين 10مجم 5', '{"pipoxolan"}', 'Medicine', 4.85, 3.59, 139, '2027-07-01', '6221025005526', 1, 'Suppository', 'local', 'amoun', '46', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 139, '2027-07-01', 3.59, 'INITIAL-IMPORT', now());

  -- Item: rowapraxin forte 20mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('rowapraxin forte 20mg 10', 'روابراكسين فورت 20مجم 10', 'pipoxolan', '6221025005472', 'Medicine', 5.65, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'rowapraxin forte 20mg 10', 'روابراكسين فورت 20مجم 10', '{"pipoxolan"}', 'Medicine', 5.65, 4.05, 93, '2028-05-01', '6221025005472', 1, 'Tablet', 'local', 'amoun', '47', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 93, '2028-05-01', 4.05, 'INITIAL-IMPORT', now());

  -- Item: rowapraxin forte 30mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('rowapraxin forte 30mg 5', 'روابراكسين فورت 30مجم 5', 'pipoxolan', '6221025005533', 'Medicine', 5.65, 'amoun', 'Suppository')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'rowapraxin forte 30mg 5', 'روابراكسين فورت 30مجم 5', '{"pipoxolan"}', 'Medicine', 5.65, 4.44, 31, '2026-11-01', '6221025005533', 1, 'Suppository', 'local', 'amoun', '38', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 31, '2026-11-01', 4.44, 'INITIAL-IMPORT', now());

  -- Item: roxid 300mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('roxid 300mg 5', 'روكسيد 300مجم 5', 'roxithromycin', '6221014000075', 'Medicine', 16.8, 't3a pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'roxid 300mg 5', 'روكسيد 300مجم 5', '{"roxithromycin"}', 'Medicine', 16.8, 15.09, 93, '2027-01-01', '6221014000075', 1, 'Tablet', 'local', 't3a pharma', '60', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 93, '2027-01-01', 15.09, 'INITIAL-IMPORT', now());

  -- Item: s-26 gold lf milk 400 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('s-26 gold lf milk 400 gm', 'اس 26 جولد ال اف لبن 400جم', 'lactose free milk formula', '6220046846613', 'Medicine', 299, 'pfizer > food and beverage trading', 'Piece')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 's-26 gold lf milk 400 gm', 'اس 26 جولد ال اف لبن 400جم', '{"lactose free milk formula"}', 'Medicine', 299, 207.73, 35, '2028-03-01', '6220046846613', 1, 'Piece', 'imported', 'pfizer > food and beverage trading', '84', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 35, '2028-03-01', 207.73, 'INITIAL-IMPORT', now());

  -- Item: sensotect
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('sensotect', 'سنسوتكت', 'hyaluronic acid+chlorhexidine digluconate+clove oil+dill oil+dimethicone+propolis+peppermint', '6220201315633', 'Medicine', 80, 'dreams > spendix inc', 'Gel')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'sensotect', 'سنسوتكت', '{"hyaluronic acid+chlorhexidine digluconate+clove oil+dill oil+dimethicone+propolis+peppermint"}', 'Medicine', 80, 68.78, 22, '2027-06-01', '6220201315633', 1, 'Gel', 'local', 'dreams > spendix inc', '467', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 22, '2027-06-01', 68.78, 'INITIAL-IMPORT', now());

  -- Item: shaan hand 50 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('shaan hand 50 gm', 'شان لليدين 50 جم', '', '6221009004057', 'Medicine', 100, 'parkville', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'shaan hand 50 gm', 'شان لليدين 50 جم', '{}', 'Medicine', 100, 73.55, 75, '2028-09-01', '6221009004057', 1, 'Cream', 'local', 'parkville', '99', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 75, '2028-09-01', 73.55, 'INITIAL-IMPORT', now());

  -- Item: shaan intimate feminine cleanser 220 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('shaan intimate feminine cleanser 220 ml', 'شان منظف للعناية الشخصية بالسيدات 220 مل', '', '6221009004064', 'Medicine', 110, 'egyptian company for cosmetics > parkville pharmaceuticals', 'Vaginal douche')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'shaan intimate feminine cleanser 220 ml', 'شان منظف للعناية الشخصية بالسيدات 220 مل', '{}', 'Medicine', 110, 74.74, 35, '2028-08-01', '6221009004064', 1, 'Vaginal douche', 'local', 'egyptian company for cosmetics > parkville pharmaceuticals', '69', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 35, '2028-08-01', 74.74, 'INITIAL-IMPORT', now());

  -- Item: spasmo rowatinex 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('spasmo rowatinex 5', 'سبازمو رواتينكس 5', 'anethol, borneol, camphene, cineole, ethaverine, fenchone, pinene', '6221025005588', 'Medicine', 9.45, 'amoun', 'Suppository')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'spasmo rowatinex 5', 'سبازمو رواتينكس 5', '{"anethol","borneol","camphene","cineole","ethaverine","fenchone","pinene"}', 'Medicine', 9.45, 5.97, 46, '2028-10-01', '6221025005588', 1, 'Suppository', 'local', 'amoun', '72', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 46, '2028-10-01', 5.97, 'INITIAL-IMPORT', now());

  -- Item: stigmide 60mg/5ml 120ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('stigmide 60mg/5ml 120ml', 'ستيجمايد 60مجم/5مل 120مل', 'pyridostigmin bromide', '6221025008923', 'Medicine', 10.5, 'sigma', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'stigmide 60mg/5ml 120ml', 'ستيجمايد 60مجم/5مل 120مل', '{"pyridostigmin bromide"}', 'Medicine', 10.5, 6.98, 148, '2026-09-01', '6221025008923', 1, 'Syrup', 'local', 'sigma', '35', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 148, '2026-09-01', 6.98, 'INITIAL-IMPORT', now());

  -- Item: stimulan 200mg/ml 120 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('stimulan 200mg/ml 120 ml', 'ستيميولان 200مجم/مل 120 مل', 'piracetam', '6221025004864', 'Medicine', 62, 'amoun', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'stimulan 200mg/ml 120 ml', 'ستيميولان 200مجم/مل 120 مل', '{"piracetam"}', 'Medicine', 62, 54.38, 150, '2026-10-01', '6221025004864', 1, 'Syrup', 'local', 'amoun', '517', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 150, '2026-10-01', 54.38, 'INITIAL-IMPORT', now());

  -- Item: tavacin 500mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('tavacin 500mg 5', 'تافاسين 500مجم 5', 'levofloxacin', '6221000001178', 'Medicine', 90, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'tavacin 500mg 5', 'تافاسين 500مجم 5', '{"levofloxacin"}', 'Medicine', 90, 61.43, 151, '2027-02-01', '6221000001178', 1, 'Tablet', 'local', 'hikma pharma', '3329', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 151, '2027-02-01', 61.43, 'INITIAL-IMPORT', now());

  -- Item: tavacin 500mg 100ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('tavacin 500mg 100ml', 'تافاسين 500مجم 100 مل', 'levofloxacin', '6221000001178', 'Medicine', 90, 'hikma pharma', 'Vial')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'tavacin 500mg 100ml', 'تافاسين 500مجم 100 مل', '{"levofloxacin"}', 'Medicine', 90, 69.35, 64, '2026-11-01', '6221000001178', 1, 'Vial', 'local', 'hikma pharma', '277', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 64, '2026-11-01', 69.35, 'INITIAL-IMPORT', now());

  -- Item: tavacin 750mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('tavacin 750mg 5', 'تافاسين 750مجم 5', 'levofloxacin', '6221000001185', 'Medicine', 96, 'hikma phrarma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'tavacin 750mg 5', 'تافاسين 750مجم 5', '{"levofloxacin"}', 'Medicine', 96, 73.85, 57, '2028-06-01', '6221000001185', 1, 'Tablet', 'local', 'hikma phrarma', '2250', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 57, '2028-06-01', 73.85, 'INITIAL-IMPORT', now());

  -- Item: telebrix-35 (50ml) ()
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('telebrix-35 (50ml) ()', 'تليبريكس-35 50 مل', 'meglumine ioxitalamate, sodium ioxitalamate', '6221025011947', 'Medicine', 240, 'amoun > lab. guerbet - france', 'Vial')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'telebrix-35 (50ml) ()', 'تليبريكس-35 50 مل', '{"meglumine ioxitalamate","sodium ioxitalamate"}', 'Medicine', 240, 148.03, 112, '2028-12-01', '6221025011947', 1, 'Vial', 'local', 'amoun > lab. guerbet - france', '60', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 112, '2028-12-01', 148.03, 'INITIAL-IMPORT', now());

  -- Item: tonoclone retard 200mg c.r. 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('tonoclone retard 200mg c.r. 10', 'تونوكلون ريتارد 200مجم 10', 'carbamazepine', '6221014000952', 'Medicine', 5.25, 't3a pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'tonoclone retard 200mg c.r. 10', 'تونوكلون ريتارد 200مجم 10', '{"carbamazepine"}', 'Medicine', 5.25, 3.65, 153, '2028-10-01', '6221014000952', 1, 'Tablet', 'local', 't3a pharma', '32', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 153, '2028-10-01', 3.65, 'INITIAL-IMPORT', now());

  -- Item: top-4 15 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('top-4 15 gm', 'توب-فور 15جرام', 'betamethasone, clioquinol, gentamicin, tolnaftate', '6221000001215', 'Medicine', 19, 'hikma pharma', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'top-4 15 gm', 'توب-فور 15جرام', '{"betamethasone","clioquinol","gentamicin","tolnaftate"}', 'Medicine', 19, 13.07, 136, '2026-08-01', '6221000001215', 1, 'Cream', 'local', 'hikma pharma', '292', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 136, '2026-08-01', 13.07, 'INITIAL-IMPORT', now());

  -- Item: top-flam 15 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('top-flam 15 gm', 'توب-فلام 15 جم', 'gramicidin, neomycin, nystatin, triamcinolone', '6221000001222', 'Medicine', 22, 'hikma pharma', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'top-flam 15 gm', 'توب-فلام 15 جم', '{"gramicidin","neomycin","nystatin","triamcinolone"}', 'Medicine', 22, 13.99, 138, '2027-05-01', '6221000001222', 1, 'Cream', 'local', 'hikma pharma', '854', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 138, '2027-05-01', 13.99, 'INITIAL-IMPORT', now());

  -- Item: triamcinolone 4mg 10 ()
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('triamcinolone 4mg 10 ()', 'تراي امسينولون 4مجم 10', 'triamcinolone', '6221014000716', 'Medicine', 5.5, 't3a pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'triamcinolone 4mg 10 ()', 'تراي امسينولون 4مجم 10', '{"triamcinolone"}', 'Medicine', 5.5, 4.2, 140, '2028-03-01', '6221014000716', 1, 'Tablet', 'local', 't3a pharma', '70', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 140, '2028-03-01', 4.2, 'INITIAL-IMPORT', now());

  -- Item: triconal 150mg 1
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('triconal 150mg 1', 'تريكونال 150مجم 1', 'fluconazole', '6221014000501', 'Medicine', 26.5, 't3a pharma > vodachem pharmaceuticals', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'triconal 150mg 1', 'تريكونال 150مجم 1', '{"fluconazole"}', 'Medicine', 26.5, 16.65, 38, '2028-06-01', '6221014000501', 1, 'Capsule', 'local', 't3a pharma > vodachem pharmaceuticals', '55', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 38, '2028-06-01', 16.65, 'INITIAL-IMPORT', now());

  -- Item: triconal 50mg 7
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('triconal 50mg 7', 'تريكونال 50مجم 7', 'fluconazole', '6221014000495', 'Medicine', 53, 't3a pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'triconal 50mg 7', 'تريكونال 50مجم 7', '{"fluconazole"}', 'Medicine', 53, 44.21, 123, '2026-09-01', '6221014000495', 1, 'Capsule', 'local', 't3a pharma', '41', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 123, '2026-09-01', 44.21, 'INITIAL-IMPORT', now());

  -- Item: tusskan 100 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('tusskan 100 ml', 'توسكان 100 مل', 'dextromethorphan, diphenhydramine, ephedrine, guaifenesin', '6221000001277', 'Medicine', 24, 'hikma pharma', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'tusskan 100 ml', 'توسكان 100 مل', '{"dextromethorphan","diphenhydramine","ephedrine","guaifenesin"}', 'Medicine', 24, 18.44, 91, '2027-07-01', '6221000001277', 1, 'Syrup', 'local', 'hikma pharma', '4099', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 91, '2027-07-01', 18.44, 'INITIAL-IMPORT', now());

  -- Item: ultrasolv 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ultrasolv 10', 'التراسولف 10', 'carbocysteine, guaifenesin, oxomemazine', '6221025017604', 'Medicine', 31, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ultrasolv 10', 'التراسولف 10', '{"carbocysteine","guaifenesin","oxomemazine"}', 'Medicine', 31, 20.03, 157, '2026-07-01', '6221025017604', 1, 'Tablet', 'local', 'amoun', '611', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 157, '2026-07-01', 20.03, 'INITIAL-IMPORT', now());

  -- Item: ultrasolv 120ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ultrasolv 120ml', 'التراسولف 120 مل', 'carbocysteine, guaifenesin, oxomemazine', '6221025014528', 'Medicine', 40, 'amoun', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ultrasolv 120ml', 'التراسولف 120 مل', '{"carbocysteine","guaifenesin","oxomemazine"}', 'Medicine', 40, 29.27, 133, '2027-11-01', '6221025014528', 1, 'Syrup', 'local', 'amoun', '794', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 133, '2027-11-01', 29.27, 'INITIAL-IMPORT', now());

  -- Item: valpam 2mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('valpam 2mg 10', 'فالبام 2مجم 10', 'diazepam', '6221025009913', 'Medicine', 2.75, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'valpam 2mg 10', 'فالبام 2مجم 10', '{"diazepam"}', 'Medicine', 2.75, 2.11, 73, '2026-11-01', '6221025009913', 1, 'Tablet', 'local', 'amoun', '36', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 73, '2026-11-01', 2.11, 'INITIAL-IMPORT', now());

  -- Item: valpam 2mg/5ml 120ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('valpam 2mg/5ml 120ml', 'فالبام 2مجم/5مل 120مل', 'diazepam', '6221025004482', 'Medicine', 5.95, 'amoun', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'valpam 2mg/5ml 120ml', 'فالبام 2مجم/5مل 120مل', '{"diazepam"}', 'Medicine', 5.95, 5.16, 130, '2027-07-01', '6221025004482', 1, 'Syrup', 'local', 'amoun', '40', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 130, '2027-07-01', 5.16, 'INITIAL-IMPORT', now());

  -- Item: varde 20 mg 4
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('varde 20 mg 4', 'فاردي 20مجم 4', 'vardenafil', '6221000011153', 'Medicine', 60, 'hikma pharma > epci', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'varde 20 mg 4', 'فاردي 20مجم 4', '{"vardenafil"}', 'Medicine', 60, 37.54, 11, '2026-10-01', '6221000011153', 1, 'Tablet', 'local', 'hikma pharma > epci', '492', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 11, '2026-10-01', 37.54, 'INITIAL-IMPORT', now());

  -- Item: vermizole 200mg/5ml 30 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('vermizole 200mg/5ml 30 ml', 'فيرميزول 200مجم /5مل 30 مل', 'albendazole', '6221025009531', 'Medicine', 26, 'amoun', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'vermizole 200mg/5ml 30 ml', 'فيرميزول 200مجم /5مل 30 مل', '{"albendazole"}', 'Medicine', 26, 16.08, 98, '2028-09-01', '6221025009531', 1, 'Suspension', 'local', 'amoun', '1274', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 98, '2028-09-01', 16.08, 'INITIAL-IMPORT', now());

  -- Item: vida queen skin 30 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('vida queen skin 30 ml', 'فيدا كوين سكين 30 مل', 'hyaluronic acid + collagen(marine) + ascorbic acid(vitamin c) + mandelic acid + panthenol', '6221024996436', 'Medicine', 200, 'vida international pharma', 'Serum')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'vida queen skin 30 ml', 'فيدا كوين سكين 30 مل', '{"hyaluronic acid + collagen(marine) + ascorbic acid(vitamin c) + mandelic acid + panthenol"}', 'Medicine', 200, 179.39, 77, '2027-08-01', '6221024996436', 1, 'Serum', 'local', 'vida international pharma', '43', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 77, '2027-08-01', 179.39, 'INITIAL-IMPORT', now());

  -- Item: vigor 50mg 1
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('vigor 50mg 1', 'فيجور 50مجم 1', 'sildenafil', '6221025010995', 'Medicine', 3.75, 'marcyrl co.', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'vigor 50mg 1', 'فيجور 50مجم 1', '{"sildenafil"}', 'Medicine', 3.75, 2.41, 66, '2028-04-01', '6221025010995', 1, 'Tablet', 'local', 'marcyrl co.', '61', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 66, '2028-04-01', 2.41, 'INITIAL-IMPORT', now());

  -- Item: vigoran 50mg 4
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('vigoran 50mg 4', 'فيجوران 50مجم 4', 'sildenafil', '6221025019653', 'Medicine', 10, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'vigoran 50mg 4', 'فيجوران 50مجم 4', '{"sildenafil"}', 'Medicine', 10, 8.31, 36, '2027-01-01', '6221025019653', 1, 'Tablet', 'local', 'amoun', '44', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 36, '2027-01-01', 8.31, 'INITIAL-IMPORT', now());

  -- Item: viotic 10 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('viotic 10 ml', 'فيوتك للاذن 10مل', 'clioquinol, flumethasone', '6221025008749', 'Medicine', 23, 'amoun', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'viotic 10 ml', 'فيوتك للاذن 10مل', '{"clioquinol","flumethasone"}', 'Medicine', 23, 17.54, 66, '2027-05-01', '6221025008749', 1, 'Drops', 'local', 'amoun', '1945', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 66, '2027-05-01', 17.54, 'INITIAL-IMPORT', now());

  -- Item: viscera 50mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('viscera 50mg 10', 'فيسرا 50مجم 10', 'tiemonium methylsulphate', '6221025019806', 'Medicine', 3.25, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'viscera 50mg 10', 'فيسرا 50مجم 10', '{"tiemonium methylsulphate"}', 'Medicine', 3.25, 1.95, 116, '2027-02-01', '6221025019806', 1, 'Tablet', 'local', 'amoun', '140', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 116, '2027-02-01', 1.95, 'INITIAL-IMPORT', now());

  -- Item: vitamount antioxidants 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('vitamount antioxidants 10', 'فيتاماونت مضاد الاكسدة 10', 'minerals, vitamins', '6221025009791', 'Medicine', 21, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'vitamount antioxidants 10', 'فيتاماونت مضاد الاكسدة 10', '{"minerals","vitamins"}', 'Medicine', 21, 15.85, 88, '2027-11-01', '6221025009791', 1, 'Capsule', 'local', 'amoun', '147', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 88, '2027-11-01', 15.85, 'INITIAL-IMPORT', now());

  -- Item: vitamount stress 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('vitamount stress 10', 'فيتاماونت 10', 'minerals, vitamins', '6221025009784', 'Medicine', 22, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'vitamount stress 10', 'فيتاماونت 10', '{"minerals","vitamins"}', 'Medicine', 22, 19.49, 29, '2028-01-01', '6221025009784', 1, 'Capsule', 'local', 'amoun', '136', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 29, '2028-01-01', 19.49, 'INITIAL-IMPORT', now());

  -- Item: vitamount 120ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('vitamount 120ml', 'فيتاماونت فيتامينات 120 مل', 'vitamins', '6221025008978', 'Medicine', 34, 'amoun', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'vitamount 120ml', 'فيتاماونت فيتامينات 120 مل', '{"vitamins"}', 'Medicine', 34, 25.59, 124, '2027-03-01', '6221025008978', 1, 'Syrup', 'local', 'amoun', '569', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 124, '2027-03-01', 25.59, 'INITIAL-IMPORT', now());

  -- Item: vomistop 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('vomistop 10', 'فوميستوب 10', 'dimethicone, metoclopramide, vitamin b6', '6221025011183', 'Medicine', 7, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'vomistop 10', 'فوميستوب 10', '{"dimethicone","metoclopramide","vitamin b6"}', 'Medicine', 7, 5.2, 128, '2027-08-01', '6221025011183', 1, 'Capsule', 'local', 'amoun', '373', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 128, '2027-08-01', 5.2, 'INITIAL-IMPORT', now());

  -- Item: winterest 50 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('winterest 50 gm', 'وينتريست 50 جم', 'methyl salicylate, magnesium, menthol, vit b6, vit d, arnica', '6220201315619', 'Medicine', 100, 'dreams el habboba > spendix inc', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'winterest 50 gm', 'وينتريست 50 جم', '{"methyl salicylate","magnesium","menthol","vit b6","vit d","arnica"}', 'Medicine', 100, 65.41, 84, '2028-08-01', '6220201315619', 1, 'Cream', 'local', 'dreams el habboba > spendix inc', '143', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 84, '2028-08-01', 65.41, 'INITIAL-IMPORT', now());

  -- Item: xenomag eff. gran. 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('xenomag eff. gran. 10', 'زينوماج 10', 'citric acid, magnesium carbonate, sodium bicarbonate', '6221025014177', 'Medicine', 6, 'amoun', 'Sachet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'xenomag eff. gran. 10', 'زينوماج 10', '{"citric acid","magnesium carbonate","sodium bicarbonate"}', 'Medicine', 6, 4.77, 117, '2027-09-01', '6221025014177', 1, 'Sachet', 'local', 'amoun', '382', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 117, '2027-09-01', 4.77, 'INITIAL-IMPORT', now());

  -- Item: xenos fruit 6
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('xenos fruit 6', 'زينوس فواكه 6', 'citric acid, sodium bicarbonte, tartaric acid', '6221025012722', 'Medicine', 4, 'amoun', 'Sachet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'xenos fruit 6', 'زينوس فواكه 6', '{"citric acid","sodium bicarbonte","tartaric acid"}', 'Medicine', 4, 2.41, 36, '2028-01-01', '6221025012722', 1, 'Sachet', 'local', 'amoun', '44', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 36, '2028-01-01', 2.41, 'INITIAL-IMPORT', now());

  -- Item: xithrone 200 mg/5ml 15ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('xithrone 200 mg/5ml 15ml', 'زيثرون 200مجم/5مل 15 مل', 'azithromycin', '6221025011237', 'Medicine', 63, 'amoun', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'xithrone 200 mg/5ml 15ml', 'زيثرون 200مجم/5مل 15 مل', '{"azithromycin"}', 'Medicine', 63, 41.44, 27, '2026-07-01', '6221025011237', 1, 'Suspension', 'local', 'amoun', '1170', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 27, '2026-07-01', 41.44, 'INITIAL-IMPORT', now());

  -- Item: xithrone 200 mg/5ml 25 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('xithrone 200 mg/5ml 25 ml', 'زيثرون 200 مجم 25 مل', 'azithromycin', '6221025016409', 'Medicine', 89, 'amoun', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'xithrone 200 mg/5ml 25 ml', 'زيثرون 200 مجم 25 مل', '{"azithromycin"}', 'Medicine', 89, 66.79, 12, '2027-04-01', '6221025016409', 1, 'Suspension', 'local', 'amoun', '731', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 12, '2027-04-01', 66.79, 'INITIAL-IMPORT', now());

  -- Item: xithrone 500mg 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('xithrone 500mg 3', 'زيثرون 500مجم 3', 'azithromycin', '6221025014399', 'Medicine', 63, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'xithrone 500mg 3', 'زيثرون 500مجم 3', '{"azithromycin"}', 'Medicine', 63, 39.31, 19, '2027-06-01', '6221025014399', 1, 'Tablet', 'local', 'amoun', '3915', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 19, '2027-06-01', 39.31, 'INITIAL-IMPORT', now());

  -- Item: xithrone 500mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('xithrone 500mg 5', 'زيثرون 500مجم 5', 'azithromycin', '6221025014122', 'Medicine', 86, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'xithrone 500mg 5', 'زيثرون 500مجم 5', '{"azithromycin"}', 'Medicine', 86, 74.47, 114, '2028-06-01', '6221025014122', 1, 'Tablet', 'local', 'amoun', '2837', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 114, '2028-06-01', 74.47, 'INITIAL-IMPORT', now());

  -- Item: zithrokan 100mg/5ml pd. oral 15 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('zithrokan 100mg/5ml pd. oral 15 ml', 'زيثروكان 100مجم/5مل باودر لعمل 15مل', 'azithromycin', '6221000001406', 'Medicine', 33, 'hikma pharma', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'zithrokan 100mg/5ml pd. oral 15 ml', 'زيثروكان 100مجم/5مل باودر لعمل 15مل', '{"azithromycin"}', 'Medicine', 33, 21.97, 23, '2027-05-01', '6221000001406', 1, 'Suspension', 'local', 'hikma pharma', '1058', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 23, '2027-05-01', 21.97, 'INITIAL-IMPORT', now());

  -- Item: zithrokan 200mg/5ml pd. oral 15 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('zithrokan 200mg/5ml pd. oral 15 ml', 'زيثروكان 200مجم/5مل 15 مل', 'azithromycin', '6221000001413', 'Medicine', 62, 'hikma pharma', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'zithrokan 200mg/5ml pd. oral 15 ml', 'زيثروكان 200مجم/5مل 15 مل', '{"azithromycin"}', 'Medicine', 62, 48.23, 103, '2028-11-01', '6221000001413', 1, 'Suspension', 'local', 'hikma pharma', '1330', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 103, '2028-11-01', 48.23, 'INITIAL-IMPORT', now());

  -- Item: zithrokan 500mg 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('zithrokan 500mg 3', 'زيثروكان 500مجم 3', 'azithromycin', '6221000001710', 'Medicine', 77, 'hikma pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'zithrokan 500mg 3', 'زيثروكان 500مجم 3', '{"azithromycin"}', 'Medicine', 77, 47.2, 159, '2027-04-01', '6221000001710', 1, 'Capsule', 'local', 'hikma pharma', '1881', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 159, '2027-04-01', 47.2, 'INITIAL-IMPORT', now());

  -- Item: zolam 0.5mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('zolam 0.5mg 10', 'زولام 0.5 مجم 10', 'alprazolam', '6221025009333', 'Medicine', 12, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'zolam 0.5mg 10', 'زولام 0.5 مجم 10', '{"alprazolam"}', 'Medicine', 12, 9.88, 52, '2028-07-01', '6221025009333', 1, 'Tablet', 'local', 'amoun', '252', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 52, '2028-07-01', 9.88, 'INITIAL-IMPORT', now());

END $$;