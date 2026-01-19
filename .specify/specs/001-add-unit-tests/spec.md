# Specification: Add Unit Testing Infrastructure

## 1. Goal

Establish a robust unit testing foundation for PharmaFlow AI to ensure code reliability, protect against regressions, and facilitate refactoring.

## 2. Background

The project currently relies on manual testing. As the codebase grows (especially with separate `services/` and `utils/` layers), the lack of automated tests poses a risk to stability, particularly for critical logic like generic ID generation, storage handling, and price calculations.

## 3. Technical Requirements

### 3.1. Framework Selection

- **Test Runner:** `Vitest` (Native Vite integration, fast, compatible with Jest API).
- **Environment:** `jsdom` (for React component testing).
- **React Testing:** `@testing-library/react`, `@testing-library/user-event`.
- **Coverage:** `v8` (built-in Vitest coverage).

### 3.2. Configuration

- Update `vite.config.ts` to include test configuration.
- Add `test` and `test:coverage` scripts to `package.json`.
- Configure `setupTests.ts` for global mocks (e.g., `ResizeObserver`, `matchMedia`).

### 3.3. Scope (Phase 1)

Focus on testing "Pure Logic" first, as per Constitution Principle IV (Service-Based Architecture).

- **Utils:**
  - `utils/idGenerator.ts` (Ensure uniqueness and prefixing).
  - `utils/storage.ts` (Verify safe parsing and error handling).
- **Services:**
  - `services/inventory/batchService.ts` (FEFO logic).

### 3.4. CI/CD Integration

- Ensure `npm test` runs successfully.
- Fail builds if tests fail.

## 4. User Stories

- **As a Developer**, I want to run `npm run test` so that I can verify my changes didn't break existing logic.
- **As a Developer**, I want to see test coverage reports so I know which parts of the code are untested.
- **As a Developer**, I want utility functions like `idGenerator` to be tested to ensure data integrity.

## 5. Acceptance Criteria

- [ ] `vitest` and `@testing-library/*` installed as devDependencies.
- [ ] `npm run test` executes successfully and shows a green pass.
- [ ] `utils/idGenerator.ts` has >90% coverage.
- [ ] `utils/storage.ts` has >90% coverage.
- [ ] A sample test for a React component (e.g., `SmartInput`) runs successfully.
