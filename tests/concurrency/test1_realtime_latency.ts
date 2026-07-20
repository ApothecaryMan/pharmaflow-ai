/**
 * Test 1 — Realtime propagation latency
 *
 * Measures the time between a process_checkout RPC completing and
 * the postgres_changes event arriving on a subscribed client.
 *
 * Usage: npx tsx tests/concurrency/test1_realtime_latency.ts
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

const REPEAT = 20;

async function run() {
  console.log(`\n=== Test 1: Realtime Propagation Latency (${REPEAT} iterations) ===\n`);
  const admin = createServiceClient();
  const seed = await seedTestEnv(admin, 100);

  const latencies: number[] = [];

  for (let i = 1; i <= REPEAT; i++) {
    const listener = createAnonClient();

    const eventReceived = new Promise<number>((resolve, reject) => {
      const channel = listener
        .channel('test1-latency')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'cash_transactions', filter: `branch_id=eq.${seed.branchId}` },
          (payload) => {
            const arrival = performance.now();
            channel.unsubscribe();
            resolve(arrival);
          },
        )
        .subscribe();

      setTimeout(() => {
        channel.unsubscribe();
        reject(new Error('Timeout waiting for realtime event'));
      }, config.realtimeTimeoutMs);
    });

    // Wait for subscription to be established
    await sleep(200);

    // Perform a checkout
    const beforeRpc = performance.now();
    const payload = buildCheckoutPayload(seed, 10 + i);
    const { error } = await admin.rpc('process_checkout', { p_payload: payload });
    if (error) {
      console.error(`  Iteration ${i}: RPC failed: ${error.message}`);
      await listener.removeChannel(listener.channel('test1-latency'));
      continue;
    }
    const afterRpc = performance.now();

    const arrival = await eventReceived;
    const latency = arrival - afterRpc;
    latencies.push(latency);

    console.log(`  [${i}/${REPEAT}] RPC→Event: ${latency.toFixed(1)}ms`);

    await listener.removeAllChannels();
  }

  await cleanupTestEnv(admin, seed);

  // Report
  const sorted = [...latencies].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  console.log(`\n─── Results ───`);
  console.log(`  Iterations: ${sorted.length}`);
  console.log(`  Min latency:  ${min.toFixed(1)}ms`);
  console.log(`  Max latency:  ${max.toFixed(1)}ms`);
  console.log(`  Avg latency:  ${avg.toFixed(1)}ms`);
  console.log(`  P95 latency:  ${p95.toFixed(1)}ms`);
  console.log(`\n  Result: ${sorted.length === REPEAT ? 'PASS' : 'INCONCLUSIVE'} (${sorted.length}/${REPEAT} completed)`);
}

run().catch(console.error);
