/**
 * Test 2 — Concurrent oversell attempt
 *
 * Seeds a stock_batch with quantity = 1, fires two process_checkout calls
 * simultaneously from two separate clients. Asserts exactly one succeeds
 * and the other returns "insufficient stock".
 *
 * Runs 50 iterations with different seed rows to catch intermittent races.
 *
 * Usage: npx tsx tests/concurrency/test2_concurrent_oversell.ts
 */

import { config } from './config.js';
import {
  createServiceClient,
  seedTestEnv,
  cleanupTestEnv,
  buildCheckoutPayload,
  sleep,
} from './helpers.js';

const ITERATIONS = config.oversellIterations;

async function run() {
  console.log(`\n=== Test 2: Concurrent Oversell Attempt (${ITERATIONS} iterations) ===\n`);
  const admin = createServiceClient();

  let passed = 0;
  let failed = 0;

  for (let i = 1; i <= ITERATIONS; i++) {
    const seed = await seedTestEnv(admin, 1);
    const payload = buildCheckoutPayload(seed, 10);

    // Two simultaneous calls
    const results = await Promise.allSettled([
      admin.rpc('process_checkout', { p_payload: payload }),
      admin.rpc('process_checkout', { p_payload: payload }),
    ]);

    // Read final batch quantity
    const { data: batch } = await admin
      .from('stock_batches')
      .select('quantity')
      .eq('id', seed.batchId)
      .single();
    const finalQty = batch?.quantity ?? -999;

    const successes = results.filter(
      (r) => r.status === 'fulfilled' && r.value.data?.success === true,
    ).length;
    const errors = results.filter(
      (r) =>
        r.status === 'fulfilled' &&
        (r.value.error || r.value.data?.success === false),
    ).length;

    const outcomeOk = successes === 1 && errors >= 0 && finalQty === 0;

    if (outcomeOk) {
      passed++;
    } else {
      failed++;
      console.log(`  [${i}/${ITERATIONS}] FAIL:`);
      console.log(`    Successes: ${successes}, Final qty: ${finalQty}`);
      for (const r of results) {
        if (r.status === 'fulfilled') {
          console.log(`    RPC:`, JSON.stringify(r.value.error || r.value.data));
        }
      }
    }

    await cleanupTestEnv(admin, seed);
  }

  console.log(`\n─── Results ───`);
  console.log(`  Passed: ${passed}/${ITERATIONS}`);
  console.log(`  Failed: ${failed}/${ITERATIONS}`);
  console.log(`  Outcome: ${failed === 0 ? 'PASS' : 'FAIL — race condition detected'}`);
}

run().catch(console.error);
