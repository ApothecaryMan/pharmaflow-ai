# Artifact 1: The "Boringly Detailed" Execution Roadmap

## Project Timeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION TIMELINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1          PHASE 2          PHASE 3         PHASE 4        PHASE 5  │
│  Foundation       Intelligence     API Layer       Frontend        Harden   │
│  (Week 1-2)       (Week 3-4)       (Week 5-6)      (Week 7-10)    (Week 11)│
│                                                                             │
│  ████████████ ──► ████████████ ──► ██████████ ──► ████████████ ──► ██████  │
│                                                                             │
│  DB Schema        Batch Jobs       REST APIs       React Tabs      E2E Test │
│  Core Services    Calculations     WebSocket       State Mgmt      Perf     │
│  Base Models      Caching          Auth/RBAC       Components      Security │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation Layer (Week 1-2)

### Sprint Goal
Establish database schema, core domain models, and base service architecture. No business logic yet—just the skeleton.

### Ticket Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: FOUNDATION                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 1.1: Database Schema Setup                                          │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 3 days                                                           │
│  Assignee: Backend Lead                                                     │
│  Dependencies: None (Starting Point)                                        │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 1.1.1: Create migration for product_intelligence table                 │
│  ├─ 1.1.2: Create migration for batch_risk table                           │
│  ├─ 1.1.3: Create migration for seasonal_indices table                     │
│  ├─ 1.1.4: Create migration for supplier_performance table                 │
│  ├─ 1.1.5: Create migration for audit_events table                         │
│  ├─ 1.1.6: Create migration for system_alerts table                        │
│  ├─ 1.1.7: Add all indexes per schema specification                        │
│  ├─ 1.1.8: Create database seeder for test data                            │
│  └─ 1.1.9: Document schema in team wiki                                    │
│                                                                             │
│  Acceptance Criteria:                                                       │
│  ✓ All migrations run without error on fresh database                      │
│  ✓ Rollback migrations work correctly                                       │
│  ✓ Seeder creates 1000+ products with realistic data                       │
│  ✓ All foreign key constraints enforced                                    │
│  ✓ Indexes verified with EXPLAIN ANALYZE                                   │
│                                                                             │
│  Definition of Done:                                                        │
│  ✓ Code reviewed by DBA or Senior Backend                                  │
│  ✓ Migration tested on staging environment                                 │
│  ✓ Schema diagram updated in Confluence                                    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 1.2: Core Domain Models (Node.js)                                   │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 2 days                                                           │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKET 1.1 (Schema must exist)                               │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 1.2.1: Create ProductIntelligence model with TypeScript types          │
│  ├─ 1.2.2: Create BatchRisk model                                          │
│  ├─ 1.2.3: Create SeasonalIndex model                                      │
│  ├─ 1.2.4: Create SupplierPerformance model                                │
│  ├─ 1.2.5: Create AuditEvent model                                         │
│  ├─ 1.2.6: Create SystemAlert model                                        │
│  ├─ 1.2.7: Set up Prisma/TypeORM configuration                             │
│  └─ 1.2.8: Write model unit tests (basic CRUD)                             │
│                                                                             │
│  Acceptance Criteria:                                                       │
│  ✓ All models have full TypeScript interfaces                              │
│  ✓ Validation decorators/schemas defined                                   │
│  ✓ Basic CRUD operations tested                                            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 1.3: Base Service Architecture                                      │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 2 days                                                           │
│  Assignee: Backend Lead                                                     │
│  Dependencies: TICKET 1.2                                                   │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 1.3.1: Create BaseService class with common methods                    │
│  ├─ 1.3.2: Set up dependency injection container (InversifyJS/tsyringe)    │
│  ├─ 1.3.3: Create ProductIntelligenceService (empty methods)               │
│  ├─ 1.3.4: Create RiskAnalysisService (empty methods)                      │
│  ├─ 1.3.5: Create FinancialReportService (empty methods)                   │
│  ├─ 1.3.6: Create AuditService (empty methods)                             │
│  ├─ 1.3.7: Set up error handling middleware                                │
│  └─ 1.3.8: Set up logging infrastructure (Winston/Pino)                    │
│                                                                             │
│  Acceptance Criteria:                                                       │
│  ✓ Services injectable and testable                                        │
│  ✓ Error handling catches and logs all exceptions                          │
│  ✓ Structured logging with correlation IDs                                 │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 1.4: Redis Cache Infrastructure                                     │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P1 (High)                                                        │
│  Estimate: 1 day                                                            │
│  Assignee: Backend Developer                                                │
│  Dependencies: None (can parallel with 1.2)                                 │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 1.4.1: Set up Redis connection with ioredis                            │
│  ├─ 1.4.2: Create CacheService with get/set/invalidate methods             │
│  ├─ 1.4.3: Define cache key naming conventions                             │
│  ├─ 1.4.4: Implement cache-aside pattern helper                            │
│  └─ 1.4.5: Write cache integration tests                                   │
│                                                                             │
│  Cache Key Convention:                                                      │
│  • intelligence:product:{product_id}                                       │
│  • intelligence:store:{store_id}:summary                                   │
│  • risk:expiry:{store_id}                                                  │
│  • financial:{store_id}:{period_key}                                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 1.5: Message Queue Setup (Bull/BullMQ)                              │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P1 (High)                                                        │
│  Estimate: 1 day                                                            │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKET 1.4 (Redis required)                                  │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 1.5.1: Set up BullMQ with Redis connection                             │
│  ├─ 1.5.2: Create queue definitions for batch jobs                         │
│  │         • intelligence-calculation-queue                                │
│  │         • risk-analysis-queue                                           │
│  │         • seasonality-update-queue                                      │
│  ├─ 1.5.3: Create base job processor class                                 │
│  ├─ 1.5.4: Set up Bull Board for queue monitoring                          │
│  └─ 1.5.5: Write queue health check endpoint                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1 Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         PHASE 1 DEPENDENCY GRAPH                            │
│                                                                             │
│                              ┌─────────┐                                    │
│                              │  1.1    │                                    │
│                              │ Schema  │                                    │
│                              └────┬────┘                                    │
│                                   │                                         │
│                    ┌──────────────┼──────────────┐                          │
│                    │              │              │                          │
│                    ▼              ▼              ▼                          │
│              ┌─────────┐   ┌─────────┐    ┌─────────┐                       │
│              │  1.2    │   │  1.4    │    │         │                       │
│              │ Models  │   │ Redis   │    │ (Wait)  │                       │
│              └────┬────┘   └────┬────┘    └─────────┘                       │
│                   │             │                                           │
│                   ▼             ▼                                           │
│              ┌─────────┐   ┌─────────┐                                      │
│              │  1.3    │   │  1.5    │                                      │
│              │Services │   │ Queues  │                                      │
│              └────┬────┘   └────┬────┘                                      │
│                   │             │                                           │
│                   └──────┬──────┘                                           │
│                          │                                                  │
│                          ▼                                                  │
│                   ┌─────────────┐                                           │
│                   │  PHASE 1    │                                           │
│                   │  COMPLETE   │                                           │
│                   └─────────────┘                                           │
│                                                                             │
│  LEGEND:                                                                    │
│  ───────                                                                    │
│  Arrow (→) = "Must complete before"                                         │
│  Parallel tasks can be assigned to different developers                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 2: Intelligence Engine (Week 3-4)

