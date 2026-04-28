# Data Model: Precision Financial Math

## Entities

### Drug (Updated)
Existing `Drug` entity is extended to support "Bottom-Up" pricing.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `unitPrice` | Integer | Price of a single smallest unit (e.g., 1 tablet) in Piastres. | `> 0`, Mandatory for sales. |
| `unitCostPrice` | Integer | Cost price of a single smallest unit in Piastres. | `> 0`. |
| `packSize` | Integer | Number of units per pack. | `> 0`. |

**Relationships**:
- Used by `SaleItem` to resolve price if specific historical price is missing.
- Used by `PurchaseItem` to resolve cost price.

## Validation Rules
1. **Integer Only**: All price fields in the DB must be stored as integers. No `DECIMAL` or `FLOAT` for financial values.
2. **Total Invariant**: `total_amount == (quantity * unit_price) - discount + tax`.
3. **Rounding**: Multi-item discounts must be allocated across items using the `money.allocate` method to ensure the sum of items equals the transaction total.
