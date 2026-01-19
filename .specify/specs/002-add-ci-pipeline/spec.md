# Specification: Add CI Pipeline (GitHub Actions)

## 1. Goal

Implement a Continuous Integration (CI) pipeline using GitHub Actions to automatically enforce code quality standards defined in the Constitution (Type Safety, Linting, Testing) on every code change.

## 2. Background

Currently, the project has a `deploy.yml` workflow, but no automated checks for Pull Requests or Commits. This means broken code (type errors, failing tests) could theoretically be pushed to the main branch.

## 3. Technical Requirements

### 3.1. Workflows

- **Name:** `ci.yml` (New Workflow)
- **Triggers:**
  - `push` to `main` branch.
  - `pull_request` to `main` branch.

### 3.2. Jobs & Checks

The pipeline must run the following checks in parallel or sequence:

1.  **Linting**: `npm run lint`
    - Ensures code style consistency.
2.  **Type Checking**: `npm run type-check`
    - Enforces TypeScript strictness (Constitution Principle I).
3.  **Unit Tests**: `npm run test`
    - verified by Vitest (Constitution Principle III).
4.  **Translation Check**: `npm run check-translations`
    - Enforces bilingual support (Constitution Principle II).

### 3.3. Failure Policy

- If **ANY** check fails, the workflow must fail.
- GitHub should block merging if these checks fail (requires repo settings, but we construct the workflow to support it).

## 4. User Stories

- **As a Developer**, I want to know immediately if my code breaks existing tests when I push.
- **As a Team Lead**, I want to ensure no code with TypeScript errors is ever merged into `main`.

## 5. Acceptance Criteria

- [ ] `.github/workflows/ci.yml` file created.
- [ ] Pipeline runs on push.
- [ ] Pipeline executes `lint`, `type-check`, `test`, `check-translations`.
- [ ] Pipeline passes for the current clean codebase.
