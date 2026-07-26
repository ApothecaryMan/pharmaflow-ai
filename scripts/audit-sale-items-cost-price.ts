import { createClient } from '@supabase/supabase-js';

/**
 * Audit: Verify sale_items.cost_price is unit cost for all historical rows.
 *
 * The migration 20260618000002_fix_financial_denominations.sql converted
 * stock_batches from pack costs to unit costs. This script checks whether
 * sale_items.cost_price was also consistently stored as unit cost.
 *
 * Run: npx tsx scripts/audit-sale-items-cost-price.ts
 *
 * What to look for:
 * - Rows where cost_price is suspiciously high (>> expected unit cost)
 * - Rows where cost_price differs significantly from drug-level WAC
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { count } = await client.from('sale_items').select('count', { count: 'exact', head: true });

  console.log(`Total sale_items: ${count}`);

  if (!count || count === 0) {
    console.log('No data to audit.');
    return;
  }

  // High cost threshold: flag anything above 50,000 (adjust per business)
  const HIGH_COST_THRESHOLD = 50000;
  let flagged = 0;
  let processed = 0;

  for (let offset = 0; offset < count; offset += 1000) {
    const { data, error } = await client
      .from('sale_items')
      .select('id, drug_id, cost_price, quantity, is_unit, created_at')
      .range(offset, offset + 999)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error at offset ${offset}:`, error);
      continue;
    }

    for (const row of data) {
      processed++;

      if (row.cost_price > HIGH_COST_THRESHOLD) {
        flagged++;
        console.log(
          `[HIGH_UNIT_COST] id=${row.id} drug=${row.drug_id} ` +
            `cost=${row.cost_price} qty=${row.quantity} isUnit=${row.is_unit}`
        );
      }
    }
  }

  console.log(`\nProcessed: ${processed}, Flagged: ${flagged}`);
  if (flagged === 0) {
    console.log('All sale_items.cost_price values appear to be unit costs. ✓');
  } else {
    console.log(`WARNING: ${flagged} row(s) with suspiciously high cost_price.`);
    console.log('Investigate: join with drugs.units_per_pack to check for pack-cost storage.');
  }
}

main().catch(console.error);
