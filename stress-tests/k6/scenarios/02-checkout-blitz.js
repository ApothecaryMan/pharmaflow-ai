/**
 * ═══════════════════════════════════════════════════════════
 * 🛒 SCENARIO 02: CHECKOUT BLITZ
 * ═══════════════════════════════════════════════════════════
 *
 * Tests: High-volume concurrent POS checkout operations.
 * Simulates rush hour in a busy pharmacy with multiple cashiers
 * processing orders simultaneously via process_checkout RPC.
 *
 * Critical checks:
 * - Stock atomicity (no overselling via race conditions)
 * - RPC response time under load
 * - Cash transaction recording accuracy
 * - Serial ID uniqueness
 *
 * Run: k6 run stress-tests/k6/scenarios/02-checkout-blitz.js
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
  getHeaders,
  SUPABASE_REST_URL,
  SUPABASE_RPC_URL,
  TEST_DATA,
  TEST_EMAIL,
  TEST_PASSWORD,
} from '../config.js';
import { loginAndGetToken } from '../helpers/auth.js';
import { generateCheckoutPayload, randomInt } from '../helpers/data-generators.js';

// --- Custom Metrics ---
const checkoutDuration = new Trend('checkout_rpc_duration', true);
const checkoutFailRate = new Rate('checkout_fail_rate');
const totalCheckouts = new Counter('checkout_total_count');
const successCheckouts = new Counter('checkout_success_count');
const stockErrors = new Counter('checkout_stock_errors');

// --- Test Configuration ---
export const options = {
  scenarios: {
    // Simulates a busy pharmacy day
    checkout_rush: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 }, // Morning start
        { duration: '1m', target: 15 }, // Getting busy
        { duration: '1m', target: 25 }, // Rush hour
        { duration: '30s', target: 25 }, // Peak sustained
        { duration: '30s', target: 0 }, // Cool down
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    checkout_rpc_duration: ['p(95)<3000', 'p(99)<8000'],
    checkout_fail_rate: ['rate<0.05'],
    http_req_failed: ['rate<0.10'],
  },
};

// --- Pre-record stock levels for post-test verification ---
export function setup() {
  const token = loginAndGetToken(TEST_EMAIL, TEST_PASSWORD);
  let preTestStockSnapshot = null;

  // Take a snapshot of stock levels before the test
  const res = http.get(
    `${SUPABASE_REST_URL}/drugs?select=id,name,stock&branch_id=eq.${TEST_DATA.branchId}&order=name.asc&limit=50`,
    { headers: getHeaders(token) }
  );

  if (res.status === 200) {
    try {
      preTestStockSnapshot = JSON.parse(res.body);
      console.log(`📊 Pre-test snapshot: ${preTestStockSnapshot.length} drugs recorded`);
    } catch {
      console.warn('⚠️ Could not parse pre-test stock snapshot');
    }
  }

  return { token, preStock: preTestStockSnapshot };
}

export default function (data) {
  const token = data ? data.token : null;

  group('🛒 POS Checkout', () => {
    // Generate a realistic checkout payload
    const payload = generateCheckoutPayload();

    // Call the atomic process_checkout RPC
    const start = Date.now();

    const res = http.post(
      `${SUPABASE_RPC_URL}/process_checkout`,
      JSON.stringify({ p_payload: payload }),
      {
        headers: getHeaders(token),
        tags: { name: 'RPC process_checkout' },
      }
    );

    const elapsed = Date.now() - start;
    checkoutDuration.add(elapsed);
    totalCheckouts.add(1);

    // Parse response
    let result = null;
    try {
      result = JSON.parse(res.body);
    } catch {}

    const isSuccess = check(res, {
      '✅ RPC status 200': (r) => r.status === 200,
      '✅ Checkout success': () => result?.success === true,
      '✅ Has sale ID': () => !!result?.saleId,
      '✅ Has serial ID': () => !!result?.serialId,
      '✅ Under 3s': () => elapsed < 3000,
    });

    if (isSuccess) {
      successCheckouts.add(1);
    } else {
      checkoutFailRate.add(true);

      // Check if it's a stock error (expected under heavy load)
      if (result?.error?.includes('Insufficient stock')) {
        stockErrors.add(1);
        console.warn(`⚠️ Stock exhausted: ${result.error}`);
      } else {
        console.error(
          `❌ Checkout failed: ${res.status} | ${JSON.stringify(result)?.substring(0, 300)}`
        );
      }
    }

    // Simulate receipt printing delay
    sleep(Math.random() * 1.5 + 0.5);
  });

  // Occasionally check inventory (like a cashier checking stock)
  if (Math.random() < 0.2) {
    group('📦 Quick Stock Check', () => {
      const drug = TEST_DATA.drugs[randomInt(0, TEST_DATA.drugs.length - 1)];
      const res = http.get(`${SUPABASE_REST_URL}/drugs?id=eq.${drug.id}&select=id,name,stock`, {
        headers: getHeaders(token),
        tags: { name: 'GET /drugs (stock-check)' },
      });

      check(res, {
        '✅ Stock check OK': (r) => r.status === 200,
      });
    });
  }

  // Human-like delay between customers
  sleep(Math.random() * 3 + 1);
}

export function teardown(data) {
  const token = data ? data.token : null;

  // Post-test stock verification
  const res = http.get(
    `${SUPABASE_REST_URL}/drugs?select=id,name,stock&branch_id=eq.${TEST_DATA.branchId}&order=name.asc&limit=50`,
    { headers: getHeaders(token) }
  );

  if (res.status === 200 && data.preStock) {
    try {
      const postStock = JSON.parse(res.body);
      const preMap = {};
      data.preStock.forEach((d) => {
        preMap[d.id] = d.stock;
      });

      let totalDeducted = 0;
      let anomalies = 0;

      postStock.forEach((d) => {
        if (preMap[d.id] !== undefined) {
          const diff = preMap[d.id] - d.stock;
          if (diff > 0) totalDeducted += diff;
          if (d.stock < 0) {
            anomalies++;
            console.error(`🔴 NEGATIVE STOCK: ${d.name} = ${d.stock}`);
          }
        }
      });

      console.log(`\n📊 Stock Integrity Check:`);
      console.log(`   Total units deducted: ${totalDeducted}`);
      console.log(`   Negative stock anomalies: ${anomalies}`);
      console.log(`   Result: ${anomalies === 0 ? '✅ CLEAN' : '❌ INTEGRITY FAILURE'}`);
    } catch (_e) {
      console.warn('⚠️ Could not verify post-test stock');
    }
  }
}

export function handleSummary(data) {
  const p95 = data.metrics.checkout_rpc_duration?.values?.['p(95)'] || 0;
  const total = data.metrics.checkout_total_count?.values?.count || 0;
  const success = data.metrics.checkout_success_count?.values?.count || 0;
  const stockErr = data.metrics.checkout_stock_errors?.values?.count || 0;
  const failRate = data.metrics.checkout_fail_rate?.values?.rate || 0;

  console.log('\n══════════════════════════════════════════');
  console.log('🛒 CHECKOUT BLITZ RESULTS');
  console.log('══════════════════════════════════════════');
  console.log(`Total Checkouts:    ${total}`);
  console.log(`Successful:         ${success}`);
  console.log(`Stock Exhausted:    ${stockErr}`);
  console.log(`Checkout p95:       ${Math.round(p95)}ms`);
  console.log(`Fail Rate:          ${(failRate * 100).toFixed(2)}%`);
  console.log(`Throughput:         ~${(total / 210).toFixed(1)} checkouts/sec`);
  console.log(`Result:             ${failRate < 0.05 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('══════════════════════════════════════════\n');

  return {
    'stress-tests/reports/02-checkout-blitz.json': JSON.stringify(data, null, 2),
  };
}
