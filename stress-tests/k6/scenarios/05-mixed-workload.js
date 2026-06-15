/**
 * ═══════════════════════════════════════════════════════════
 * 🔄 SCENARIO 05: MIXED WORKLOAD (Realistic Day)
 * ═══════════════════════════════════════════════════════════
 *
 * Tests: Simulates a realistic pharmacy workday with diverse
 * concurrent operations from different user roles:
 *
 *   👤 Cashier (40%):     POS checkout operations
 *   💊 Pharmacist (25%):  Inventory browsing & search
 *   📊 Manager (15%):     Sales reports & analytics
 *   📦 Stock Clerk (10%): Stock updates & movements
 *   🔐 Auth (10%):        Login/logout operations
 *
 * Run: k6 run stress-tests/k6/scenarios/05-mixed-workload.js
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
  getHeaders,
  SUPABASE_ANON_KEY,
  SUPABASE_AUTH_URL,
  SUPABASE_REST_URL,
  SUPABASE_RPC_URL,
  TEST_DATA,
  TEST_EMAIL,
  TEST_PASSWORD,
} from '../config.js';
import { loginAndGetToken } from '../helpers/auth.js';
import { generateCheckoutPayload, generateDrug, randomInt } from '../helpers/data-generators.js';

export function setup() {
  const token = loginAndGetToken(TEST_EMAIL, TEST_PASSWORD);
  return { token };
}

// --- Custom Metrics ---
const cashierDuration = new Trend('mixed_cashier_duration', true);
const pharmacistDuration = new Trend('mixed_pharmacist_duration', true);
const managerDuration = new Trend('mixed_manager_duration', true);
const stockClerkDuration = new Trend('mixed_stock_clerk_duration', true);
const totalOps = new Counter('mixed_total_operations');
const opsErrors = new Rate('mixed_error_rate');

// --- Test Configuration ---
export const options = {
  scenarios: {
    realistic_day: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 }, // Morning start
        { duration: '1m', target: 15 }, // Full staff
        { duration: '1m30s', target: 20 }, // Peak hours
        { duration: '30s', target: 10 }, // Afternoon lull
        { duration: '30s', target: 0 }, // End of day
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    mixed_cashier_duration: ['p(95)<4000'],
    mixed_pharmacist_duration: ['p(95)<6000'],
    mixed_manager_duration: ['p(95)<3000'],
    mixed_error_rate: ['rate<0.10'],
    http_req_failed: ['rate<0.10'],
  },
};

export default function (data) {
  const token = data ? data.token : null;
  const roll = Math.random() * 100;
  totalOps.add(1);

  if (roll < 40) {
    // --- 👤 CASHIER: Checkout ---
    doCashierWork(token);
  } else if (roll < 65) {
    // --- 💊 PHARMACIST: Browse Inventory ---
    doPharmacistWork(token);
  } else if (roll < 80) {
    // --- 📊 MANAGER: Check Reports ---
    doManagerWork(token);
  } else if (roll < 90) {
    // --- 📦 STOCK CLERK: Stock Operations ---
    doStockClerkWork(token);
  } else {
    // --- 🔐 AUTH: Login/Logout ---
    doAuthWork();
  }

  sleep(Math.random() * 2 + 0.5);
}

// ─────── Role Implementations ───────

function doCashierWork(token) {
  group('👤 Cashier: Checkout', () => {
    const start = Date.now();

    // Quick inventory check first
    http.get(
      `${SUPABASE_REST_URL}/drugs?branch_id=eq.${TEST_DATA.branchId}&select=id,name,public_price,stock&status=eq.active&limit=50`,
      { headers: getHeaders(token), tags: { name: 'GET /drugs (cashier)' } }
    );

    // Process checkout
    const payload = generateCheckoutPayload();
    const res = http.post(
      `${SUPABASE_RPC_URL}/process_checkout`,
      JSON.stringify({ p_payload: payload }),
      { headers: getHeaders(token), tags: { name: 'RPC process_checkout (mixed)' } }
    );

    cashierDuration.add(Date.now() - start);

    let result;
    try {
      result = JSON.parse(res.body);
    } catch {}

    const ok = check(res, {
      '✅ Cashier checkout OK': (r) =>
        r.status === 200 && (result?.success || result?.error?.includes('Insufficient')),
    });

    opsErrors.add(!ok);
  });
}

function doPharmacistWork(token) {
  group('💊 Pharmacist: Browse', () => {
    const start = Date.now();

    // Load full inventory
    const res = http.get(
      `${SUPABASE_REST_URL}/drugs?branch_id=eq.${TEST_DATA.branchId}&select=*&status=eq.active&order=name.asc`,
      { headers: getHeaders(token), tags: { name: 'GET /drugs (pharmacist-full)' } }
    );

    check(res, { '✅ Inventory loaded': (r) => r.status === 200 });

    // Check expiring soon
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    http.get(
      `${SUPABASE_REST_URL}/drugs?branch_id=eq.${TEST_DATA.branchId}&expiry_date=lte.${futureDate}&select=id,name,stock,expiry_date&order=expiry_date.asc&limit=50`,
      { headers: getHeaders(token), tags: { name: 'GET /drugs (expiring)' } }
    );

    pharmacistDuration.add(Date.now() - start);
    opsErrors.add(res.status !== 200);
  });
}

function doManagerWork(token) {
  group('📊 Manager: Reports', () => {
    const start = Date.now();

    // Recent sales
    const salesRes = http.get(
      `${SUPABASE_REST_URL}/sales?branch_id=eq.${TEST_DATA.branchId}&select=id,serial_id,total,status,date,payment_method,items&order=date.desc&limit=50`,
      { headers: getHeaders(token), tags: { name: 'GET /sales (manager)' } }
    );

    // Cash transactions (ordered by time)
    http.get(`${SUPABASE_REST_URL}/cash_transactions?select=*&order=time.desc&limit=50`, {
      headers: getHeaders(token),
      tags: { name: 'GET /cash_transactions' },
    });

    // Audit logs (ordered by timestamp)
    http.get(`${SUPABASE_REST_URL}/audit_logs?select=*&order=timestamp.desc&limit=30`, {
      headers: getHeaders(token),
      tags: { name: 'GET /audit_logs' },
    });

    // Financial summary RPC (uses p_date_from and p_date_to)
    http.post(
      `${SUPABASE_RPC_URL}/compute_financial_summary`,
      JSON.stringify({
        p_branch_id: TEST_DATA.branchId,
        p_date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_date_to: new Date().toISOString().split('T')[0],
      }),
      { headers: getHeaders(token), tags: { name: 'RPC compute_financial_summary' } }
    );

    managerDuration.add(Date.now() - start);
    opsErrors.add(salesRes.status !== 200);
  });
}

function doStockClerkWork(token) {
  group('📦 Stock Clerk: Movements', () => {
    const start = Date.now();

    // Check stock movements (ordered by timestamp)
    http.get(
      `${SUPABASE_REST_URL}/stock_movements?branch_id=eq.${TEST_DATA.branchId}&select=*&order=timestamp.desc&limit=30`,
      { headers: getHeaders(token), tags: { name: 'GET /stock_movements' } }
    );

    // Check batches for random drug
    const drug = TEST_DATA.drugs[randomInt(0, TEST_DATA.drugs.length - 1)];
    const batchRes = http.get(
      `${SUPABASE_REST_URL}/stock_batches?drug_id=eq.${drug.id}&select=*&order=expiry_date.asc`,
      { headers: getHeaders(token), tags: { name: 'GET /stock_batches (clerk)' } }
    );

    // Check shortages RPC
    http.post(
      `${SUPABASE_RPC_URL}/get_shortages`,
      JSON.stringify({ p_branch_id: TEST_DATA.branchId }),
      { headers: getHeaders(token), tags: { name: 'RPC get_shortages' } }
    );

    stockClerkDuration.add(Date.now() - start);
    opsErrors.add(batchRes.status !== 200);
  });
}

function doAuthWork() {
  group('🔐 Auth: Login Cycle', () => {
    const res = http.post(
      `${SUPABASE_AUTH_URL}/token?grant_type=password`,
      JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        tags: { name: 'POST /auth/login (mixed)' },
      }
    );

    const ok = check(res, {
      '✅ Auth login OK': (r) => r.status === 200,
    });

    opsErrors.add(!ok);
  });
}

export function handleSummary(data) {
  const total = data.metrics.mixed_total_operations?.values?.count || 0;
  const errRate = data.metrics.mixed_error_rate?.values?.rate || 0;
  const cashierP95 = data.metrics.mixed_cashier_duration?.values?.['p(95)'] || 0;
  const pharmacistP95 = data.metrics.mixed_pharmacist_duration?.values?.['p(95)'] || 0;
  const managerP95 = data.metrics.mixed_manager_duration?.values?.['p(95)'] || 0;

  console.log('\n══════════════════════════════════════════');
  console.log('🔄 MIXED WORKLOAD RESULTS');
  console.log('══════════════════════════════════════════');
  console.log(`Total Operations:   ${total}`);
  console.log(`Cashier p95:        ${Math.round(cashierP95)}ms`);
  console.log(`Pharmacist p95:     ${Math.round(pharmacistP95)}ms`);
  console.log(`Manager p95:        ${Math.round(managerP95)}ms`);
  console.log(`Error Rate:         ${(errRate * 100).toFixed(2)}%`);
  console.log(`Result:             ${errRate < 0.1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('══════════════════════════════════════════\n');

  return {
    'stress-tests/reports/05-mixed-workload.json': JSON.stringify(data, null, 2),
  };
}
