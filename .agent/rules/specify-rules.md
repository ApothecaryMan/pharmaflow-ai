---
trigger: always_on
---

# ZINC Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-05-06

## Active Technologies
- TypeScript (ES2022 target) + React 19+, Vite, Supabase, TanStack Table (013-oop-service-refactor-p2)
- Supabase (PostgreSQL), `StorageService` (013-oop-service-refactor-p2)
- TypeScript 5+ (ES2022) + React 19, Lucide React, TanStack Table v8 (014-fix-pos-quantity-logic)
- Supabase (PostgreSQL), StorageService (014-fix-pos-quantity-logic)

- React 19 / TypeScript 5 + Lucide React, TanStack Table v8 (MANDATORY per Constitution), existing services (`employeeService`, `branchService`). (001-org-management)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

React 19 / TypeScript 5: Follow standard conventions

## Recent Changes
- 014-fix-pos-quantity-logic: Added TypeScript 5+ (ES2022) + React 19, Lucide React, TanStack Table v8
- 013-oop-service-refactor-p2: Added TypeScript (ES2022 target) + React 19+, Vite, Supabase, TanStack Table

- 001-org-management: Added React 19 / TypeScript 5 + , TanStack Table v8 (MANDATORY per Constitution), existing services (`employeeService`, `branchService`).

<!-- MANUAL ADDITIONS START -->
## AI Assistant Golden Rules (STRICT ADHERENCE REQUIRED)

1.  **NO HARDCODED TRANSLATIONS**: Never write raw strings (Arabic or English) in JSX. Always use `i18n/translations.ts` and access via `t.key`.
2.  **PRESERVE COMMENTS**: Never delete existing comments during code edits. Preserve all logic explanations, documentation, and organizational comments.
3.  **CLEAN UI/NUMERIC FOCUS**: Prioritize clear, numeric-focused interfaces for POS operations (e.g., hiding currency symbols where requested for a cleaner look).
4.  **MINIMAL UI LOGIC**: Keep components focused on rendering. Move complex calculations, data transformations, and business logic into hooks (e.g., `usePOSCart`) or dedicated service layers.
<!-- MANUAL ADDITIONS END -->