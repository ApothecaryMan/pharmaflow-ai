/**
 * ═══════════════════════════════════════════════════════════
 * 🔐 SCENARIO 01: AUTH STORM
 * ═══════════════════════════════════════════════════════════
 * 
 * Tests: Concurrent authentication load on Supabase Auth.
 * Simulates multiple pharmacy employees logging in simultaneously
 * at shift change (e.g., morning shift starts, everyone logs in).
 * 
 * Run: k6 run stress-tests/k6/scenarios/01-auth-storm.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SUPABASE_AUTH_URL, SUPABASE_ANON_KEY, TEST_EMAIL, TEST_PASSWORD, SUPABASE_REST_URL, getHeaders } from '../config.js';
import { loginAndGetToken, verifySession } from '../helpers/auth.js';

// --- Custom Metrics ---
const loginDuration = new Trend('auth_login_duration', true);
const loginFailRate = new Rate('auth_login_fail_rate');
const sessionVerifyDuration = new Trend('auth_session_verify_duration', true);
const totalLogins = new Counter('auth_total_logins');

// --- Test Configuration ---
export const options = {
  scenarios: {
    // Phase 1: Ramp up gradually
    auth_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },   // Gradual ramp
        { duration: '1m',  target: 20 },   // Sustained load
        { duration: '30s', target: 30 },   // Push to peak
        { duration: '30s', target: 0 },    // Cool down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    'auth_login_duration': ['p(95)<2000', 'p(99)<5000'],
    'auth_login_fail_rate': ['rate<0.05'],
    'auth_session_verify_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.05'],
  },
};

export default function () {
  group('🔐 Auth Login Flow', () => {
    // 1. Login 
    const loginStart = Date.now();
    
    const res = http.post(
      `${SUPABASE_AUTH_URL}/token?grant_type=password`,
      JSON.stringify({ 
        email: TEST_EMAIL, 
        password: TEST_PASSWORD 
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        tags: { name: 'POST /auth/login' },
      }
    );

    const loginTime = Date.now() - loginStart;
    loginDuration.add(loginTime);
    totalLogins.add(1);

    const loginOk = check(res, {
      '✅ Login status 200': (r) => r.status === 200,
      '✅ Has access_token': (r) => {
        try { return !!JSON.parse(r.body).access_token; }
        catch { return false; }
      },
      '✅ Login under 2s': () => loginTime < 2000,
    });

    loginFailRate.add(!loginOk);

    if (!loginOk) {
      console.error(`❌ Login failed: ${res.status} | ${res.body?.substring(0, 200)}`);
      sleep(1);
      return;
    }

    const token = JSON.parse(res.body).access_token;

    // 2. Verify session
    const verifyStart = Date.now();
    const verifyRes = http.get(
      `${SUPABASE_AUTH_URL}/user`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        },
        tags: { name: 'GET /auth/user' },
      }
    );
    sessionVerifyDuration.add(Date.now() - verifyStart);

    check(verifyRes, {
      '✅ Session valid': (r) => r.status === 200,
    });

    // 3. Simulate fetching initial data after login (what the app does)
    const dataRes = http.get(
      `${SUPABASE_REST_URL}/employees?select=id,name,role&limit=10`,
      {
        headers: getHeaders(token),
        tags: { name: 'GET /employees (post-login)' },
      }
    );

    check(dataRes, {
      '✅ Employee data loaded': (r) => r.status === 200,
    });
  });

  // Human-like delay between iterations
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  const passed = data.metrics.auth_login_fail_rate?.values?.rate < 0.05;
  const p95 = data.metrics.auth_login_duration?.values?.['p(95)'] || 0;
  
  console.log('\n══════════════════════════════════════════');
  console.log('🔐 AUTH STORM RESULTS');
  console.log('══════════════════════════════════════════');
  console.log(`Total Logins:     ${data.metrics.auth_total_logins?.values?.count || 0}`);
  console.log(`Login p95:        ${Math.round(p95)}ms`);
  console.log(`Fail Rate:        ${((data.metrics.auth_login_fail_rate?.values?.rate || 0) * 100).toFixed(2)}%`);
  console.log(`Result:           ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('══════════════════════════════════════════\n');

  return {
    'stress-tests/reports/01-auth-storm.json': JSON.stringify(data, null, 2),
  };
}
