/**
 * ═══════════════════════════════════════════════════════════
 * 📦 SCENARIO 04: INVENTORY LOAD TEST
 * ═══════════════════════════════════════════════════════════
 * 
 * Tests: Database read/write performance on inventory tables.
 * Focuses on the drugs + stock_batches tables which are the
 * most queried tables in the system.
 * 
 * Scenarios:
 * - Heavy reads (full inventory load with 1400+ drugs)
 * - Filtered queries (category, search, low stock)
 * - Concurrent stock checks
 * - Batch data reads
 * 
 * Run: k6 run stress-tests/k6/scenarios/04-inventory-load.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SUPABASE_REST_URL, getHeaders, TEST_DATA, TEST_EMAIL, TEST_PASSWORD } from '../config.js';
import { randomInt } from '../helpers/data-generators.js';
import { loginAndGetToken } from '../helpers/auth.js';

export function setup() {
  const token = loginAndGetToken(TEST_EMAIL, TEST_PASSWORD);
  return { token };
}


// --- Custom Metrics ---
const fullLoadDuration = new Trend('inv_full_load_duration', true);
const searchDuration = new Trend('inv_search_duration', true);
const filterDuration = new Trend('inv_filter_duration', true);
const batchLoadDuration = new Trend('inv_batch_load_duration', true);
const queryErrors = new Rate('inv_query_error_rate');
const totalQueries = new Counter('inv_total_queries');

// --- Test Configuration ---
export const options = {
  scenarios: {
    // Heavy read load
    inventory_readers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 10 },
        { duration: '1m',  target: 30 },    // 30 concurrent readers
        { duration: '30s', target: 40 },    // Push higher
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: {
    'inv_full_load_duration': ['p(95)<2000'],
    'inv_search_duration': ['p(95)<1000'],
    'inv_filter_duration': ['p(95)<1500'],
    'inv_batch_load_duration': ['p(95)<1500'],
    'inv_query_error_rate': ['rate<0.05'],
    'http_req_failed': ['rate<0.05'],
  },
};

export default function (data) {
  const token = data ? data.token : null;
  const queryType = randomInt(1, 10);

  if (queryType <= 3) {
    // 30% - Full inventory load (heaviest query)
    group('📦 Full Inventory Load', () => {
      const start = Date.now();
      const res = http.get(
        `${SUPABASE_REST_URL}/drugs?branch_id=eq.${TEST_DATA.branchId}&select=*&status=eq.active&order=name.asc`,
        {
          headers: getHeaders(token),
          tags: { name: 'GET /drugs (full-load)' },
        }
      );

      fullLoadDuration.add(Date.now() - start);
      totalQueries.add(1);

      const ok = check(res, {
        '✅ Full load 200': (r) => r.status === 200,
        '✅ Has data': (r) => {
          try { return JSON.parse(r.body).length > 100; }
          catch { return false; }
        },
        '✅ Under 2s': () => (Date.now() - start) < 2000,
      });

      queryErrors.add(!ok);
    });

  } else if (queryType <= 5) {
    // 20% - Search by name (ilike query)
    group('🔍 Name Search', () => {
      const terms = ['pana', 'augm', 'mid', 'kap', 'sacr', 'aspi', 'flagy', 'nexiu', 'gluc'];
      const term = terms[randomInt(0, terms.length - 1)];

      const start = Date.now();
      const res = http.get(
        `${SUPABASE_REST_URL}/drugs?branch_id=eq.${TEST_DATA.branchId}&name=ilike.*${term}*&select=id,name,public_price,stock,category&limit=50`,
        {
          headers: getHeaders(token),
          tags: { name: 'GET /drugs (search)' },
        }
      );

      searchDuration.add(Date.now() - start);
      totalQueries.add(1);

      const ok = check(res, {
        '✅ Search 200': (r) => r.status === 200,
        '✅ Under 1s': () => (Date.now() - start) < 1000,
      });

      queryErrors.add(!ok);
    });

  } else if (queryType <= 7) {
    // 20% - Filtered queries (low stock, category)
    group('🏷️ Filtered Query', () => {
      const categories = ['analgesics', 'antibiotics', 'cardiovascular', 'diabetes', 'gi'];
      const category = categories[randomInt(0, categories.length - 1)];

      const start = Date.now();
      const res = http.get(
        `${SUPABASE_REST_URL}/drugs?branch_id=eq.${TEST_DATA.branchId}&category=eq.${category}&select=id,name,stock,public_price&order=stock.asc&limit=100`,
        {
          headers: getHeaders(token),
          tags: { name: 'GET /drugs (filter-category)' },
        }
      );

      filterDuration.add(Date.now() - start);
      totalQueries.add(1);

      check(res, {
        '✅ Filter 200': (r) => r.status === 200,
      });
    });

  } else if (queryType <= 9) {
    // 20% - Stock batches query
    group('📊 Batch Data Load', () => {
      const drug = TEST_DATA.drugs[randomInt(0, TEST_DATA.drugs.length - 1)];
      
      const start = Date.now();
      const res = http.get(
        `${SUPABASE_REST_URL}/stock_batches?drug_id=eq.${drug.id}&select=id,quantity,expiry_date,batch_number&quantity=gt.0&order=expiry_date.asc`,
        {
          headers: getHeaders(token),
          tags: { name: 'GET /stock_batches' },
        }
      );

      batchLoadDuration.add(Date.now() - start);
      totalQueries.add(1);

      check(res, {
        '✅ Batches loaded': (r) => r.status === 200,
      });
    });

  } else {
    // 10% - Low stock alert query
    group('⚠️ Low Stock Check', () => {
      const start = Date.now();
      const res = http.get(
        `${SUPABASE_REST_URL}/drugs?branch_id=eq.${TEST_DATA.branchId}&stock=lt.10&stock=gt.0&select=id,name,stock,min_stock&order=stock.asc`,
        {
          headers: getHeaders(token),
          tags: { name: 'GET /drugs (low-stock)' },
        }
      );

      filterDuration.add(Date.now() - start);
      totalQueries.add(1);

      check(res, {
        '✅ Low stock check OK': (r) => r.status === 200,
      });
    });
  }

  // Short delay between queries
  sleep(Math.random() * 1 + 0.3);
}

export function handleSummary(data) {
  const total = data.metrics.inv_total_queries?.values?.count || 0;
  const errRate = data.metrics.inv_query_error_rate?.values?.rate || 0;
  const fullp95 = data.metrics.inv_full_load_duration?.values?.['p(95)'] || 0;
  const searchp95 = data.metrics.inv_search_duration?.values?.['p(95)'] || 0;
  const filterp95 = data.metrics.inv_filter_duration?.values?.['p(95)'] || 0;
  const batchp95 = data.metrics.inv_batch_load_duration?.values?.['p(95)'] || 0;

  console.log('\n══════════════════════════════════════════');
  console.log('📦 INVENTORY LOAD TEST RESULTS');
  console.log('══════════════════════════════════════════');
  console.log(`Total Queries:        ${total}`);
  console.log(`Full Load p95:        ${Math.round(fullp95)}ms`);
  console.log(`Search p95:           ${Math.round(searchp95)}ms`);
  console.log(`Filter p95:           ${Math.round(filterp95)}ms`);
  console.log(`Batch Load p95:       ${Math.round(batchp95)}ms`);
  console.log(`Error Rate:           ${(errRate * 100).toFixed(2)}%`);
  console.log(`Throughput:           ~${(total / 130).toFixed(1)} queries/sec`);
  console.log(`Result:               ${errRate < 0.05 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('══════════════════════════════════════════\n');

  return {
    'stress-tests/reports/04-inventory-load.json': JSON.stringify(data, null, 2),
  };
}
