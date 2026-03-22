# Tasks: Supabase Backend Migration

**Input**: Design documents from `specs/supabase-migration/`
**Prerequisites**: plan.md (required), research.md, data-model.md

## Phase 3.1: Setup & Initialization
- [ ] T001 Initialize Supabase Client (`src/lib/supabase.ts`) and ensure `@supabase/supabase-js` is installed.
- [ ] T002 Add Environment Variables for Supabase (URL & Anon Key) to `.env` and validate in `vite-env.d.ts`.
- [ ] T003 Execute SQL migration commands from `data-model.md` directly into the Supabase SQL Editor.
- [ ] T004 Generate TypeScript definitions (`src/types/supabase.ts`) using the Supabase CLI (`npx supabase gen types`).

## Phase 3.2: Auth Integration ⚠️ MUST COMPLETE BEFORE 3.3
- [ ] T005 Refactor `services/hr/authService.ts` to use Supabase Auth API (`signInWithPassword` & session management).
- [ ] T006 Update `hooks/useAuth.ts` to seamlessly latch onto `supabase.auth.onAuthStateChange` events.
- [ ] T007 Fix UI components (e.g. `LoginForm.tsx`) to handle new Auth errors cleanly according to the schema.

## Phase 3.3: Core Implementation (Services Refactoring)
_CRITICAL: Replace all localStorage/IndexedDB APIs with Supabase PostgREST equivalent endpoints_
- [ ] T008 [P] Refactor `services/hr/employeeService.ts` (CRUD ops)
- [ ] T009 [P] Refactor `services/inventory/inventoryService.ts` (Drugs management)
- [ ] T010 [P] Refactor `services/customers/customerService.ts`
- [ ] T011 [P] Refactor `services/suppliers/supplierService.ts`
- [ ] T012 [P] Refactor `services/inventory/batchService.ts` 
- [ ] T013 [P] Refactor `services/auditService.ts` (Insert logs directly to `audit_logs` table)

## Phase 3.4: Complex Transactions Integration
- [ ] T014 Refactor `services/sales/salesService.ts` to correctly map the denormalized frontend `Sale` object into normalized `sales`, `sale_items`, and `sale_item_batches` inserts.
- [ ] T015 Refactor `services/transactions/transactionService.ts` to leverage atomic Supabase RPC functions (or transactional logic) instead of IndexedDB loops.
- [ ] T016 Refactor `services/purchases/purchaseService.ts` and `services/returns/returnService.ts`.

## Phase 3.5: Realtime & Polish
- [ ] T017 Refactor `services/DataContext.tsx` to subscribe to the `supabase_realtime` publication for instant state updates.
- [ ] T018 Integrate logic previously handled by `syncQueueService.ts` into a Supabase-friendly offline caching mechanism if required by pharmacies.
- [ ] T019 Conduct complete end-to-end POS checkout test locally.

## Dependencies
- Setup (T001-T004) MUST complete before any integration begins.
- Auth (T005-T007) MUST complete before Core Implementation because all Postgres RLS policies rely on the authenticated `auth.uid()`.
- Core Services (T008-T013) can run in parallel `[P]`.
- Complex Transactions (T014-T016) are sequential and rely on Core Services endpoints acting correctly.
- Realtime (T017-T019) requires all UI data bindings to be active.

## Parallel Example
```bash
# Execute T008-T011 simultaneously as they mutate independent table APIs:
Task: "Refactor employeeService to use Supabase in services/hr/employeeService.ts"
Task: "Refactor inventoryService to Supabase in services/inventory/inventoryService.ts"
Task: "Refactor customerService to Supabase in services/customers/customerService.ts"
```
