# Data Model: OOP Service Refactor - Phase 2

## Core Entities

### Customer / Supplier (Inherits from BaseEntity)
- **Fields**:
  - `id`: string (UUID)
  - `name`: string
  - `contactInfo`: object (phone, email, address)
  - `status`: 'active' | 'inactive'
  - `branchId`: string
  - `orgId`: string
- **Validation**:
  - Name must be non-empty.
  - Status must be one of the defined values.

### Sale / Purchase (Inherits from BaseReport)
- **Fields**:
  - `id`: string (UUID)
  - `items`: array (productId, quantity, price)
  - `total`: number
  - `status`: string (e.g., 'pending', 'completed', 'received')
  - `timestamp`: string (ISO)
- **Transitions**:
  - Purchase: `pending` -> `received` triggers automated batch creation.

### Inventory Batch
- **Fields**:
  - `id`: string (UUID)
  - `productId`: string
  - `purchaseId`: string (link to source)
  - `quantity`: number
  - `expiryDate`: string
  - `batchNumber`: string

### Employee
- **Fields**:
  - `id`: string (UUID)
  - `name`: string
  - `email`: string
  - `role`: UserRole
  - `orgRole`: OrgRole
  - `avatarUrl`: string (optional)
  - `contactInfo`: object

## Relationships

- **Purchase -> Inventory Batch**: 1-to-Many. One purchase order can generate multiple batches (one for each item).
- **Employee -> Permission**: Role-based mapping via `ROLE_PERMISSIONS` configuration.
