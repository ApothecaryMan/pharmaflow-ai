/**
 * Test 5 — Reconnection recovery
 *
 * Client A subscribed and receiving events normally.
 * Simulate a dropped WebSocket (force disconnect).
 * While disconnected, Client B performs 3 transactions.
 * Reconnect Client A.
 * Assert Client A's state converges to match the DB after reconnect.
 *
 * This test documents whether Supabase's channel auto-resync works,
 * or if we need an explicit refetch-on-reconnect fallback.
 *
 * Usage: npx tsx tests/concurrency/test5_reconnection_recovery.ts
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
  console.log(`\n=== Test 5: Reconnection Recovery ===\n`);
  const admin = createServiceClient();
  const seed = await seedTestEnv(admin, 100);

  // Create first sale to set baseline
  const p1 = buildCheckoutPayload(seed, 10);
  await admin.rpc('process_checkout', { p_payload: p1 });
  await sleep(200);

  // Client A — subscribe to sales changes
  const clientA = createAnonClient();
  let eventsBefore: number = 0;
  let eventsAfter: number = 0;

  const channel = clientA.channel('test5-reconnect');
  channel
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'sales', filter: `branch_id=eq.${seed.branchId}` },
      () => {
        // Use a simple counter per phase — set by the test logic
        if (reconnectPhase) {
          eventsAfter++;
        } else {
          eventsBefore++;
        }
      },
    )
    .subscribe();

  await sleep(1000);
  console.log(`  Client A subscribed`);

  // Phase 1: events while connected
  let reconnectPhase = false;
  const p2 = buildCheckoutPayload(seed, 20);
  await admin.rpc('process_checkout', { p_payload: p2 });
  await sleep(500);
  console.log(`  Events received while connected: ${eventsBefore}`);

  // Simulate disconnect by calling channel.unsubscribe() then re-subscribe
  channel.unsubscribe();
  await sleep(200);
  console.log(`  Client A disconnected`);

  // Client B (admin) performs 3 transactions while disconnected
  for (let i = 0; i < 3; i++) {
    const p = buildCheckoutPayload(seed, 30 + i);
    await admin.rpc('process_checkout', { p_payload: p });
    await sleep(100);
  }
  console.log(`  3 transactions performed while Client A was disconnected`);

  // Reconnect Client A
  reconnectPhase = true;
  const reconnected = new Promise<void>((resolve, reject) => {
    clientA
      .channel('test5-reconnect')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales', filter: `branch_id=eq.${seed.branchId}` },
        () => {
          eventsAfter++;
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });

    setTimeout(() => reject(new Error('Reconnect timeout')), config.realtimeTimeoutMs);
  });

  await reconnected;
  console.log(`  Client A reconnected`);

  // Wait for any catch-up events to arrive
  await sleep(config.settleTimeMs);

  // Query DB for total sale count
  const { count: dbCount, error: countErr } = await admin
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', seed.branchId);

  // Report behavior (not a hard pass/fail — we're documenting Supabase behavior)
  console.log(`\n─── Results ───`);
  console.log(`  Total sales in DB: ${dbCount}`);
  console.log(`  Events received before disconnect: ${eventsBefore}`);
  console.log(`  Events received after reconnect: ${eventsAfter}`);

  const missedEvents = (dbCount ?? 0) - eventsBefore - eventsAfter;
  const autoResyncWorks = missedEvents <= 0;

  console.log(`  Missed events (not replayed after reconnect): ${Math.max(0, missedEvents)}`);
  console.log(`  Auto-resync behavior: ${autoResyncWorks ? 'Supabase replayed missed events automatically' : 'Manual refetch needed — events were lost'}`);
  console.log(`  Recommendation: ${autoResyncWorks ? 'No change needed' : 'Add useShift() refetch on channel reconnection'}`);

  await clientA.removeAllChannels();
  await cleanupTestEnv(admin, seed);
}

run().catch(console.error);
