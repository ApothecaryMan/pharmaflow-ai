# Phase 0: Outline & Research

## Decision 1: Database Provider
**Decision**: Supabase (PostgreSQL)
**Rationale**: Native Row Level Security (RLS) offers robust multi-tenant (branch-level) isolation. Real-time channels provide out-of-the-box cross-device syncing without custom WebSocket infrastructure. TypeScript SDK seamlessly integrates with the existing React application.
**Alternatives considered**: 
- **Firebase (Firestore)**: Flat NoSQL structure scales poorly for complex relational queries like FEFO inventory, sequential invoice tracking, and audit reporting.
- **Custom Node.js/Express + PostgreSQL**: Adds significant maintenance overhead, heavy infra management, and requires designing custom websocket logic for real-time state.

## Decision 2: Offline Resilience (Phase 4 integration)
**Decision**: Optimistic UI Updates + Background Sync Queue (IndexedDB)
**Rationale**: Pharmacies are mission-critical environments requiring continuous operation even during internet outages. A purely cloud-dependent system is a severe business risk. The local database (IndexedDB) continues to handle sales instantly, while a background sync engine (`syncQueueService.ts`) pushes and pulls to Supabase when online.
**Alternatives considered**: 
- **Strict Online-Only**: Rejected due to unacceptable business risk during outages. Wait times at a pharmacy checkout cannot be dictated by internet latency.
