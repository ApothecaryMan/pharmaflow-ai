
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// --- Configuration ---
const ENV_PATH = path.resolve('.env');
const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const BRANCH_ID = '20864e85-6a6e-4b4b-a44c-b87fe50ecb7b';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Import Data ---
const DATA_PATH = path.resolve('data/sample-inventory.ts');
const dataContent = fs.readFileSync(DATA_PATH, 'utf-8');
const jsonMatch = dataContent.match(/export const CSV_INVENTORY: Drug\[\] = (\[[\s\S]*\]);/);
if (!jsonMatch) {
  console.error('Could not parse CSV_INVENTORY from sample-inventory.ts');
  process.exit(1);
}

let jsonStr = jsonMatch[1]
  .replace(/\/\/.*$/gm, '') 
  .replace(/(\w+):/g, '"$1":') 
  .replace(/'/g, '"') 
  .replace(/,(\s*[\]\}])/g, '$1'); 

const fullInventory = JSON.parse(jsonStr);
const inventory = fullInventory.slice(0, 50); // Start with 50 items

async function seed() {
  console.log(`🚀 Starting seed for ${inventory.length} items...`);

  const batchSize = 10; 
  for (let i = 0; i < inventory.length; i += batchSize) {
    const chunk = inventory.slice(i, i + batchSize);
    console.log(`📦 Processing batch ${i / batchSize + 1} / ${Math.ceil(inventory.length / batchSize)}...`);

    for (const item of chunk) {
      try {
        // A. Global Drug (Optional fallback if table doesn't exist)
        let globalDrugId = null;
        try {
            const { data: gData, error: gError } = await supabase
              .from('global_drugs')
              .upsert({
                name_en: item.name,
                name_ar: item.nameAr || item.nameAr,
                active_substance: Array.isArray(item.genericName) ? item.genericName.join(', ') : item.genericName,
                barcode: item.barcode,
                category: item.category,
                public_price: item.publicPrice,
                manufacturer: item.manufacturer,
                dosage_form: item.dosageForm,
                updated_at: new Date().toISOString()
              }, { onConflict: 'barcode' })
              .select('id')
              .maybeSingle();
            
            if (gData) globalDrugId = gData.id;
        } catch (e) {
            console.warn(`  ⚠️ Global Catalog skipped for ${item.name}`);
        }

        // B. Branch Drug
        const branchDrug: any = {
          branch_id: BRANCH_ID,
          name: item.name,
          name_arabic: item.nameAr || item.nameAr,
          generic_name: item.genericName,
          category: item.category,
          public_price: item.publicPrice,
          cost_price: item.costPrice,
          stock: item.stock,
          expiry_date: item.expiryDate ? (item.expiryDate.length === 7 ? `${item.expiryDate}-01` : item.expiryDate) : null,
          barcode: item.barcode,
          units_per_pack: item.unitsPerPack,
          dosage_form: item.dosageForm,
          origin: item.origin,
          manufacturer: item.manufacturer,
          item_rank: item.itemRank,
          status: 'active'
        };

        if (globalDrugId) branchDrug.global_drug_id = globalDrugId;

        const { data: dData, error: dError } = await supabase
          .from('drugs')
          .upsert(branchDrug, { onConflict: 'branch_id,barcode' }) 
          .select('id')
          .maybeSingle();

        if (dError || !dData) {
            // Try regular insert if upsert fails
            const { data: dData2, error: dError2 } = await supabase
                .from('drugs')
                .insert(branchDrug)
                .select('id')
                .maybeSingle();
            
            if (dData2) {
                await seedBatch(dData2.id, item);
            } else {
                console.error(`  ❌ Failed ${item.name}:`, dError2?.message || dError?.message);
            }
        } else {
            await seedBatch(dData.id, item);
        }

      } catch (e: any) {
        console.error(`  ❌ Unexpected error for ${item.name}:`, e.message);
      }
    }
  }

  console.log('🏁 Seed completed!');
}

async function seedBatch(drugId: string, item: any) {
  const batch = {
    drug_id: drugId,
    branch_id: BRANCH_ID,
    quantity: item.stock,
    expiry_date: item.expiryDate ? (item.expiryDate.length === 7 ? `${item.expiryDate}-01` : item.expiryDate) : null,
    cost_price: item.costPrice,
    batch_number: 'INITIAL-IMPORT',
    date_received: new Date().toISOString(),
    version: 1
  };

  await supabase.from('stock_batches').insert(batch);
}

seed();
