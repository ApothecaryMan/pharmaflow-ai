# Implementation Tasks: Supabase Backend

## 🔴 Phase 1: Database Schema & Foundation
- [ ] Create Supabase project and configure environment variables
- [ ] Run SQL migrations for all 16 tables (branches → audit_logs)
- [ ] Enable RLS on all tables and create branch_isolation policies
- [ ] Create indexes for performance-critical queries
- [ ] Write seed script for dev/staging data
- [ ] Install `@supabase/supabase-js` in frontend

## 🔴 Phase 2: Authentication
- [ ] Configure Supabase Auth (Email/Password provider)
- [ ] Create `supabaseClient.ts` singleton
- [ ] Refactor `authService.ts` to use Supabase Auth (login/logout/session)
- [ ] Add `branch_id` to JWT custom claims via Supabase hook
- [ ] Update `useAuth` hook for Supabase session management
- [ ] Implement offline session caching (fallback to cached JWT)

## 🟡 Phase 3: Service Layer Migration
- [ ] Create `supabaseService.ts` base CRUD helper
- [ ] Migrate `inventoryService.ts` → Supabase queries
- [ ] Migrate `salesService.ts` → Supabase queries
- [ ] Migrate `customerService.ts` → Supabase queries
- [ ] Migrate `supplierService.ts` → Supabase queries
- [ ] Migrate `purchaseService.ts` → Supabase queries
- [ ] Migrate `returnService.ts` → Supabase queries
- [ ] Migrate `employeeService.ts` → Supabase queries
- [ ] Migrate `batchService.ts` → Supabase queries
- [ ] Migrate `branchService.ts` → Supabase queries
- [ ] Migrate `auditService.ts` → Supabase queries

## 🟡 Phase 4: Sync Engine & Realtime
- [ ] Refactor `syncEngine.ts` to use Supabase Realtime channels
- [ ] Subscribe to `sales`, `drugs`, `stock_batches` changes per branch
- [ ] Update `DataContext.tsx` to merge Realtime payloads into state
- [ ] Keep IndexedDB as offline write-ahead log (fallback)
- [ ] Update `syncQueueService.ts` to flush to Supabase on reconnect

## 🟢 Phase 5: Data Migration & Cleanup
- [ ] Build one-time migration script: localStorage/IndexedDB → Supabase
- [ ] Migrate Netlify Edge Functions (AI, Time) to Supabase Edge Functions
- [ ] Remove mock API client once all services use Supabase
- [ ] End-to-end testing across branches
