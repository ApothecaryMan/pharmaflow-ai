
import fs from 'fs';
import path from 'path';

// --- Configuration ---
const BRANCH_ID = '20864e85-6a6e-4b4b-a44c-b87fe50ecb7b';
const DATA_PATH = path.resolve('data/sample-inventory.ts');
const OUTPUT_DIR = path.resolve('artifacts/sql_seed');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// --- Import Data ---
const dataContent = fs.readFileSync(DATA_PATH, 'utf-8');
const jsonMatch = dataContent.match(/export const CSV_INVENTORY: Drug\[\] = (\[[\s\S]*\]);/);
if (!jsonMatch) {
  console.error('Could not parse CSV_INVENTORY');
  process.exit(1);
}

let jsonStr = jsonMatch[1]
  .replace(/\/\/.*$/gm, '') 
  .replace(/(\w+):/g, '"$1":') 
  .replace(/'/g, '"') 
  .replace(/,(\s*[\]\}])/g, '$1'); 

const inventory = JSON.parse(jsonStr);

function escape(str: any) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'string') return `'${str.replace(/'/g, "''")}'`;
  return str;
}

function formatArray(arr: any[]) {
  if (!arr || !Array.isArray(arr)) return 'NULL';
  const escaped = arr.map(v => `"${v.replace(/"/g, '\\"')}"`).join(',');
  return `'\{${escaped}\}'`;
}

function generateChunkSql(chunk: any[], chunkIndex: number) {
  let sql = `-- PharmaFlow Seed Part ${chunkIndex + 1}\n`;
  sql += `-- Branch: ${BRANCH_ID}\n\n`;
  sql += `DO $$\n`;
  sql += `DECLARE\n`;
  sql += `  v_bid UUID := '${BRANCH_ID}';\n`;
  sql += `  v_oid UUID;\n`;
  sql += `  v_gid UUID;\n`;
  sql += `  v_did UUID;\n`;
  sql += `BEGIN\n`;
  sql += `  SELECT org_id INTO v_oid FROM branches WHERE id = v_bid;\n\n`;

  for (const item of chunk) {
    const nameAr = item.nameArabic || item.nameAr;
    const activeSub = Array.isArray(item.genericName) ? item.genericName.join(', ') : item.genericName;
    const expiry = item.expiryDate ? (item.expiryDate.length === 7 ? `${item.expiryDate}-01` : item.expiryDate) : null;
    const dosage = item.dosageForm || item.dosage_form;

    sql += `  -- Item: ${item.name}\n`;
    sql += `  INSERT INTO global_drugs (name_en, name_ar, active_substance, barcode, category, public_price, manufacturer, dosage_form)\n`;
    sql += `  VALUES (${escape(item.name)}, ${escape(nameAr)}, ${escape(activeSub)}, ${escape(item.barcode)}, ${escape(item.category)}, ${item.publicPrice || 0}, ${escape(item.manufacturer)}, ${escape(dosage)})\n`;
    sql += `  ON CONFLICT (barcode) DO UPDATE SET updated_at = now()\n`;
    sql += `  RETURNING id INTO v_gid;\n\n`;

    sql += `  INSERT INTO drugs (global_drug_id, branch_id, org_id, name, name_arabic, generic_name, category, public_price, cost_price, stock, expiry_date, barcode, units_per_pack, dosage_form, origin, manufacturer, item_rank, status)\n`;
    sql += `  VALUES (v_gid, v_bid, v_oid, ${escape(item.name)}, ${escape(nameAr)}, ${formatArray(item.genericName)}, ${escape(item.category)}, ${item.publicPrice || 0}, ${item.costPrice || 0}, ${item.stock || 0}, ${escape(expiry)}, ${escape(item.barcode)}, ${item.unitsPerPack || 1}, ${escape(dosage)}, ${escape(item.origin)}, ${escape(item.manufacturer)}, ${escape(item.itemRank)}, 'active')\n`;
    sql += `  ON CONFLICT (branch_id, barcode) DO UPDATE SET stock = EXCLUDED.stock, expiry_date = EXCLUDED.expiry_date\n`;
    sql += `  RETURNING id INTO v_did;\n\n`;

    sql += `  INSERT INTO stock_batches (drug_id, branch_id, quantity, expiry_date, cost_price, batch_number, date_received)\n`;
    sql += `  VALUES (v_did, v_bid, ${item.stock || 0}, ${escape(expiry)}, ${item.costPrice || 0}, 'INITIAL-IMPORT', now());\n\n`;
  }

  sql += `END $$;`;
  return sql;
}

const chunkSize = 200; // Smaller chunks for SQL Editor stability
for (let i = 0; i < inventory.length; i += chunkSize) {
  const chunk = inventory.slice(i, i + chunkSize);
  const chunkIndex = i / chunkSize;
  const sql = generateChunkSql(chunk, chunkIndex);
  fs.writeFileSync(path.join(OUTPUT_DIR, `seed_part_${chunkIndex + 1}.sql`), sql);
}

console.log(`✅ Generated ${Math.ceil(inventory.length / chunkSize)} SQL files in ${OUTPUT_DIR}`);
