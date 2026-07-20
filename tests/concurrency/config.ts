/**
 * Concurrency & Realtime Test Configuration
 *
 * Set these env vars before running:
 *   SUPABASE_URL       = https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY = service-role key (full access)
 *   SUPABASE_ANON_KEY  = anon key
 *   TEST_BRANCH_ID     = UUID of the test branch (created by helpers)
 *   TEST_ORG_ID        = UUID of the test org
 *
 * Or copy .env.concurrency to the project root and the runner will load it.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  const envPath = resolve(__dirname, '../../.env.concurrency');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

export function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const config = {
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceKey: requireEnv('SUPABASE_SERVICE_KEY'),

  anonKey: process.env.SUPABASE_ANON_KEY || requireEnv('SUPABASE_SERVICE_KEY'),

  branchId: process.env.TEST_BRANCH_ID || '',
  orgId: process.env.TEST_ORG_ID || '',

  /** Employee-performer UUID used in test RPC calls */
  performerId: process.env.TEST_PERFORMER_ID || '',

  /** Drug used for sale/return test items */
  testDrugId: process.env.TEST_DRUG_ID || '',

  /** Number of iterations for probabilistic tests (Test 2) */
  oversellIterations: Number(process.env.OVERSELL_ITERATIONS) || 50,

  /** How long to wait (ms) for realtime events to arrive */
  realtimeTimeoutMs: Number(process.env.REALTIME_TIMEOUT_MS) || 10_000,

  /** Settle time after burst before consistency check (Test 3) */
  settleTimeMs: Number(process.env.SETTLE_TIME_MS) || 3_000,
} as const;
