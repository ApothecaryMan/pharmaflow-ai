# Phase 0: Research & Architecture Decisions

## Decision 1: Separation of Profile and Employment Data
- **Decision**: Introduce a `user_profiles` table for personal data (Name, Phone, unique Username `@`) and refactor the `employees` table to act purely as an `employments` junction table linking `user_id` to `org_id` (with Branch, Salary, Role, and the internal Pharmacy `employee_code`).
- **Rationale**: Currently, the `employees` table holds both personal data and organizational data. By separating them, a user can exist independently in `user_profiles` and have multiple `employees` (employment) records across different organizations, each with its own internal `employee_code` specific to that pharmacy.
- **Alternatives considered**: Keeping all data in `employees`. Rejected because it complicates multi-employment.

## Decision 2: Employment Request Workflow
- **Decision**: Create an `employment_requests` table where the pharmacy admin submits a request using the employee's unique `username` (e.g., @ahmed). The employee accepts it in their portal.
- **Rationale**: Replaces the manual addition of employees. Ensures mutual consent.
- **Alternatives considered**: Sending an email invite link via `org_invites`. Rejected because using a platform-native handle (username) is faster and more social.

## Decision 3: Remote Access vs Physical POS (Security)
- **Decision**: When an employee logs into their personal account, they are directed to an **Employee Portal** (HR info, requests) but CANNOT access the Pharmacy POS or Dashboard remotely unless they have `Admin` or `Remote` privileges. Regular work (sales, inventory) MUST be done via the local POS `QuickLogin.tsx` on an authorized pharmacy device.
- **Rationale**: Retail security standard. Prevents theft, remote manipulation of sales, and unauthorized access from home.

## Decision 4: Dual Login System (Global vs POS)
- **Decision**: The global app login uses the global `username`/email and Supabase Auth. The local POS login (`QuickLogin.tsx`) uses a local `username` (auto-derived from the numeric part of the `employee_code`, e.g., '15' from 'EMP-015') and a local `password` stored directly in the `employees` table.
- **Rationale**: Ensures the POS remains fast and optimized for quick cashier switching, while keeping the platform account secure and independent. Supports existing biometrics (Passkeys). If the user is a multi-pharmacy Admin, they get a `/workspace-switcher`.
