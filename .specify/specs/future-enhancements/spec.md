# Feature Specification: Future System Robustness Enhancements

**Feature Branch**: `211-future-robustness`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: User request: "DLQ & Race Conditions"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dead Letter Queue (DLQ) for Failed Syncs (Priority: P2)
As a System Administrator, I want the Sync Engine to isolate repeatedly failing network requests (Sync Actions) into a dedicated "Dead Letter Queue" instead of blocking the entire queue, so that other offline transactions can still be synchronized to the cloud while support engineers investigate the problematic payload.
**Why this priority**: Crucial for cloud sync independence. A single malformed payload should not stop the synchronization of healthy operations.
**Independent Test**: Can be tested by artificially injecting a malformed payload (e.g. invalid `CUSTOMER_ID`) into the Sync Queue, forcing it to fail 3 times, and verifying that the engine moves it to the DLQ and successfully resumes syncing the rest.

### User Story 2 - Optimistic Locking for High-Load Sales (Priority: P2)
As a Pharmacy Shift Manager, during peak rush hours, I want the system to gracefully handle the scenario where two cashiers attempt to sell the exact same physical package (Batch) of medicine simultaneously, so that the stock is calculated correctly without generating a negative/corrupted batch quantity.
**Why this priority**: The FEFO system currently relies on client-side state. In high-load multi-terminal environments, race conditions can corrupt local data before the sync resolves conflicts.
**Independent Test**: Simulate two concurrent `transactionService.completeSale()` calls for the same medicine ID with only 1 unit remaining in the batch. Verify that the second transaction fails explicitly with an "Out of Stock" or "Batch Modified" error rather than over-allocating.

---

## Requirements *(mandatory)*

### Functional Requirements

-   **FR-001**: Implementation of a **Dead Letter Queue (DLQ) mechanism** inside `syncQueueService.ts`.
-   **FR-002**: A `SyncAction` MUST have a `retryCount` field. If `retryCount` exceeds a pre-defined threshold (e.g., 3), the action is moved to a separate `dlq` table in IndexedDB.
-   **FR-003**: The UI MUST provide a "Sync Errors" section accessible to IT/Admins to view, edit, or clear the DLQ.
-   **FR-004**: Implementation of **Optimistic Versioning** for `StockBatch`. Each batch must maintain a `version` or `lastUpdatedAt` timestamp.
-   **FR-005**: `batchService.allocateStock` MUST verify that the `version` of the batch being deducted matches the currently stored version. If mismatched, the transaction aborts and prompts the cashier to refresh the cart.

### Edge Cases

- **Transient Errors vs. Permanent Errors**: Network timeouts should increment the retry count, but HTTP 400 (Bad Request) errors should instantly route the payload to the DLQ.
- **Race Condition Resolution**: If two cashiers sell the same last unit, the Sync Engine will eventually conflict on the server. Optimistic Locking catches this *locally* before it even hits the sync queue.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System continues syncing normal transactions even if the queue contains a permanently failing transaction.
- **SC-002**: 0 instances of negative `StockBatch` quantities across all terminals, even with synthetic concurrent checkout tests.
