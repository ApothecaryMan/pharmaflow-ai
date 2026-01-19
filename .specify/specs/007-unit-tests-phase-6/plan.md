# Implementation Plan: Phase 6 Unit Tests

## Goal

Implement tests for `Login.tsx`.

## Proposed Changes

### 1. Auth Component Tests

#### [NEW] [components/auth/Login.test.tsx](file:///d:/Projects/HTML/pharmaflow-ai/components/auth/Login.test.tsx)

- Mock `authService`.
- Use `fireEvent` to simulate typing and clicking.
- Use `waitFor` to handle the async login and 1500ms success delay.
- **Note**: The component has a `1500ms` delay on success. Tests need to use Fake Timers to skip this delay.

## Verification Plan

### Automated

- Run `npm run test` components/auth/Login.test.tsx
