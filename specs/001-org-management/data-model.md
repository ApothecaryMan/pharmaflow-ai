# Data Model: Organization Management

## Entities

### OrgMember (Core)
Represents a user's membership and role within an organization.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary Key |
| org_id | UUID | Reference to Organization |
| user_id | UUID | Reference to Auth User |
| role | org_role | `owner`, `admin`, `member` |

### Employee (Profile & Assignment)
Extended profile for a person working within the organization, linked to a specific branch.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary Key |
| branch_id | UUID | Current primary branch assignment |
| user_id | UUID | Reference to Auth User (optional) |
| org_role | org_role | Denormalized role for quick access |

## Relationships

- **Organization** 1:N **Branches**
- **Organization** 1:N **OrgMembers**
- **Branch** 1:N **Employees**

## Permissions Matrix Logic

The Matrix will display a join of `OrgMember` (for role) and `Employee` (for branch assignment).
Updates will trigger `employeeService.update(id, { branchId, orgRole })`.
