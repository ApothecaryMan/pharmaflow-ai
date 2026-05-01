-- PharmaFlow Seed Part 1
-- Branch: 20864e85-6a6e-4b4b-a44c-b87fe50ecb7b

DO $$
DECLARE
  v_bid UUID := '20864e85-6a6e-4b4b-a44c-b87fe50ecb7b';
  v_oid UUID;
  v_gid UUID;
  v_did UUID;
BEGIN
  SELECT org_id INTO v_oid FROM branches WHERE id = v_bid;

  -- Item: bispyller 120
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('bispyller 120', 'بيسبايلير 120', 'bismuth subcitrate potassium, metronidazole, tetracycline', '6221004442939', 'Medicine', 800, 'hikma pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'bispyller 120', 'بيسبايلير 120', '{"bismuth subcitrate potassium","metronidazole","tetracycline"}', 'Medicine', 800, 698.1, 1590, '2027-09-01', '6221004442939', 10, 'Capsule', 'local', 'hikma pharma', '391', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 1590, '2027-09-01', 698.1, 'INITIAL-IMPORT', now());

  -- Item: midathetic 5mg/ml 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('midathetic 5mg/ml 10', 'ميداثيتك 5مجم/مل 10', 'midazolam', '6221025012715', 'Medicine', 140, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'midathetic 5mg/ml 10', 'ميداثيتك 5مجم/مل 10', '{"midazolam"}', 'Medicine', 140, 100.19, 670, '2028-01-01', '6221025012715', 10, 'Ampoule', 'local', 'amoun', '191', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 670, '2028-01-01', 100.19, 'INITIAL-IMPORT', now());

  -- Item: trio-clar 42
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('trio-clar 42', 'تريو-كلار 42', 'clarithromycin, omeprazole, tinidazole', '6221000000621', 'Medicine', 220, 'hikma pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'trio-clar 42', 'تريو-كلار 42', '{"clarithromycin","omeprazole","tinidazole"}', 'Medicine', 220, 189.44, 1050, '2027-04-01', '6221000000621', 7, 'Capsule', 'local', 'hikma pharma', '1195', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 1050, '2027-04-01', 189.44, 'INITIAL-IMPORT', now());

  -- Item: dasiword 50 mg 60
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('dasiword 50 mg 60', 'داسيورد 50 مجم 60', 'dasatinib', '6221000000362', 'Medicine', 9600, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'dasiword 50 mg 60', 'داسيورد 50 مجم 60', '{"dasatinib"}', 'Medicine', 9600, 5782.69, 396, '2028-01-01', '6221000000362', 6, 'Tablet', 'local', 'hikma pharma', '52', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 396, '2028-01-01', 5782.69, 'INITIAL-IMPORT', now());

  -- Item: dolphin k 75mg/3ml 6
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('dolphin k 75mg/3ml 6', 'دولفن كيه 75مجم/3مل 6', 'diclofenac potassium', '6221025014399', 'Medicine', 48, 'delta pharma', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'dolphin k 75mg/3ml 6', 'دولفن كيه 75مجم/3مل 6', '{"diclofenac potassium"}', 'Medicine', 48, 34.26, 234, '2028-10-01', '6221025014399', 6, 'Ampoule', 'local', 'delta pharma', '319', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 234, '2028-10-01', 34.26, 'INITIAL-IMPORT', now());

  -- Item: kapron 500mg/5ml 6
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('kapron 500mg/5ml 6', 'كابرون 500مجم/5 مل 6', 'tranexamic acid', '6221025012708', 'Medicine', 90, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'kapron 500mg/5ml 6', 'كابرون 500مجم/5 مل 6', '{"tranexamic acid"}', 'Medicine', 90, 75.34, 198, '2026-12-01', '6221025012708', 6, 'Ampoule', 'local', 'amoun', '1923', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 198, '2026-12-01', 75.34, 'INITIAL-IMPORT', now());

  -- Item: neuroton 6
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('neuroton 6', 'نيوروتون 6', 'vitamin b1, vitamin b2, vitamin b6, vitamin b12', '6221025015723', 'Medicine', 66, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'neuroton 6', 'نيوروتون 6', '{"vitamin b1","vitamin b2","vitamin b6","vitamin b12"}', 'Medicine', 66, 52.79, 420, '2028-05-01', '6221025015723', 6, 'Ampoule', 'local', 'amoun', '3998', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 420, '2028-05-01', 52.79, 'INITIAL-IMPORT', now());

  -- Item: stimulan 1gm/5ml 6
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('stimulan 1gm/5ml 6', 'ستيميولان 1جم/5مل 6', 'piracetam', '6221025009593', 'Medicine', 60, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'stimulan 1gm/5ml 6', 'ستيميولان 1جم/5مل 6', '{"piracetam"}', 'Medicine', 60, 36.89, 228, '2026-07-01', '6221025009593', 6, 'Ampoule', 'local', 'amoun', '330', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 228, '2026-07-01', 36.89, 'INITIAL-IMPORT', now());

  -- Item: mobic 15mg/1.5ml 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('mobic 15mg/1.5ml 5', 'موبيك 15مجم/1.5مل 5', 'meloxicam', '6214005508421', 'Medicine', 39, 'boehringer ingelheim', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'mobic 15mg/1.5ml 5', 'موبيك 15مجم/1.5مل 5', '{"meloxicam"}', 'Medicine', 39, 27.77, 685, '2028-06-01', '6214005508421', 5, 'Ampoule', 'imported', 'boehringer ingelheim', '136', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 685, '2028-06-01', 27.77, 'INITIAL-IMPORT', now());

  -- Item: nalufin 20mg/ml 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('nalufin 20mg/ml 5', 'نالوفين 20مجم/مل 5', 'nalbuphine', '6221025010438', 'Medicine', 225, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'nalufin 20mg/ml 5', 'نالوفين 20مجم/مل 5', '{"nalbuphine"}', 'Medicine', 225, 152.8, 440, '2026-07-01', '6221025010438', 5, 'Ampoule', 'local', 'amoun', '1165', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 440, '2026-07-01', 152.8, 'INITIAL-IMPORT', now());

  -- Item: sacrofer 100mg/5ml 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('sacrofer 100mg/5ml 5', 'ساكروفير 100مجم/5مل 5', 'iron', '6221025020178', 'Medicine', 275, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'sacrofer 100mg/5ml 5', 'ساكروفير 100مجم/5مل 5', '{"iron"}', 'Medicine', 275, 175.55, 505, '2026-10-01', '6221025020178', 5, 'Ampoule', 'local', 'amoun', '2515', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 505, '2026-10-01', 175.55, 'INITIAL-IMPORT', now());

  -- Item: baritava 4 mg 28
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('baritava 4 mg 28', 'باريتفا 4 مجم 28', 'baricitinib', '6221000000249', 'Medicine', 2254, 'hikma specialized pharmaceuticals > hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'baritava 4 mg 28', 'باريتفا 4 مجم 28', '{"baricitinib"}', 'Medicine', 2254, 1842.35, 428, '2026-12-01', '6221000000249', 4, 'Tablet', 'local', 'hikma specialized pharmaceuticals > hikma pharma', '519', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 428, '2026-12-01', 1842.35, 'INITIAL-IMPORT', now());

  -- Item: janaglip 50/1000mg 28
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('janaglip 50/1000mg 28', 'جاناجليب بلس 50/1000مجم 28', 'metformin, sitagliptin', '6221000010309', 'Medicine', 172, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'janaglip 50/1000mg 28', 'جاناجليب بلس 50/1000مجم 28', '{"metformin","sitagliptin"}', 'Medicine', 172, 132.77, 464, '2027-02-01', '6221000010309', 4, 'Tablet', 'local', 'hikma pharma', '363', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 464, '2027-02-01', 132.77, 'INITIAL-IMPORT', now());

  -- Item: alkapress 10mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('alkapress 10mg 30', 'الكابرس 10مجم 30', 'amlodipine', '6221000000034', 'Medicine', 108, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'alkapress 10mg 30', 'الكابرس 10مجم 30', '{"amlodipine"}', 'Medicine', 108, 69.11, 363, '2027-04-01', '6221000000034', 3, 'Tablet', 'local', 'hikma pharma', '1434', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 363, '2027-04-01', 69.11, 'INITIAL-IMPORT', now());

  -- Item: amophage 500mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('amophage 500mg 30', 'اموفاج 500 مجم 30', 'metformin', '6221025010179', 'Medicine', 10.5, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'amophage 500mg 30', 'اموفاج 500 مجم 30', '{"metformin"}', 'Medicine', 10.5, 6.7, 354, '2026-10-01', '6221025010179', 3, 'Tablet', 'local', 'amoun', '96', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 354, '2026-10-01', 6.7, 'INITIAL-IMPORT', now());

  -- Item: amostigmine 0.5mg/ml 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('amostigmine 0.5mg/ml 3', 'اموستجمين0.5مجم/مل 3', 'neostigmine', '6221025007421', 'Medicine', 5, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'amostigmine 0.5mg/ml 3', 'اموستجمين0.5مجم/مل 3', '{"neostigmine"}', 'Medicine', 5, 3.54, 228, '2028-03-01', '6221025007421', 3, 'Ampoule', 'local', 'amoun', '61', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 228, '2028-03-01', 3.54, 'INITIAL-IMPORT', now());

  -- Item: amotril 0.5mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('amotril 0.5mg 30', 'اموتريل 0.5مجم 30', 'clonazepam', '6221025008312', 'Medicine', 16.5, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'amotril 0.5mg 30', 'اموتريل 0.5مجم 30', '{"clonazepam"}', 'Medicine', 16.5, 10.38, 135, '2026-10-01', '6221025008312', 3, 'Tablet', 'local', 'amoun', '115', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 135, '2026-10-01', 10.38, 'INITIAL-IMPORT', now());

  -- Item: amotril 2mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('amotril 2mg 30', 'اموتريل 2مجم 30', 'clonazepam', '6221025008329', 'Medicine', 24, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'amotril 2mg 30', 'اموتريل 2مجم 30', '{"clonazepam"}', 'Medicine', 24, 16.47, 54, '2026-08-01', '6221025008329', 3, 'Tablet', 'local', 'amoun', '155', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 54, '2026-08-01', 16.47, 'INITIAL-IMPORT', now());

  -- Item: antodine 20mg/2ml 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('antodine 20mg/2ml 3', 'انتودين 20مجم/2مل 3', 'famotidine', '6221025014986', 'Medicine', 39, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'antodine 20mg/2ml 3', 'انتودين 20مجم/2مل 3', '{"famotidine"}', 'Medicine', 39, 31.4, 177, '2026-12-01', '6221025014986', 3, 'Ampoule', 'local', 'amoun', '2967', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 177, '2026-12-01', 31.4, 'INITIAL-IMPORT', now());

  -- Item: antodine 40mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('antodine 40mg 30', 'انتودين 40مجم 30', 'famotidine', '6221025003843', 'Medicine', 93, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'antodine 40mg 30', 'انتودين 40مجم 30', '{"famotidine"}', 'Medicine', 93, 69.09, 408, '2026-10-01', '6221025003843', 3, 'Tablet', 'local', 'amoun', '5108', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 408, '2026-10-01', 69.09, 'INITIAL-IMPORT', now());

  -- Item: astonin-h 0.1mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('astonin-h 0.1mg 30', 'استونين اتش 0.1مجم 30', 'fludrocortisone', '6221025016423', 'Medicine', 18, 'amoun > merck kgaa f.r.germany', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'astonin-h 0.1mg 30', 'استونين اتش 0.1مجم 30', '{"fludrocortisone"}', 'Medicine', 18, 13.55, 342, '2027-07-01', '6221025016423', 3, 'Tablet', 'local', 'amoun > merck kgaa f.r.germany', '181', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 342, '2027-07-01', 13.55, 'INITIAL-IMPORT', now());

  -- Item: b-com forte 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('b-com forte 30', 'بي-كوم فورت 30', 'vitamin b complex', '6221025019233', 'Medicine', 15, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'b-com forte 30', 'بي-كوم فورت 30', '{"vitamin b complex"}', 'Medicine', 15, 9.51, 408, '2027-11-01', '6221025019233', 3, 'Tablet', 'local', 'amoun', '336', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 408, '2027-11-01', 9.51, 'INITIAL-IMPORT', now());

  -- Item: bone cal 500mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('bone cal 500mg 30', 'بون كال 500مجم 30', 'calcium', '6221025017581', 'Medicine', 24, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'bone cal 500mg 30', 'بون كال 500مجم 30', '{"calcium"}', 'Medicine', 24, 14.96, 306, '2028-12-01', '6221025017581', 3, 'Tablet', 'local', 'amoun', '141', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 306, '2028-12-01', 14.96, 'INITIAL-IMPORT', now());

  -- Item: cal-heparine 5000 i.u. 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cal-heparine 5000 i.u. 3', 'كالهيبارين 5000 3', 'heparin calcium', '6221025004475', 'Medicine', 198, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cal-heparine 5000 i.u. 3', 'كالهيبارين 5000 3', '{"heparin calcium"}', 'Medicine', 198, 127.89, 186, '2028-09-01', '6221025004475', 3, 'Ampoule', 'local', 'amoun', '1518', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 186, '2028-09-01', 127.89, 'INITIAL-IMPORT', now());

  -- Item: carlol-v 6.25mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('carlol-v 6.25mg 30', 'كارلول-في 6.25مجم 30', 'carvedilol', '6221025020345', 'Medicine', 19.5, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'carlol-v 6.25mg 30', 'كارلول-في 6.25مجم 30', '{"carvedilol"}', 'Medicine', 19.5, 12.35, 288, '2028-10-01', '6221025020345', 3, 'Tablet', 'local', 'amoun', '32', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 288, '2028-10-01', 12.35, 'INITIAL-IMPORT', now());

  -- Item: durjoy 60mg 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('durjoy 60mg 3', 'ديورجوي 60مجم 3', 'dapoxetine', '6221000000430', 'Medicine', 59.5, 'jedco', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'durjoy 60mg 3', 'ديورجوي 60مجم 3', '{"dapoxetine"}', 'Medicine', 59.5, 43.61, 60, '2027-02-01', '6221000000430', 3, 'Tablet', 'local', 'jedco', '472', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 60, '2027-02-01', 43.61, 'INITIAL-IMPORT', now());

  -- Item: empagliform 12.5/1000 mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('empagliform 12.5/1000 mg 30', 'ايمبايفورم 12.5/1000مجم 30', 'empagliflozin, metformin', '6221000000478', 'Medicine', 228, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'empagliform 12.5/1000 mg 30', 'ايمبايفورم 12.5/1000مجم 30', '{"empagliflozin","metformin"}', 'Medicine', 228, 190.37, 129, '2027-12-01', '6221000000478', 3, 'Tablet', 'local', 'hikma pharma', '320', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 129, '2027-12-01', 190.37, 'INITIAL-IMPORT', now());

  -- Item: empagliform 12.5/500 mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('empagliform 12.5/500 mg 30', 'امبايفورم 12.5/500مجم 30', 'empagliflozin, metformin', '6221000000508', 'Medicine', 207, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'empagliform 12.5/500 mg 30', 'امبايفورم 12.5/500مجم 30', '{"empagliflozin","metformin"}', 'Medicine', 207, 125.89, 282, '2027-08-01', '6221000000508', 3, 'Tablet', 'local', 'hikma pharma', '241', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 282, '2027-08-01', 125.89, 'INITIAL-IMPORT', now());

  -- Item: empagliform 5/500 mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('empagliform 5/500 mg 30', 'امبايفورم 5/500مجم 30', 'empagliflozin, metformin', '6221000000515', 'Medicine', 159, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'empagliform 5/500 mg 30', 'امبايفورم 5/500مجم 30', '{"empagliflozin","metformin"}', 'Medicine', 159, 129.66, 237, '2027-02-01', '6221000000515', 3, 'Tablet', 'local', 'hikma pharma', '94', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 237, '2027-02-01', 129.66, 'INITIAL-IMPORT', now());

  -- Item: empaglimax 10 mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('empaglimax 10 mg 30', 'امبايماكس 10مجم 30', 'empagliflozin', '6221000011023', 'Medicine', 154.5, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'empaglimax 10 mg 30', 'امبايماكس 10مجم 30', '{"empagliflozin"}', 'Medicine', 154.5, 111.59, 123, '2028-03-01', '6221000011023', 3, 'Tablet', 'local', 'hikma pharma', '228', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 123, '2028-03-01', 111.59, 'INITIAL-IMPORT', now());

  -- Item: feburic 80mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('feburic 80mg 30', 'فيبيوريك 80مجم 30', 'febuxostat', '6221000000584', 'Medicine', 139.5, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'feburic 80mg 30', 'فيبيوريك 80مجم 30', '{"febuxostat"}', 'Medicine', 139.5, 125.08, 102, '2027-11-01', '6221000000584', 3, 'Tablet', 'local', 'hikma pharma', '3723', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 102, '2027-11-01', 125.08, 'INITIAL-IMPORT', now());

  -- Item: flamifast 50mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('flamifast 50mg 30', 'فلاميفاست 50 مجم 30', 'diclofenac potassium', '6221000011252', 'Medicine', 52.5, 'epci', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'flamifast 50mg 30', 'فلاميفاست 50 مجم 30', '{"diclofenac potassium"}', 'Medicine', 52.5, 44.8, 189, '2028-05-01', '6221000011252', 3, 'Tablet', 'local', 'epci', '463', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 189, '2028-05-01', 44.8, 'INITIAL-IMPORT', now());

  -- Item: flexilax 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('flexilax 30', 'فليكسيلاكس 30', 'diclofenac potassium, methocarbamol', '6221000000614', 'Medicine', 84, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'flexilax 30', 'فليكسيلاكس 30', '{"diclofenac potassium","methocarbamol"}', 'Medicine', 84, 62.43, 276, '2027-02-01', '6221000000614', 3, 'Tablet', 'local', 'hikma pharma', '2392', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 276, '2027-02-01', 62.43, 'INITIAL-IMPORT', now());

  -- Item: hair nails 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('hair nails 30', 'فورهير اند نيلز 30', 'calcium pantothenate, keratin, l-cystine, para-aminobenzoic acid, vitamin b1, yeast', '6221025012241', 'Medicine', 15, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'hair nails 30', 'فورهير اند نيلز 30', '{"calcium pantothenate","keratin","l-cystine","para-aminobenzoic acid","vitamin b1","yeast"}', 'Medicine', 15, 9.4, 219, '2028-07-01', '6221025012241', 3, 'Capsule', 'local', 'amoun', '74', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 219, '2028-07-01', 9.4, 'INITIAL-IMPORT', now());

  -- Item: gast-reg 50mg/5ml ./. 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('gast-reg 50mg/5ml ./. 3', 'جاست ريج 50 مجم/5مل 3', 'trimebutine', '6221025018465', 'Medicine', 33, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'gast-reg 50mg/5ml ./. 3', 'جاست ريج 50 مجم/5مل 3', '{"trimebutine"}', 'Medicine', 33, 22.47, 273, '2028-09-01', '6221025018465', 3, 'Ampoule', 'local', 'amoun', '989', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 273, '2028-09-01', 22.47, 'INITIAL-IMPORT', now());

  -- Item: glimaryl 1mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('glimaryl 1mg 30', 'يماريل 1مجم 30', 'glimepiride', '6221014002499', 'Medicine', 15, 't3a pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'glimaryl 1mg 30', 'يماريل 1مجم 30', '{"glimepiride"}', 'Medicine', 15, 10.44, 390, '2027-09-01', '6221014002499', 3, 'Tablet', 'local', 't3a pharma', '32', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 390, '2027-09-01', 10.44, 'INITIAL-IMPORT', now());

  -- Item: glimaryl 2mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('glimaryl 2mg 30', 'يماريل 2 مجم 30', 'glimepiride', '6221014002529', 'Medicine', 20.25, 't3a pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'glimaryl 2mg 30', 'يماريل 2 مجم 30', '{"glimepiride"}', 'Medicine', 20.25, 12.58, 297, '2027-08-01', '6221014002529', 3, 'Tablet', 'local', 't3a pharma', '31', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 297, '2027-08-01', 12.58, 'INITIAL-IMPORT', now());

  -- Item: haemokion 10mg/ml 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('haemokion 10mg/ml 3', 'هيموكيون 10 مجم / مل 3', 'vitamin k1', '6221025007926', 'Medicine', 36, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'haemokion 10mg/ml 3', 'هيموكيون 10 مجم / مل 3', '{"vitamin k1"}', 'Medicine', 36, 25.7, 339, '2026-12-01', '6221025007926', 3, 'Ampoule', 'local', 'amoun', '367', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 339, '2026-12-01', 25.7, 'INITIAL-IMPORT', now());

  -- Item: haemostop 250mg/2ml 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('haemostop 250mg/2ml 3', 'هيموستوب 250مجم/2مل 3', 'ethamsylate', '6221025010131', 'Medicine', 27, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'haemostop 250mg/2ml 3', 'هيموستوب 250مجم/2مل 3', '{"ethamsylate"}', 'Medicine', 27, 19.09, 438, '2027-01-01', '6221025010131', 3, 'Ampoule', 'local', 'amoun', '723', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 438, '2027-01-01', 19.09, 'INITIAL-IMPORT', now());

  -- Item: hi-chrome 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('hi-chrome 30', 'هاي كروم 30', 'chromium picolinate', '6221025004604', 'Medicine', 18, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'hi-chrome 30', 'هاي كروم 30', '{"chromium picolinate"}', 'Medicine', 18, 13.9, 135, '2028-10-01', '6221025004604', 3, 'Tablet', 'local', 'amoun', '44', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 135, '2028-10-01', 13.9, 'INITIAL-IMPORT', now());

  -- Item: hypopress 25mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('hypopress 25mg 30', 'هيبوبرس 25مجم 30', 'captopril', '6221025004291', 'Medicine', 15, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'hypopress 25mg 30', 'هيبوبرس 25مجم 30', '{"captopril"}', 'Medicine', 15, 13.14, 42, '2026-09-01', '6221025004291', 3, 'Tablet', 'local', 'amoun', '31', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 42, '2026-09-01', 13.14, 'INITIAL-IMPORT', now());

  -- Item: ketolgin 100mg 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ketolgin 100mg 3', 'كيتولجين 100مجم 3', 'ketoprofen', '6221025008848', 'Medicine', 5, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ketolgin 100mg 3', 'كيتولجين 100مجم 3', '{"ketoprofen"}', 'Medicine', 5, 4.25, 465, '2027-04-01', '6221025008848', 3, 'Ampoule', 'local', 'amoun', '311', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 465, '2027-04-01', 4.25, 'INITIAL-IMPORT', now());

  -- Item: lafurex 40mg/4ml 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('lafurex 40mg/4ml 3', 'لافيوريكس 40مجم/4مل 3', 'furosemide', '6221025015006', 'Medicine', 13.5, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'lafurex 40mg/4ml 3', 'لافيوريكس 40مجم/4مل 3', '{"furosemide"}', 'Medicine', 13.5, 10.2, 417, '2027-04-01', '6221025015006', 3, 'Ampoule', 'local', 'amoun', '91', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 417, '2027-04-01', 10.2, 'INITIAL-IMPORT', now());

  -- Item: lodoz 10/6.25 mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('lodoz 10/6.25 mg 30', 'لودوز 10 / 6.25 مجم 30', 'bisoprolol fumarate, hydrochlorothiazide', '6221025016638', 'Medicine', 57, 'amoun > merck kgaa f.r.germany', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'lodoz 10/6.25 mg 30', 'لودوز 10 / 6.25 مجم 30', '{"bisoprolol fumarate","hydrochlorothiazide"}', 'Medicine', 57, 45.83, 156, '2028-08-01', '6221025016638', 3, 'Tablet', 'local', 'amoun > merck kgaa f.r.germany', '39', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 156, '2028-08-01', 45.83, 'INITIAL-IMPORT', now());

  -- Item: lodoz 2.5/6.25 mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('lodoz 2.5/6.25 mg 30', 'لودوز 6.25/2.5 مجم 30', 'bisoprolol fumarate, hydrochlorothiazide', '6221025016645', 'Medicine', 24, 'amoun > merck kgaa f.r.germany', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'lodoz 2.5/6.25 mg 30', 'لودوز 6.25/2.5 مجم 30', '{"bisoprolol fumarate","hydrochlorothiazide"}', 'Medicine', 24, 21.29, 405, '2027-09-01', '6221025016645', 3, 'Tablet', 'local', 'amoun > merck kgaa f.r.germany', '58', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 405, '2027-09-01', 21.29, 'INITIAL-IMPORT', now());

  -- Item: lodoz 5/6.25 mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('lodoz 5/6.25 mg 30', 'لودوز 6.25/5 مجم 30', 'bisoprolol fumarate, hydrochlorothiazide', '6221025017208', 'Medicine', 33, 'amoun > merck kgaa f.r.germany', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'lodoz 5/6.25 mg 30', 'لودوز 6.25/5 مجم 30', '{"bisoprolol fumarate","hydrochlorothiazide"}', 'Medicine', 33, 21.09, 318, '2026-12-01', '6221025017208', 3, 'Tablet', 'local', 'amoun > merck kgaa f.r.germany', '68', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 318, '2026-12-01', 21.09, 'INITIAL-IMPORT', now());

  -- Item: melocam 15mg/2ml 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('melocam 15mg/2ml 3', 'ميلوكام 15مجم/2مل 3', 'meloxicam', '6221025015204', 'Medicine', 15, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'melocam 15mg/2ml 3', 'ميلوكام 15مجم/2مل 3', '{"meloxicam"}', 'Medicine', 15, 12.92, 321, '2026-07-01', '6221025015204', 3, 'Ampoule', 'local', 'amoun', '108', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 321, '2026-07-01', 12.92, 'INITIAL-IMPORT', now());

  -- Item: midathetic 15mg/3ml 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('midathetic 15mg/3ml 3', 'ميداثيتك 15مجم/3مل 3', 'midazolam', '6221025013644', 'Medicine', 84, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'midathetic 15mg/3ml 3', 'ميداثيتك 15مجم/3مل 3', '{"midazolam"}', 'Medicine', 84, 52.06, 402, '2027-04-01', '6221025013644', 3, 'Ampoule', 'local', 'amoun', '375', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 402, '2027-04-01', 52.06, 'INITIAL-IMPORT', now());

  -- Item: mirfenacin 5/50 mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('mirfenacin 5/50 mg 30', 'ميرفيناسين ام ار 5/50مجم 30', 'solifenacin, mirabegron', '6221000011009', 'Medicine', 339, 'hikma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'mirfenacin 5/50 mg 30', 'ميرفيناسين ام ار 5/50مجم 30', '{"solifenacin","mirabegron"}', 'Medicine', 339, 292.31, 405, '2028-11-01', '6221000011009', 3, 'Tablet', 'imported', 'hikma', '87', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 405, '2028-11-01', 292.31, 'INITIAL-IMPORT', now());

  -- Item: motijust 2/125mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('motijust 2/125mg 30', 'موتيجست بلس 2/125 مجم 30', 'loperamide, simethicone', '6221025020147', 'Medicine', 37.5, 'international drug industries > novell pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'motijust 2/125mg 30', 'موتيجست بلس 2/125 مجم 30', '{"loperamide","simethicone"}', 'Medicine', 37.5, 33.44, 147, '2026-08-01', '6221025020147', 3, 'Capsule', 'local', 'international drug industries > novell pharma', '54', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 147, '2026-08-01', 33.44, 'INITIAL-IMPORT', now());

  -- Item: neurofenac 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('neurofenac 30', 'نيوروفيناك 30', 'diclofenac sodium, vitamin b1, vitamin b6, vitamin b12', '6221025009852', 'Medicine', 25.5, 'amoun > merck kgaa f.r.germany', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'neurofenac 30', 'نيوروفيناك 30', '{"diclofenac sodium","vitamin b1","vitamin b6","vitamin b12"}', 'Medicine', 25.5, 18.22, 306, '2027-07-01', '6221025009852', 3, 'Capsule', 'local', 'amoun > merck kgaa f.r.germany', '76', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 306, '2027-07-01', 18.22, 'INITIAL-IMPORT', now());

  -- Item: nitrocare 6.5mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('nitrocare 6.5mg 30', 'نيتروكير 6.5مجم 30', 'nitroglycerin', '6221014001782', 'Medicine', 25.5, 't3a pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'nitrocare 6.5mg 30', 'نيتروكير 6.5مجم 30', '{"nitroglycerin"}', 'Medicine', 25.5, 18.45, 405, '2028-06-01', '6221014001782', 3, 'Capsule', 'local', 't3a pharma', '45', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 405, '2028-06-01', 18.45, 'INITIAL-IMPORT', now());

  -- Item: quitcool 300mg 30 ext. rel
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('quitcool 300mg 30 ext. rel', 'كويتكول اكس ار 300مجم 30', 'quetiapine', '6221000001055', 'Medicine', 336, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'quitcool 300mg 30 ext. rel', 'كويتكول اكس ار 300مجم 30', '{"quetiapine"}', 'Medicine', 336, 241.21, 378, '2027-07-01', '6221000001055', 3, 'Tablet', 'local', 'hikma pharma', '85', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 378, '2027-07-01', 241.21, 'INITIAL-IMPORT', now());

  -- Item: quitcool 50mg 30 ext. rel
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('quitcool 50mg 30 ext. rel', 'كويتكول اكس ار 500مجم 30', 'quetiapine', '6221000001031', 'Medicine', 135, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'quitcool 50mg 30 ext. rel', 'كويتكول اكس ار 500مجم 30', '{"quetiapine"}', 'Medicine', 135, 88.28, 342, '2027-04-01', '6221000001031', 3, 'Tablet', 'local', 'hikma pharma', '129', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 342, '2027-04-01', 88.28, 'INITIAL-IMPORT', now());

  -- Item: roysan 4mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('roysan 4mg 30', 'رويسان 4مجم 30', 'tizanidine', '6221025017437', 'Medicine', 42, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'roysan 4mg 30', 'رويسان 4مجم 30', '{"tizanidine"}', 'Medicine', 42, 31.23, 408, '2028-10-01', '6221025017437', 3, 'Tablet', 'local', 'amoun', '277', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 408, '2028-10-01', 31.23, 'INITIAL-IMPORT', now());

  -- Item: simethicone 80mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('simethicone 80mg 30', 'سايميثيكون 80مجم 30', 'simethicone', '6221025008152', 'Medicine', 5.75, 'amoun > pyramids for trading pharmaceuticals-egypt', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'simethicone 80mg 30', 'سايميثيكون 80مجم 30', '{"simethicone"}', 'Medicine', 5.75, 5.05, 276, '2028-03-01', '6221025008152', 3, 'Tablet', 'local', 'amoun > pyramids for trading pharmaceuticals-egypt', '275', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 276, '2028-03-01', 5.05, 'INITIAL-IMPORT', now());

  -- Item: stimulan 400mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('stimulan 400mg 30', 'ستيميولان 400مجم 30', 'piracetam', '6221025004857', 'Medicine', 48, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'stimulan 400mg 30', 'ستيميولان 400مجم 30', '{"piracetam"}', 'Medicine', 48, 34.83, 33, '2027-10-01', '6221025004857', 3, 'Capsule', 'local', 'amoun', '1071', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 33, '2027-10-01', 34.83, 'INITIAL-IMPORT', now());

  -- Item: stimulan 800mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('stimulan 800mg 30', 'ستيميولان 800مجم 30', 'piracetam', '6221025008923', 'Medicine', 78, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'stimulan 800mg 30', 'ستيميولان 800مجم 30', '{"piracetam"}', 'Medicine', 78, 53.73, 459, '2028-08-01', '6221025008923', 3, 'Tablet', 'local', 'amoun', '640', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 459, '2028-08-01', 53.73, 'INITIAL-IMPORT', now());

  -- Item: thyrocil 50mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('thyrocil 50mg 30', 'ثيروسيل 50مجم 30', 'propylthiouracil', '6221025010209', 'Medicine', 72, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'thyrocil 50mg 30', 'ثيروسيل 50مجم 30', '{"propylthiouracil"}', 'Medicine', 72, 53.04, 474, '2028-05-01', '6221025010209', 3, 'Tablet', 'local', 'amoun', '367', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 474, '2028-05-01', 53.04, 'INITIAL-IMPORT', now());

  -- Item: tonoclone 200mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('tonoclone 200mg 30', 'تونوكلون 200مجم 30', 'carbamazepine', '6221014000990', 'Medicine', 13.5, 't3a pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'tonoclone 200mg 30', 'تونوكلون 200مجم 30', '{"carbamazepine"}', 'Medicine', 13.5, 11.89, 195, '2026-12-01', '6221014000990', 3, 'Tablet', 'local', 't3a pharma', '35', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 195, '2026-12-01', 11.89, 'INITIAL-IMPORT', now());

  -- Item: tonoclone 400mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('tonoclone 400mg 30', 'تونوكلون 400مجم 30', 'carbamazepine', '6221014001690', 'Medicine', 16.5, 't3a pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'tonoclone 400mg 30', 'تونوكلون 400مجم 30', '{"carbamazepine"}', 'Medicine', 16.5, 11.04, 237, '2027-05-01', '6221014001690', 3, 'Tablet', 'local', 't3a pharma', '33', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 237, '2027-05-01', 11.04, 'INITIAL-IMPORT', now());

  -- Item: valpam 5 mg/ml 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('valpam 5 mg/ml 3', 'فالبام 5مجم/مل 3', 'diazepam', '6221025004499', 'Medicine', 6, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'valpam 5 mg/ml 3', 'فالبام 5مجم/مل 3', '{"diazepam"}', 'Medicine', 6, 5.01, 210, '2028-08-01', '6221025004499', 3, 'Ampoule', 'local', 'amoun', '38', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 210, '2028-08-01', 5.01, 'INITIAL-IMPORT', now());

  -- Item: viscera 5mg/2ml 3
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('viscera 5mg/2ml 3', 'فيسرا 5مجم/2مل 3', 'tiemonium methylsulphate', '6221025019820', 'Medicine', 36, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'viscera 5mg/2ml 3', 'فيسرا 5مجم/2مل 3', '{"tiemonium methylsulphate"}', 'Medicine', 36, 27.82, 78, '2026-07-01', '6221025019820', 3, 'Ampoule', 'local', 'amoun', '315', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 78, '2026-07-01', 27.82, 'INITIAL-IMPORT', now());

  -- Item: vixaport 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('vixaport 30', 'فيكسابورت 30', 'benfotiamine, cyanocobalamine, pyridoxine', '6221000006180', 'Medicine', 150, 'hikma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'vixaport 30', 'فيكسابورت 30', '{"benfotiamine","cyanocobalamine","pyridoxine"}', 'Medicine', 150, 99.98, 153, '2027-03-01', '6221000006180', 3, 'Tablet', 'local', 'hikma', '1157', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 153, '2027-03-01', 99.98, 'INITIAL-IMPORT', now());

  -- Item: yostiretic 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('yostiretic 30', 'يوسترتك 30', 'amiloride, hydrochlorothiazide', '6221025004284', 'Medicine', 12, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'yostiretic 30', 'يوسترتك 30', '{"amiloride","hydrochlorothiazide"}', 'Medicine', 12, 9.06, 381, '2027-02-01', '6221025004284', 3, 'Tablet', 'local', 'amoun', '110', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 381, '2027-02-01', 9.06, 'INITIAL-IMPORT', now());

  -- Item: zolam 0.25mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('zolam 0.25mg 30', 'زولام 0.25مجم 30', 'alprazolam', '6221025009319', 'Medicine', 30, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'zolam 0.25mg 30', 'زولام 0.25مجم 30', '{"alprazolam"}', 'Medicine', 30, 18.07, 111, '2027-08-01', '6221025009319', 3, 'Tablet', 'local', 'amoun', '143', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 111, '2027-08-01', 18.07, 'INITIAL-IMPORT', now());

  -- Item: alkapress 5mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('alkapress 5mg 20', 'الكابرس 5مجم 20', 'amlodipine', '6221000000041', 'Medicine', 58, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'alkapress 5mg 20', 'الكابرس 5مجم 20', '{"amlodipine"}', 'Medicine', 58, 50.03, 268, '2027-08-01', '6221000000041', 2, 'Tablet', 'local', 'hikma pharma', '1361', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 268, '2027-08-01', 50.03, 'INITIAL-IMPORT', now());

  -- Item: alkapress 10/160mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('alkapress 10/160mg 20', 'الكابرس بلس 10/160مجم 20', 'amlodipine, valsartan', '6221000000065', 'Medicine', 102, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'alkapress 10/160mg 20', 'الكابرس بلس 10/160مجم 20', '{"amlodipine","valsartan"}', 'Medicine', 102, 66.5, 82, '2028-10-01', '6221000000065', 2, 'Tablet', 'local', 'hikma pharma', '431', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 82, '2028-10-01', 66.5, 'INITIAL-IMPORT', now());

  -- Item: alkapress trio 10/320/25mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('alkapress trio 10/320/25mg 14', 'الكابرس تريو 10/320/25مجم 14', 'amlodipine, hydrochlorothiazide, valsartan', '6221000010798', 'Medicine', 118, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'alkapress trio 10/320/25mg 14', 'الكابرس تريو 10/320/25مجم 14', '{"amlodipine","hydrochlorothiazide","valsartan"}', 'Medicine', 118, 86.33, 90, '2027-10-01', '6221000010798', 2, 'Tablet', 'local', 'hikma pharma', '219', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 90, '2027-10-01', 86.33, 'INITIAL-IMPORT', now());

  -- Item: alkapress trio 5/160/12.5mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('alkapress trio 5/160/12.5mg 14', 'الكابرس تريو 5/160/12.5مجم 14', 'amlodipine, hydrochlorothiazide, valsartan', '6221000010804', 'Medicine', 97, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'alkapress trio 5/160/12.5mg 14', 'الكابرس تريو 5/160/12.5مجم 14', '{"amlodipine","hydrochlorothiazide","valsartan"}', 'Medicine', 97, 72.83, 56, '2026-07-01', '6221000010804', 2, 'Tablet', 'local', 'hikma pharma', '390', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 56, '2026-07-01', 72.83, 'INITIAL-IMPORT', now());

  -- Item: alkapress trio 5/160/25mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('alkapress trio 5/160/25mg 14', 'الكابرس تريو 5/160/25مجم 14', 'amlodipine, hydrochlorothiazide, valsartan', '6221000010811', 'Medicine', 110, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'alkapress trio 5/160/25mg 14', 'الكابرس تريو 5/160/25مجم 14', '{"amlodipine","hydrochlorothiazide","valsartan"}', 'Medicine', 110, 97.04, 246, '2027-02-01', '6221000010811', 2, 'Tablet', 'local', 'hikma pharma', '146', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 246, '2027-02-01', 97.04, 'INITIAL-IMPORT', now());

  -- Item: alucal 320mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('alucal 320mg 20', 'الوكال 320مجم 20', 'dihydroxyaluminum sodium carbonate', '6220004368972', 'Medicine', 4, 'amriya', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'alucal 320mg 20', 'الوكال 320مجم 20', '{"dihydroxyaluminum sodium carbonate"}', 'Medicine', 4, 3.2, 184, '2026-09-01', '6220004368972', 2, 'Tablet', 'local', 'amriya', '36', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 184, '2026-09-01', 3.2, 'INITIAL-IMPORT', now());

  -- Item: amosar 25mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('amosar 25mg 20', 'اموسار 25مجم 20', 'losartan potassium', '6221025016263', 'Medicine', 28.8, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'amosar 25mg 20', 'اموسار 25مجم 20', '{"losartan potassium"}', 'Medicine', 28.8, 22.74, 90, '2028-03-01', '6221025016263', 2, 'Tablet', 'local', 'amoun', '52', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 90, '2028-03-01', 22.74, 'INITIAL-IMPORT', now());

  -- Item: amostigmine 15 mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('amostigmine 15 mg 20', 'اموستجمين 20', 'neostigmine', '6221025013699', 'Medicine', 8, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'amostigmine 15 mg 20', 'اموستجمين 20', '{"neostigmine"}', 'Medicine', 8, 5.14, 296, '2027-02-01', '6221025013699', 2, 'Tablet', 'local', 'amoun', '38', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 296, '2027-02-01', 5.14, 'INITIAL-IMPORT', now());

  -- Item: beto-12 1mg/ml 2
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('beto-12 1mg/ml 2', 'بيتو-12 1 مجم / مل 2', 'cyanocobalamine', '6221025014504', 'Medicine', 11, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'beto-12 1mg/ml 2', 'بيتو-12 1 مجم / مل 2', '{"cyanocobalamine"}', 'Medicine', 11, 9.18, 264, '2028-03-01', '6221025014504', 2, 'Ampoule', 'local', 'amoun', '84', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 264, '2028-03-01', 9.18, 'INITIAL-IMPORT', now());

  -- Item: bistol 10mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('bistol 10mg 20', 'بيستول 10مجم 20', 'bisoprolol fumarate', '6221000000188', 'Medicine', 42, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'bistol 10mg 20', 'بيستول 10مجم 20', '{"bisoprolol fumarate"}', 'Medicine', 42, 29.75, 212, '2028-03-01', '6221000000188', 2, 'Tablet', 'local', 'hikma pharma', '288', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 212, '2028-03-01', 29.75, 'INITIAL-IMPORT', now());

  -- Item: bistol 5mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('bistol 5mg 20', 'بيستول 5مجم 20', 'bisoprolol fumarate', '6221000000195', 'Medicine', 34, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'bistol 5mg 20', 'بيستول 5مجم 20', '{"bisoprolol fumarate"}', 'Medicine', 34, 21.43, 222, '2028-05-01', '6221000000195', 2, 'Tablet', 'local', 'hikma pharma', '518', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 222, '2028-05-01', 21.43, 'INITIAL-IMPORT', now());

  -- Item: bistol 5/12.5 mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('bistol 5/12.5 mg 20', 'بيستول بلس 5/12.5 مجم 20', 'bisoprolol fumarate, hydrochlorothiazide', '6221000000225', 'Medicine', 36, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'bistol 5/12.5 mg 20', 'بيستول بلس 5/12.5 مجم 20', '{"bisoprolol fumarate","hydrochlorothiazide"}', 'Medicine', 36, 22.14, 50, '2027-01-01', '6221000000225', 2, 'Tablet', 'local', 'hikma pharma', '375', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 50, '2027-01-01', 22.14, 'INITIAL-IMPORT', now());

  -- Item: carbatol 200mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('carbatol 200mg 20', 'كارباتول 200مجم 20', 'carbamazepine', '6221025015914', 'Medicine', 37, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'carbatol 200mg 20', 'كارباتول 200مجم 20', '{"carbamazepine"}', 'Medicine', 37, 30.38, 66, '2028-01-01', '6221025015914', 2, 'Tablet', 'local', 'amoun', '102', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 66, '2028-01-01', 30.38, 'INITIAL-IMPORT', now());

  -- Item: cartilgin 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cartilgin 20', 'كارتيلجين 20', 'chondroitin, glucosamine, vitamin c', '6221025014269', 'Medicine', 15.6, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cartilgin 20', 'كارتيلجين 20', '{"chondroitin","glucosamine","vitamin c"}', 'Medicine', 15.6, 11.92, 238, '2026-08-01', '6221025014269', 2, 'Capsule', 'local', 'amoun', '57', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 238, '2026-08-01', 11.92, 'INITIAL-IMPORT', now());

  -- Item: corasore 150mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('corasore 150mg 20', 'كوراسور 150مجم 20', 'heptaminol', '6221025004628', 'Medicine', 46, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'corasore 150mg 20', 'كوراسور 150مجم 20', '{"heptaminol"}', 'Medicine', 46, 31.75, 116, '2028-12-01', '6221025004628', 2, 'Tablet', 'local', 'amoun', '1855', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 116, '2028-12-01', 31.75, 'INITIAL-IMPORT', now());

  -- Item: cortilon 0.1 mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cortilon 0.1 mg 20', 'كورتيلون 0.1مجم 20', 'fludrocortisone', '6221025010964', 'Medicine', 16, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cortilon 0.1 mg 20', 'كورتيلون 0.1مجم 20', '{"fludrocortisone"}', 'Medicine', 16, 12.69, 188, '2028-03-01', '6221025010964', 2, 'Tablet', 'local', 'amoun', '1015', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 188, '2028-03-01', 12.69, 'INITIAL-IMPORT', now());

  -- Item: c-retard + zinc 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('c-retard + zinc 20', 'سي ريتارد+زنك 20', 'vitamin c, zinc', '6221000005817', 'Medicine', 80, 'hikma pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'c-retard + zinc 20', 'سي ريتارد+زنك 20', '{"vitamin c","zinc"}', 'Medicine', 80, 60.94, 238, '2027-11-01', '6221000005817', 2, 'Capsule', 'local', 'hikma pharma', '891', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 238, '2027-11-01', 60.94, 'INITIAL-IMPORT', now());

  -- Item: depratiox 10 mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('depratiox 10 mg 20', 'ديبراتيوكس 10مجم 20', 'vortioxetine', '6221000003332', 'Medicine', 206, 'hikma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'depratiox 10 mg 20', 'ديبراتيوكس 10مجم 20', '{"vortioxetine"}', 'Medicine', 206, 148.14, 144, '2026-07-01', '6221000003332', 2, 'Tablet', 'local', 'hikma', '289', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 144, '2026-07-01', 148.14, 'INITIAL-IMPORT', now());

  -- Item: depratiox 20 mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('depratiox 20 mg 20', 'ديبراتيوكس 20مجم 20', 'vortioxetine', '6221000003363', 'Medicine', 396, 'hikma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'depratiox 20 mg 20', 'ديبراتيوكس 20مجم 20', '{"vortioxetine"}', 'Medicine', 396, 254.54, 202, '2028-08-01', '6221000003363', 2, 'Tablet', 'local', 'hikma', '132', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 202, '2028-08-01', 254.54, 'INITIAL-IMPORT', now());

  -- Item: diabetron 40mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('diabetron 40mg 20', 'ديابترون 40 مجم 20 3', 'gliclazide', '6221025003973', 'Medicine', 5.75, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'diabetron 40mg 20', 'ديابترون 40 مجم 20 3', '{"gliclazide"}', 'Medicine', 5.75, 3.51, 250, '2027-12-01', '6221025003973', 2, 'Tablet', 'local', 'amoun', '40', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 250, '2027-12-01', 3.51, 'INITIAL-IMPORT', now());

  -- Item: diabetron 80mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('diabetron 80mg 20', 'ديابترون 80 مجم 20', 'gliclazide', '6221025003980', 'Medicine', 9, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'diabetron 80mg 20', 'ديابترون 80 مجم 20', '{"gliclazide"}', 'Medicine', 9, 5.43, 40, '2026-09-01', '6221025003980', 2, 'Tablet', 'local', 'amoun', '40', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 40, '2026-09-01', 5.43, 'INITIAL-IMPORT', now());

  -- Item: diarol 0.5mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('diarol 0.5mg 20', 'ديارول 0.5مجم 20', 'repaglinide', '6221025017468', 'Medicine', 13, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'diarol 0.5mg 20', 'ديارول 0.5مجم 20', '{"repaglinide"}', 'Medicine', 13, 8.73, 158, '2026-10-01', '6221025017468', 2, 'Tablet', 'local', 'amoun', '37', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 158, '2026-10-01', 8.73, 'INITIAL-IMPORT', now());

  -- Item: diarol 1 mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('diarol 1 mg 20', 'ديارول 1مجم 20', 'repaglinide', '6221025017475', 'Medicine', 17.5, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'diarol 1 mg 20', 'ديارول 1مجم 20', '{"repaglinide"}', 'Medicine', 17.5, 10.84, 102, '2028-07-01', '6221025017475', 2, 'Tablet', 'local', 'amoun', '32', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 102, '2028-07-01', 10.84, 'INITIAL-IMPORT', now());

  -- Item: diarol 2 mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('diarol 2 mg 20', 'دايارول 2مجم 20', 'repaglinide', '6221025017482', 'Medicine', 24, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'diarol 2 mg 20', 'دايارول 2مجم 20', '{"repaglinide"}', 'Medicine', 24, 14.68, 54, '2028-06-01', '6221025017482', 2, 'Tablet', 'local', 'amoun', '33', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 54, '2028-06-01', 14.68, 'INITIAL-IMPORT', now());

  -- Item: doxirazol 30 mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('doxirazol 30 mg 14', 'دوكسيرازول 30 مجم 14 ه', 'dexlansoprazole', '6221000000416', 'Medicine', 65, 'hikma pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'doxirazol 30 mg 14', 'دوكسيرازول 30 مجم 14 ه', '{"dexlansoprazole"}', 'Medicine', 65, 39.93, 236, '2028-08-01', '6221000000416', 2, 'Capsule', 'local', 'hikma pharma', '482', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 236, '2028-08-01', 39.93, 'INITIAL-IMPORT', now());

  -- Item: doxirazol 60 mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('doxirazol 60 mg 14', 'دوكسيرازول 60 مجم 14', 'dexlansoprazole', '6221000000423', 'Medicine', 101, 'hikma pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'doxirazol 60 mg 14', 'دوكسيرازول 60 مجم 14', '{"dexlansoprazole"}', 'Medicine', 101, 65.97, 88, '2027-01-01', '6221000000423', 2, 'Capsule', 'local', 'hikma pharma', '1313', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 88, '2027-01-01', 65.97, 'INITIAL-IMPORT', now());

  -- Item: effegad 75 mg 14 e.r
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('effegad 75 mg 14 e.r', 'ايفيجاد 75مجم 14', 'venlafaxine', '6221000010736', 'Medicine', 76, 'hikma pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'effegad 75 mg 14 e.r', 'ايفيجاد 75مجم 14', '{"venlafaxine"}', 'Medicine', 76, 57.92, 276, '2027-11-01', '6221000010736', 2, 'Capsule', 'local', 'hikma pharma', '213', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 276, '2027-11-01', 57.92, 'INITIAL-IMPORT', now());

  -- Item: emetrex 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('emetrex 20', 'اميتركس 20', 'cyclizine, vitamin b6', '6221025017727', 'Medicine', 44, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'emetrex 20', 'اميتركس 20', '{"cyclizine","vitamin b6"}', 'Medicine', 44, 35.44, 118, '2026-12-01', '6221025017727', 2, 'Tablet', 'local', 'amoun', '937', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 118, '2026-12-01', 35.44, 'INITIAL-IMPORT', now());

  -- Item: estikan 20mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('estikan 20mg 14', 'استيكان 20مجم 7', 'escitalopram', '6221000000522', 'Medicine', 106, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'estikan 20mg 14', 'استيكان 20مجم 7', '{"escitalopram"}', 'Medicine', 106, 82.63, 196, '2027-09-01', '6221000000522', 2, 'Tablet', 'local', 'hikma pharma', '1151', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 196, '2027-09-01', 82.63, 'INITIAL-IMPORT', now());

  -- Item: euthyrox 100mcg 50
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('euthyrox 100mcg 50', 'يوثيروكس 100 ميكروجرام 50', 'levothyroxine', '6221025018359', 'Medicine', 70, 'merck kgaa f.r.germany > amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'euthyrox 100mcg 50', 'يوثيروكس 100 ميكروجرام 50', '{"levothyroxine"}', 'Medicine', 70, 43.32, 146, '2028-06-01', '6221025018359', 2, 'Tablet', 'imported', 'merck kgaa f.r.germany > amoun', '590', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 146, '2028-06-01', 43.32, 'INITIAL-IMPORT', now());

  -- Item: feburic 40 mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('feburic 40 mg 20', 'فيبيوريك 40مجم 20', 'febuxostat', '6221000000577', 'Medicine', 76, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'feburic 40 mg 20', 'فيبيوريك 40مجم 20', '{"febuxostat"}', 'Medicine', 76, 54.73, 160, '2027-01-01', '6221000000577', 2, 'Tablet', 'local', 'hikma pharma', '1007', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 160, '2027-01-01', 54.73, 'INITIAL-IMPORT', now());

  -- Item: floxamo 500/500 mg 16
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('floxamo 500/500 mg 16', 'فلوكسامو 1جم 16', 'amoxicillin, flucloxacillin', '6221025019356', 'Medicine', 110, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'floxamo 500/500 mg 16', 'فلوكسامو 1جم 16', '{"amoxicillin","flucloxacillin"}', 'Medicine', 110, 76.87, 120, '2026-11-01', '6221025019356', 2, 'Tablet', 'local', 'amoun', '1685', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 120, '2026-11-01', 76.87, 'INITIAL-IMPORT', now());

  -- Item: haema- 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('haema- 14', 'هيما-كابس 14', 'ferrous fumarate+vitamins(b1+b2+b6+b12+c+d+e)+folic acid+calcium+copper+linoleic acid+linolenic acid+manganese', '6221025008305', 'Medicine', 18, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'haema- 14', 'هيما-كابس 14', '{"ferrous fumarate+vitamins(b1+b2+b6+b12+c+d+e)+folic acid+calcium+copper+linoleic acid+linolenic acid+manganese"}', 'Medicine', 18, 15.83, 202, '2027-04-01', '6221025008305', 2, 'Capsule', 'local', 'amoun', '438', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 202, '2027-04-01', 15.83, 'INITIAL-IMPORT', now());

  -- Item: haemokion 10mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('haemokion 10mg 20', 'هيموكيون 10 مجم 20', 'vitamin k1', '6221025008763', 'Medicine', 16, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'haemokion 10mg 20', 'هيموكيون 10 مجم 20', '{"vitamin k1"}', 'Medicine', 16, 13.9, 172, '2028-04-01', '6221025008763', 2, 'Tablet', 'local', 'amoun', '70', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 172, '2028-04-01', 13.9, 'INITIAL-IMPORT', now());

  -- Item: haemostop 250mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('haemostop 250mg 20', 'هيموستوب 250مجم 20', 'ethamsylate', '6221025014580', 'Medicine', 26, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'haemostop 250mg 20', 'هيموستوب 250مجم 20', '{"ethamsylate"}', 'Medicine', 26, 22.59, 48, '2028-11-01', '6221025014580', 2, 'Tablet', 'local', 'amoun', '188', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 48, '2028-11-01', 22.59, 'INITIAL-IMPORT', now());

  -- Item: hypopress-d 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('hypopress-d 20', 'هيبوبرس-دي 20', 'captopril, hydrochlorothiazide', '6221025017413', 'Medicine', 18, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'hypopress-d 20', 'هيبوبرس-دي 20', '{"captopril","hydrochlorothiazide"}', 'Medicine', 18, 13.29, 184, '2028-02-01', '6221025017413', 2, 'Tablet', 'local', 'amoun', '35', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 184, '2028-02-01', 13.29, 'INITIAL-IMPORT', now());

  -- Item: ibiamox 250mg 12
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ibiamox 250mg 12', 'ابياموكس 250مجم 12', 'amoxicillin', '6221025005014', 'Medicine', 5.7, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ibiamox 250mg 12', 'ابياموكس 250مجم 12', '{"amoxicillin"}', 'Medicine', 5.7, 4.31, 102, '2028-07-01', '6221025005014', 2, 'Capsule', 'local', 'amoun', '60', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 102, '2028-07-01', 4.31, 'INITIAL-IMPORT', now());

  -- Item: kapron 500 mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('kapron 500 mg 20', 'كابرون 500 مجم 20', 'tranexamic acid', '6221025012692', 'Medicine', 110, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'kapron 500 mg 20', 'كابرون 500 مجم 20', '{"tranexamic acid"}', 'Medicine', 110, 90.16, 314, '2026-07-01', '6221025012692', 2, 'Tablet', 'local', 'amoun', '3347', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 314, '2026-07-01', 90.16, 'INITIAL-IMPORT', now());

  -- Item: kast 5 mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('kast 5 mg 14', 'كاست 5مجم 14', 'montelukast', '6221000000874', 'Medicine', 53, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'kast 5 mg 14', 'كاست 5مجم 14', '{"montelukast"}', 'Medicine', 53, 46.83, 276, '2026-11-01', '6221000000874', 2, 'Tablet', 'local', 'hikma pharma', '391', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 276, '2026-11-01', 46.83, 'INITIAL-IMPORT', now());

  -- Item: ketolgin 25mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ketolgin 25mg 20', 'كيتولجين 25مجم 30', 'ketoprofen', '6221025014467', 'Medicine', 7.5, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ketolgin 25mg 20', 'كيتولجين 25مجم 30', '{"ketoprofen"}', 'Medicine', 7.5, 4.6, 70, '2028-04-01', '6221025014467', 2, 'Tablet', 'local', 'amoun', '46', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 70, '2028-04-01', 4.6, 'INITIAL-IMPORT', now());

  -- Item: lactodel 2.5mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('lactodel 2.5mg 20', 'لاكتوديل 2.5مجم 20', 'bromocriptine', '6221025003614', 'Medicine', 72, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'lactodel 2.5mg 20', 'لاكتوديل 2.5مجم 20', '{"bromocriptine"}', 'Medicine', 72, 58.82, 160, '2027-10-01', '6221025003614', 2, 'Tablet', 'local', 'amoun', '683', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 160, '2027-10-01', 58.82, 'INITIAL-IMPORT', now());

  -- Item: lafurex 20mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('lafurex 20mg 20', 'لافيوريكس 20مجم 20', 'furosemide', '6221025014726', 'Medicine', 8.5, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'lafurex 20mg 20', 'لافيوريكس 20مجم 20', '{"furosemide"}', 'Medicine', 8.5, 6.22, 72, '2026-08-01', '6221025014726', 2, 'Tablet', 'local', 'amoun', '44', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 72, '2026-08-01', 6.22, 'INITIAL-IMPORT', now());

  -- Item: lafurex 40mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('lafurex 40mg 20', 'لافيوريكس 40مجم 20', 'furosemide', '6221025014733', 'Medicine', 9.5, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'lafurex 40mg 20', 'لافيوريكس 40مجم 20', '{"furosemide"}', 'Medicine', 9.5, 8.23, 124, '2028-04-01', '6221025014733', 2, 'Tablet', 'local', 'amoun', '41', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 124, '2028-04-01', 8.23, 'INITIAL-IMPORT', now());

  -- Item: low-sterol 10mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('low-sterol 10mg 20', 'لو استيرول 10مجم 20', 'simvastatin', '6221014000839', 'Medicine', 63.8, 't3a pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'low-sterol 10mg 20', 'لو استيرول 10مجم 20', '{"simvastatin"}', 'Medicine', 63.8, 52.74, 174, '2026-12-01', '6221014000839', 2, 'Tablet', 'local', 't3a pharma', '31', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 174, '2026-12-01', 52.74, 'INITIAL-IMPORT', now());

  -- Item: marcofen 400mg 20 coated
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('marcofen 400mg 20 coated', 'ماركوفين 400مجم 20', 'ibuprofen', '6221025000903', 'Medicine', 11, 'glaxo smithkline', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'marcofen 400mg 20 coated', 'ماركوفين 400مجم 20', '{"ibuprofen"}', 'Medicine', 11, 7.15, 180, '2027-10-01', '6221025000903', 2, 'Tablet', 'local', 'glaxo smithkline', '55', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 180, '2027-10-01', 7.15, 'INITIAL-IMPORT', now());

  -- Item: michaelon 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('michaelon 20', 'مايكيلون 20', 'carbinoxamine, paracetamol(acetaminophen), pseudoephedrine', '6221025012364', 'Medicine', 9.5, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'michaelon 20', 'مايكيلون 20', '{"carbinoxamine","paracetamol(acetaminophen)","pseudoephedrine"}', 'Medicine', 9.5, 6.21, 64, '2028-07-01', '6221025012364', 2, 'Tablet', 'local', 'amoun', '70', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 64, '2028-07-01', 6.21, 'INITIAL-IMPORT', now());

  -- Item: omez 20mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('omez 20mg 14', 'اوميز 20مجم 14', 'omeprazole', '6221004048865', 'Medicine', 56, 'pharopharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'omez 20mg 14', 'اوميز 20مجم 14', '{"omeprazole"}', 'Medicine', 56, 42.27, 196, '2027-12-01', '6221004048865', 2, 'Capsule', 'local', 'pharopharma', '4336', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 196, '2027-12-01', 42.27, 'INITIAL-IMPORT', now());

  -- Item: p.t.b. 500 mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('p.t.b. 500 mg 20', 'بي.تي.بي 500مجم 20', 'pyrazinamide', '6221025003485', 'Medicine', 9.5, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'p.t.b. 500 mg 20', 'بي.تي.بي 500مجم 20', '{"pyrazinamide"}', 'Medicine', 9.5, 8.35, 312, '2028-07-01', '6221025003485', 2, 'Tablet', 'local', 'amoun', '71', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 312, '2028-07-01', 8.35, 'INITIAL-IMPORT', now());

  -- Item: rheumarene 25 mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('rheumarene 25 mg 20', 'رومارين 25مجم 20', 'diclofenac sodium', '6221025001290', 'Medicine', 13.25, 'sedico', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'rheumarene 25 mg 20', 'رومارين 25مجم 20', '{"diclofenac sodium"}', 'Medicine', 13.25, 11.01, 210, '2027-12-01', '6221025001290', 2, 'Tablet', 'local', 'sedico', '50', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 210, '2027-12-01', 11.01, 'INITIAL-IMPORT', now());

  -- Item: rowapraxin 10mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('rowapraxin 10mg 20', 'روابراكسين 10مجم 20', 'pipoxolan', '6221025005465', 'Medicine', 5.65, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'rowapraxin 10mg 20', 'روابراكسين 10مجم 20', '{"pipoxolan"}', 'Medicine', 5.65, 3.83, 172, '2028-04-01', '6221025005465', 2, 'Tablet', 'local', 'amoun', '70', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 172, '2028-04-01', 3.83, 'INITIAL-IMPORT', now());

  -- Item: spasmodin 5mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('spasmodin 5mg 20', 'سبازمودين 5مجم 20', 'oxyphenonium bromide', '6221009003586', 'Medicine', 7, 'hi-pharm', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'spasmodin 5mg 20', 'سبازمودين 5مجم 20', '{"oxyphenonium bromide"}', 'Medicine', 7, 6.21, 226, '2028-08-01', '6221009003586', 2, 'Tablet', 'local', 'hi-pharm', '385', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 226, '2028-08-01', 6.21, 'INITIAL-IMPORT', now());

  -- Item: topoprazan 20 mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('topoprazan 20 mg 14', 'توبوبرازان 20مجم 14', 'vonoprazan', '6221000010910', 'Medicine', 100, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'topoprazan 20 mg 14', 'توبوبرازان 20مجم 14', '{"vonoprazan"}', 'Medicine', 100, 86.49, 50, '2026-11-01', '6221000010910', 2, 'Tablet', 'local', 'hikma pharma', '846', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 50, '2026-11-01', 86.49, 'INITIAL-IMPORT', now());

  -- Item: vasotal 400mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('vasotal 400mg 20', 'فازوتال 400مجم 20', 'pentoxifylline', '6221014000105', 'Medicine', 22, 't3a pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'vasotal 400mg 20', 'فازوتال 400مجم 20', '{"pentoxifylline"}', 'Medicine', 22, 14.74, 88, '2027-02-01', '6221014000105', 2, 'Tablet', 'local', 't3a pharma', '50', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 88, '2027-02-01', 14.74, 'INITIAL-IMPORT', now());

  -- Item: xefo rapid 8 mg 20
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('xefo rapid 8 mg 20', 'زيفو رابيد 8مجم 20', 'lornoxicam', '6221000001383', 'Medicine', 89, 'marcyrl co. > takeda', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'xefo rapid 8 mg 20', 'زيفو رابيد 8مجم 20', '{"lornoxicam"}', 'Medicine', 89, 76.48, 108, '2026-10-01', '6221000001383', 2, 'Tablet', 'local', 'marcyrl co. > takeda', '930', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 108, '2026-10-01', 76.48, 'INITIAL-IMPORT', now());

  -- Item: acne free 0.025% 30 gm ()
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('acne free 0.025% 30 gm ()', 'اكني فري 0.025% 30 جرام', 'tretinoin', '6221025002877', 'Medicine', 13, 'amoun', 'Gel')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'acne free 0.025% 30 gm ()', 'اكني فري 0.025% 30 جرام', '{"tretinoin"}', 'Medicine', 13, 8.45, 54, '2027-02-01', '6221025002877', 1, 'Gel', 'local', 'amoun', '215', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 54, '2027-02-01', 8.45, 'INITIAL-IMPORT', now());

  -- Item: acne free 0.05% 30 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('acne free 0.05% 30 gm', 'اكني فري 0.05% 30 جرام', 'tretinoin', '6221025002860', 'Medicine', 27, 'amoun', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'acne free 0.05% 30 gm', 'اكني فري 0.05% 30 جرام', '{"tretinoin"}', 'Medicine', 27, 18.45, 142, '2027-11-01', '6221025002860', 1, 'Cream', 'local', 'amoun', '360', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 142, '2027-11-01', 18.45, 'INITIAL-IMPORT', now());

  -- Item: actozone 30mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('actozone 30mg 10', 'اكتوزون 30مجم 10', 'pioglitazone', '6221025017772', 'Medicine', 33.5, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'actozone 30mg 10', 'اكتوزون 30مجم 10', '{"pioglitazone"}', 'Medicine', 33.5, 24.86, 57, '2027-04-01', '6221025017772', 1, 'Tablet', 'local', 'amoun', '90', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 57, '2027-04-01', 24.86, 'INITIAL-IMPORT', now());

  -- Item: actozone 45mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('actozone 45mg 10', 'اكتوزون 45مجم 10', 'pioglitazone', '6221025017765', 'Medicine', 50, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'actozone 45mg 10', 'اكتوزون 45مجم 10', '{"pioglitazone"}', 'Medicine', 50, 40.2, 147, '2028-09-01', '6221025017765', 1, 'Tablet', 'local', 'amoun', '54', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 147, '2028-09-01', 40.2, 'INITIAL-IMPORT', now());

  -- Item: amikacin 500mg (Amoun)
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('amikacin 500mg (Amoun)', 'اميكاسين 500مجم 1 - آمون', 'amikacin', '6221025019219', 'Medicine', 34, 'Amoun', 'Vial')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'amikacin 500mg (Amoun)', 'اميكاسين 500مجم 1 - آمون', '{"amikacin"}', 'Medicine', 34, 22.17, 85, '2027-03-01', '6221025019219', 1, 'Vial', 'local', 'Amoun', '790', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 85, '2027-03-01', 22.17, 'INITIAL-IMPORT', now());

  -- Item: amikacin amoun 100mg/2ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('amikacin amoun 100mg/2ml', 'اميكاسين امون 100مجم/2مل', 'amikacin', '6221025019172', 'Medicine', 5, 'amoun', 'Vial')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'amikacin amoun 100mg/2ml', 'اميكاسين امون 100مجم/2مل', '{"amikacin"}', 'Medicine', 5, 4.25, 80, '2028-12-01', '6221025019172', 1, 'Vial', 'local', 'amoun', '91', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 80, '2028-12-01', 4.25, 'INITIAL-IMPORT', now());

  -- Item: amocomb 15 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('amocomb 15 gm', 'اموكومب 15 جم', 'gramicidin, neomycin, nystatin, triamcinolone', '6221025018380', 'Medicine', 14, 'amoun', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'amocomb 15 gm', 'اموكومب 15 جم', '{"gramicidin","neomycin","nystatin","triamcinolone"}', 'Medicine', 14, 9.81, 94, '2027-02-01', '6221025018380', 1, 'Cream', 'local', 'amoun', '166', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 94, '2027-02-01', 9.81, 'INITIAL-IMPORT', now());

  -- Item: amoflam 100mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('amoflam 100mg 10', 'اموفلام 100 مجم 10', 'aceclofenac', '6221025018700', 'Medicine', 7.5, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'amoflam 100mg 10', 'اموفلام 100 مجم 10', '{"aceclofenac"}', 'Medicine', 7.5, 4.85, 35, '2027-01-01', '6221025018700', 1, 'Tablet', 'local', 'amoun', '42', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 35, '2027-01-01', 4.85, 'INITIAL-IMPORT', now());

  -- Item: amovit calcium 12
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('amovit calcium 12', 'اموفيت كالسيوم 12', 'calcium, vitamin c', '6221025017703', 'Medicine', 9, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'amovit calcium 12', 'اموفيت كالسيوم 12', '{"calcium","vitamin c"}', 'Medicine', 9, 7.76, 65, '2027-06-01', '6221025017703', 1, 'Tablet', 'local', 'amoun', '39', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 65, '2027-06-01', 7.76, 'INITIAL-IMPORT', now());

  -- Item: amovit-c 1 gm 12
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('amovit-c 1 gm 12', 'اموفيت سي 12', 'vitamin c', '6221025015709', 'Medicine', 8, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'amovit-c 1 gm 12', 'اموفيت سي 12', '{"vitamin c"}', 'Medicine', 8, 5.88, 43, '2028-11-01', '6221025015709', 1, 'Tablet', 'local', 'amoun', '46', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 43, '2028-11-01', 5.88, 'INITIAL-IMPORT', now());

  -- Item: antiflam 1% 20 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('antiflam 1% 20 gm', 'انتيفلام 1% ايمل 20 جم', 'diclofenac sodium', '6221014002727', 'Medicine', 7.5, 't3a pharma', 'Gel')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'antiflam 1% 20 gm', 'انتيفلام 1% ايمل 20 جم', '{"diclofenac sodium"}', 'Medicine', 7.5, 6.05, 120, '2027-10-01', '6221014002727', 1, 'Gel', 'local', 't3a pharma', '56', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 120, '2027-10-01', 6.05, 'INITIAL-IMPORT', now());

  -- Item: antinal 220mg/5ml 60ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('antinal 220mg/5ml 60ml', 'انتينال زجاجة 60 مل', 'nifuroxazide', '6221025005298', 'Medicine', 24, 'amoun', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'antinal 220mg/5ml 60ml', 'انتينال زجاجة 60 مل', '{"nifuroxazide"}', 'Medicine', 24, 16.41, 55, '2027-04-01', '6221025005298', 1, 'Suspension', 'local', 'amoun', '2090', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 55, '2027-04-01', 16.41, 'INITIAL-IMPORT', now());

  -- Item: antodine 10mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('antodine 10mg 10', 'انتودين 10مجم 10', 'famotidine', '6221025018830', 'Medicine', 10.5, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'antodine 10mg 10', 'انتودين 10مجم 10', '{"famotidine"}', 'Medicine', 10.5, 7.81, 127, '2027-10-01', '6221025018830', 1, 'Tablet', 'local', 'amoun', '442', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 127, '2027-10-01', 7.81, 'INITIAL-IMPORT', now());

  -- Item: antodine 20 mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('antodine 20 mg 10', 'انتودين 20مجم 10', 'famotidine', '6221025018670', 'Medicine', 12, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'antodine 20 mg 10', 'انتودين 20مجم 10', '{"famotidine"}', 'Medicine', 12, 10.29, 104, '2028-06-01', '6221025018670', 1, 'Tablet', 'local', 'amoun', '403', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 104, '2028-06-01', 10.29, 'INITIAL-IMPORT', now());

  -- Item: apidone 125ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('apidone 125ml', 'ابيدون 125 مل', 'chlorpheniramine, dexamethasone', '6221025004833', 'Medicine', 24, 'amoun', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'apidone 125ml', 'ابيدون 125 مل', '{"chlorpheniramine","dexamethasone"}', 'Medicine', 24, 21.21, 89, '2027-05-01', '6221025004833', 1, 'Syrup', 'local', 'amoun', '4429', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 89, '2027-05-01', 21.21, 'INITIAL-IMPORT', now());

  -- Item: apigent 0.1% top. cr. 15 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('apigent 0.1% top. cr. 15 gm', 'ابيجينت 0.1% 15 جم', 'gentamicin', '6221025014832', 'Medicine', 4.75, 'amoun', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'apigent 0.1% top. cr. 15 gm', 'ابيجينت 0.1% 15 جم', '{"gentamicin"}', 'Medicine', 4.75, 3.13, 133, '2028-06-01', '6221025014832', 1, 'Cream', 'local', 'amoun', '52', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 133, '2028-06-01', 3.13, 'INITIAL-IMPORT', now());

  -- Item: apigent 3mg/gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('apigent 3mg/gm', 'ابيجينت 3مجم/جم', 'gentamicin', '6221025002990', 'Medicine', 4.95, 'amoun', 'Ointment')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'apigent 3mg/gm', 'ابيجينت 3مجم/جم', '{"gentamicin"}', 'Medicine', 4.95, 3.44, 137, '2028-01-01', '6221025002990', 1, 'Ointment', 'local', 'amoun', '37', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 137, '2028-01-01', 3.44, 'INITIAL-IMPORT', now());

  -- Item: apigent 3mg/ml 5 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('apigent 3mg/ml 5 ml', 'ابيجنت 3 مجم/مل 5 مل', 'gentamicin', '6221025002983', 'Medicine', 4.95, 'amoun', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'apigent 3mg/ml 5 ml', 'ابيجنت 3 مجم/مل 5 مل', '{"gentamicin"}', 'Medicine', 4.95, 3.35, 129, '2027-01-01', '6221025002983', 1, 'Drops', 'local', 'amoun', '56', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 129, '2027-01-01', 3.35, 'INITIAL-IMPORT', now());

  -- Item: apigent-p 5 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('apigent-p 5 ml', 'ابيجينت-بي عين/اذن 5 مل', 'gentamicin, prednisolone', '6221025002976', 'Medicine', 6.5, 'amoun', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'apigent-p 5 ml', 'ابيجينت-بي عين/اذن 5 مل', '{"gentamicin","prednisolone"}', 'Medicine', 6.5, 4.59, 16, '2028-05-01', '6221025002976', 1, 'Drops', 'local', 'amoun', '45', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 16, '2028-05-01', 4.59, 'INITIAL-IMPORT', now());

  -- Item: apigent-p 5 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('apigent-p 5 gm', 'ابيجينت-بي 5 ج عين', 'gentamicin', '6221025008282', 'Medicine', 8, 'amoun', 'Ointment')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'apigent-p 5 gm', 'ابيجينت-بي 5 ج عين', '{"gentamicin"}', 'Medicine', 8, 4.86, 44, '2027-08-01', '6221025008282', 1, 'Ointment', 'local', 'amoun', '37', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 44, '2027-08-01', 4.86, 'INITIAL-IMPORT', now());

  -- Item: argiderm- p 15 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('argiderm- p 15 gm', 'ارجيدرم-بي 15 جم', 'panthenol, silver sulphadiazine', '6221025004222', 'Medicine', 6, 'amoun', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'argiderm- p 15 gm', 'ارجيدرم-بي 15 جم', '{"panthenol","silver sulphadiazine"}', 'Medicine', 6, 4.22, 52, '2027-09-01', '6221025004222', 1, 'Cream', 'local', 'amoun', '39', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 52, '2027-09-01', 4.22, 'INITIAL-IMPORT', now());

  -- Item: argiderm- p 40 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('argiderm- p 40 gm', 'ارجيدرم-بي 40 جم', 'panthenol, silver sulphadiazine', '6221025013651', 'Medicine', 9, 'amoun', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'argiderm- p 40 gm', 'ارجيدرم-بي 40 جم', '{"panthenol","silver sulphadiazine"}', 'Medicine', 9, 6.28, 41, '2028-06-01', '6221025013651', 1, 'Cream', 'local', 'amoun', '35', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 41, '2028-06-01', 6.28, 'INITIAL-IMPORT', now());

  -- Item: arythrex 100mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('arythrex 100mg 10', 'اريثريكس 100مجم 10', 'celecoxib', '6221025016041', 'Medicine', 21.6, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'arythrex 100mg 10', 'اريثريكس 100مجم 10', '{"celecoxib"}', 'Medicine', 21.6, 18.63, 84, '2027-02-01', '6221025016041', 1, 'Capsule', 'local', 'amoun', '203', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 84, '2027-02-01', 18.63, 'INITIAL-IMPORT', now());

  -- Item: azalide 200mg/5ml 15ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('azalide 200mg/5ml 15ml', 'ازالايد 200 مجم / 5مل 15 مل', 'azithromycin', '6221014000600', 'Medicine', 53, 't3a pharma', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'azalide 200mg/5ml 15ml', 'ازالايد 200 مجم / 5مل 15 مل', '{"azithromycin"}', 'Medicine', 53, 33.42, 33, '2027-06-01', '6221014000600', 1, 'Suspension', 'local', 't3a pharma', '149', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 33, '2027-06-01', 33.42, 'INITIAL-IMPORT', now());

  -- Item: azelast 125/50 mcg 25 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('azelast 125/50 mcg 25 ml', 'ازيلاست بلاس 125/50 مكجم للانف 25 مل', 'azelastine, fluticasone propionate', '6221000001772', 'Medicine', 102, 'hikma pharma', 'Spray')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'azelast 125/50 mcg 25 ml', 'ازيلاست بلاس 125/50 مكجم للانف 25 مل', '{"azelastine","fluticasone propionate"}', 'Medicine', 102, 89.47, 116, '2027-11-01', '6221000001772', 1, 'Spray', 'local', 'hikma pharma', '1920', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 116, '2027-11-01', 89.47, 'INITIAL-IMPORT', now());

  -- Item: b.b.c. 25 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('b.b.c. 25 ml', 'بي.بي.سي. ة 25 مل', 'benzocaine, benzydamine, cetalkonium', '6221025001474', 'Medicine', 49, 'amoun', 'Spray')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'b.b.c. 25 ml', 'بي.بي.سي. ة 25 مل', '{"benzocaine","benzydamine","cetalkonium"}', 'Medicine', 49, 39.68, 18, '2028-08-01', '6221025001474', 1, 'Spray', 'local', 'amoun', '1434', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 18, '2028-08-01', 39.68, 'INITIAL-IMPORT', now());

  -- Item: baby care 30 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('baby care 30 gm', 'بيبي كير 30 جرام', 'calamine, dimethicone, zinc oxide', '6221025009906', 'Medicine', 45, 'egpi > hi-pharm', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'baby care 30 gm', 'بيبي كير 30 جرام', '{"calamine","dimethicone","zinc oxide"}', 'Medicine', 45, 30.78, 120, '2027-07-01', '6221025009906', 1, 'Cream', 'local', 'egpi > hi-pharm', '93', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 120, '2027-07-01', 30.78, 'INITIAL-IMPORT', now());

  -- Item: baby 30 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('baby 30 gm', 'بيبي 30 جم', 'olive oil, zinc oxide', '6221025009906', 'Medicine', 45, 'amoun', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'baby 30 gm', 'بيبي 30 جم', '{"olive oil","zinc oxide"}', 'Medicine', 45, 32.58, 40, '2028-09-01', '6221025009906', 1, 'Cream', 'local', 'amoun', '268', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 40, '2028-09-01', 32.58, 'INITIAL-IMPORT', now());

  -- Item: beclo 50mcg/dose 200 doses
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('beclo 50mcg/dose 200 doses', 'بيكلو 50ميكرو/جرعة انف 200 جرعة', 'beclomethasone dipropionate', '6221025017017', 'Medicine', 48.5, 'amoun', 'Spray')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'beclo 50mcg/dose 200 doses', 'بيكلو 50ميكرو/جرعة انف 200 جرعة', '{"beclomethasone dipropionate"}', 'Medicine', 48.5, 35.44, 31, '2027-02-01', '6221025017017', 1, 'Spray', 'local', 'amoun', '789', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 31, '2027-02-01', 35.44, 'INITIAL-IMPORT', now());

  -- Item: betafos 2ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('betafos 2ml', 'بيتافوس 2 مل', 'betamethasone dipropionate, betamethasone sodium phosphate', '6221025019158', 'Medicine', 31, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'betafos 2ml', 'بيتافوس 2 مل', '{"betamethasone dipropionate","betamethasone sodium phosphate"}', 'Medicine', 31, 27.6, 70, '2028-01-01', '6221025019158', 1, 'Ampoule', 'local', 'amoun', '2795', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 70, '2028-01-01', 27.6, 'INITIAL-IMPORT', now());

  -- Item: betasalic lotion 30 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('betasalic lotion 30 ml', 'بيتاسليك محلول 30 مل', 'betamethasone, salicylic acid', '6210872046585', 'Medicine', 9, 'memphis', 'Lotion')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'betasalic lotion 30 ml', 'بيتاسليك محلول 30 مل', '{"betamethasone","salicylic acid"}', 'Medicine', 9, 8.09, 81, '2027-02-01', '6210872046585', 1, 'Lotion', 'local', 'memphis', '62', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 81, '2027-02-01', 8.09, 'INITIAL-IMPORT', now());

  -- Item: canemazole 1% 20 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('canemazole 1% 20 gm', 'كانيمازول 1% 20 جم', 'clotrimazole', '6221014001997', 'Medicine', 5, 't3a pharma', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'canemazole 1% 20 gm', 'كانيمازول 1% 20 جم', '{"clotrimazole"}', 'Medicine', 5, 3.16, 139, '2028-08-01', '6221014001997', 1, 'Cream', 'local', 't3a pharma', '39', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 139, '2028-08-01', 3.16, 'INITIAL-IMPORT', now());

  -- Item: carlol-v 12.5mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('carlol-v 12.5mg 10', 'كارلول-في 12.5مجم 10', 'carvedilol', '6221025019103', 'Medicine', 8, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'carlol-v 12.5mg 10', 'كارلول-في 12.5مجم 10', '{"carvedilol"}', 'Medicine', 8, 6.37, 109, '2027-10-01', '6221025019103', 1, 'Tablet', 'local', 'amoun', '30', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 109, '2027-10-01', 6.37, 'INITIAL-IMPORT', now());

  -- Item: cazet 10/40mg 7
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cazet 10/40mg 7', 'كازيت 40/10 مجم 7', 'ezetimibe, simvastatin', '6220001011315', 'Medicine', 60, 'unipharma co. > 4 a pharma-egypt', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cazet 10/40mg 7', 'كازيت 40/10 مجم 7', '{"ezetimibe","simvastatin"}', 'Medicine', 60, 41.24, 34, '2027-08-01', '6220001011315', 1, 'Tablet', 'local', 'unipharma co. > 4 a pharma-egypt', '33', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 34, '2027-08-01', 41.24, 'INITIAL-IMPORT', now());

  -- Item: cebion 100mg/ml 30 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cebion 100mg/ml 30 ml', 'سيبيون 100 مجم / مل 30 مل', 'vitamin c', '6221025012418', 'Medicine', 5.5, 'amoun > merck kgaa f.r.germany', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cebion 100mg/ml 30 ml', 'سيبيون 100 مجم / مل 30 مل', '{"vitamin c"}', 'Medicine', 5.5, 4.47, 133, '2026-11-01', '6221025012418', 1, 'Drops', 'local', 'amoun > merck kgaa f.r.germany', '76', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 133, '2026-11-01', 4.47, 'INITIAL-IMPORT', now());

  -- Item: cefadrine 500mg
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cefadrine 500mg', 'سيفادرين 500مجم', 'cephradine', '6221014000242', 'Medicine', 6, 't3a pharma', 'Vial')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cefadrine 500mg', 'سيفادرين 500مجم', '{"cephradine"}', 'Medicine', 6, 4.48, 73, '2027-03-01', '6221014000242', 1, 'Vial', 'local', 't3a pharma', '35', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 73, '2027-03-01', 4.48, 'INITIAL-IMPORT', now());

  -- Item: cefotax 1 gm t3a
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cefotax 1 gm t3a', 'سيفوتاكس 1جم تي ثري ايه', 'cefotaxime', '6221014000020', 'Medicine', 30, 't3a pharma > vodachem pharmaceuticals', 'Vial')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cefotax 1 gm t3a', 'سيفوتاكس 1جم تي ثري ايه', '{"cefotaxime"}', 'Medicine', 30, 26.98, 146, '2028-10-01', '6221014000020', 1, 'Vial', 'local', 't3a pharma > vodachem pharmaceuticals', '1101', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 146, '2028-10-01', 26.98, 'INITIAL-IMPORT', now());

  -- Item: cefotrix 1 gm ()
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cefotrix 1 gm ()', 'سيفوتريكس 1جم', 'ceftriaxone', '6221014000648', 'Medicine', 45, 't3a pharma', 'Vial')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cefotrix 1 gm ()', 'سيفوتريكس 1جم', '{"ceftriaxone"}', 'Medicine', 45, 31.97, 104, '2028-03-01', '6221014000648', 1, 'Vial', 'local', 't3a pharma', '159', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 104, '2028-03-01', 31.97, 'INITIAL-IMPORT', now());

  -- Item: cefotrix 250mg ()
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cefotrix 250mg ()', 'سيفوتريكس 250 مجم', 'ceftriaxone', '6221014000686', 'Medicine', 15, 't3a pharma', 'Vial')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cefotrix 250mg ()', 'سيفوتريكس 250 مجم', '{"ceftriaxone"}', 'Medicine', 15, 10.81, 82, '2026-11-01', '6221014000686', 1, 'Vial', 'local', 't3a pharma', '39', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 82, '2026-11-01', 10.81, 'INITIAL-IMPORT', now());

  -- Item: cempion 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cempion 10', 'سمبيون 10', 'lactoferrin+colostrum+iron+vitamin b complex+folic acid+vitamin c+vitamin e+cocoa powder+zinc+seleni', '6221007013976', 'Medicine', 125, 'medcare > neutra company', 'Sachet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cempion 10', 'سمبيون 10', '{"lactoferrin+colostrum+iron+vitamin b complex+folic acid+vitamin c+vitamin e+cocoa powder+zinc+seleni"}', 'Medicine', 125, 97.76, 108, '2026-08-01', '6221007013976', 1, 'Sachet', 'local', 'medcare > neutra company', '102', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 108, '2026-08-01', 97.76, 'INITIAL-IMPORT', now());

  -- Item: cerelac wheat 125 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cerelac wheat 125 gm', 'سيريلاك 125 جم', '', '6221007034070', 'Medicine', 52, 'nestle', 'Piece')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cerelac wheat 125 gm', 'سيريلاك 125 جم', '{}', 'Medicine', 52, 35.46, 69, '2028-04-01', '6221007034070', 1, 'Piece', 'local', 'nestle', '756', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 69, '2028-04-01', 35.46, 'INITIAL-IMPORT', now());

  -- Item: cetazime 1 gm iv/im usp23
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cetazime 1 gm iv/im usp23', 'سيتازيم 1 جم 1', 'ceftazidime', '6221014000457', 'Medicine', 45, 't3a pharma', 'Vial')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cetazime 1 gm iv/im usp23', 'سيتازيم 1 جم 1', '{"ceftazidime"}', 'Medicine', 45, 30.99, 82, '2027-02-01', '6221014000457', 1, 'Vial', 'local', 't3a pharma', '49', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 82, '2027-02-01', 30.99, 'INITIAL-IMPORT', now());

  -- Item: cetazime 500 mg iv/im usp23
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cetazime 500 mg iv/im usp23', 'سيتازيم 500مجم 1', 'ceftazidime', '6221014000440', 'Medicine', 21.75, 't3a pharma', 'Vial')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cetazime 500 mg iv/im usp23', 'سيتازيم 500مجم 1', '{"ceftazidime"}', 'Medicine', 21.75, 18.43, 21, '2027-08-01', '6221014000440', 1, 'Vial', 'local', 't3a pharma', '37', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 21, '2027-08-01', 18.43, 'INITIAL-IMPORT', now());

  -- Item: collycrom 4% 10 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('collycrom 4% 10 ml', 'كوليكروم 4% قطرة 10 مل', 'sodium cromoglycate', '6221025015983', 'Medicine', 8.5, 'amoun', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'collycrom 4% 10 ml', 'كوليكروم 4% قطرة 10 مل', '{"sodium cromoglycate"}', 'Medicine', 8.5, 6.01, 27, '2028-09-01', '6221025015983', 1, 'Drops', 'local', 'amoun', '34', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 27, '2028-09-01', 6.01, 'INITIAL-IMPORT', now());

  -- Item: c-retard 500mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('c-retard 500mg 10', 'سي-ريتارد 500مجم 10', 'vitamin c', '6221000001314', 'Medicine', 35, 'hikma pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'c-retard 500mg 10', 'سي-ريتارد 500مجم 10', '{"vitamin c"}', 'Medicine', 35, 30.78, 97, '2026-12-01', '6221000001314', 1, 'Capsule', 'local', 'hikma pharma', '1982', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 97, '2026-12-01', 30.78, 'INITIAL-IMPORT', now());

  -- Item: cyclopentolate 1% 5 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cyclopentolate 1% 5 ml', 'سيكلوبنتولات 1% للعين 5 مل', 'cyclopentolate', '6221025019868', 'Medicine', 8, 'company', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cyclopentolate 1% 5 ml', 'سيكلوبنتولات 1% للعين 5 مل', '{"cyclopentolate"}', 'Medicine', 8, 6.59, 58, '2028-08-01', '6221025019868', 1, 'Drops', 'local', 'company', '123', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 58, '2028-08-01', 6.59, 'INITIAL-IMPORT', now());

  -- Item: cyrinol 60 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('cyrinol 60 ml', 'سيرينول 60 مل', 'carbinoxamine, ephedrine, pholcodine', '6221025008084', 'Medicine', 17, 'amoun', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'cyrinol 60 ml', 'سيرينول 60 مل', '{"carbinoxamine","ephedrine","pholcodine"}', 'Medicine', 17, 11.88, 118, '2027-08-01', '6221025008084', 1, 'Syrup', 'local', 'amoun', '575', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 118, '2027-08-01', 11.88, 'INITIAL-IMPORT', now());

  -- Item: danofran 8mg
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('danofran 8mg', 'دانوفران 8مجم', 'ondansetron', '6221014000051', 'Medicine', 41, 't3a pharma', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'danofran 8mg', 'دانوفران 8مجم', '{"ondansetron"}', 'Medicine', 41, 36.6, 93, '2027-06-01', '6221014000051', 1, 'Ampoule', 'local', 't3a pharma', '69', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 93, '2027-06-01', 36.6, 'INITIAL-IMPORT', now());

  -- Item: daviken 120ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('daviken 120ml', 'دافيكين 120مل', 'valpoic acid', '6221025018410', 'Medicine', 13.2, 'amoun', 'Syrup')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'daviken 120ml', 'دافيكين 120مل', '{"valpoic acid"}', 'Medicine', 13.2, 10.56, 26, '2026-07-01', '6221025018410', 1, 'Syrup', 'local', 'amoun', '37', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 26, '2026-07-01', 10.56, 'INITIAL-IMPORT', now());

  -- Item: deltaclav 642.9mg/5ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('deltaclav 642.9mg/5ml', 'دلتاكلاف 642.9مجم/5مل', 'amoxicillin, clavulanic acid', '6221000001413', 'Medicine', 108, 'misr > delta pharma', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'deltaclav 642.9mg/5ml', 'دلتاكلاف 642.9مجم/5مل', '{"amoxicillin","clavulanic acid"}', 'Medicine', 108, 80.1, 99, '2026-09-01', '6221000001413', 1, 'Suspension', 'local', 'misr > delta pharma', '304', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 99, '2026-09-01', 80.1, 'INITIAL-IMPORT', now());

  -- Item: dexaron 5 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('dexaron 5 ml', 'ديكسارون بلس للعين والأذن 5 مل', 'dexamethasone, neomycin sulphate, polymyxin b sulphate', '6221025008268', 'Medicine', 8.5, 'amoun', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'dexaron 5 ml', 'ديكسارون بلس للعين والأذن 5 مل', '{"dexamethasone","neomycin sulphate","polymyxin b sulphate"}', 'Medicine', 8.5, 6.07, 99, '2028-07-01', '6221025008268', 1, 'Drops', 'local', 'amoun', '41', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 99, '2028-07-01', 6.07, 'INITIAL-IMPORT', now());

  -- Item: dexaron
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('dexaron', 'ديكسارون بلس العين / الأذن', 'dexamethasone, neomycin sulphate, polymyxin b sulphate', '6221025008251', 'Medicine', 7, 'amoun', 'Ointment')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'dexaron', 'ديكسارون بلس العين / الأذن', '{"dexamethasone","neomycin sulphate","polymyxin b sulphate"}', 'Medicine', 7, 5.26, 112, '2028-06-01', '6221025008251', 1, 'Ointment', 'local', 'amoun', '36', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 112, '2028-06-01', 5.26, 'INITIAL-IMPORT', now());

  -- Item: diax 220mg/5ml 60ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('diax 220mg/5ml 60ml', 'دياكس 220مجم/5مل 60 مل', 'nifuroxazide', '6221000000409', 'Medicine', 32, 'hikma pharma', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'diax 220mg/5ml 60ml', 'دياكس 220مجم/5مل 60 مل', '{"nifuroxazide"}', 'Medicine', 32, 26.49, 140, '2028-11-01', '6221000000409', 1, 'Suspension', 'local', 'hikma pharma', '642', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 140, '2028-11-01', 26.49, 'INITIAL-IMPORT', now());

  -- Item: ekmasonid 9 mg 10 e.r
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ekmasonid 9 mg 10 e.r', 'اكماسونيد 9مجم 10', 'budesonide', '6221000000454', 'Medicine', 123, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ekmasonid 9 mg 10 e.r', 'اكماسونيد 9مجم 10', '{"budesonide"}', 'Medicine', 123, 105.14, 108, '2027-02-01', '6221000000454', 1, 'Tablet', 'local', 'hikma pharma', '402', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 108, '2027-02-01', 105.14, 'INITIAL-IMPORT', now());

  -- Item: em-ex 1 mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('em-ex 1 mg 10', 'ام- اكس 1مجم 10', 'granisetron', '6221025014221', 'Medicine', 200, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'em-ex 1 mg 10', 'ام- اكس 1مجم 10', '{"granisetron"}', 'Medicine', 200, 130.6, 16, '2028-06-01', '6221025014221', 1, 'Tablet', 'local', 'amoun', '228', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 16, '2028-06-01', 130.6, 'INITIAL-IMPORT', now());

  -- Item: em-ex 3mg/3ml 1
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('em-ex 3mg/3ml 1', 'ام اكس 3 مجم/مل 1', 'granisetron', '6221025014207', 'Medicine', 84, 'amoun', 'Ampoule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'em-ex 3mg/3ml 1', 'ام اكس 3 مجم/مل 1', '{"granisetron"}', 'Medicine', 84, 61.57, 32, '2027-05-01', '6221025014207', 1, 'Ampoule', 'local', 'amoun', '61', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 32, '2027-05-01', 61.57, 'INITIAL-IMPORT', now());

  -- Item: enemax enema 120 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('enemax enema 120 ml', 'انيماكس حقنة شرجية 120 مل', 'disodium phosphate, mono sodium phosphate', '6221025001450', 'Medicine', 40, 'amoun', 'Solution')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'enemax enema 120 ml', 'انيماكس حقنة شرجية 120 مل', '{"disodium phosphate","mono sodium phosphate"}', 'Medicine', 40, 24.47, 59, '2028-05-01', '6221025001450', 1, 'Solution', 'local', 'amoun', '633', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 59, '2028-05-01', 24.47, 'INITIAL-IMPORT', now());

  -- Item: estikana 10 mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('estikana 10 mg 14', 'استيكانا 10مجم 14', 'escitalopram', '6221000000539', 'Medicine', 48, 'hochster pharmaceutical industries', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'estikana 10 mg 14', 'استيكانا 10مجم 14', '{"escitalopram"}', 'Medicine', 48, 38.26, 82, '2026-12-01', '6221000000539', 1, 'Tablet', 'local', 'hochster pharmaceutical industries', '382', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 82, '2026-12-01', 38.26, 'INITIAL-IMPORT', now());

  -- Item: fexon 120mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('fexon 120mg 10', 'فيكسون 120مجم 10', 'fexofenadine', '6221000000591', 'Medicine', 22, 'hikma pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'fexon 120mg 10', 'فيكسون 120مجم 10', '{"fexofenadine"}', 'Medicine', 22, 18.01, 106, '2027-03-01', '6221000000591', 1, 'Tablet', 'local', 'hikma pharma', '262', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 106, '2027-03-01', 18.01, 'INITIAL-IMPORT', now());

  -- Item: fladazole 500mg 4
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('fladazole 500mg 4', 'فلادازول 500مجم 4', 'secnidazole', '6221025008367', 'Medicine', 26, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'fladazole 500mg 4', 'فلادازول 500مجم 4', '{"secnidazole"}', 'Medicine', 26, 22.08, 86, '2027-01-01', '6221025008367', 1, 'Tablet', 'local', 'amoun', '992', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 86, '2027-01-01', 22.08, 'INITIAL-IMPORT', now());

  -- Item: fladazole 500mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('fladazole 500mg 5', 'فلادازول 500 مجم 5', 'secnidazole', '6221025018861', 'Medicine', 11.6, 'amoun', 'Sachet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'fladazole 500mg 5', 'فلادازول 500 مجم 5', '{"secnidazole"}', 'Medicine', 11.6, 7.93, 62, '2028-01-01', '6221025018861', 1, 'Sachet', 'local', 'amoun', '92', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 62, '2028-01-01', 7.93, 'INITIAL-IMPORT', now());

  -- Item: florosin 20mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('florosin 20mg 10', 'فلوروسين 20مجم 10', 'fluoxetine', '6221014000792', 'Medicine', 11, 't3a pharma', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'florosin 20mg 10', 'فلوروسين 20مجم 10', '{"fluoxetine"}', 'Medicine', 11, 6.87, 153, '2028-05-01', '6221014000792', 1, 'Capsule', 'local', 't3a pharma', '55', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 153, '2028-05-01', 6.87, 'INITIAL-IMPORT', now());

  -- Item: fuci-top-c 15 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('fuci-top-c 15 gm', 'فيوسي توب سي 15 جرام', 'betamethasone, fucidic acid', '6221000000676', 'Medicine', 33, 'hikma pharma', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'fuci-top-c 15 gm', 'فيوسي توب سي 15 جرام', '{"betamethasone","fucidic acid"}', 'Medicine', 33, 28.21, 85, '2028-07-01', '6221000000676', 1, 'Cream', 'local', 'hikma pharma', '234', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 85, '2028-07-01', 28.21, 'INITIAL-IMPORT', now());

  -- Item: fungisafe 1% 15 gm
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('fungisafe 1% 15 gm', 'فانجيسيف 1% 15 جرام', 'terbinafine', '6221025014689', 'Medicine', 9, 'amoun', 'Cream')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'fungisafe 1% 15 gm', 'فانجيسيف 1% 15 جرام', '{"terbinafine"}', 'Medicine', 9, 7.14, 151, '2027-11-01', '6221025014689', 1, 'Cream', 'local', 'amoun', '69', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 151, '2027-11-01', 7.14, 'INITIAL-IMPORT', now());

  -- Item: fungisafe 250mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('fungisafe 250mg 10', 'فانجيسيف 250مجم 10', 'terbinafine', '6221025014665', 'Medicine', 40, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'fungisafe 250mg 10', 'فانجيسيف 250مجم 10', '{"terbinafine"}', 'Medicine', 40, 29.97, 148, '2028-09-01', '6221025014665', 1, 'Tablet', 'local', 'amoun', '46', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 148, '2028-09-01', 29.97, 'INITIAL-IMPORT', now());

  -- Item: gast-reg 100mg 5
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('gast-reg 100mg 5', 'جاست ريج 100مجم 5', 'trimebutine', '6221025013019', 'Medicine', 5.3, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'gast-reg 100mg 5', 'جاست ريج 100مجم 5', '{"trimebutine"}', 'Medicine', 5.3, 4.76, 25, '2027-03-01', '6221025013019', 1, 'Capsule', 'local', 'amoun', '358', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 25, '2027-03-01', 4.76, 'INITIAL-IMPORT', now());

  -- Item: gast-reg 24mg/5ml 125ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('gast-reg 24mg/5ml 125ml', 'جاست ريج 24مجم/5مل 125 مل', 'trimebutine', '6221025012005', 'Medicine', 33, 'amoun', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'gast-reg 24mg/5ml 125ml', 'جاست ريج 24مجم/5مل 125 مل', '{"trimebutine"}', 'Medicine', 33, 28.14, 37, '2026-07-01', '6221025012005', 1, 'Suspension', 'local', 'amoun', '2022', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 37, '2026-07-01', 28.14, 'INITIAL-IMPORT', now());

  -- Item: glimaryl 3mg 30
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('glimaryl 3mg 30', 'يماريل 3 مجم 30', 'glimepiride', '6221014002536', 'Medicine', 24, 't3a pharma', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'glimaryl 3mg 30', 'يماريل 3 مجم 30', '{"glimepiride"}', 'Medicine', 24, 15.58, 75, '2027-08-01', '6221014002536', 1, 'Tablet', 'local', 't3a pharma', '36', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 75, '2027-08-01', 15.58, 'INITIAL-IMPORT', now());

  -- Item: g-regulator 24mg/5ml 125ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('g-regulator 24mg/5ml 125ml', 'جي-رييتور 24 مجم / 5 مل 125 مل', 'trimebutine', '6221014000136', 'Medicine', 6.75, 't3a pharma', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'g-regulator 24mg/5ml 125ml', 'جي-رييتور 24 مجم / 5 مل 125 مل', '{"trimebutine"}', 'Medicine', 6.75, 5.27, 129, '2028-10-01', '6221014000136', 1, 'Suspension', 'local', 't3a pharma', '57', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 129, '2028-10-01', 5.27, 'INITIAL-IMPORT', now());

  -- Item: hero pro 7.5ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('hero pro 7.5ml', 'هيرو برو 7.5 مل', 'lactobacillus rhamnosus, bifidobacterium breve', '6221024998416', 'Medicine', 190, 'company', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'hero pro 7.5ml', 'هيرو برو 7.5 مل', '{"lactobacillus rhamnosus","bifidobacterium breve"}', 'Medicine', 190, 163.38, 85, '2026-08-01', '6221024998416', 1, 'Drops', 'local', 'company', '607', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 85, '2026-08-01', 163.38, 'INITIAL-IMPORT', now());

  -- Item: hero vi d3 - 2800 i.u./ml 15 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('hero vi d3 - 2800 i.u./ml 15 ml', 'هيرو في د3 فم 15 مل', 'cholecalciferol(vitamin d3)', '6221024996436', 'Medicine', 32, 'hero mea trading', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'hero vi d3 - 2800 i.u./ml 15 ml', 'هيرو في د3 فم 15 مل', '{"cholecalciferol(vitamin d3)"}', 'Medicine', 32, 23.12, 50, '2028-05-01', '6221024996436', 1, 'Drops', 'local', 'hero mea trading', '362', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 50, '2028-05-01', 23.12, 'INITIAL-IMPORT', now());

  -- Item: hero vitamin d3 + k2 10 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('hero vitamin d3 + k2 10 ml', 'هيرو في d3 + k2 فم 10 مل', 'vitamin d3, vitamin k2', '6221024996450', 'Medicine', 95, 'hero mea trading', 'Drops')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'hero vitamin d3 + k2 10 ml', 'هيرو في d3 + k2 فم 10 مل', '{"vitamin d3","vitamin k2"}', 'Medicine', 95, 63.01, 94, '2027-09-01', '6221024996450', 1, 'Drops', 'local', 'hero mea trading', '420', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 94, '2027-09-01', 63.01, 'INITIAL-IMPORT', now());

  -- Item: hibiotic 312mg/5 ml 60ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('hibiotic 312mg/5 ml 60ml', 'هاي بيوتك 312مجم/5مل 60 مل', 'amoxicillin, clavulanic acid', '6221025008244', 'Medicine', 53, 'amoun', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'hibiotic 312mg/5 ml 60ml', 'هاي بيوتك 312مجم/5مل 60 مل', '{"amoxicillin","clavulanic acid"}', 'Medicine', 53, 37.21, 62, '2027-05-01', '6221025008244', 1, 'Suspension', 'local', 'amoun', '326', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 62, '2027-05-01', 37.21, 'INITIAL-IMPORT', now());

  -- Item: hibiotic n 600mg 80 ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('hibiotic n 600mg 80 ml', 'هاي بيوتك ان 600مجم 80 مل', 'amoxicillin, clavulanic acid', '6221025019578', 'Medicine', 92, 'amoun', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'hibiotic n 600mg 80 ml', 'هاي بيوتك ان 600مجم 80 مل', '{"amoxicillin","clavulanic acid"}', 'Medicine', 92, 62.58, 88, '2028-07-01', '6221025019578', 1, 'Suspension', 'local', 'amoun', '1853', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 88, '2028-07-01', 62.58, 'INITIAL-IMPORT', now());

  -- Item: hypnor 7.5mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('hypnor 7.5mg 10', 'هيبنور 7.5 مجم 10', 'zopiclone', '6221025013705', 'Medicine', 9, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'hypnor 7.5mg 10', 'هيبنور 7.5 مجم 10', '{"zopiclone"}', 'Medicine', 9, 7.82, 40, '2027-08-01', '6221025013705', 1, 'Tablet', 'local', 'amoun', '134', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 40, '2027-08-01', 7.82, 'INITIAL-IMPORT', now());

  -- Item: hypopress 12.5mg 10
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('hypopress 12.5mg 10', 'هيبوبرس 12.5مجم 10', 'captopril', '6221025015686', 'Medicine', 4, 'amoun', 'Tablet')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'hypopress 12.5mg 10', 'هيبوبرس 12.5مجم 10', '{"captopril"}', 'Medicine', 4, 3.49, 25, '2027-08-01', '6221025015686', 1, 'Tablet', 'local', 'amoun', '36', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 25, '2027-08-01', 3.49, 'INITIAL-IMPORT', now());

  -- Item: hyposec 20mg 14
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('hyposec 20mg 14', 'هيبوسيك 20مجم 14', 'omeprazole', '6221025004666', 'Medicine', 42, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'hyposec 20mg 14', 'هيبوسيك 20مجم 14', '{"omeprazole"}', 'Medicine', 42, 37.38, 124, '2027-06-01', '6221025004666', 1, 'Capsule', 'local', 'amoun', '48', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 124, '2027-06-01', 37.38, 'INITIAL-IMPORT', now());

  -- Item: ibiamox 200mg/5ml 80ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ibiamox 200mg/5ml 80ml', 'ابياموكس 200مجم/5مل 80 مل', 'amoxicillin', '6221025017833', 'Medicine', 16, 'amoun', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ibiamox 200mg/5ml 80ml', 'ابياموكس 200مجم/5مل 80 مل', '{"amoxicillin"}', 'Medicine', 16, 9.72, 17, '2028-04-01', '6221025017833', 1, 'Suspension', 'local', 'amoun', '104', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 17, '2028-04-01', 9.72, 'INITIAL-IMPORT', now());

  -- Item: ibiamox 400mg/5ml 80ml
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ibiamox 400mg/5ml 80ml', 'ابياموكس 400مجم 80 مل', 'amoxicillin', '6221025017840', 'Medicine', 70, 'amoun', 'Suspension')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ibiamox 400mg/5ml 80ml', 'ابياموكس 400مجم 80 مل', '{"amoxicillin"}', 'Medicine', 70, 62.29, 152, '2026-07-01', '6221025017840', 1, 'Suspension', 'local', 'amoun', '202', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 152, '2026-07-01', 62.29, 'INITIAL-IMPORT', now());

  -- Item: ibiamox 500mg 12
  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)
  VALUES ('ibiamox 500mg 12', 'ابياموكس 500مجم 12', 'amoxicillin', '6221025005021', 'Medicine', 45, 'amoun', 'Capsule')
  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_gid;

  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)
  VALUES (v_gid, v_bid, v_oid, 'ibiamox 500mg 12', 'ابياموكس 500مجم 12', '{"amoxicillin"}', 'Medicine', 45, 39.41, 70, '2026-11-01', '6221025005021', 1, 'Capsule', 'local', 'amoun', '677', 'active')
  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date
  RETURNING id INTO v_did;

  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)
  VALUES (v_did, v_bid, 70, '2026-11-01', 39.41, 'INITIAL-IMPORT', now());

END $$;