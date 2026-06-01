# Phase 1: Data Model Updates

## New Table: `user_profiles`
Stores independent personal data for all users on the platform.
- `id` (uuid, pk, matches auth.users.id)
- `username` (varchar, unique, e.g., @ahmed_ali) -> *Used across the whole platform for sending employment invites/requests.*
- `full_name` (varchar)
- `phone` (varchar)
- `license_number` (varchar, nullable)
- `created_at` (timestamp)

## Modified Table: `employees` (Acts as Employment Record)
Links a user profile to an organization. This is where pharmacy-specific data lives.
- `id` (uuid, pk)
- `user_id` (uuid, fk to user_profiles.id)
- `org_id` (uuid, fk to organizations.id)
- `branch_id` (uuid, fk to branches.id)
- `employee_code` (varchar) -> *The internal code given by the pharmacy (e.g., EMP-001).*
- `username` (varchar) -> *Auto-generated from code (e.g., '1' from 'EMP-001'). Used for local POS QuickLogin.*
- `password` (varchar) -> *Hashed local password for POS QuickLogin.*
- `biometric_credential_id` (varchar, nullable) -> *For POS Passkey login.*
- `role` (varchar)
- `salary` (numeric)
- `status` (varchar: 'active', 'inactive', 'terminated')
*Note: Personal fields (name, phone) will be migrated to `user_profiles` and fetched via joins or views.*

## New Table: `employment_requests`
Handles the handshake between an organization and an independent employee.
- `id` (uuid, pk)
- `org_id` (uuid, fk to organizations.id)
- `target_username` (varchar) -> *The global username used to find the user profile.*
- `role` (varchar)
- `branch_id` (uuid, nullable)
- `status` (varchar: 'pending', 'accepted', 'rejected')
- `created_at` (timestamp)
