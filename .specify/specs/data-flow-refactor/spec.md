# Feature Specification: Data Flow & Integrity Refactor

**Feature Branch**: `210-data-flow-refactor`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: User request: "Audit and improve data flow for correctness and non-duplication"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Atomic Checkout (Priority: P1)
As a Pharmacist, when I complete a sale, I want the system to ensure that the sale is recorded AND the stock is deducted AND the batches are updated as a single atomic operation, so that my inventory remains 100% accurate even if a crash occurs.
**Why this priority**: Essential for business accuracy and financial reporting.
**Independent Test**: Can be tested by forcing a network/storage failure during checkout and verifying that no partial data remains.

### User Story 2 - Real-time Stock Sync (Priority: P2)
As an Inventory Manager, I want to see a single source of truth for stock levels that is always consistent with the batches, so I don't get confused by conflicting numbers.
**Why this priority**: Avoids procurement errors caused by incorrect stock displays.
**Independent Test**: Verify that editing a batch immediately updates the displayed drug stock without a page reload.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Implementation of a **Transaction Coordinator** for Sales.
- **FR-002**: `Drug.stock` MUST be a virtual/computed field derived from `StockBatch` sum.
- **FR-003**: The system MUST follow a **Persistence-First** pattern (Write to Storage -> Confirm -> Update React State).
- **FR-004**: Implementation of an **Audit Trace** for all stock movements (StockMovement entity).
- **FR-005**: All cross-entity updates (e.g., Sale + Stock) MUST be wrapped in an error-handling block that performs manual rollback if persistence fails.

### Edge Cases

- **Partial Write**: What happens if the Sale is saved but the Stock update fails? (Handled by rollback).
- **Concurrent Sales**: Two POS terminals selling the same drug simultaneously. (Handled by atomic batch deduction).
- **Offline Mode**: Handling transactions when local storage is the only source (Already supported by current sharding, but needs robustness in sync).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero "Stock Drift" instances (Difference between Drug.stock and sum(Batches.quantity) = 0).
- **SC-002**: 100% reliability of "Cancel Sale" returning correct stock to the correct batches.
- **SC-003**: No duplicate entries in Sales history due to double-submission or state-sync loops.
