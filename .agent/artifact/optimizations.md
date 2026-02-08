# Optimization Proposals 🚀

## ✅ Implementation Progress (تابع التقدم)

- [x] **Phase 1: Critical Stability (The "Memory Bomb")**
  - [x] Data Sharding/Archiving (Sales & Cash) `🚨 Critical`
  - [x] Cash Service Active Shift Caching `🚨 Critical`
- [ ] **Phase 2: High Impact / Quick Wins**
  - [ ] Map Lookups & O(1) Access `🔥 High`
  - [ ] Bulk Batch Creation `🔥 High`
  - [ ] Bulk Stock Updates `🔥 High`
  - [ ] Batch Service Optimization (Atomic Structure) `🔥 High`
- [ ] **Phase 3: Storage Capacity**
  - [ ] LZ-String Compression `🔥 High`
- [ ] **Phase 4: Optimization & Polish**
  - [ ] Settings Singleton `⚡ Medium`
  - [ ] Gemini AI Session Caching `⚡ Medium`
  - [ ] Buffered Audit Logs `⚡ Medium`

---

## 🎯 Evaluation Matrix (تقييم كل اقتراح)

| الاقتراح                 | الأولوية        | الجودة | سهولة التنفيذ | التقييم    |
| :----------------------- | :-------------- | :----- | :------------ | :--------- |
| **Data Sharding**        | 🚨 **Critical** | 9/10   | Medium        | ⭐⭐⭐⭐⭐ |
| **LZ Compression**       | 🔥 **High**     | 8/10   | Easy          | ⭐⭐⭐⭐   |
| **Bulk Batch Creation**  | 🔥 **High**     | 9/10   | Medium        | ⭐⭐⭐⭐⭐ |
| **Map Lookups**          | 🔥 **High**     | 10/10  | Easy          | ⭐⭐⭐⭐⭐ |
| **Buffered Audit Logs**  | ⚡ **Medium**   | 7/10   | Hard          | ⭐⭐⭐     |
| **Session Caching (AI)** | ⚡ **Medium**   | 8/10   | Easy          | ⭐⭐⭐⭐   |
| **Settings Singleton**   | ⚡ **Medium**   | 9/10   | Very Easy     | ⭐⭐⭐⭐⭐ |

---

## 🏗️ Architecture & Storage (System-Wide)

### 🔹 Strategy: Data Sharding / Archiving

**Proposal:** Horizontal Partitioning by Time

- **Problem:** `salesService` and `cashService` read the **entire history** (potentially years of data) into RAM on every page load.
- **Algorithm Change:**
  - **Current:** `storage.get('sales')` loads 10,000+ records.
  - **New:** Partition keys by period: `sales_2025_01`, `sales_2025_02`. Only load "Active Month" by default. Load others on demand.
- **Improvement Level:** 🚨 **Critical** (Prevents app crash after ~6 months of usage)
- **Benefits:**
  - **Memory:** Keeps heap usage constant regardless of years of usage.
  - **Speed:** Instant load times for current operations.

### 🔹 Strategy: Compression

**Proposal:** LZ-String Compression for Storage

- **Problem:** `localStorage` has a hard 5MB limit. Raw JSON strings waste 40-60% of this space.
- **Algorithm Change:**
  - **New:** Wrap `storage.set` to compress string if length > 1KB using `lz-string`. Decompress on `storage.get`.
- **Improvement Level:** 🔥 **High**
- **Benefits:**
  - **Capacity:** Effectively doubles or triples the storage limit (10MB+ equivalent).

---

## 🛠️ Module: `useEntityHandlers.ts`

### 🔹 Function: `handleApprovePurchase`

**Proposal:** Map-based Lookup & Bulk Batch Creation

- **Algorithm Change:**
  - **Current:** `O(N*M)` nested loops with `N` separate disk writes.
  - **New:** `O(N)` linear processing with **1** atomic disk write.
- **Improvement Level:** 🔥 **High** (Critical for large purchases)
- **Benefits:**
  - **Speed:** Drastically reduces I/O overhead.
  - **Safety:** Prevents partial data corruption (half-created batches) if the process crashes.

### 🔹 Function: `handleUpdateSale`

**Proposal:** Bulk Inventory Update & Map Lookups

- **Algorithm Change:**
  - **Current:** `O(N*M)` logic inside loops.
  - **New:** `O(N + M)` pre-parsing + **1** bulk update transaction.