### Sprint Goal
Implement all calculation algorithms as batch jobs. This is the "brain" of the system—no UI, just pure business logic.

### Ticket Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: INTELLIGENCE ENGINE                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 2.1: Core Calculation Utilities                                     │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 3 days                                                           │
│  Assignee: Senior Backend Developer                                         │
│  Dependencies: PHASE 1 COMPLETE                                             │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 2.1.1: Implement calculateStockDays() with edge cases                  │
│  ├─ 2.1.2: Implement calculateWeightedVelocity()                           │
│  ├─ 2.1.3: Implement calculateReorderConfidence()                          │
│  ├─ 2.1.4: Implement detectCashTrap()                                      │
│  ├─ 2.1.5: Implement calculateExpiryRiskScore()                            │
│  ├─ 2.1.6: Implement calculateSeasonalityIndex()                           │
│  ├─ 2.1.7: Implement suggestReorderQuantity()                              │
│  └─ 2.1.8: Write comprehensive unit tests (see Artifact 5)                 │
│                                                                             │
│  CRITICAL: All functions must handle:                                       │
│  • Division by zero                                                         │
│  • Null/undefined inputs                                                    │
│  • Negative values (data errors)                                            │
│  • Empty arrays                                                             │
│                                                                             │
│  Acceptance Criteria:                                                       │
│  ✓ 100% unit test coverage on calculation functions                        │
│  ✓ All edge cases documented in code comments                              │
│  ✓ Performance: Each function < 10ms for single product                    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 2.2: Nightly Intelligence Batch Job                                 │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 3 days                                                           │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKET 2.1                                                   │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 2.2.1: Create IntelligenceCalculationJob processor                     │
│  ├─ 2.2.2: Implement batch processing (1000 products/batch)                │
│  ├─ 2.2.3: Add progress tracking and logging                               │
│  ├─ 2.2.4: Implement failure recovery (resume from last success)           │
│  ├─ 2.2.5: Add job scheduling (cron: 0 2 * * *)                            │
│  ├─ 2.2.6: Create manual trigger endpoint for admins                       │
│  └─ 2.2.7: Add Slack/email notification on completion/failure              │
│                                                                             │
│  Job Flow:                                                                   │
│  1. Lock job (prevent duplicate runs)                                       │
│  2. Fetch all active products in batches                                    │
│  3. For each product: Calculate all intelligence fields                     │
│  4. Bulk upsert to product_intelligence table                              │
│  5. Invalidate relevant cache keys                                          │
│  6. Update job_runs table with statistics                                   │
│  7. Release lock                                                            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 2.3: Real-Time Stock Event Handler                                  │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P1 (High)                                                        │
│  Estimate: 2 days                                                           │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKET 2.1                                                   │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 2.3.1: Create StockChangeEvent listener                                │
│  ├─ 2.3.2: On sale: Update velocity, stock_days (lightweight calc)         │
│  ├─ 2.3.3: On stock receipt: Update stock_days, clear stockout flag        │
│  ├─ 2.3.4: Debounce updates (max 1 update per product per 5 min)           │
│  └─ 2.3.5: Invalidate cache on significant changes                         │
│                                                                             │
│  Event Types to Handle:                                                     │
│  • SALE_COMPLETED                                                           │
│  • STOCK_RECEIVED                                                           │
│  • STOCK_ADJUSTED                                                           │
│  • STOCK_TRANSFERRED                                                        │
│  • RETURN_PROCESSED                                                         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 2.4: Risk Analysis Batch Job                                        │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 2 days                                                           │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKET 2.1                                                   │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 2.4.1: Create RiskAnalysisJob processor                                │
│  ├─ 2.4.2: Scan all batches for expiry risk                                │
│  ├─ 2.4.3: Calculate cash trap scores for all products                     │
│  ├─ 2.4.4: Identify dead stock (zero sales > 60 days)                      │
│  ├─ 2.4.5: Generate system alerts for critical risks                       │
│  ├─ 2.4.6: Schedule: Run daily at 3 AM (after intelligence job)            │
│  └─ 2.4.7: Create risk summary for dashboard                               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 2.5: Seasonality Index Monthly Job                                  │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P2 (Medium)                                                      │
│  Estimate: 2 days                                                           │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKET 2.1                                                   │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 2.5.1: Create SeasonalityCalculationJob processor                      │
│  ├─ 2.5.2: Analyze 12+ months of historical data per product               │
│  ├─ 2.5.3: Calculate monthly indices (baseline = 1.0)                      │
│  ├─ 2.5.4: Detect seasonal trajectory (rising/stable/declining)            │
│  ├─ 2.5.5: Store in seasonal_indices table                                 │
│  ├─ 2.5.6: Schedule: Run on 1st of each month at 4 AM                      │
│  └─ 2.5.7: Handle new products (insufficient data gracefully)              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 2.6: Supplier Performance Tracker                                   │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P2 (Medium)                                                      │
│  Estimate: 1 day                                                            │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKET 2.1                                                   │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 2.6.1: Track PO submission → receipt time                              │
│  ├─ 2.6.2: Calculate average lead time per supplier                        │
│  ├─ 2.6.3: Calculate lead time variability (std deviation)                 │
│  ├─ 2.6.4: Update on each stock receipt event                              │
│  └─ 2.6.5: Expose via SupplierPerformanceService                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 2 Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         PHASE 2 DEPENDENCY GRAPH                            │
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │   PHASE 1       │                                 │
│                         │   COMPLETE      │                                 │
│                         └────────┬────────┘                                 │
│                                  │                                          │
│                                  ▼                                          │
│                         ┌─────────────────┐                                 │
│                         │      2.1        │                                 │
│                         │  Core Utils     │                                 │
│                         │  (CRITICAL)     │                                 │
│                         └────────┬────────┘                                 │
│                                  │                                          │
│           ┌──────────┬──────────┼──────────┬──────────┐                     │
│           │          │          │          │          │                     │
│           ▼          ▼          ▼          ▼          ▼                     │
│      ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                 │
│      │  2.2   │ │  2.3   │ │  2.4   │ │  2.5   │ │  2.6   │                 │
│      │Nightly │ │Real-   │ │ Risk   │ │Season- │ │Supplier│                 │
│      │  Job   │ │ Time   │ │  Job   │ │ ality  │ │  Perf  │                 │
│      └────────┘ └────────┘ └────────┘ └────────┘ └────────┘                 │
│           │          │          │          │          │                     │
│           └──────────┴──────────┴──────────┴──────────┘                     │
│                                  │                                          │
│                                  ▼                                          │
│                         ┌─────────────────┐                                 │
│                         │    PHASE 2      │                                 │
│                         │    COMPLETE     │                                 │
│                         └─────────────────┘                                 │
│                                                                             │
│  NOTE: 2.2-2.6 can be developed in parallel after 2.1 is done              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 3: API Layer (Week 5-6)

