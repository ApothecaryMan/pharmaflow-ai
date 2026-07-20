/**
 * Concurrency & Realtime Test Runner
 *
 * Orchestrates all 6 tests sequentially.
 *
 * Usage:
 *   Set env vars (see config.ts), then:
 *   npx tsx tests/concurrency/runner.ts
 *
 * Or run individual tests:
 *   npx tsx tests/concurrency/test1_realtime_latency.ts
 */

const tests = [
  './test1_realtime_latency.js',
  './test2_concurrent_oversell.js',
  './test3_multi_device_consistency.js',
  './test4_detail_view_consistency.js',
  './test5_reconnection_recovery.js',
  './test6_duplicate_submission.js',
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Concurrency & Realtime Replication Test Suite      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL || '(not set — loading from .env.concurrency)'}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n────────────────────────────────────────────`);
      console.log(`Running ${test}...`);
      console.log(`────────────────────────────────────────────`);
      await import(test);
      passed++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ❌ ${msg}`);
      failed++;
    }
  }

  console.log(`\n════════════════════════════════════════════════`);
  console.log(`  Total: ${passed} passed, ${failed} failed`);
  console.log(`════════════════════════════════════════════════\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
