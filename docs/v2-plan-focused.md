# Phase 2 — Full Replication Status

## All critical & high bugs fixed ✅

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| **Sales double deduction** (Bug 1) | `.map()` over ALL batches deducted full qty from EACH batch matching `drugId` | FIFO: sort by `expiryDate ASC`, deduct from oldest until qty satisfied |
| **Inventory unit mismatch** (Bug 1b) | `saleItem.quantity / unitsPerPack` — stock is in units, code treated it as packs | Changed to `saleItem.quantity * unitsPerPack` |
| **Same bug in returns** | Both `useProcessSalesReturn` & `useCreatePurchaseReturn` had division | Changed to multiplication (units) |
| **Single-batch findIndex** in returns | `useCreatePurchaseReturn` found only first batch matching `drugId` | FIFO spread across all matching batches |
| **Fake expiry date** (Bug 2) | `expiryDate \|\| new Date().toISOString()` made missing dates = "expired today" | Made `StockBatch.expiryDate` optional (type), removed fallback entirely. DB stores NULL, `mapBatchToDb` skips if undefined |
| **Approve empty cache** (Bug 3) | `getQueryData()` returns undefined if detail never fetched, `approve()` returns minimal data without items | mutationFn now calls `purchaseService.getById(id)` to always get full items |
| **patchPagedListCache crash** | Registered for flat-array caches (sales.recent, etc) but expected `{rows, count}` | Replaced with `patchListCache` (correct for flat arrays) |
| **No-op cache updates** | `setQueryData` returned `[...old]` — no change | Now properly appends transactions & updates shift totals |

---

## Remaining (low priority)

| Item | Files | Risk | Effort |
|------|-------|------|--------|
| Cancellation/modification paths | `useSalesHandlers.ts` — 13 `invalidateQueries` | Loading spinners on cancel/edit (not crash) | 1-2 hrs |
| Update mutations use request payload | `useEmployeeMutations.ts`, `useCustomerMutations.ts`, `useSupplierMutations.ts` | `updatedAt` may be stale until refetch | 30 min |

---

## All verified files
`usePurchaseMutations.ts` · `useInventoryMutations.ts` · `useCustomerMutations.ts` · `useSupplierMutations.ts` · `useEmployeeMutations.ts` · `useSalesMutations.ts` · `useReturnsMutations.ts` · `useSalesHandlers.ts` · `useInventoryHandlers.ts` · `useShift.tsx` · `useExpenses.ts` · `useCashRegister.ts` · `patchers.ts` · `registry.ts` · `types/inventory.ts` · `batchRepository.ts`
