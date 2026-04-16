# Quickstart: Organization Management

## Prerequisites
- User must have `org_role` of 'owner' or 'admin'.
- Organization must have at least one branch.

## Accessing the Dashboard
1. Log in to ZINC.
2. Navigate to **Settings** > **General Settings**.
3. Click on **Organization Management**.

## Local Development
- Metrics are cached in IndexedDB (`pharma-org-metrics`).
- To force a refresh, clear IndexedDB or click the refresh button (if implemented).
- Permissions changes use `employeeService`, which syncs with Supabase.

## Key Files
- Logic: `services/org/orgAggregationService.ts`
- Dashboard: `components/org/OrganizationManagementPage.tsx`
- Permissions: `components/org/MemberPermissionMatrix.tsx`
