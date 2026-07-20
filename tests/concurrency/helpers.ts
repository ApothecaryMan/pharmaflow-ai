/**
 * Shared test utilities for concurrency/realtime tests.
 * Uses service-role key to bypass RLS for deterministic test setup.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

export function createServiceClient(): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    db: { schema: 'public' },
    realtime: { timeout: config.realtimeTimeoutMs },
  });
}

export function createAnonClient(): SupabaseClient {
  // Use service key for tests to bypass RLS so we can actually receive the realtime events
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    db: { schema: 'public' },
    realtime: { timeout: config.realtimeTimeoutMs },
  });
}

export interface TestSeed {
  orgId: string;
  branchId: string;
  drugId: string;
  batchId: string;
  performerId: string;
}

/**
 * Seed a test environment for a single test run.
 * Creates: org, branch, employee, drug, stock_batch with given qty.
 * Returns all generated IDs.
 */
export async function seedTestEnv(
  client: SupabaseClient,
  batchQty: number,
): Promise<TestSeed> {
  const orgId = config.orgId || crypto.randomUUID();
  const branchId = config.branchId || crypto.randomUUID();
  const performerId = config.performerId || crypto.randomUUID();
  const drugId = config.testDrugId || crypto.randomUUID();

  // Ensure org exists
  const { error: orgErr } = await client
    .from('organizations')
    .upsert({ id: orgId, name: `Concurrency Test Org ${Date.now()}`, slug: `test-org-${Date.now()}` }, { onConflict: 'id' });
  if (orgErr) throw new Error(`seed org: ${orgErr.message}`);

  // Ensure branch exists
  const { error: branchErr } = await client
    .from('branches')
    .upsert(
      { id: branchId, org_id: orgId, name: `Concurrency Test Branch ${Date.now()}`, code: `TST-${Date.now().toString().slice(-4)}` },
      { onConflict: 'id' },
    );
  if (branchErr) throw new Error(`seed branch: ${branchErr.message}`);

  // Ensure auth user exists
  const authUserEmail = `test_${Date.now()}@pharmaflow.test`;
  const { data: authData, error: authErr } = await client.auth.admin.createUser({
    email: authUserEmail,
    password: 'password123',
    email_confirm: true
  });
  if (authErr && !authErr.message.includes('already exists')) throw new Error(`seed auth: ${authErr.message}`);
  const authUserId = authData?.user?.id || performerId;

  // Ensure user profile exists
  const { error: profileErr } = await client
    .from('user_profiles')
    .upsert({
      id: authUserId,
      username: `testuser_${Date.now()}`,
      full_name: 'Concurrency Test User',
    }, { onConflict: 'id' });
  if (profileErr) throw new Error(`seed user profile: ${profileErr.message}`);

  // Ensure performer employee exists
  const { error: empErr } = await client
    .from('employees')
    .upsert(
      {
        id: performerId,
        branch_id: branchId,
        org_id: orgId,
        name: 'Concurrency Test Performer',
        role: 'pharmacist',
        status: 'active',
        employee_code: `EMP-${Date.now().toString().slice(-4)}`,
        username: `testuser_${Date.now()}`,
        position: 'Tester',
        department: 'pharmacy',
        user_id: authUserId, // or auth_user_id if that's the column name, let's just try user_id
        auth_user_id: authUserId,
      },
      { onConflict: 'id' },
    );
  if (empErr) throw new Error(`seed employee: ${empErr.message}`);

  // Ensure drug exists
  const { error: drugErr } = await client
    .from('drugs')
    .upsert(
      {
        id: drugId,
        branch_id: branchId,
        org_id: orgId,
        name: `Concurrency Test Drug ${Date.now()}`,
        barcode: `CONC-${Date.now()}`,
        public_price: 10,
        cost_price: 5,
        category: 'general',
        units_per_pack: 1,
        stock: batchQty,
      },
      { onConflict: 'id' },
    );
  if (drugErr) throw new Error(`seed drug: ${drugErr.message}`);

  // Seed a stock_batch with the requested quantity
  const batchId = crypto.randomUUID();
  const { error: batchErr } = await client.from('stock_batches').insert({
    id: batchId,
    branch_id: branchId,
    org_id: orgId,
    drug_id: drugId,
    quantity: batchQty,
    expiry_date: '2027-12-31',
    cost_price: 5,
    version: 1,
  });
  if (batchErr) throw new Error(`seed batch: ${batchErr.message}`);

  return { orgId, branchId, drugId, batchId, performerId };
}

/**
 * Clean up all test data created by seedTestEnv.
 */
export async function cleanupTestEnv(client: SupabaseClient, seed: TestSeed): Promise<void> {
  const { error: _be } = await client.from('stock_batches').delete().eq('id', seed.batchId);
  const { error: _de } = await client.from('drugs').delete().eq('id', seed.drugId);
  const { error: _ee } = await client.from('employees').delete().eq('id', seed.performerId);
  const { error: _bre } = await client.from('branches').delete().eq('id', seed.branchId);
  // Don't delete org — it may be shared
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build a minimal checkout payload for testing.
 */
export function buildCheckoutPayload(seed: TestSeed, total: number = 10): Record<string, unknown> {
  return {
    branchId: seed.branchId,
    orgId: seed.orgId,
    performerId: seed.performerId,
    performerName: 'Concurrency Test',
    paymentMethod: 'cash',
    saleType: 'walk-in',
    total,
    subtotal: total,
    globalDiscount: 0,
    items: [
      {
        id: seed.batchId,
        drugId: seed.drugId,
        quantity: 1,
        publicPrice: total,
        isUnit: false,
      },
    ],
  };
}
