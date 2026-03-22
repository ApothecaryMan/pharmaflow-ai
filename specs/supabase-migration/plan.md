# Implementation Plan: Supabase Backend Migration

**Branch**: `feature/supabase-migration` | **Date**: 2026-03-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/supabase-migration/spec.md`

## Summary
Migrate the existing PharmaFlow-AI `localStorage` architecture to a highly robust PostgreSQL database via Supabase, ensuring real-time multi-branch synchronization and strict data isolation via RLS policies.

## Technical Context
**Language/Version**: TypeScript 5.x, React 19.x  
**Primary Dependencies**: `@supabase/supabase-js`, Vite  
**Storage**: PostgreSQL (Supabase) + IndexedDB (Local Caching)  
**Testing**: Vitest  
**Target Platform**: Web Browsers (Chrome/Safari/Edge)  
**Project Type**: Single Web Application (Option 1)  
**Performance Goals**: RLS policies must execute in O(1) time using indexed lookups.  
**Constraints**: Must maintain offline capability. Multi-branch data must NEVER leak.  

## Constitution Check
_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._
- **Simplicity**: Leveraging Supabase's managed services avoids creating, deploying, and maintaining a custom backend infrastructure.
- **Security**: Utilizing PostgreSQL's Row Level Security (RLS) embedded at the database engine level ensures absolute isolation between distinct pharmacy branches.

## Project Structure
### Documentation (this feature)
```
specs/supabase-migration/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (Detailed SQL & RLS Schema)
└── spec.md              # Feature specification
```

**Structure Decision**: Option 1 (Single web application with integrated Supabase SDK in the `services/` abstraction layer).

## Phase 0: Outline & Research
Resolved. See [research.md](./research.md) for database choice rationale and offline strategy.

## Phase 1: Design & Contracts
Resolved. The comprehensive SQL schema, Triggers, and RLS policies have been architected and formalized.
See [data-model.md](./data-model.md) for the complete schemas.

## Phase 2: Task Planning Approach
_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:
- Generate objective tasks from Phase 1 design docs (data-model).
- Sequential progression constraints applied:
  1. Initialize Supabase Project + Keys
  2. Execute SQL Schema + Functions
  3. Integrate Supabase Auth
  4. Refactor Services Layer (`inventoryService`, `salesService`, etc.)
  5. Refactor Sync Engine

**Estimated Output**: 15-20 distinct, ordered tasks in `tasks.md`

## Complexity Tracking
| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| Hybrid Storage | The app needs both IndexedDB (Local Caching) and Supabase (Remote DB). | A pure remote DB approach breaks the offline-first requirement for pharmacies, which is unacceptable for POS systems. |

## Progress Tracking
**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented
