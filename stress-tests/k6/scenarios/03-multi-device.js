/**
 * ═══════════════════════════════════════════════════════════
 * 📱 SCENARIO 03: MULTI-DEVICE SIMULATION
 * ═══════════════════════════════════════════════════════════
 * 
 * Tests: Multiple POS terminals operating simultaneously.
 * Each virtual user (VU) simulates a complete device workflow:
 *   1. Login
 *   2. Load inventory
 *   3. Search for drug
 *   4. Checkout
 *   5. Check sales history
 *   6. Repeat
 * 
 * This tests the real-world scenario of a pharmacy with
 * multiple cashier stations, all sharing the same branch data.
 * 
 * Run: k6 run stress-tests/k6/scenarios/03-multi-device.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { 
  SUPABASE_REST_URL, SUPABASE_RPC_URL,
  getHeaders, TEST_DATA, TEST_EMAIL, TEST_PASSWORD 
} from '../config.js';
import { generateCheckoutPayload, randomInt, generateCustomerName } from '../helpers/data-generators.js';
import { loginAndGetToken } from '../helpers/auth.js';

export function setup() {
  const token = loginAndGetToken(TEST_EMAIL, TEST_PASSWORD);
  return { token };
}


// --- Custom Metrics ---
const deviceCycleDuration = new Trend('device_cycle_duration', true);
const inventoryLoadDuration = new Trend('device_inventory_load_duration', true);
const searchDuration = new Trend('device_search_duration', true);
const checkoutDuration = new Trend('device_checkout_duration', true);
const deviceErrors = new Rate('device_error_rate');
const completedCycles = new Counter('device_completed_cycles');

// --- Test Configuration ---
export const options = {
  scenarios: {
    // Fixed number of devices, running continuously
    multi_device: {
      executor: 'constant-vus',
      vus: 10,            // 10 POS terminals
      duration: '3m',     // Running for 3 minutes
    },
  },
  thresholds: {
    'device_cycle_duration': ['p(95)<15000'],     // Full cycle < 15s
    'device_inventory_load_duration': ['p(95)<2000'],
    'device_search_duration': ['p(95)<1000'],
    'device_checkout_duration': ['p(95)<3000'],
    'device_error_rate': ['rate<0.10'],
    'http_req_failed': ['rate<0.10'],
  },
};

export default function (data) {
  const token = data ? data.token : null;
  const deviceId = `POS-${__VU}`;
  const cycleStart = Date.now();
  let hasError = false;

  // --- Step 1: Load Inventory (what happens when POS screen opens) ---
  group(`📱 [${deviceId}] Load Inventory`, () => {
    const start = Date.now();
    const res = http.get(
      `${SUPABASE_REST_URL}/drugs?branch_id=eq.${TEST_DATA.branchId}&select=id,name,public_price,stock,category,barcode,dosage_form&status=eq.active&order=name.asc&limit=200`,
      {
        headers: getHeaders(token),
        tags: { name: 'GET /drugs (inventory-load)' },
      }
    );

    inventoryLoadDuration.add(Date.now() - start);
    
    const ok = check(res, {
      '✅ Inventory loaded': (r) => r.status === 200,
      '✅ Has drug data': (r) => {
        try { return JSON.parse(r.body).length > 0; }
        catch { return false; }
      },
    });
    if (!ok) hasError = true;
  });

  sleep(0.5); // Cashier looks at screen

  // --- Step 2: Search for a drug (barcode scan / name search) ---
  group(`📱 [${deviceId}] Search Drug`, () => {
    const searchTerms = ['pana', 'augm', 'conc', 'lipi', 'nexiu', 'midath', 'kapro', 'stimu'];
    const term = searchTerms[randomInt(0, searchTerms.length - 1)];
    
    const start = Date.now();
    const res = http.get(
      `${SUPABASE_REST_URL}/drugs?branch_id=eq.${TEST_DATA.branchId}&name=ilike.*${term}*&select=id,name,public_price,stock&limit=20`,
      {
        headers: getHeaders(token),
        tags: { name: 'GET /drugs (search)' },
      }
    );

    searchDuration.add(Date.now() - start);
    
    check(res, {
      '✅ Search returned results': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 2 + 1); // Cashier selects items

  // --- Step 3: Process Checkout ---
  group(`📱 [${deviceId}] Checkout`, () => {
    const payload = generateCheckoutPayload({
      performerName: `Device ${deviceId}`,
    });

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

    let result = null;
    try { result = JSON.parse(res.body); } catch {}

    const ok = check(res, {
      '✅ Checkout RPC 200': (r) => r.status === 200,
      '✅ Checkout success': () => result?.success === true,
    });

    if (!ok) {
      hasError = true;
      if (result?.error?.includes('Insufficient stock')) {
        // Expected - don't count as device error
        hasError = false;
      }
    }
  });

  sleep(Math.random() * 1 + 0.5); // Print receipt

  // --- Step 4: Check recent sales (cashier verifies last sale) ---
  group(`📱 [${deviceId}] Check Sales`, () => {
    const res = http.get(
      `${SUPABASE_REST_URL}/sales?branch_id=eq.${TEST_DATA.branchId}&select=id,serial_id,total,status,date&order=date.desc&limit=10`,
      {
        headers: getHeaders(token),
        tags: { name: 'GET /sales (recent)' },
      }
    );

    check(res, {
      '✅ Sales loaded': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 1 + 0.5);

  // --- Step 5: Occasionally check shift balance ---
  if (Math.random() < 0.3) {
    group(`📱 [${deviceId}] Check Shift`, () => {
      const shiftId = TEST_DATA.shiftIds[randomInt(0, TEST_DATA.shiftIds.length - 1)];
      const res = http.get(
        `${SUPABASE_REST_URL}/shifts?id=eq.${shiftId}&select=*`,
        {
          headers: getHeaders(token),
          tags: { name: 'GET /shifts (balance)' },
        }
      );

      check(res, {
        '✅ Shift data OK': (r) => r.status === 200,
      });
    });
  }

  // Record cycle
  deviceErrors.add(hasError);
  completedCycles.add(1);
  deviceCycleDuration.add(Date.now() - cycleStart);

  // Brief pause before next customer
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  const cycles = data.metrics.device_completed_cycles?.values?.count || 0;
  const errorRate = data.metrics.device_error_rate?.values?.rate || 0;
  const cyclep95 = data.metrics.device_cycle_duration?.values?.['p(95)'] || 0;
  const checkoutp95 = data.metrics.device_checkout_duration?.values?.['p(95)'] || 0;
  const invp95 = data.metrics.device_inventory_load_duration?.values?.['p(95)'] || 0;

  console.log('\n══════════════════════════════════════════');
  console.log('📱 MULTI-DEVICE SIMULATION RESULTS');
  console.log('══════════════════════════════════════════');
  console.log(`Devices:            10 concurrent POS terminals`);
  console.log(`Completed Cycles:   ${cycles}`);
  console.log(`Cycle p95:          ${Math.round(cyclep95)}ms`);
  console.log(`Checkout p95:       ${Math.round(checkoutp95)}ms`);
  console.log(`Inventory Load p95: ${Math.round(invp95)}ms`);
  console.log(`Error Rate:         ${(errorRate * 100).toFixed(2)}%`);
  console.log(`Result:             ${errorRate < 0.10 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('══════════════════════════════════════════\n');

  return {
    'stress-tests/reports/03-multi-device.json': JSON.stringify(data, null, 2),
  };
}
