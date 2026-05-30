/**
 * ═══════════════════════════════════════════════════════════
 * ⚡ SCENARIO 06: SPIKE TEST 
 * ═══════════════════════════════════════════════════════════
 * 
 * Tests: System behavior during sudden traffic spikes.
 * Simulates a scenario like:
 *   - A pharmacy chain running a promotion
 *   - End-of-month insurance billing rush
 *   - System recovery after downtime
 * 
 * The test goes from 5 → 80 users in just 10 seconds, then
 * holds at 80 for 30 seconds before ramping back down.
 * 
 * Run: k6 run stress-tests/k6/scenarios/06-spike-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { SUPABASE_REST_URL, SUPABASE_RPC_URL, getHeaders, TEST_DATA, TEST_EMAIL, TEST_PASSWORD } from '../config.js';
import { generateCheckoutPayload, randomInt } from '../helpers/data-generators.js';
import { loginAndGetToken } from '../helpers/auth.js';

export function setup() {
  const token = loginAndGetToken(TEST_EMAIL, TEST_PASSWORD);
  return { token };
}


// --- Custom Metrics ---
const requestDuration = new Trend('spike_request_duration', true);
const errorRate = new Rate('spike_error_rate');
const totalRequests = new Counter('spike_total_requests');
const checkoutDuration = new Trend('spike_checkout_duration', true);

// --- Test Configuration ---
export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 5 },     // Normal operation
        { duration: '10s', target: 80 },     // 🔥 SPIKE! 5 → 80 in 10s
        { duration: '30s', target: 80 },     // Sustained spike  
        { duration: '20s', target: 10 },     // Recovery
        { duration: '10s', target: 0 },      // Cool down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // More lenient thresholds for spike test (system is expected to struggle)
    'spike_request_duration': ['p(95)<5000', 'p(99)<10000'],
    'spike_error_rate': ['rate<0.20'],     // Allow up to 20% during spike
    'spike_checkout_duration': ['p(95)<8000'],
    'http_req_failed': ['rate<0.20'],
  },
};

export default function (data) {
  const token = data ? data.token : null;
  const action = randomInt(1, 10);
  totalRequests.add(1);

  if (action <= 4) {
    // 40% - Checkout (the heaviest operation)
    doCheckout(token);
  } else if (action <= 7) {
    // 30% - Inventory read
    doInventoryRead(token);
  } else if (action <= 9) {
    // 20% - Sales query
    doSalesQuery(token);
  } else {
    // 10% - Batch query
    doBatchQuery(token);
  }

  // Minimal delay during spike to maximize pressure
  sleep(Math.random() * 0.5 + 0.2);
}

function doCheckout(token) {
  group('⚡ Spike: Checkout', () => {
    const payload = generateCheckoutPayload();
    const start = Date.now();

    const res = http.post(
      `${SUPABASE_RPC_URL}/process_checkout`,
      JSON.stringify({ p_payload: payload }),
      {
        headers: getHeaders(token),
        tags: { name: 'RPC process_checkout (spike)' },
        timeout: '15s',
      }
    );

    const elapsed = Date.now() - start;
    checkoutDuration.add(elapsed);
    requestDuration.add(elapsed);

    let result;
    try { result = JSON.parse(res.body); } catch {}

    const ok = check(res, {
      '✅ Spike checkout status': (r) => r.status === 200,
      '✅ Spike checkout result': () => result?.success || result?.error?.includes('Insufficient'),
    });

    errorRate.add(!ok);
  });
}

function doInventoryRead(token) {
  group('⚡ Spike: Inventory', () => {
    const start = Date.now();
    const res = http.get(
      `${SUPABASE_REST_URL}/drugs?branch_id=eq.${TEST_DATA.branchId}&select=id,name,public_price,stock&status=eq.active&limit=100`,
      {
        headers: getHeaders(token),
        tags: { name: 'GET /drugs (spike)' },
        timeout: '10s',
      }
    );

    requestDuration.add(Date.now() - start);
    const ok = check(res, { '✅ Spike inventory OK': (r) => r.status === 200 });
    errorRate.add(!ok);
  });
}

function doSalesQuery(token) {
  group('⚡ Spike: Sales', () => {
    const start = Date.now();
    const res = http.get(
      `${SUPABASE_REST_URL}/sales?branch_id=eq.${TEST_DATA.branchId}&select=id,serial_id,total,date&order=date.desc&limit=20`,
      {
        headers: getHeaders(token),
        tags: { name: 'GET /sales (spike)' },
        timeout: '10s',
      }
    );

    requestDuration.add(Date.now() - start);
    const ok = check(res, { '✅ Spike sales OK': (r) => r.status === 200 });
    errorRate.add(!ok);
  });
}

function doBatchQuery(token) {
  group('⚡ Spike: Batches', () => {
    const drug = TEST_DATA.drugs[randomInt(0, TEST_DATA.drugs.length - 1)];
    const start = Date.now();
    const res = http.get(
      `${SUPABASE_REST_URL}/stock_batches?drug_id=eq.${drug.id}&select=id,quantity,expiry_date&quantity=gt.0`,
      {
        headers: getHeaders(token),
        tags: { name: 'GET /stock_batches (spike)' },
        timeout: '10s',
      }
    );

    requestDuration.add(Date.now() - start);
    const ok = check(res, { '✅ Spike batch OK': (r) => r.status === 200 });
    errorRate.add(!ok);
  });
}

export function handleSummary(data) {
  const total = data.metrics.spike_total_requests?.values?.count || 0;
  const errRate = data.metrics.spike_error_rate?.values?.rate || 0;
  const reqP95 = data.metrics.spike_request_duration?.values?.['p(95)'] || 0;
  const checkP95 = data.metrics.spike_checkout_duration?.values?.['p(95)'] || 0;
  const reqP50 = data.metrics.spike_request_duration?.values?.['p(50)'] || 0;

  console.log('\n══════════════════════════════════════════');
  console.log('⚡ SPIKE TEST RESULTS');
  console.log('══════════════════════════════════════════');
  console.log(`Total Requests:     ${total}`);
  console.log(`Request p50:        ${Math.round(reqP50)}ms`);
  console.log(`Request p95:        ${Math.round(reqP95)}ms`);
  console.log(`Checkout p95:       ${Math.round(checkP95)}ms`);
  console.log(`Error Rate:         ${(errRate * 100).toFixed(2)}%`);
  console.log(`Peak VUs:           80`);
  console.log(`Spike Resilience:   ${errRate < 0.20 ? '✅ SURVIVED' : '❌ COLLAPSED'}`);
  console.log('══════════════════════════════════════════\n');

  return {
    'stress-tests/reports/06-spike-test.json': JSON.stringify(data, null, 2),
  };
}
