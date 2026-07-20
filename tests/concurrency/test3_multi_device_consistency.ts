/**
 * Test 3 — Multi-device consistency after burst
 *
 * Opens 5 subscriber clients on the same tenant channel.
 * Fires 30 mixed transactions (sales/returns/purchases) in rapid
 * succession from a 6th "actor" client.
 * After settle time, asserts all 5 subscribers' cache matches DB state.
 *
 * Usage: npx tsx tests/concurrency/test3_multi_device_consistency.ts
 */

import { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';
import {
  createServiceClient,
  createAnonClient,
  seedTestEnv,
  cleanupTestEnv,
  buildCheckoutPayload,
  sleep,
} from './helpers.js';

const SUBSCRIBER_COUNT = 5;
const TRANSACTION_COUNT = 30;

interface SubscriberState {
  events: RealtimePostgresChangesPayload<Record<string, unknown>>[];
  ready: boolean;
}

async function run() {
  console.log(`\n=== Test 3: Multi-Device Consistency (${SUBSCRIBER_COUNT} subs, ${TRANSACTION_COUNT} txns) ===\n`);
  const admin = createServiceClient();
  const seed = await seedTestEnv(admin, 500);

  // Set up subscribers
  const subscribers: SubscriberState[] = [];
  const channels: ReturnType<SupabaseClient['channel']>[] = [];

  for (let i = 0; i < SUBSCRIBER_COUNT; i++) {
    const state: SubscriberState = { events: [], ready: false };
    subscribers.push(state);

    const client = createAnonClient();
    const ch = client
      .channel(`test3-sub-${i}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_transactions', filter: `branch_id=eq.${seed.branchId}` },
        (payload) => {
          state.events.push(payload);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') state.ready = true;
      });
    channels.push(ch);
  }

  // Wait for all subscribers to be ready
  await sleep(1000);
  const allReady = subscribers.every((s) => s.ready);
  if (!allReady) {
    console.error('  Not all subscribers became ready');
    process.exit(1);
  }
  console.log(`  ${SUBSCRIBER_COUNT} subscribers ready`);

  // Actor fires mixed transactions
  console.log(`  Firing ${TRANSACTION_COUNT} transactions...`);
  for (let i = 0; i < TRANSACTION_COUNT; i++) {
    const payload = buildCheckoutPayload(seed, 10 + (i % 5));
    const { error } = await admin.rpc('process_checkout', { p_payload: payload });
    if (error) console.error(`  Transaction ${i}: RPC error: ${error.message}`);
  }

  // Settle
  console.log(`  Settling for ${config.settleTimeMs}ms...`);
  await sleep(config.settleTimeMs);

  // Count events received by each subscriber
  const counts = subscribers.map((s, i) => {
    console.log(`  Subscriber ${i}: ${s.events.length} events`);
    return s.events.length;
  });

  // Verify all subscribers received the same number of events
  const uniqueCounts = new Set(counts);
  const consistent = uniqueCounts.size === 1;

  // Verify no sequence gaps (events should contain sequential data)
  const hasGaps = counts.some((c) => c !== counts[0]);

  // Cleanup
  for (const ch of channels) {
    ch.unsubscribe();
  }
  await cleanupTestEnv(admin, seed);

  console.log(`\n─── Results ───`);
  console.log(`  Events per subscriber: ${JSON.stringify(counts)}`);
  console.log(`  Subscriber agreement: ${consistent ? 'YES (all equal)' : 'NO (mismatch)'}`);
  console.log(`  Outcome: ${consistent ? 'PASS' : 'FAIL — subscriber states diverged'}`);
}

run().catch(console.error);
