# Specification: Phase 6 Unit Tests (Auth Component)

## 1. Goal

Implement unit tests for the `Login` component to ensure secure and correct authentication flows.

## 2. Technical Requirements

### 2.1. Component: Login

- **File**: `components/auth/Login.tsx`
- **Scenarios**:
  - **Rendering**: Should render username/password inputs and submit button.
  - **Validation**:
    - Should show error if username is empty.
    - Should show error if password is empty or too short (< 4 chars).
  - **Interaction**:
    - Should toggle password visibility.
  - **Logic**:
    - Should call `authService.login` on submit.
    - Should show error message on login failure.
    - Should call `onLoginSuccess` or `onViewChange` on success (after delay).

## 3. Mocking

- Mock `authService.login` to control success/failure outcomes.
- Mock `TRANSLATIONS` or use standard english text checks.

## 4. Acceptance Criteria

- [ ] `components/auth/Login.test.tsx` created.
- [ ] All 5+ test scenarios pass.
