import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSale() {
  const { data, error } = await supabase
    .from('sales')
    .select('id, serial_id, items, item_returned_quantities, status, net_total')
    .eq('serial_id', 'SALE-20260515-0009')
    .single();

  if (error) {
    console.error('Error fetching sale:', error);
    return;
  }

  console.log('Sale Data:', JSON.stringify(data, null, 2));
}

checkSale();
