# Technical Architecture Report: PharmaFlow AI (Zinc)

## 1. PROJECT OVERVIEW
- **Main Purpose:** Zinc is a comprehensive, bilingual (EN/AR) pharmacy management system and point-of-sale (POS) application designed for multi-tenant SaaS operation. It handles inventory tracking, customer CRM, shift cash management, and AI-powered operations.
- **Tech Stack Summary:** 
  - **Frontend:** React 19 Single Page Application (SPA) built with Vite, styled with Tailwind CSS v4 and Shadcn UI.
  - **Backend & DB:** Supabase (PostgreSQL) handling Auth, Database, and Row Level Security (RLS).
  - **Data Access:** Direct client-to-database communication via `@supabase/supabase-js`.

## 2. DATABASE SCHEMA SUMMARY
- **`organizations` / `org_members`:** SaaS tenant roots and user access mapping.
- **`subscriptions`:** Tracks plan limits (branches, users) per organization.
- **`branches`:** Physical store locations belonging to an organization.
- **`employees`:** Staff members managed under branches/orgs.
- **`suppliers`:** Vendors providing stock.
- **`drugs`:** The central inventory items catalog.
- **`purchases` / `purchase_items`:** Procurement records from suppliers.
- **`stock_batches`:** Discrete inventory lots tracking cost and exact expiry dates (FEFO).
- **`sales` / `sale_items` / `sale_item_batches`:** POS transactions linking items and specific expiry batches to a customer.
- **`stock_movements`:** Immutable ledger of every inventory change (additions, sales, adjustments).
- **`returns` / `purchase_returns` (and items):** Tracks customer & supplier refunds.
- **`customers`:** CRM database linking patients to their purchase history.
- **`shifts` / `cash_transactions`:** Point-of-sale drawer management and daily cash reconciliation.
- **`audit_logs`:** General system activity tracking.
**Most Critical Tables:** `drugs`, `stock_batches`, `sales`, and `stock_movements`. They form the core relational hub where inventory and financial data intersect.

## 3. DATA FLOW
- **UI to DB Movement:** The application uses a "Thick Client" architecture. React components talk to a substantial frontend `services/` layer (e.g., `branchService.ts`, `inventoryService`), which makes direct RPC or Supabase API calls securely leveraging the user's JWT.
- **Triggers & Background Jobs:** 
  - Standard `moddatetime` triggers update timestamps.
  - A critical `sync_drug_stock()` trigger automatically updates aggregate stock levels on the `drugs` table whenever a new `stock_movements` row is inserted.
  - There are currently no CRON jobs or Supabase Edge functions configured.

## 4. CURRENT BACKEND LOGIC
- **Frontend/Services Logic:** Almost all business logic lives in the frontend. This includes inventory pack/unit calculations, sale cart aggregations, offline syncing queues (`syncQueueService`), and AI integrations (`geminiService.ts`).
- **Database Logic:** Row Level Security (RLS) is heavily utilized (`tenant_isolation`) via dynamic functions like `get_user_branch_ids()` to strictly enforce multi-tenant boundaries. Data aggregation relies on the aforementioned SQL triggers.
- **Server-Side API:** None. There are no Edge Functions or Node.js API routes; the application is 100% reliant on Supabase auto-generated APIs.

## 5. DATA & ANALYTICS POTENTIAL
- **Data Collected:** Comprehensive transactional histories are recorded per tenant, including exact employee shift performance, item-level profitability (sale price vs. batch cost price), and customer longitudinal purchase tracking.
- **Current Reporting:** Analytics are currently handled client-side by fetching rows and crunching them in the browser (e.g., `StockMovementReport` using Chart.js). There is no dedicated analytics warehouse or materialized views in the database.

## 6. WEAKEST POINTS
- **Architectural Bottlenecks:** Because most business logic and transactional orchestration happen in the frontend, complex multi-step operations (like processing a large sale that spans multiple batches) are vulnerable to network interruptions and partial failures.
- **Risks Under Scale:** Concurrency is a significant risk. Without backend API route orchestration implementing strict locking mechanisms, multiple cashiers checking out the same low-stock item simultaneously could cause race conditions (overselling). Additionally, client-side data crunching for reports will severely bottleneck UI performance as tenant transaction volume grows.
