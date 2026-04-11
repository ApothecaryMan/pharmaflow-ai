# Research: Organization Management Permissions

## Member Role Logic

- **Decision**: Use `org_role` from `org_members` table as the source of truth for organization-level access.
- **Rationale**: The database migration `20260329000000_multi_tenant.sql` already defines `owner`, `admin`, and `member` roles at the organization level.
- **Application**: 
  - `owner`/`admin`: Access to all branches in the org (via RLS).
  - `member`: Access only to their assigned `branch_id`.

## UI Table Implementation

- **Decision**: Use `TanStack Table v8`.
- **Rationale**: Mandatory per Constitution (Principle III). Provides better RTL support and performance for large member lists than raw HTML tables.

## Multi-Branch Access

- **Decision**: For the first iteration, "Multi-branch access" will be managed by either:
  1. Setting `org_role` to `admin` (granting access to ALL branches).
  2. Changing the primary `branch_id` for a `member` role employee.
- **Rationale**: This aligns with the current Supabase RLS policy `tenant_isolation`.
