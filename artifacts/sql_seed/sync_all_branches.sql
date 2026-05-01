
-- PharmaFlow: Global Catalog to All Branches Sync
-- This script ensures that all branches in the organization have all items from the global catalog
-- items will be created with stock = 0 if they don't already exist.

DO $$
DECLARE
    v_ref_branch_id UUID := '20864e85-6a6e-4b4b-a44c-b87fe50ecb7b';
    v_org_id UUID;
    v_branch RECORD;
    v_count INTEGER := 0;
BEGIN
    -- 1. Identify the Organization
    SELECT org_id INTO v_org_id FROM branches WHERE id = v_ref_branch_id LIMIT 1;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Could not find Organization for branch %', v_ref_branch_id;
    END IF;

    RAISE NOTICE 'Syncing catalog for Organization: %', v_org_id;

    -- 2. Iterate through all branches in the Org
    FOR v_branch IN (SELECT id, name FROM branches WHERE org_id = v_org_id) LOOP
        RAISE NOTICE 'Processing branch: %', v_branch.name;

        -- 3. Insert missing drugs from global_drugs
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
            v_org_id, 
            g.name_en, 
            g.name_ar,
            CASE 
                WHEN g.active_substance IS NOT NULL AND g.active_substance <> '' 
                -- Split by comma and clean whitespace
                THEN ARRAY(SELECT trim(s) FROM unnest(string_to_array(g.active_substance, ',')) s)
                ELSE ARRAY[]::TEXT[]
            END,
            g.category, 
            COALESCE(g.public_price, 0), 
            0, -- Cost Price 0
            0, -- Stock 0
            g.barcode, 
            g.dosage_form, 
            g.manufacturer, 
            'active',
            'normal'
        FROM global_drugs g
        WHERE NOT EXISTS (
            SELECT 1 FROM drugs d 
            WHERE d.branch_id = v_branch.id AND d.barcode = g.barcode
        );

        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Added % new items to branch %', v_count, v_branch.name;
    END LOOP;

    RAISE NOTICE 'Global Sync Complete.';
END $$;
