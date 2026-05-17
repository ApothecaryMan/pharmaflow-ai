-- ══════════════════════════════════════════════════════════════
-- Migration: Automate Catalog Sync to New Branches & Backfill
-- Created: 2026-05-17
-- Description: Automatically populates the 'drugs' table from 'global_drugs'
--              whenever a new branch is created, and backfills any existing
--              empty branches (e.g. newly onboarded organizations/tenants).
-- ══════════════════════════════════════════════════════════════

-- 1. Create the sync function
CREATE OR REPLACE FUNCTION sync_global_catalog_to_new_branch()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO drugs (
        global_drug_id, 
        branch_id, 
        org_id, 
        name, 
        name_arabic, 
        generic_name, 
        category, 
        public_price, 
        cost_price, 
        stock, 
        barcode, 
        dosage_form, 
        manufacturer, 
        status,
        item_rank
    )
    SELECT 
        g.id, 
        NEW.id, 
        NEW.org_id, 
        g.name_en, 
        g.name_ar,
        CASE 
            WHEN g.active_substance IS NOT NULL AND g.active_substance <> '' 
            THEN ARRAY(SELECT trim(s) FROM unnest(string_to_array(g.active_substance, ',')) s)
            ELSE ARRAY[]::TEXT[]
        END,
        COALESCE(g.category, 'غير مصنف'), 
        COALESCE(g.public_price, 0), 
        0, -- Default cost price = 0
        0, -- Default stock = 0
        g.barcode, 
        g.dosage_form, 
        g.manufacturer, 
        'active',
        'normal'
    FROM global_drugs g
    WHERE NOT EXISTS (
        SELECT 1 FROM drugs d 
        WHERE d.branch_id = NEW.id AND d.barcode = g.barcode
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on the branches table
DROP TRIGGER IF EXISTS trg_sync_catalog_on_branch_creation ON branches;
CREATE TRIGGER trg_sync_catalog_on_branch_creation
AFTER INSERT ON branches
FOR EACH ROW
EXECUTE FUNCTION sync_global_catalog_to_new_branch();

-- 3. Create function and trigger to sync NEW global drugs to all existing branches
CREATE OR REPLACE FUNCTION sync_new_global_drug_to_all_branches()
RETURNS TRIGGER AS $$
DECLARE
    v_branch RECORD;
BEGIN
    FOR v_branch IN (SELECT id, org_id FROM branches) LOOP
        INSERT INTO drugs (
            global_drug_id, 
            branch_id, 
            org_id, 
            name, 
            name_arabic, 
            generic_name, 
            category, 
            public_price, 
            cost_price, 
            stock, 
            barcode, 
            dosage_form, 
            manufacturer, 
            status,
            item_rank
        )
        SELECT 
            NEW.id, 
            v_branch.id, 
            v_branch.org_id, 
            NEW.name_en, 
            NEW.name_ar,
            CASE 
                WHEN NEW.active_substance IS NOT NULL AND NEW.active_substance <> '' 
                THEN ARRAY(SELECT trim(s) FROM unnest(string_to_array(NEW.active_substance, ',')) s)
                ELSE ARRAY[]::TEXT[]
            END,
            COALESCE(NEW.category, 'غير مصنف'), 
            COALESCE(NEW.public_price, 0), 
            0, -- Default cost price = 0
            0, -- Default stock = 0
            NEW.barcode, 
            NEW.dosage_form, 
            NEW.manufacturer, 
            'active',
            'normal'
        WHERE NOT EXISTS (
            SELECT 1 FROM drugs d 
            WHERE d.branch_id = v_branch.id AND d.barcode = NEW.barcode
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_new_global_drug ON global_drugs;
CREATE TRIGGER trg_sync_new_global_drug
AFTER INSERT ON global_drugs
FOR EACH ROW
EXECUTE FUNCTION sync_new_global_drug_to_all_branches();

-- 4. Backfill any existing branches that are completely empty (0 local drugs)
DO $$
DECLARE
    v_branch RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_branch IN (
        SELECT id, org_id, name 
        FROM branches b
        WHERE NOT EXISTS (SELECT 1 FROM drugs d WHERE d.branch_id = b.id)
    ) LOOP
        RAISE NOTICE 'Backfilling empty branch: % (%)', v_branch.name, v_branch.id;
        
        INSERT INTO drugs (
            global_drug_id, 
            branch_id, 
            org_id, 
            name, 
            name_arabic, 
            generic_name, 
            category, 
            public_price, 
            cost_price, 
            stock, 
            barcode, 
            dosage_form, 
            manufacturer, 
            status,
            item_rank
        )
        SELECT 
            g.id, 
            v_branch.id, 
            v_branch.org_id, 
            g.name_en, 
            g.name_ar,
            CASE 
                WHEN g.active_substance IS NOT NULL AND g.active_substance <> '' 
                THEN ARRAY(SELECT trim(s) FROM unnest(string_to_array(g.active_substance, ',')) s)
                ELSE ARRAY[]::TEXT[]
            END,
            COALESCE(g.category, 'غير مصنف'), 
            COALESCE(g.public_price, 0), 
            0, -- Default cost price = 0
            0, -- Default stock = 0
            g.barcode, 
            g.dosage_form, 
            g.manufacturer, 
            'active',
            'normal'
        FROM global_drugs g;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Successfully seeded % drugs into branch %', v_count, v_branch.name;
    END LOOP;
END $$;
