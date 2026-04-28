# Quickstart: Precision Financial Math

## Setup
1. Ensure you are on the `016-precision-math` branch.
2. Run the DB migration:
   ```bash
   npx supabase migration up
   ```

## Running Simulations
To verify the math engine across 10,000 transactions:
```bash
npx ts-node src/scratch/test-precision-final.ts
```

## Key Components
- **Money Engine**: `src/utils/money.ts`
- **Pricing Logic**: `src/services/pricingService.ts`
- **POS Integration**: `src/components/pos/usePOSCart.ts`
