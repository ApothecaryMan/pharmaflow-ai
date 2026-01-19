# PharmaFlow AI Constitution

## Core Principles

### I. Strict Type Safety

**TypeScript is mandatory.** The `any` type is strictly forbidden. All props, state, and API responses must have defined interfaces.
_Rationale: Critical for a medical application to ensure data integrity and prevent runtime errors._

### II. Localization First (i18n)

**No hardcoded text.** All user-facing strings must be extracted to `i18n/translations.ts`. The app must support seamless switching between English (LTR) and Arabic (RTL).
_Rationale: Essential for bilingual user base and compliance with regional requirements._

### III. Standard Component Usage (Design System)

**Use the Component Library.** Direct use of standard HTML `<input>`, `<select>`, `<button>`, or `<table>` tags is **forbidden** for UI elements.
**MANDATORY Components:**

- Inputs: `SmartInput`, `SmartPhoneInput`, `FloatingInput`.
- Layout: `SegmentedControl`, `Switch`.
- Data display: `TanStackTable` (never `<table>`).
- Modals: `Modal`, `ExpandedModal`.
- Data: `StorageService` (never `localStorage`).
  _Rationale: Ensures consistent UI/UX, built-in RTL support, and centralized logic fixes._

### IV. Service-Based Architecture

**Separation of Concerns.**

- **Components (`components/`)**: Pure UI/View layer. No complex business logic.
- **Services (`services/`)**: Business logic, API calls, and calculation engines.
- **Context (`context/`)**: Global state distribution only.
  _Rationale: Makes logic testable independent of React, and keeps components "dumb" and reusable._

### V. Secure & Robust Data Handling

**Strict Storage & IDs.**

- **Storage**: NEVER access `localStorage` directly. Use `StorageService` (in `utils/storage.ts`) to prevent key collisions and ensure type safety.
- **IDs**: NEVER use `Date.now()` or `UUID` for business identifiers. Use `idGenerator` (e.g., `B1-0001`) for readable, sequential IDs.
  _Rationale: Prevents data corruption, key conflicts, and ensures human-readable identifiers for support/operations._

## Technical Constraints

- **Framework**: React 19+ with Vite
- **Language**: TypeScript (ES2022 target)
- **Styling**: Tailwind CSS v3+ with strict RTL plugin support.
- **State Management**: Hybrid (Context for global state + Services for domain data).
- **Linter**: ESLint with strict React Hooks rules.

## Governance

- **Code Review Checklist**:
  - [ ] No `any` types.
  - [ ] No hardcoded strings.
  - [ ] No direct `localStorage` access.
  - [ ] No raw HTML input/select/table tags.
  - [ ] iOS Safari fix applied (`WebkitAppearance: none`) for custom buttons.
- **Documentation**: Updates to `README.md` or `docs/` required for architectural changes.
- **Commit Messages**: Conventional Commits style (`feat:`, `fix:`, `chore:`).

**Version**: 1.1.0 | **Ratified**: 2026-01-19 | **Last Amended**: 2026-01-19
