# 🛡️ PharmaFlow AI: Edge Cases & Logic Audit Log

This document tracks deep architectural edge cases, security vulnerabilities, and logic pitfalls. Each case is researched against real-world pharmacy software failures and verified within our codebase.

## 📋 Audit Status Overview

| ID | Case Name | Complexity | Status | Verification Method |
|----|-----------|------------|--------|---------------------|
| EC-01 | **The Double-Sell (Race Condition)** | 🔴 High | 🟡 Verifying | Atomic RPC Check |
| EC-02 | **Multi-Batch Split (FEFO)** | 🟠 Med | 🟢 Verified | Transaction Log Review |
| EC-03 | **Partial Fractional Return** | 🔴 High | ⚪ Pending | Math Engine Unit Test |
| EC-04 | **Time Travel (Clock Tampering)** | 🟠 Med | 🟢 Verified | TimeService Offset |
| EC-05 | **Mid-Checkout Switch** | 🟡 Med | ⚪ Pending | Hook Guard Check |
| EC-06 | **Floating Point Drift** | 🔴 High | ⚪ Pending | Precision Math Stress Test |
| EC-07 | **Return to Purged Batch** | 🟡 Med | ⚪ Pending | DB Schema Integrity |
| EC-08 | **Credit Limit Overrun** | 🟠 Med | ⚪ Pending | Logic Constraint Check |
| EC-09 | **Mid-Session Price Change** | 🟡 Med | ⚪ Pending | Snapshot Logic Check |
| EC-10 | **Rollback Network Failure** | 🔴 High | ⚪ Pending | UndoManager Resilience |

---

## 🔍 Deep Dive & Verification Progress

### [EC-01] The Double-Sell (Race Condition)
**Description**: Two cashiers sell the same "last box" of a drug simultaneously.
**Risk**: Inventory drift (Physical stock = 0, System stock = -1 or still 1).
**Verification**:
- [x] Check `batchService.updateBatchQuantity` for atomic updates.
- [x] Verify Supabase RPC `atomic_increment_batch` is used.
- [ ] Script a concurrency test (Python/Node) to fire 10 simultaneous requests.

> [!NOTE]
> Current status: The system uses `UPDATE ... SET quantity = quantity + p_delta`, which is natively atomic in PostgreSQL. This prevents the "read-modify-write" race condition.

---

### [EC-04] Time Travel (Clock Tampering)
**Description**: User changes system clock to bypass expiry checks or backdate sales.
**Verification**:
- [x] Verify `TimeService` uses external NTP/Server sync.
- [x] Check `validateTransactionTime` in `StatusBarContext.tsx`.

> [!TIP]
> The implementation in `timeService.ts` correctly calculates an `offset` from a server source and applies it to `Date.now()`. Local clock changes do not affect `getVerifiedDate()`.

---

### [EC-02] Multi-Batch Split (FEFO)
**Description**: A single large sale (e.g., 100 units) must be fulfilled by multiple batches with different expiry dates.
**Verification**:
- [x] Review `batchService.allocateStock` logic.
- [x] Check if `transactionService` logs multiple movements for a single item.

> [!IMPORTANT]
> The `allocateStock` function correctly loops through sorted batches and creates multiple `BatchAllocation` entries. The `transactionService` then creates a movement for each allocation.

---

## 🛠️ Tools & Scripts
*(This section will be updated with Python scripts for stress testing)*