### Sprint Goal
Expose all intelligence data through secure, well-documented REST APIs. Implement WebSocket for real-time updates.

### Ticket Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: API LAYER                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 3.1: API Route Structure & Middleware                               │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 2 days                                                           │
│  Assignee: Backend Lead                                                     │
│  Dependencies: PHASE 2 COMPLETE                                             │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 3.1.1: Set up Express router structure                                 │
│  │         • /api/v1/intelligence/procurement                              │
│  │         • /api/v1/intelligence/financials                               │
│  │         • /api/v1/intelligence/risk                                     │
│  │         • /api/v1/intelligence/audit                                    │
│  │         • /api/v1/intelligence/dashboard                                │
│  ├─ 3.1.2: Implement authentication middleware (JWT validation)            │
│  ├─ 3.1.3: Implement RBAC middleware (role-based access)                   │
│  ├─ 3.1.4: Implement request validation middleware (Joi/Zod)               │
│  ├─ 3.1.5: Implement rate limiting per endpoint                            │
│  ├─ 3.1.6: Set up request/response logging                                 │
│  └─ 3.1.7: Create OpenAPI/Swagger documentation                            │
│                                                                             │
│  Route Permission Matrix:                                                   │
│  ┌────────────────────┬──────────┬────────────┬─────────┬─────────┐        │
│  │ Endpoint           │ Cashier  │ Pharmacist │ Manager │ Auditor │        │
│  ├────────────────────┼──────────┼────────────┼─────────┼─────────┤        │
│  │ /procurement       │    ✗     │    READ    │  WRITE  │  READ   │        │
│  │ /financials        │    ✗     │    READ    │  WRITE  │  WRITE  │        │
│  │ /risk              │    ✗     │    READ    │  WRITE  │  READ   │        │
│  │ /audit             │  SELF    │    READ    │  WRITE  │  WRITE  │        │
│  │ /dashboard         │  LIMITED │    READ    │  WRITE  │  READ   │        │
│  └────────────────────┴──────────┴────────────┴─────────┴─────────┘        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 3.2: Procurement API Endpoints                                      │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 2 days                                                           │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKET 3.1                                                   │
│                                                                             │
│  Endpoints:                                                                  │
│  ├─ GET  /procurement/items                                                │
│  │       Query: storeId, supplierId, categoryId, stockStatus,              │
│  │              minConfidence, seasonSignal, page, limit, sort             │
│  │       Response: Paginated list (see Artifact 3)                         │
│  │                                                                         │
│  ├─ GET  /procurement/items/:productId                                     │
│  │       Response: Single item with full calculation breakdown             │
│  │                                                                         │
│  ├─ GET  /procurement/summary                                              │
│  │       Response: KPI summary (need to order count, stockouts, etc.)      │
│  │                                                                         │
│  ├─ POST /procurement/generate-po                                          │
│  │       Body: { items: [{ productId, quantity }], supplierId }            │
│  │       Response: Generated PO document                                   │
│  │                                                                         │
│  └─ GET  /procurement/pending-pos                                          │
│          Response: List of pending purchase orders                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 3.3: Financials API Endpoints                                       │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 2 days                                                           │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKET 3.1                                                   │
│                                                                             │
│  Endpoints:                                                                  │
│  ├─ GET  /financials/summary                                               │
│  │       Query: storeId, startDate, endDate, compareWithPrior              │
│  │       Response: Revenue, COGS, Profit, Margin, comparison deltas        │
│  │                                                                         │
│  ├─ GET  /financials/by-category                                           │
│  │       Query: storeId, startDate, endDate                                │
│  │       Response: Breakdown by category with margins                       │
│  │                                                                         │
│  ├─ GET  /financials/by-product                                            │
│  │       Query: storeId, startDate, endDate, categoryId, abcClass,         │
│  │              page, limit, sort                                          │
│  │       Response: Paginated product-level financials                       │
│  │                                                                         │
│  ├─ GET  /financials/drill-down/:kpi                                       │
│  │       Params: kpi = 'revenue' | 'profit' | 'cogs'                       │
│  │       Query: storeId, startDate, endDate                                │
│  │       Response: Transaction-level breakdown for audit trail             │
│  │                                                                         │
│  └─ GET  /financials/export                                                │
│          Query: storeId, startDate, endDate, format (csv/xlsx)             │
│          Response: File download                                            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 3.4: Risk API Endpoints                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 2 days                                                           │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKET 3.1                                                   │
│                                                                             │
│  Endpoints:                                                                  │
│  ├─ GET  /risk/summary                                                     │
│  │       Query: storeId                                                    │
│  │       Response: Total at-risk value by category                          │
│  │                                                                         │
│  ├─ GET  /risk/expiring                                                    │
│  │       Query: storeId, daysThreshold, page, limit, sort                  │
│  │       Response: Batches expiring within threshold                        │
│  │                                                                         │
│  ├─ GET  /risk/cash-traps                                                  │
│  │       Query: storeId, minScore, page, limit                             │
│  │       Response: Products identified as cash traps                        │
│  │                                                                         │
│  ├─ GET  /risk/dead-stock                                                  │
│  │       Query: storeId, daysSinceLastSale, page, limit                    │
│  │       Response: Products with no recent sales                            │
│  │                                                                         │
│  ├─ POST /risk/create-discount                                             │
│  │       Body: { batchId, discountPercent, endDate, reason }               │
│  │       Response: Created discount record                                  │
│  │                                                                         │
│  └─ POST /risk/write-off                                                   │
│          Body: { batchId, quantity, reason }                                │
│          Response: Write-off confirmation, inventory updated                │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 3.5: Audit API Endpoints                                            │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 2 days                                                           │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKET 3.1                                                   │
│                                                                             │
│  Endpoints:                                                                  │
│  ├─ GET  /audit/transactions                                               │
│  │       Query: storeId, startDate, endDate, type, cashierId,              │
│  │              productId, hasAnomaly, search, page, limit                 │
│  │       Response: Paginated transaction log                                │
│  │                                                                         │
│  ├─ GET  /audit/transactions/:transactionId                                │
│  │       Response: Full transaction detail with line items & audit trail   │
│  │                                                                         │
│  ├─ GET  /audit/anomalies                                                  │
│  │       Query: storeId, startDate, endDate, type (void/discount/below)    │
│  │       Response: Transactions flagged with anomalies                      │
│  │                                                                         │
│  └─ GET  /audit/export                                                     │
│          Query: storeId, startDate, endDate, format                         │
│          Response: File download for regulatory compliance                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 3.6: Dashboard API Endpoints                                        │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P1 (High)                                                        │
│  Estimate: 1 day                                                            │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKETS 3.2, 3.3, 3.4                                        │
│                                                                             │
│  Endpoints:                                                                  │
│  ├─ GET  /dashboard/overview                                               │
│  │       Query: storeId                                                    │
│  │       Response: Aggregated KPIs from all domains                         │
│  │                                                                         │
│  └─ GET  /dashboard/alerts                                                 │
│          Query: storeId, priority (critical/high/medium)                    │
│          Response: Active system alerts                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 3.7: WebSocket Real-Time Updates                                    │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P1 (High)                                                        │
│  Estimate: 2 days                                                           │
│  Assignee: Backend Developer                                                │
│  Dependencies: TICKET 3.1                                                   │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 3.7.1: Set up Socket.IO server                                         │
│  ├─ 3.7.2: Implement authentication for WebSocket connections              │
│  ├─ 3.7.3: Create room structure (per store)                               │
│  ├─ 3.7.4: Emit events on:                                                 │
│  │         • New critical alert                                            │
│  │         • Stockout detected                                             │
│  │         • Large transaction completed                                   │
│  │         • Daily totals update (every 5 min)                             │
│  └─ 3.7.5: Implement reconnection handling                                 │
│                                                                             │
│  Event Types:                                                                │
│  • ALERT_CREATED                                                            │
│  • STOCKOUT_DETECTED                                                        │
│  • STOCK_CRITICAL (< 2 days)                                               │
│  • DAILY_PULSE_UPDATE                                                       │
│  • BATCH_JOB_COMPLETED                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Frontend Implementation (Week 7-10)

