# Specification: Phase 4 Unit Tests (Utils & Services)

## 1. Goal

Complete the test coverage for critical utilities and remaining core services identified in the gap analysis.

## 2. Technical Requirements

### 2.1. Utilities

- **Expiry Logic**: `utils/expiryUtils.ts`
  - Verify `sanitizeExpiryInput` prevents invalid dates.
  - Verify `checkExpiryStatus` correctly identifies expired/near-expiry items.
- **Currency**: `utils/currency.ts`
  - Verify correct dollar/local formatting.

### 2.2. Services

- **Settings**: `services/settings/settingsService.ts`
  - Verify default settings are returned if storage is empty.
  - Verify `set` updates storage.
- **Customers**: `services/customers/customerService.ts`
  - Verify `create` assigns ID and Branch Code.
  - Verify `points` logic (add/redeem).

### 2.3. Hooks

- **useAuth**: `hooks/useAuth.ts`
  - Verify initial state.
  - Verify `login` updates state and storage.
  - Verify `logout` clears state.

## 3. Acceptance Criteria

- [ ] `utils/expiryUtils.test.ts` created.
- [ ] `services/settings/settingsService.test.ts` created.
- [ ] `services/customers/customerService.test.ts` created.
- [ ] `hooks/useAuth.test.ts` created.
- [ ] All new tests pass.
