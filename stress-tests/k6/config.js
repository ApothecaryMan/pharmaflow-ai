/**
 * Shared Configuration for ZINC Stress Tests
 * All Supabase connection details, thresholds, and constants.
 *
 * Usage:
 *   k6 run -e SUPABASE_URL=https://... -e SUPABASE_ANON_KEY=... scenario.js
 *   OR use the defaults below (for dev convenience only).
 */

// --- Supabase Connection ---
export const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://vhewcoumaxicnfsjwcai.supabase.co';
export const SUPABASE_ANON_KEY =
  __ENV.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoZXdjb3VtYXhpY25mc2p3Y2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTE5MjAsImV4cCI6MjA5MTc2NzkyMH0.psGOWNA4Ewvnb-kY0lu3Y46N0evbW9RzlB812icbF_w';
export const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1`;
export const SUPABASE_AUTH_URL = `${SUPABASE_URL}/auth/v1`;
export const SUPABASE_RPC_URL = `${SUPABASE_REST_URL}/rpc`;

// --- Test Credentials ---
// These should be test accounts, NOT production accounts
export const TEST_EMAIL = __ENV.TEST_EMAIL || 'test-stress@zinc.dev';
export const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'StressTest@2026';

// --- Real Data IDs (from actual Supabase) ---
export const TEST_DATA = {
  // Branch "2" - has the most data
  branchId: '20864e85-6a6e-4b4b-a44c-b87fe50ecb7b',
  orgId: 'a311a42d-6f03-4bf8-9221-d83091b7b042',

  // Employee in that branch
  employeeId: 'c72bd704-3a25-44d8-aebe-45569bf448c0',
  employeeName: 'Stress Test User',

  // Drugs with high stock (safe to deduct during tests)
  drugs: [
    {
      id: '92e91c1c-a811-409f-a837-5a210961ddc6',
      name: 'midathetic 5mg/ml 10',
      price: 140.0,
      stock: 670,
    },
    {
      id: 'f33c64d6-b368-4467-9cae-c561d37f4d24',
      name: 'dasiword 50 mg 60',
      price: 9600.0,
      stock: 396,
    },
    {
      id: '18d3c815-6a46-4948-9f99-84bedac72224',
      name: 'kapron 500mg/5ml 6',
      price: 90.0,
      stock: 198,
    },
    {
      id: '2e9c547b-443b-42c0-a43d-ce77ebf23024',
      name: 'stimulan 1gm/5ml 6',
      price: 60.0,
      stock: 228,
    },
    {
      id: '1c702b39-02e6-426c-aec6-654d56cb567f',
      name: 'nalufin 20mg/ml 5',
      price: 225.0,
      stock: 440,
    },
    {
      id: '066fb9af-5579-46be-858a-046b0b62e29c',
      name: 'sacrofer 100mg/5ml 5',
      price: 275.0,
      stock: 505,
    },
    {
      id: 'b0fe394b-e995-452e-9d1f-48d3ea4f01fb',
      name: 'janaglip 50/1000mg 28',
      price: 172.0,
      stock: 464,
    },
    {
      id: '68fcd9b7-1e5d-48b1-a769-0da006037cf9',
      name: 'antodine 20mg/2ml 3',
      price: 39.0,
      stock: 177,
    },
    {
      id: '0a6ca996-e4ab-4c45-9d70-06f5e400020d',
      name: 'astonin-h 0.1mg 30',
      price: 18.0,
      stock: 342,
    },
    { id: '95f22f44-2156-42d4-8aec-5cbc3902158f', name: 'b-com forte 30', price: 15.0, stock: 408 },
  ],

  // Open shifts
  shiftIds: [
    'da7ffdf4-90cc-49a7-ae1a-131857a7d8ab',
    '1c24676c-ba4f-43fe-a406-64c868e46222',
    'e9c5be72-c30a-419a-81a9-843d97da6925',
  ],
};

// --- Standard Headers ---
export function getHeaders(accessToken) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Prefer: 'return=representation',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

// --- Performance Thresholds ---
export const THRESHOLDS = {
  // Auth operations
  auth_login_duration: ['p(95)<2000', 'p(99)<5000'],

  // Checkout (RPC) operations
  checkout_duration: ['p(95)<3000', 'p(99)<8000'],

  // Inventory read operations
  inventory_read_duration: ['p(95)<1000', 'p(99)<3000'],

  // General
  http_req_failed: ['rate<0.05'], // <5% error rate
  http_req_duration: ['p(95)<5000'], // 95th percentile < 5s
};

// --- Tag Helpers ---
export const TAGS = {
  AUTH: { scenario: 'auth' },
  CHECKOUT: { scenario: 'checkout' },
  INVENTORY: { scenario: 'inventory' },
  MIXED: { scenario: 'mixed' },
};