### Sprint Goal
Build all React components for the multi-tab interface. Implement state management, data fetching, and user interactions.

### Ticket Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: FRONTEND IMPLEMENTATION                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 4.1: Project Setup & Architecture                                   │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 2 days                                                           │
│  Assignee: Frontend Lead                                                    │
│  Dependencies: API Contracts Finalized (3.2-3.6)                            │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 4.1.1: Initialize React app (Vite + TypeScript)                        │
│  ├─ 4.1.2: Set up folder structure:                                        │
│  │         src/                                                            │
│  │         ├── components/                                                 │
│  │         │   ├── common/          (Button, Table, Card, etc.)           │
│  │         │   ├── procurement/     (ProcurementGrid, ConfidenceBadge)    │
│  │         │   ├── financials/      (FinancialKPIs, MarginChart)          │
│  │         │   ├── risk/            (RiskCard, ExpiryGrid)                │
│  │         │   └── audit/           (TransactionLog, AuditDetail)         │
│  │         ├── pages/                                                      │
│  │         │   ├── IntelligenceDashboard.tsx                              │
│  │         │   ├── ProcurementTab.tsx                                     │
│  │         │   ├── FinancialsTab.tsx                                      │
│  │         │   ├── RiskTab.tsx                                            │
│  │         │   └── AuditTab.tsx                                           │
│  │         ├── hooks/               (useIntelligence, useFilters)         │
│  │         ├── services/            (API clients)                         │
│  │         ├── store/               (Zustand/Redux slices)                │
│  │         ├── types/               (TypeScript interfaces)               │
│  │         └── utils/               (formatters, validators)              │
│  ├─ 4.1.3: Set up TailwindCSS + shadcn/ui                                  │
│  ├─ 4.1.4: Set up React Query for data fetching                            │
│  ├─ 4.1.5: Set up Zustand for global state                                 │
│  ├─ 4.1.6: Create TypeScript interfaces from API contracts                 │
│  └─ 4.1.7: Set up React Router with tab routes                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 4.2: Global Layout & Navigation                                     │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 2 days                                                           │
│  Assignee: Frontend Developer                                               │
│  Dependencies: TICKET 4.1                                                   │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 4.2.1: Create IntelligenceLayout component                             │
│  │         • Global header with store selector                             │
│  │         • Tab navigation bar                                            │
│  │         • Global context bar (period selector for shared state)         │
│  ├─ 4.2.2: Implement tab routing with URL sync                             │
│  ├─ 4.2.3: Create GlobalFilterContext provider                             │
│  ├─ 4.2.4: Implement store selector with persistence                       │
│  ├─ 4.2.5: Create RefreshButton with loading state                         │
│  └─ 4.2.6: Implement tab badges (alert counts)                             │
│                                                                             │
│  State Management:                                                           │
│  // stores/globalStore.ts                                                   │
│  interface GlobalState {                                                    │
│    storeId: string;                                                        │
│    setStoreId: (id: string) => void;                                       │
│    sharedDateRange: { start: Date; end: Date };                            │
│    setSharedDateRange: (range: DateRange) => void;                         │
│  }                                                                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 4.3: Common Components Library                                      │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 3 days                                                           │
│  Assignee: Frontend Developer                                               │
│  Dependencies: TICKET 4.1                                                   │
│                                                                             │
│  Components to Build:                                                        │
│  ├─ DataTable: Sortable, paginated table with row selection                │
│  ├─ KPICard: Metric display with comparison delta                          │
│  ├─ FilterBar: Reusable filter container                                   │
│  ├─ DateRangePicker: Period selector with presets                          │
│  ├─ ConfidenceIndicator: Visual confidence score (dots/bar)                │
│  ├─ TrendIndicator: Up/down/stable arrows with color                       │
│  ├─ StatusBadge: Colored badges for status display                         │
│  ├─ Tooltip: Rich tooltips with calculation breakdowns                     │
│  ├─ Modal: Slide-over and center modals                                    │
│  ├─ EmptyState: Friendly empty data displays                               │
│  └─ LoadingSkeleton: Shimmer loading states                                │
│                                                                             │
│  Each Component Requires:                                                    │
│  ✓ TypeScript props interface                                              │
│  ✓ Storybook story                                                         │
│  ✓ Basic unit test                                                         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 4.4: Dashboard Tab Implementation                                   │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P1 (High)                                                        │
│  Estimate: 2 days                                                           │
│  Assignee: Frontend Developer                                               │
│  Dependencies: TICKETS 4.2, 4.3, 3.6                                        │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 4.4.1: Create DashboardPage component                                  │
│  ├─ 4.4.2: Build AlertsWidget (critical alerts list)                       │
│  ├─ 4.4.3: Build TodaysPulseWidget (daily metrics)                         │
│  ├─ 4.4.4: Build ProcurementSnapshotWidget                                 │
│  ├─ 4.4.5: Build FinancialSnapshotWidget                                   │
│  ├─ 4.4.6: Build RiskSnapshotWidget                                        │
│  ├─ 4.4.7: Implement click-through navigation to tabs                      │
│  ├─ 4.4.8: Set up WebSocket connection for real-time updates               │
│  └─ 4.4.9: Add auto-refresh logic (30 second interval)                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 4.5: Procurement Tab Implementation                                 │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 4 days                                                           │
│  Assignee: Frontend Developer                                               │
│  Dependencies: TICKETS 4.2, 4.3, 3.2                                        │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 4.5.1: Create ProcurementPage component                                │
│  ├─ 4.5.2: Build ProcurementFilterBar                                      │
│  │         • Supplier dropdown                                             │
│  │         • Category dropdown                                             │
│  │         • Stock status radio buttons                                    │
│  │         • Confidence slider                                             │
│  │         • Season signal checkboxes                                      │
│  ├─ 4.5.3: Build ProcurementKPIs row                                       │
│  ├─ 4.5.4: Build ProcurementGrid with columns:                             │
│  │         • Checkbox (selection)                                          │
│  │         • Product name + supplier                                       │
│  │         • Stock + Stock Days                                            │
│  │         • Velocity                                                      │
│  │         • Season Signal (with icon)                                     │
│  │         • Suggested Order (editable)                                    │
│  │         • Confidence Score (visual)                                     │
│  ├─ 4.5.5: Build ConfidenceTooltip (calculation breakdown)                 │
│  ├─ 4.5.6: Build SuggestedOrderTooltip (formula explanation)               │
│  ├─ 4.5.7: Implement row styling based on status                           │
│  ├─ 4.5.8: Build GeneratePOModal                                           │
│  │         • Summary of selected items                                     │
│  │         • Quantity confirmation/edit                                    │
│  │         • Supplier confirmation                                         │
│  │         • Submit action                                                 │
│  ├─ 4.5.9: Implement bulk selection logic                                  │
│  └─ 4.5.10: Add product history side panel                                 │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 4.6: Financials Tab Implementation                                  │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 4 days                                                           │
│  Assignee: Frontend Developer                                               │
│  Dependencies: TICKETS 4.2, 4.3, 3.3                                        │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 4.6.1: Create FinancialsPage component                                 │
│  ├─ 4.6.2: Build FinancialsFilterBar                                       │
│  │         • Date range picker (synced with global state)                  │
│  │         • Category filter                                               │
│  │         • ABC class filter                                              │
│  │         • Compare toggle                                                │
│  ├─ 4.6.3: Build FinancialKPIRow                                           │
│  │         • Revenue card (clickable)                                      │
│  │         • Gross Profit card (clickable)                                 │
│  │         • Margin % card                                                 │
│  │         • COGS card                                                     │
│  │         • Units Sold card                                               │
│  │         • Avg Basket card                                               │
│  ├─ 4.6.4: Build CategoryBreakdownTable                                    │
│  ├─ 4.6.5: Build ProductFinancialsGrid with columns:                       │
│  │         • Product name                                                  │
│  │         • ABC class                                                     │
│  │         • Qty Sold                                                      │
│  │         • Revenue                                                       │
│  │         • COGS                                                          │
│  │         • Profit                                                        │
│  │         • Margin % (with color coding)                                  │
│  ├─ 4.6.6: Build DrillDownModal (audit trail)                              │
│  │         • Calculation verification section                              │
│  │         • Transaction register table                                    │
│  │         • Anomalies section                                             │
│  ├─ 4.6.7: Implement chart view toggle (table vs chart)                    │
│  └─ 4.6.8: Add CSV/Excel export functionality                              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 4.7: Risk Tab Implementation                                        │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 4 days                                                           │
│  Assignee: Frontend Developer                                               │
│  Dependencies: TICKETS 4.2, 4.3, 3.4                                        │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 4.7.1: Create RiskPage component                                       │
│  ├─ 4.7.2: Build RiskOverviewCards                                         │
│  │         • Expiring card (clickable)                                     │
│  │         • Cash Traps card (clickable)                                   │
│  │         • Dead Stock card (clickable)                                   │
│  │         • Overstock card (clickable)                                    │
│  ├─ 4.7.3: Build RiskViewSelector (radio buttons)                          │
│  ├─ 4.7.4: Build ExpiryRiskGrid with columns:                              │
│  │         • Checkbox                                                      │
│  │         • Product + Batch                                               │
│  │         • Quantity                                                      │
│  │         • Expiry Date                                                   │
│  │         • Days Left                                                     │
│  │         • Value at Risk                                                 │
│  │         • Risk Score (with tooltip)                                     │
│  │         • Action button                                                 │
│  ├─ 4.7.5: Build CashTrapGrid (different columns)                          │
│  ├─ 4.7.6: Build DeadStockGrid (different columns)                         │
│  ├─ 4.7.7: Build RiskScoreTooltip (calculation breakdown)                  │
│  ├─ 4.7.8: Build CreateDiscountModal                                       │
│  │         • Selected items summary                                        │
│  │         • Discount % input                                              │
│  │         • Expected recovery calculation                                 │
│  │         • Required sales velocity display                               │
│  ├─ 4.7.9: Build RecommendedActionsPanel                                   │
│  │         • AI-generated recommendations                                  │
│  │         • One-click action buttons                                      │
│  └─ 4.7.10: Implement write-off workflow                                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 4.8: Audit Tab Implementation                                       │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 3 days                                                           │
│  Assignee: Frontend Developer                                               │
│  Dependencies: TICKETS 4.2, 4.3, 3.5                                        │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 4.8.1: Create AuditPage component                                      │
│  ├─ 4.8.2: Build AuditSearchBar (full-text search)                         │
│  ├─ 4.8.3: Build AuditFilterBar                                            │
│  │         • Date range picker                                             │
│  │         • Transaction type checkboxes                                   │
│  │         • Cashier dropdown                                              │
│  │         • Product/Category dropdown                                     │
│  │         • Anomaly flags checkboxes                                      │
│  ├─ 4.8.4: Build QuickAuditButtons                                         │
│  │         • Voids Today                                                   │
│  │         • High Discounts                                                │
│  │         • Below Cost                                                    │
│  │         • Controlled Substances                                         │
│  │         • Price Overrides                                               │
│  ├─ 4.8.5: Build TransactionLogGrid with columns:                          │
│  │         • Timestamp                                                     │
│  │         • Invoice #                                                     │
│  │         • Type (with icon)                                              │
│  │         • Cashier                                                       │
│  │         • Product                                                       │
│  │         • Qty                                                           │
│  │         • Amount                                                        │
│  │         • Flag (anomaly indicator)                                      │
│  ├─ 4.8.6: Build TransactionDetailModal                                    │
│  │         • Transaction header                                            │
│  │         • Line items table                                              │
│  │         • Anomaly explanation (if applicable)                           │
│  │         • Full audit trail timeline                                     │
│  │         • Action buttons (print, export, flag)                          │
│  └─ 4.8.7: Implement expandable row for inline detail                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Hardening & Launch (Week 11-12)