- **Improvement Level:** 🔥 **High** (For complex modifications)
- **Benefits:**
  - **Speed:** uses `O(1)` Map lookups for matching items. Single React state update avoids render thrashing.
  - **Safety:** Transactional integrity; validates all stock changes before applying any.

---

## 📦 Service: `inventoryService.ts`

### 🔹 Function: `updateStock`

**Proposal:** Bulk Update Method (`updateStockBulk`)

- **Algorithm Change:**
  - **Current:** Linear calls (N reads + N writes).
  - **New:** Single I/O read/write operation for N items.
- **Improvement Level:** 🔥 **High**
- **Benefits:**
  - **Speed:** Reduces Storage I/O overhead by factor of N.
  - **Safety:** "All or Nothing" updates prevent inventory drift.

---

## 🛡️ Service: `auditService.ts`

### 🔹 Function: `log`

**Proposal:** Buffered Write Strategy

- **Algorithm Change:**
  - **Current:** Synchronous read+write for **EVERY** single log.
  - **New:** In-memory buffer flushed every 5 seconds or when buffer > 10 items.
- **Improvement Level:** ⚡ **Medium** (High impact during loops)
- **Benefits:**
  - **Speed:** Decouples logging cost from business logic execution.
  - **Safety:** Unload listeners ensure buffer is flushed before window close.

---

## 🧠 Service: `geminiService.ts`

### 🔹 Function: `callAI`

**Proposal:** Session Caching

- **Algorithm Change:**
  - **Current:** Fetches new response for identical queries (e.g., "Health Tip" or "Employee Stats" if data hasn't changed).
  - **New:** Cache responses using a hash of the prompt as key in `sessionStorage`.
- **Improvement Level:** ⚡ **Medium**
- **Benefits:**
  - **Cost:** Reduces API token usage.
  - **Latency:** Instant response for repeated queries.

---

## 🛒 Service: `salesHelpers.ts`

### 🔹 Function: `restoreStockForCancelledSale`

**Proposal:** Bulk Return & Map Lookup

- **Algorithm Change:**
  - **Current:** `O(N*M)` nested loops.
  - **New:** `O(N)` linear processing using `batchService.returnStockBulk`.
- **Improvement Level:** 🔥 **High** (For large cancellations)
- **Benefits:**
  - **Speed:** Single pass inventory update.
  - **Safety:** Transactional return ensures partial failures don't leave batches in an inconsistent state.

---

## 👥 Service: `customerService.ts`

### 🔹 Function: `getAll`

**Proposal:** Caching & Branch Filtering

- **Algorithm Change:**
  - **Current:** Full JSON Parse + Async Settings fetch on **every** call.
  - **New:** Memoized read with cache invalidation on writes.
- **Improvement Level:** ⚡ **Medium**
- **Benefits:**
  - **Speed:** Reduces CPU usage for frequent customer lookups.
  - **Safety:** Consistency maintained via cache invalidation on write.

---

## 💵 Service: `cashService.ts`

### 🔹 Function: `addTransaction`

**Proposal:** Active Shift Caching or Sub-storage

- **Algorithm Change:**
  - **Current:** Reads **entire** shift history (years of data) to add 1 transaction.
  - **New:** Cache "current open shift" in memory/separate key. Commit to archive only on Close Shift.
- **Improvement Level:** 🚨 **Critical**
- **Benefits:**
  - **Speed:** Removes the single biggest bottleneck in the Checkout flow.
  - **Safety:** Reduces risk of corrupting historical data during simple daily sales.

---

## ⚙️ Service: `settingsService.ts`

### 🔹 Function: `get`

**Proposal:** In-Memory Singleton Cache

- **Algorithm Change:**
  - **Current:** Disk Read (localStorage) on every single configuration check (theme, lang, tax).
  - **New:** Read from static memory variable; write updates variable + disk.
- **Improvement Level:** ⚡ **Medium** (Cumulative impact is high)
- **Benefits:**
  - **Speed:** Zero latency for checking settings.
  - **Safety:** No impact, purely performance.

---

## 🔐 Service: `authService.ts`

### 🔹 Function: `logAuditEvent`

**Proposal:** Rotating Log Buffer

- **Algorithm Change:**
  - **Current:** Reads ~500 items, prepends 1, writes ~500 items. Occurs on every login/logout.
  - **New:** Append-only buffer flushed periodically.
- **Improvement Level:** 📉 **Low** (Infrequent action)
- **Benefits:**
  - **Speed:** Minimal, but good practice.
