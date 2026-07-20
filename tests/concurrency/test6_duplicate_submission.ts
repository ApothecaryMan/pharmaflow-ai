/**
 * Test 6 — Duplicate submission / idempotency
 *
 * Fires the exact same process_checkout payload twice in quick succession
 * (simulating a double-click or network retry).
 * Asserts only one sale record is created, or the second attempt is
 * rejected/deduplicated cleanly.
 *
 * Current expectation: this will FAIL because no idempotency mechanism exists.
 * Once fixed, expected behavior is: second call returns
 *   { success: false, error: 'Duplicate request' }
 * and no second row is created.
 *
 * Usage: npx tsx tests/concurrency/test6_duplicate_submission.ts
 */

import { config } from './config.js';
import {
  createServiceClient,
  seedTestEnv,
  cleanupTestEnv,
  buildCheckoutPayload,
} from './helpers.js';

async function run() {
  console.log(`\n=== Test 6: Duplicate Submission / Idempotency ===\n`);
  const admin = createServiceClient();
  const seed = await seedTestEnv(admin, 100);

  const payload = buildCheckoutPayload(seed, 25);

  // Fire identical payload twice in quick succession
  const [r1, r2] = await Promise.all([
    admin.rpc('process_checkout', { p_payload: payload }),
    admin.rpc('process_checkout', { p_payload: payload }),
  ]);

  // Count sales created
  const { data: sales, count } = await admin
    .from('sales')
    .select('id, serial_id', { count: 'exact' })
    .eq('branch_id', seed.branchId);

  const rowsCreated = count ?? 0;
  const firstOk = r1.data?.success === true;
  const secondOk = r2.data?.success === true;

  console.log(`  First call success:  ${firstOk}`);
  console.log(`  Second call success: ${secondOk}`);
  console.log(`  Sales rows created:   ${rowsCreated}`);

  let passed = false;

  if (rowsCreated === 1) {
    console.log(`  ✅ Idempotency works — only one sale created`);
    passed = true;
  } else if (rowsCreated === 2 && firstOk && secondOk) {
    console.log(`  ❌ No idempotency — duplicate created (expected until fix is applied)`);
    passed = false;
  } else if (rowsCreated === 2 && firstOk && !secondOk) {
    console.log(`  ✅ Second call properly rejected`);
    passed = true;
  } else {
    console.log(`  ❓ Unexpected state`);
    passed = false;
  }

  console.log(`\n─── Result: ${passed ? 'PASS' : 'FAIL'} ───`);
  if (!passed) {
    console.log(`  Expected: 1 sale row. Got: ${rowsCreated}.`);
    console.log(`  This confirms the idempotency gap (P2 from audit).`);
  }

  await cleanupTestEnv(admin, seed);
}

run().catch(console.error);