### Sprint Goal
End-to-end testing, performance optimization, security audit, and production deployment.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: HARDENING & LAUNCH                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 5.1: End-to-End Testing                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 3 days                                                           │
│  Assignee: QA Engineer + Full Team                                          │
│  Dependencies: ALL PHASE 4 COMPLETE                                         │
│                                                                             │
│  Test Scenarios:                                                             │
│  ├─ User Journey: Manager morning check (Dashboard → Procurement → PO)     │
│  ├─ User Journey: Monthly reporting (Financials → Drill-down → Export)     │
│  ├─ User Journey: Risk mitigation (Risk → Discount Campaign → Verify)      │
│  ├─ User Journey: Fraud investigation (Audit → Search → Detail)            │
│  ├─ Cross-tab: Filter persistence and URL sharing                          │
│  ├─ Real-time: WebSocket reconnection on network loss                      │
│  ├─ Performance: Page load < 2s with 10,000 products                       │
│  ├─ Edge case: Empty states (new store, no data)                           │
│  └─ Edge case: Permission boundaries (cashier vs manager views)            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 5.2: Performance Optimization                                       │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P1 (High)                                                        │
│  Estimate: 2 days                                                           │
│  Assignee: Senior Developer                                                 │
│  Dependencies: TICKET 5.1 (Need baseline metrics)                           │
│                                                                             │
│  Backend:                                                                    │
│  ├─ Query optimization (EXPLAIN ANALYZE all slow queries)                  │
│  ├─ Add missing indexes based on query patterns                            │
│  ├─ Implement cursor-based pagination for large datasets                   │
│  └─ Tune Redis cache TTLs based on hit rates                               │
│                                                                             │
│  Frontend:                                                                   │
│  ├─ Implement virtual scrolling for large grids                            │
│  ├─ Lazy load tab content                                                  │
│  ├─ Optimize bundle size (code splitting)                                  │
│  └─ Add React.memo to expensive components                                 │
│                                                                             │
│  Targets:                                                                    │
│  ✓ Dashboard load: < 1.5s                                                  │
│  ✓ Tab switch: < 500ms                                                     │
│  ✓ Grid render (1000 rows): < 200ms                                        │
│  ✓ API response (p95): < 300ms                                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 5.3: Security Audit                                                 │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 2 days                                                           │
│  Assignee: Security Lead / External Audit                                   │
│  Dependencies: ALL PHASE 4 COMPLETE                                         │
│                                                                             │
│  Checklist:                                                                  │
│  ├─ SQL injection testing on all query parameters                          │
│  ├─ XSS testing on all user inputs                                         │
│  ├─ RBAC bypass testing (can cashier access /financials?)                  │
│  ├─ JWT token validation (expiry, tampering)                               │
│  ├─ Rate limiting verification                                             │
│  ├─ Sensitive data exposure (PII in logs, responses)                       │
│  ├─ HTTPS enforcement                                                      │
│  └─ Dependency vulnerability scan (npm audit, Snyk)                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 5.4: Production Deployment                                          │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P0 (Blocker)                                                     │
│  Estimate: 2 days                                                           │
│  Assignee: DevOps + Backend Lead                                            │
│  Dependencies: TICKETS 5.1, 5.2, 5.3                                        │
│                                                                             │
│  Subtasks:                                                                   │
│  ├─ 5.4.1: Run database migrations on production                           │
│  ├─ 5.4.2: Deploy backend services                                         │
│  ├─ 5.4.3: Deploy frontend to CDN                                          │
│  ├─ 5.4.4: Configure production Redis                                      │
│  ├─ 5.4.5: Set up job scheduler (cron jobs)                                │
│  ├─ 5.4.6: Run initial batch jobs (populate intelligence tables)           │
│  ├─ 5.4.7: Smoke test all endpoints                                        │
│  ├─ 5.4.8: Enable monitoring and alerting                                  │
│  └─ 5.4.9: Gradual rollout (10% → 50% → 100%)                              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TICKET 5.5: Documentation & Training                                       │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Priority: P1 (High)                                                        │
│  Estimate: 2 days                                                           │
│  Assignee: Tech Writer + Product Owner                                      │
│  Dependencies: ALL PHASE 4 COMPLETE                                         │
│                                                                             │
│  Deliverables:                                                               │
│  ├─ User Guide: How to use each tab                                        │
│  ├─ Admin Guide: Batch job monitoring, troubleshooting                     │
│  ├─ API Documentation: Swagger/OpenAPI published                           │
│  ├─ Training Video: 15-min walkthrough for store managers                  │
│  └─ FAQ: Common questions and answers                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

