# Data Model: POS Cart Stock Linking

## Entities

### CartItem (Extension of Drug)
- `id`: Current batch ID or Master Drug ID.
- `quantity`: Quantity in current mode.
- `isUnit`: Boolean (Pack vs Unit).
- `unitsPerPack`: From parent drug.

### Stock Validation Logic
- `TotalStockUnits = sum(batches.stock)`
- `UnitsInCart = sum(cart.map(i => i.isUnit ? i.quantity : i.quantity * i.unitsPerPack))`
- `RemainingUnits = TotalStockUnits - UnitsInCart`
