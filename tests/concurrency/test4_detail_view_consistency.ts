/**
 * Test 4 — Detail-view consistency
 *
 * Client A "opens" a specific sale (subscribes to changes filtered by sale_id).
 * Client B processes a return against that sale.
 * Asserts Client A receives the change notification within N seconds
 * without any manual refetch call.
 *
 * Usage: npx tsx tests/concurrency/test4_detail_view_consistency.ts
 */

import { config } from './config.js';
import {
  createServiceClient,
  createAnonClient,
  seedTestEnv,
  cleanupTestEnv,
  buildCheckoutPayload,
  sleep,
} from './helpers.js';

async function run() {
  console.log(`\n=== Test 4: Detail-View Consistency ===\n`);
  const admin = createServiceClient();
  const seed = await seedTestEnv(admin, 100);

  // 1. Create a sale first
  const payload = buildCheckoutPayload(seed, 50);
  const { data: saleResult, error: saleErr } = await admin.rpc('process_checkout', { p_payload: payload });
  if (saleErr || !saleResult?.success) {
    throw new Error(`Checkout failed: ${JSON.stringify(saleErr || saleResult)}`);
  }
  const saleId: string = saleResult.sale.id;
  console.log(`  Sale created: ${saleId}`);

  // 2. Client A subscribes to changes on this specific sale (using sales table filter)
  const clientA = createAnonClient();
  const saleChanged = new Promise<void>((resolve, reject) => {
    const channel = clientA
      .channel('test4-detail')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sales', filter: `id=eq.${saleId}` },
        () => {
          channel.unsubscribe();
          resolve();
        },
      )
      .subscribe();

    setTimeout(() => {
      channel.unsubscribe();
      reject(new Error('Timeout — Client A did not receive sale change'));
    }, config.realtimeTimeoutMs);
  });

  await sleep(500);

  // 3. Client B processes a return against the sale
  const returnPayload = {
    branchId: seed.branchId,
    orgId: seed.orgId,
    saleId,
    performerId: seed.performerId,
    performerName: 'Concurrency Test',
    returnType: 'partial',
    reason: 'damaged',
    items: [
      {
        drugId: seed.drugId,
        saleItemId: saleResult.sale.items[0].saleItemId,
        quantity: 1,
        condition: 'sellable',
        isUnit: false,
      },
    ],
  };
  const { error: returnErr } = await admin.rpc('process_return', { p_payload: returnPayload });
  if (returnErr) {
    console.error(`  Return RPC error: ${returnErr.message}`);
  } else {
    console.log(`  Return processed`);
  }

  // 4. Wait for Client A to receive notification
  try {
    await saleChanged;
    console.log(`  Client A received sale change notification`);
    console.log(`\n─── Result: PASS ───`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  ${msg}`);
    console.log(`\n─── Result: FAIL ───`);
  }

  await clientA.removeAllChannels();
  await cleanupTestEnv(admin, seed);
}

run().catch(console.error);
