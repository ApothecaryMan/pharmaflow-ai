# Implementation Plan: Unit Testing Infrastructure

## Goal

Integrate Vitest and React Testing Library into the existing Vite project to enable unit testing for utilities, services, and components.

## Technical Approach

We will use `vitest` as the test runner because it shares the same configuration as Vite, making it faster and easier to set up than Jest. We will use `jsdom` to simulate a browser environment for React components.

## Proposed Changes

### 1. Configuration & Dependencies

#### [MODIFY] [package.json](file:///d:/Projects/HTML/pharmaflow-ai/package.json)

- Add `devDependencies`:
  - `vitest`
  - `jsdom`
  - `@testing-library/react`
  - `@testing-library/dom`
  - `@testing-library/jest-dom`
  - `@testing-library/user-event`
  - `@vitest/coverage-v8`
- Add `scripts`:
  - `"test": "vitest"`
  - `"test:ui": "vitest --ui"`
  - `"test:coverage": "vitest run --coverage"`

#### [MODIFY] [vite.config.ts](file:///d:/Projects/HTML/pharmaflow-ai/vite.config.ts)

- Add `test` configuration block to the Vite config.
- Set environment to `jsdom`.
- Configure setup files.

#### [NEW] [setupTests.ts](file:///d:/Projects/HTML/pharmaflow-ai/src/setupTests.ts)

- Import `@testing-library/jest-dom`.
- Mock global browser APIs not present in JSDOM (e.g., `ResizeObserver`, `matchMedia`).
- Clean up after each test.

#### [MODIFY] [tsconfig.json](file:///d:/Projects/HTML/pharmaflow-ai/tsconfig.json)

- Add `vitest/globals` and `@testing-library/jest-dom` to `types` or `include` to ensure TS recognition.

### 2. Implementation & Tests

#### [NEW] [utils/storage.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/components/utils/storage.test.ts)

- Test `storage.get` returns default value if key missing.
- Test `storage.set` correctly saves data.
- Test JSON parsing error handling.
- **Dependency**: `utils/storage.ts`

#### [NEW] [utils/idGenerator.test.ts](file:///d:/Projects/HTML/pharmaflow-ai/components/utils/idGenerator.test.ts)

- Test ID format (Prefix + Number).
- Test sequence incrementation.
- **Dependency**: `utils/idGenerator.ts`

#### [NEW] [components/common/SmartInputs.test.tsx](file:///d:/Projects/HTML/pharmaflow-ai/components/common/SmartInputs.test.tsx)

- Test `SmartInput` renders correctly.
- Test RTL detection logic.
- **Dependency**: `components/common/SmartInputs.tsx`

## Verification Plan

### Automated Tests

- Run `npm install` to get new deps.
- Run `npm run test` to execute the suite.
- Expect: 3 passing test suites (Storage, ID Generator, SmartInputs).

### Manual Verification

- Run `npm run test:coverage` and open the coverage report to verify >90% coverage on targeted files.
