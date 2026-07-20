# Concurrency & Realtime Replication Tests

Integration tests that exercise Zinc's transaction system against a real
Supabase instance to verify concurrency-safety and realtime event delivery.

## Prerequisites

- Node 20+
- A Supabase project (dev/staging — **never production**)
- Service-role key (bypasses RLS for setup/cleanup)

## Setup

```bash
cp .env.concurrency.example .env.concurrency
# Edit .env.concurrency with your Supabase credentials
```

### .env.concurrency

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=service-role-key-here
SUPABASE_ANON_KEY=anon-key-here
TEST_ORG_ID=                                  # optional — generated if empty
TEST_BRANCH_ID=                               # optional — generated if empty
TEST_PERFORMER_ID=                            # optional — generated if empty
TEST_DRUG_ID=                                 # optional — generated if empty
OVERSELL_ITERATIONS=50                        # Test 2 iterations
REALTIME_TIMEOUT_MS=10000                     # max wait for events
SETTLE_TIME_MS=3000                           # settle time after burst
```

## Running

```bash
# All tests
npx tsx tests/concurrency/runner.ts

# Individual tests
npx tsx tests/concurrency/test1_realtime_latency.ts
npx tsx tests/concurrency/test2_concurrent_oversell.ts
npx tsx tests/concurrency/test3_multi_device_consistency.ts
npx tsx tests/concurrency/test4_detail_view_consistency.ts
npx tsx tests/concurrency/test5_reconnection_recovery.ts
npx tsx tests/concurrency/test6_duplicate_submission.ts
```

## Test descriptions

| # | Test | What it does |
|---|------|-------------|
| 1 | Realtime latency | Measures time from RPC response to `postgres_changes` event (20 iterations) |
| 2 | Concurrent oversell | Fires 2 simultaneous checkouts for qty=1 batch; asserts only 1 succeeds (50 iterations) |
| 3 | Multi-device consistency | 5 subscribers + 1 actor + 30 transactions; asserts all subscribers agree |
| 4 | Detail-view consistency | Subscribes to specific sale, processes return, asserts event received |
| 5 | Reconnection recovery | Disconnects subscriber, performs 3 transactions, reconnects; checks if missed events replay |
| 6 | Duplicate submission | Same payload twice; asserts deduplication (**expected to fail until idempotency is implemented**) |

## Safety

- **Never run against production** — these tests create and destroy real rows.
- Uses service-role key for setup/cleanup to avoid RLS interference.
- Every test seeds its own data and cleans up after itself.
- Run against a dedicated test project or local Supabase stack.
