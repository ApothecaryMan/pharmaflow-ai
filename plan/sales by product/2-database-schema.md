# Artifact 2: Intelligence-Ready Database Schema

## Complete SQL Schema with Detailed Comments

```sql
-- ============================================================================
-- PHARMACY INTELLIGENCE SYSTEM - DATABASE SCHEMA
-- Version: 1.0.0
-- Last Updated: 2025-01-31
-- 
-- NAMING CONVENTIONS:
-- - Tables: snake_case, plural (e.g., product_intelligence)
-- - Columns: snake_case (e.g., stock_days)
-- - Indexes: idx_{table}_{column(s)}
-- - Foreign Keys: fk_{table}_{referenced_table}
-- 
-- AUDIT FIELDS:
-- Every table includes created_at and updated_at for tracking
-- ============================================================================

-- ============================================================================
-- TABLE: product_intelligence
-- PURPOSE: Stores pre-calculated intelligence metrics for each product.
--          Updated nightly by batch job, with real-time updates on stock changes.
-- REFRESH: Nightly batch (full recalc) + Event-driven (partial updates)
-- ============================================================================

CREATE TABLE product_intelligence (
    -- PRIMARY KEY
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- FOREIGN KEYS: Links to core system tables
    product_id UUID NOT NULL 
        COMMENT 'FK to products table. Each product has exactly one intelligence record per store.',
    store_id UUID NOT NULL 
        COMMENT 'FK to stores table. Intelligence is calculated per-store because sales patterns vary by location.',
    
    -- ========================================================================
    -- STOCK METRICS
    -- These fields answer: "How much do I have and how long will it last?"
    -- ========================================================================
    
    current_stock INTEGER NOT NULL DEFAULT 0 
        COMMENT 'Current physical stock quantity. Synced from inventory table. Used as numerator in stock_days calculation.',
    
    stock_days DECIMAL(10,2) 
        COMMENT 'Days of stock remaining at current velocity. Formula: current_stock / avg_daily_sales. NULL if avg_daily_sales is 0 (infinite days). Critical for reorder decisions.',
    
    reorder_point_days INTEGER NOT NULL DEFAULT 14 
        COMMENT 'Threshold in days. When stock_days < reorder_point_days, product needs reorder. Default 14, configurable per product based on lead time.',
    
    stock_status VARCHAR(20) NOT NULL DEFAULT 'NORMAL' 
        COMMENT 'Derived status for filtering. Values: OUT_OF_STOCK, CRITICAL (< 3 days), LOW (< reorder_point), NORMAL, OVERSTOCK (> 90 days). Calculated from stock_days.',
    
    -- ========================================================================
    -- VELOCITY METRICS
    -- These fields answer: "How fast is this product selling?"
    -- ========================================================================
    
    avg_daily_sales_7d DECIMAL(10,4) 
        COMMENT 'Average units sold per day over last 7 days. Most recent/reactive velocity measure. Used with 50% weight in weighted velocity.',
    
    avg_daily_sales_14d DECIMAL(10,4) 
        COMMENT 'Average units sold per day over last 14 days. Medium-term velocity. Used with 30% weight in weighted velocity.',
    
    avg_daily_sales_30d DECIMAL(10,4) 
        COMMENT 'Average units sold per day over last 30 days. Longer-term trend. Used with 20% weight in weighted velocity.',
    
    weighted_avg_daily_sales DECIMAL(10,4) 
        COMMENT 'Composite velocity. Formula: (7d * 0.5) + (14d * 0.3) + (30d * 0.2). Used for stock_days and reorder calculations. NULL if no sales history.',
    
    velocity_trend VARCHAR(20) DEFAULT 'STABLE' 
        COMMENT 'Direction of velocity change. Values: INCREASING, STABLE, DECREASING. Calculated by comparing 7d vs 30d. Used for confidence scoring.',
    
    velocity_coefficient_of_variation DECIMAL(5,4) 
        COMMENT 'Measure of sales consistency. Formula: std_dev(daily_sales) / mean(daily_sales). Lower = more predictable. Used in confidence score. Range: 0.0 to 2.0+.',
    
    -- ========================================================================
    -- CONFIDENCE METRICS
    -- These fields answer: "How much should I trust the reorder suggestion?"
    -- ========================================================================
    
    reorder_confidence_score INTEGER 
        COMMENT 'Overall confidence in reorder suggestion. Range: 0-100. Composite of velocity stability, data recency, seasonality certainty, and lead time reliability. Displayed as visual indicator.',
    
    confidence_components JSONB 
        COMMENT 'Breakdown of confidence score components. Structure: {"velocity_stability": 85, "data_recency": 90, "seasonality_certainty": 70, "lead_time_reliability": 80}. Used for tooltip explanation.',
    
    data_quality_flag VARCHAR(20) DEFAULT 'GOOD' 
        COMMENT 'Data quality indicator. Values: GOOD, SPARSE (< 30 days data), NEW_PRODUCT (< 7 days), IRREGULAR (high CV). Affects confidence score and UI warnings.',
    
    -- ========================================================================
    -- SEASONALITY METRICS
    -- These fields answer: "Is demand about to change due to seasonal patterns?"
    -- ========================================================================
    
    seasonal_index_current DECIMAL(4,2) DEFAULT 1.00 
        COMMENT 'Current month seasonality multiplier. 1.0 = baseline. >1.0 = above-average demand month. <1.0 = below-average. Applied to velocity for forecasting.',
    
    seasonal_index_next_month DECIMAL(4,2) DEFAULT 1.00 
        COMMENT 'Next month seasonality multiplier. Used to detect transitions. If current > next, we are exiting peak season.',
    
    seasonal_trajectory VARCHAR(20) DEFAULT 'STABLE' 
        COMMENT 'Seasonal direction indicator. Values: RISING (entering peak), STABLE (no pattern), DECLINING (exiting peak). Critical for preventing over-ordering.',
    
    seasonal_confidence VARCHAR(20) DEFAULT 'LOW' 
        COMMENT 'Confidence in seasonal pattern. Values: HIGH (3+ years data), MEDIUM (1-2 years), LOW (insufficient data). Affects how much weight to give seasonal adjustment.',
    
    -- ========================================================================
    -- REORDER SUGGESTION
    -- These fields answer: "What should I order and why?"
    -- ========================================================================
    
    suggested_reorder_qty INTEGER 
        COMMENT 'System-recommended order quantity. Formula considers: forecasted demand, coverage period, lead time, safety stock, current stock, pending POs. Can be overridden by user.',
    
    suggested_reorder_reasoning JSONB 
        COMMENT 'Full breakdown of suggestion calculation. Structure: {"forecasted_daily_demand": 5.2, "coverage_period_days": 14, "lead_time_days": 3, "safety_stock_qty": 8, "gross_need": 89, "current_stock": 24, "pending_po_qty": 0, "net_need": 65, "rounded_to_pack_size": 72}. Used for tooltip.',
    
    last_suggested_at TIMESTAMP WITH TIME ZONE 
        COMMENT 'When the suggestion was last recalculated. Used to show data freshness in UI.',
    
    -- ========================================================================
    -- SUPPLIER & LEAD TIME
    -- These fields answer: "How reliable is my supplier?"
    -- ========================================================================
    
    primary_supplier_id UUID 
        COMMENT 'FK to suppliers table. The default supplier for reorders. Used for lead time calculations and PO generation.',
    
    avg_lead_time_days DECIMAL(5,2) 
        COMMENT 'Average days from PO submission to stock receipt for this product/supplier. Calculated from historical POs. Critical for safety stock.',
    
    lead_time_variability_days DECIMAL(5,2) 
        COMMENT 'Standard deviation of lead time. Higher = less reliable supplier. Used for safety stock buffer calculation.',
    
    last_stockout_date DATE 
        COMMENT 'Most recent date when stock reached zero. Used to calculate "days since stockout" and track improvement.',
    
    stockout_count_90d INTEGER DEFAULT 0 
        COMMENT 'Number of stockout incidents in last 90 days. High count = unreliable supply chain. Affects confidence score.',
    
    -- ========================================================================
    -- FINANCIAL METRICS (Cached for Performance)
    -- These fields answer: "Is this product profitable?"
    -- ========================================================================
    
    abc_class CHAR(1) 
        COMMENT 'ABC classification based on revenue contribution. A = top 80%, B = next 15%, C = bottom 5%. Recalculated monthly. Used for prioritization.',
    
    gross_margin_percent DECIMAL(5,2) 
        COMMENT 'Current gross margin. Formula: (selling_price - cost_price) / selling_price * 100. Used for quick reference without joining to products.',
    
    revenue_30d DECIMAL(12,2) 
        COMMENT 'Revenue generated in last 30 days. Cached for dashboard performance. Updated nightly.',
    
    profit_30d DECIMAL(12,2) 
        COMMENT 'Gross profit in last 30 days. Cached for quick reference.',
    
    -- ========================================================================
    -- RISK FLAGS (Cached from Risk Analysis)
    -- These fields answer: "Does this product have any problems?"
    -- ========================================================================
    
    has_expiry_risk BOOLEAN DEFAULT FALSE 
        COMMENT 'TRUE if any batch expires within 90 days AND cannot be sold at current velocity. Triggers Risk tab inclusion.',
    
    cash_trap_score INTEGER 
        COMMENT 'Cash trap risk score. Range: 0-100. Higher = more cash tied up with low return. See detectCashTrap() algorithm. NULL if not applicable.',
    
    is_dead_stock BOOLEAN DEFAULT FALSE 
        COMMENT 'TRUE if zero sales in last 60 days AND stock > 0. Indicates product should be reviewed for clearance or return.',
    
    -- ========================================================================
    -- SYSTEM FIELDS
    -- ========================================================================
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() 
        COMMENT 'Record creation timestamp.',
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() 
        COMMENT 'Last update timestamp. Used for cache invalidation and data freshness checks.',
    
    last_calculation_run_id UUID 
        COMMENT 'FK to batch_job_runs table. Links to the batch job that last updated this record. Used for debugging.',
    
    -- CONSTRAINTS
    CONSTRAINT uq_product_store UNIQUE (product_id, store_id),
    CONSTRAINT chk_stock_status CHECK (stock_status IN ('OUT_OF_STOCK', 'CRITICAL', 'LOW', 'NORMAL', 'OVERSTOCK')),
    CONSTRAINT chk_velocity_trend CHECK (velocity_trend IN ('INCREASING', 'STABLE', 'DECREASING')),
    CONSTRAINT chk_seasonal_trajectory CHECK (seasonal_trajectory IN ('RISING', 'STABLE', 'DECLINING')),
    CONSTRAINT chk_abc_class CHECK (abc_class IN ('A', 'B', 'C')),
    CONSTRAINT chk_confidence_range CHECK (reorder_confidence_score >= 0 AND reorder_confidence_score <= 100),
    CONSTRAINT chk_cash_trap_range CHECK (cash_trap_score >= 0 AND cash_trap_score <= 100)
);

-- INDEXES for product_intelligence
CREATE INDEX idx_pi_product_id ON product_intelligence(product_id);
CREATE INDEX idx_pi_store_id ON product_intelligence(store_id);
CREATE INDEX idx_pi_stock_status ON product_intelligence(store_id, stock_status);
CREATE INDEX idx_pi_supplier ON product_intelligence(store_id, primary_supplier_id);
CREATE INDEX idx_pi_abc_class ON product_intelligence(store_id, abc_class);
CREATE INDEX idx_pi_cash_trap ON product_intelligence(store_id, cash_trap_score DESC) WHERE cash_trap_score > 50;
CREATE INDEX idx_pi_dead_stock ON product_intelligence(store_id) WHERE is_dead_stock = TRUE;
CREATE INDEX idx_pi_expiry_risk ON product_intelligence(store_id) WHERE has_expiry_risk = TRUE;
CREATE INDEX idx_pi_reorder_needed ON product_intelligence(store_id, stock_days) WHERE stock_status IN ('OUT_OF_STOCK', 'CRITICAL', 'LOW');


-- ============================================================================
-- TABLE: batch_risk
-- PURPOSE: Tracks expiry risk at the batch level (not product level).
--          A product can have multiple batches with different expiry dates.
-- REFRESH: Daily batch job
-- ============================================================================

CREATE TABLE batch_risk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- FOREIGN KEYS
    batch_id UUID NOT NULL 
        COMMENT 'FK to inventory_batches table. Each batch has unique expiry date and cost.',
    product_id UUID NOT NULL 
        COMMENT 'FK to products table. Denormalized for query performance.',
    store_id UUID NOT NULL 
        COMMENT 'FK to stores table. Batches are store-specific.',
    
    -- BATCH INFO (Denormalized for performance)
    batch_number VARCHAR(50) 
        COMMENT 'Human-readable batch identifier. Displayed in UI for identification.',
    
    current_quantity INTEGER NOT NULL 
        COMMENT 'Current units remaining in this batch. Decremented on sales (FIFO).',
    
    unit_cost DECIMAL(10,2) NOT NULL 
        COMMENT 'Cost per unit for this batch. May differ from current product cost. Used for value-at-risk calculation.',
    
    expiry_date DATE NOT NULL 
        COMMENT 'Batch expiration date. Primary driver of expiry risk calculations.',
    
    -- RISK METRICS
    days_until_expiry INTEGER GENERATED ALWAYS AS (expiry_date - CURRENT_DATE) STORED 
        COMMENT 'Computed column: days remaining until expiry. Negative if already expired.',
    
    sellable_days_remaining INTEGER 
        COMMENT 'Days until batch should be pulled from shelf. Formula: days_until_expiry - minimum_shelf_life_days. May be negative.',
    
    value_at_risk DECIMAL(12,2) GENERATED ALWAYS AS (current_quantity * unit_cost) STORED 
        COMMENT 'Computed column: total cost value at risk if batch expires. current_quantity * unit_cost.',
    
    current_daily_velocity DECIMAL(10,4) 
        COMMENT 'Current product velocity (copied from product_intelligence). Used to project if batch will sell in time.',
    
    projected_units_sold DECIMAL(10,2) 
        COMMENT 'Projected units to be sold before expiry. Formula: current_daily_velocity * sellable_days_remaining.',
    
    projected_remaining_qty DECIMAL(10,2) 
        COMMENT 'Expected quantity remaining at expiry. Formula: current_quantity - projected_units_sold. Negative = will sell out.',
    
    will_clear_in_time BOOLEAN GENERATED ALWAYS AS (projected_remaining_qty <= 0) STORED 
        COMMENT 'Computed column: TRUE if projected to sell before expiry at current velocity.',
    
    -- RISK SCORING
    expiry_risk_score INTEGER 
        COMMENT 'Composite risk score. Range: 0-100. Factors: urgency (days left), clearance feasibility, value at stake. See calculateExpiryRiskScore().',
    
    risk_score_components JSONB 
        COMMENT 'Breakdown of risk score. Structure: {"urgency_score": 95, "velocity_score": 80, "value_score": 75, "composite": 85}.',
    
    risk_category VARCHAR(20) 
        COMMENT 'Risk severity bucket. Values: CRITICAL (score > 80), HIGH (60-80), MEDIUM (40-60), LOW (< 40). Used for filtering.',
    
    -- RECOMMENDED ACTIONS
    recommended_action VARCHAR(50) 
        COMMENT 'System-recommended action. Values: DISCOUNT_AGGRESSIVE, DISCOUNT_MODERATE, MONITOR, RETURN_TO_SUPPLIER, WRITE_OFF.',
    
    recommended_discount_percent INTEGER 
        COMMENT 'If action is DISCOUNT_*, this is the suggested discount to achieve clearance. Range: 0-100.',
    
    expected_recovery_value DECIMAL(12,2) 
        COMMENT 'Projected recovered value if discount is applied. Formula: projected_remaining_qty * (selling_price * (1 - discount)).',
    
    -- STATUS TRACKING
    action_taken VARCHAR(50) 
        COMMENT 'What action was actually taken. Values: DISCOUNT_APPLIED, RETURNED, WRITTEN_OFF, SOLD_NORMALLY, EXPIRED. Updated by user actions.',
    
    action_taken_at TIMESTAMP WITH TIME ZONE 
        COMMENT 'When the action was taken.',
    
    action_taken_by UUID 
        COMMENT 'FK to users table. Who took the action.',
    
    actual_recovery_value DECIMAL(12,2) 
        COMMENT 'Actual value recovered after action. Used for analyzing recommendation effectiveness.',
    
    -- SYSTEM FIELDS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- CONSTRAINTS
    CONSTRAINT uq_batch_store UNIQUE (batch_id, store_id),
    CONSTRAINT chk_risk_category CHECK (risk_category IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    CONSTRAINT chk_risk_score_range CHECK (expiry_risk_score >= 0 AND expiry_risk_score <= 100)
);

-- INDEXES for batch_risk
CREATE INDEX idx_br_store_expiry ON batch_risk(store_id, expiry_date);
CREATE INDEX idx_br_store_risk ON batch_risk(store_id, expiry_risk_score DESC);
CREATE INDEX idx_br_product ON batch_risk(product_id);
CREATE INDEX idx_br_critical ON batch_risk(store_id) WHERE risk_category = 'CRITICAL';
CREATE INDEX idx_br_needs_action ON batch_risk(store_id, recommended_action) WHERE action_taken IS NULL;


-- ============================================================================
-- TABLE: seasonal_indices
-- PURPOSE: Stores monthly seasonality indices for each product.
--          Used to adjust demand forecasts based on historical patterns.
-- REFRESH: Monthly batch job (1st of each month)
-- ============================================================================

CREATE TABLE seasonal_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- FOREIGN KEYS
    product_id UUID NOT NULL 
        COMMENT 'FK to products table. Seasonality is product-specific.',
    store_id UUID 
        COMMENT 'FK to stores table. NULL means global (all stores). Store-specific if sales patterns vary by location.',
    
    -- SEASONALITY DATA
    month_of_year INTEGER NOT NULL 
        COMMENT 'Month number (1-12). January = 1, December = 12.',
    
    seasonal_index DECIMAL(4,2) NOT NULL DEFAULT 1.00 
        COMMENT 'Seasonality multiplier for this month. 1.0 = baseline average. 1.3 = 30% above average. 0.7 = 30% below average.',
    
    sample_years INTEGER 
        COMMENT 'Number of years of data used to calculate this index. More years = higher confidence.',
    
    avg_monthly_sales DECIMAL(12,2) 
        COMMENT 'Average units sold in this month across all sample years. Used with index to understand absolute volume.',
    
    std_dev_monthly_sales DECIMAL(12,2) 
        COMMENT 'Standard deviation of monthly sales. High std_dev = inconsistent pattern, less reliable index.',
    
    confidence_level VARCHAR(20) 
        COMMENT 'Confidence in this index. Values: HIGH (3+ years, low std_dev), MEDIUM (1-2 years), LOW (insufficient data).',
    
    -- PATTERN DETECTION
    is_peak_month BOOLEAN DEFAULT FALSE 
        COMMENT 'TRUE if this is one of the top 3 months for this product. Used for inventory planning.',
    
    is_trough_month BOOLEAN DEFAULT FALSE 
        COMMENT 'TRUE if this is one of the bottom 3 months. Used to avoid over-ordering.',
    
    yoy_growth_rate DECIMAL(5,2) 
        COMMENT 'Year-over-year growth rate for this month. Positive = growing demand. Used for trend adjustment.',
    
    -- SYSTEM FIELDS
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() 
        COMMENT 'When this index was last calculated.',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- CONSTRAINTS
    CONSTRAINT uq_product_store_month UNIQUE (product_id, store_id, month_of_year),
    CONSTRAINT chk_month_range CHECK (month_of_year >= 1 AND month_of_year <= 12),
    CONSTRAINT chk_index_positive CHECK (seasonal_index > 0)
);

-- INDEXES for seasonal_indices
CREATE INDEX idx_si_product ON seasonal_indices(product_id);
CREATE INDEX idx_si_store_month ON seasonal_indices(store_id, month_of_year);
CREATE INDEX idx_si_peaks ON seasonal_indices(product_id) WHERE is_peak_month = TRUE;


-- ============================================================================
-- TABLE: supplier_performance
-- PURPOSE: Tracks supplier reliability metrics for lead time calculations.
-- REFRESH: Updated on each stock receipt event
-- ============================================================================

CREATE TABLE supplier_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- FOREIGN KEYS
    supplier_id UUID NOT NULL 
        COMMENT 'FK to suppliers table.',
    store_id UUID NOT NULL 
        COMMENT 'FK to stores table. Supplier performance may vary by store (different delivery routes).',
    product_id UUID 
        COMMENT 'FK to products table. NULL means supplier-level metrics, non-NULL means product-specific.',
    
    -- LEAD TIME METRICS
    avg_lead_time_days DECIMAL(5,2) NOT NULL 
        COMMENT 'Average days from PO submission to stock receipt. Calculated from completed POs.',
    
    min_lead_time_days INTEGER 
        COMMENT 'Fastest recorded lead time. Used for best-case planning.',
    
    max_lead_time_days INTEGER 
        COMMENT 'Slowest recorded lead time. Used for worst-case safety stock.',
    
    lead_time_std_dev DECIMAL(5,2) 
        COMMENT 'Standard deviation of lead time. Higher = less reliable. Used for safety stock buffer.',
    
    lead_time_sample_size INTEGER 
        COMMENT 'Number of POs used to calculate these metrics. More = higher confidence.',
    
    -- RELIABILITY METRICS
    on_time_delivery_rate DECIMAL(5,2) 
        COMMENT 'Percentage of orders delivered within promised lead time. Range: 0-100.',
    
    fill_rate DECIMAL(5,2) 
        COMMENT 'Percentage of ordered quantity actually delivered. 100 = full delivery, <100 = partial fills.',
    
    quality_issue_rate DECIMAL(5,2) 
        COMMENT 'Percentage of deliveries with quality issues (damaged, wrong item). Lower is better.',
    
    -- RECENT PERFORMANCE
    last_po_date DATE 
        COMMENT 'Date of most recent PO to this supplier. Used to detect stale data.',
    
    last_delivery_date DATE 
        COMMENT 'Date of most recent delivery received.',
    
    last_lead_time_days INTEGER 
        COMMENT 'Lead time of most recent order. Used for trend detection.',
    
    -- SYSTEM FIELDS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- CONSTRAINTS
    CONSTRAINT uq_supplier_store_product UNIQUE (supplier_id, store_id, product_id)
);

-- INDEXES for supplier_performance
CREATE INDEX idx_sp_supplier ON supplier_performance(supplier_id);
CREATE INDEX idx_sp_store ON supplier_performance(store_id);
CREATE INDEX idx_sp_product ON supplier_performance(product_id) WHERE product_id IS NOT NULL;


-- ============================================================================
-- TABLE: audit_events
-- PURPOSE: Comprehensive audit trail for all significant system events.
--          Used by the Audit tab and for regulatory compliance.
-- REFRESH: Real-time (event-driven)
-- ============================================================================

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- EVENT IDENTIFICATION
    event_type VARCHAR(50) NOT NULL 
        COMMENT 'Type of event. Values: SALE, RETURN, VOID, PRICE_OVERRIDE, DISCOUNT_APPLIED, STOCK_ADJUSTMENT, USER_LOGIN, etc.',
    
    event_subtype VARCHAR(50) 
        COMMENT 'More specific event type. E.g., for SALE: CASH, CREDIT, INSURANCE. For VOID: CUSTOMER_REQUEST, ERROR_CORRECTION.',
    
    -- CONTEXT
    store_id UUID NOT NULL 
        COMMENT 'FK to stores table. Where the event occurred.',
    
    terminal_id VARCHAR(50) 
        COMMENT 'POS terminal identifier. Used to track which register.',
    
    user_id UUID NOT NULL 
        COMMENT 'FK to users table. Who performed the action.',
    
    approver_user_id UUID 
        COMMENT 'FK to users table. If action required approval, who approved it. NULL if no approval needed.',
    
    -- TRANSACTION LINK
    transaction_id UUID 
        COMMENT 'FK to transactions table. Links to the parent transaction if applicable.',
    
    transaction_line_id UUID 
        COMMENT 'FK to transaction_lines table. Links to specific line item if applicable.',
    
    invoice_number VARCHAR(50) 
        COMMENT 'Human-readable invoice number. Denormalized for search performance.',
    
    -- PRODUCT/BATCH LINK
    product_id UUID 
        COMMENT 'FK to products table. The product involved, if applicable.',
    
    batch_id UUID 
        COMMENT 'FK to inventory_batches table. The specific batch, if applicable.',
    
    -- EVENT DATA
    quantity DECIMAL(10,2) 
        COMMENT 'Quantity involved in the event. Positive for additions, negative for reductions.',
    
    unit_price DECIMAL(10,2) 
        COMMENT 'Price per unit at time of event.',
    
    total_amount DECIMAL(12,2) 
        COMMENT 'Total monetary value of the event.',
    
    original_value DECIMAL(12,2) 
        COMMENT 'Original value before change. Used for overrides and adjustments.',
    
    new_value DECIMAL(12,2) 
        COMMENT 'New value after change.',
    
    discount_percent DECIMAL(5,2) 
        COMMENT 'If discount applied, the percentage.',
    
    discount_amount DECIMAL(12,2) 
        COMMENT 'If discount applied, the dollar amount.',
    
    -- REASON & NOTES
    reason_code VARCHAR(50) 
        COMMENT 'Standardized reason code. E.g., CUSTOMER_REQUEST, PRICE_MATCH, DAMAGED_GOODS.',
    
    reason_text TEXT 
        COMMENT 'Free-text explanation entered by user.',
    
    -- ANOMALY FLAGS
    is_anomaly BOOLEAN DEFAULT FALSE 
        COMMENT 'TRUE if this event was flagged as unusual by the system.',
    
    anomaly_type VARCHAR(50) 
        COMMENT 'Type of anomaly. Values: VOID_AFTER_CLOSE, HIGH_DISCOUNT, BELOW_COST, QUANTITY_UNUSUAL, etc.',
    
    anomaly_score INTEGER 
        COMMENT 'Severity of anomaly. Range: 0-100. Higher = more suspicious.',
    
    -- SYSTEM FIELDS
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() 
        COMMENT 'Exact time the event occurred. Used for precise audit trail.',
    
    ip_address INET 
        COMMENT 'IP address of the terminal/device. Security audit purposes.',
    
    session_id VARCHAR(100) 
        COMMENT 'User session identifier. Groups related events.',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES for audit_events
CREATE INDEX idx_ae_store_timestamp ON audit_events(store_id, event_timestamp DESC);
CREATE INDEX idx_ae_transaction ON audit_events(transaction_id);
CREATE INDEX idx_ae_user ON audit_events(user_id, event_timestamp DESC);
CREATE INDEX idx_ae_product ON audit_events(product_id, event_timestamp DESC);
CREATE INDEX idx_ae_invoice ON audit_events(invoice_number);
CREATE INDEX idx_ae_anomalies ON audit_events(store_id, event_timestamp DESC) WHERE is_anomaly = TRUE;
CREATE INDEX idx_ae_type ON audit_events(store_id, event_type, event_timestamp DESC);
CREATE INDEX idx_ae_voids ON audit_events(store_id, event_timestamp DESC) WHERE event_type = 'VOID';


-- ============================================================================
-- TABLE: system_alerts
-- PURPOSE: Stores alerts generated by the intelligence system.
--          Displayed on Dashboard and individual tabs.
-- REFRESH: Created by batch jobs and real-time events
-- ============================================================================

CREATE TABLE system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ALERT CLASSIFICATION
    alert_type VARCHAR(50) NOT NULL 
        COMMENT 'Category of alert. Values: STOCKOUT, LOW_STOCK, EXPIRY_CRITICAL, CASH_TRAP, DEAD_STOCK, MARGIN_EROSION, ANOMALY_DETECTED.',
    
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' 
        COMMENT 'Alert urgency. Values: CRITICAL, HIGH, MEDIUM, LOW. Determines sort order and notification behavior.',
    
    domain VARCHAR(20) NOT NULL 
        COMMENT 'Which tab this alert belongs to. Values: PROCUREMENT, FINANCIALS, RISK, AUDIT. Used for routing.',
    
    -- CONTEXT
    store_id UUID NOT NULL 
        COMMENT 'FK to stores table. Alert is store-specific.',
    
    product_id UUID 
        COMMENT 'FK to products table. The product related to alert, if applicable.',
    
    batch_id UUID 
        COMMENT 'FK to inventory_batches table. The batch related to alert, if applicable.',
    
    transaction_id UUID 
        COMMENT 'FK to transactions table. The transaction related to alert, if applicable.',
    
    -- ALERT CONTENT
    title VARCHAR(200) NOT NULL 
        COMMENT 'Short alert title. Displayed in alert list. E.g., "Stockout: Paracetamol 500mg".',
    
    description TEXT 
        COMMENT 'Detailed alert description with context.',
    
    metric_value DECIMAL(12,2) 
        COMMENT 'The metric value that triggered the alert. E.g., stock_days = 1.5.',
    
    threshold_value DECIMAL(12,2) 
        COMMENT 'The threshold that was breached. E.g., 3 days for CRITICAL stock.',
    
    monetary_impact DECIMAL(12,2) 
        COMMENT 'Estimated financial impact. E.g., $2,340 at-risk for expiry alert.',
    
    -- NAVIGATION
    deep_link_tab VARCHAR(50) 
        COMMENT 'Which tab to navigate to. Used for "View Details" action.',
    
    deep_link_params JSONB 
        COMMENT 'URL parameters for deep link. E.g., {"productId": "uuid", "filter": "below_rop"}.',
    
    -- STATUS TRACKING
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' 
        COMMENT 'Alert status. Values: ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED.',
    
    acknowledged_by UUID 
        COMMENT 'FK to users table. Who acknowledged the alert.',
    
    acknowledged_at TIMESTAMP WITH TIME ZONE 
        COMMENT 'When the alert was acknowledged.',
    
    resolved_at TIMESTAMP WITH TIME ZONE 
        COMMENT 'When the underlying issue was resolved.',
    
    auto_resolve_condition TEXT 
        COMMENT 'Condition for automatic resolution. E.g., "stock_days > 7". Checked by batch job.',
    
    -- SYSTEM FIELDS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE 
        COMMENT 'When this alert should auto-expire if not resolved. NULL = no expiry.',
    
    -- CONSTRAINTS
    CONSTRAINT chk_priority CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    CONSTRAINT chk_status CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')),
    CONSTRAINT chk_domain CHECK (domain IN ('PROCUREMENT', 'FINANCIALS', 'RISK', 'AUDIT', 'SYSTEM'))
);

-- INDEXES for system_alerts
CREATE INDEX idx_sa_store_priority ON system_alerts(store_id, priority, created_at DESC) WHERE status = 'ACTIVE';
CREATE INDEX idx_sa_store_domain ON system_alerts(store_id, domain, created_at DESC) WHERE status = 'ACTIVE';
CREATE INDEX idx_sa_product ON system_alerts(product_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_sa_expiring ON system_alerts(expires_at) WHERE status = 'ACTIVE' AND expires_at IS NOT NULL;


-- ============================================================================
-- TABLE: batch_job_runs
-- PURPOSE: Tracks execution of batch jobs for monitoring and debugging.
-- REFRESH: Created on each job run
-- ============================================================================

CREATE TABLE batch_job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    job_name VARCHAR(100) NOT NULL 
        COMMENT 'Name of the batch job. E.g., NIGHTLY_INTELLIGENCE, RISK_ANALYSIS, SEASONALITY_UPDATE.',
    
    store_id UUID 
        COMMENT 'FK to stores table. NULL if job is system-wide.',
    
    -- EXECUTION DETAILS
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING' 
        COMMENT 'Job status. Values: RUNNING, COMPLETED, FAILED, CANCELLED.',
    
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    completed_at TIMESTAMP WITH TIME ZONE,
    
    duration_seconds INTEGER 
        COMMENT 'Total execution time in seconds.',
    
    -- PROGRESS TRACKING
    total_items INTEGER 
        COMMENT 'Total items to process.',
    
    processed_items INTEGER DEFAULT 0 
        COMMENT 'Items successfully processed.',
    
    failed_items INTEGER DEFAULT 0 
        COMMENT 'Items that failed processing.',
    
    -- RESULTS
    results_summary JSONB 
        COMMENT 'Summary of job results. Structure varies by job type.',
    
    error_message TEXT 
        COMMENT 'Error message if job failed.',
    
    error_stack TEXT 
        COMMENT 'Full error stack trace for debugging.',
    
    -- SYSTEM FIELDS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- CONSTRAINTS
    CONSTRAINT chk_job_status CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'))
);

-- INDEXES for batch_job_runs
CREATE INDEX idx_bjr_job_name ON batch_job_runs(job_name, started_at DESC);
CREATE INDEX idx_bjr_status ON batch_job_runs(status, started_at DESC) WHERE status IN ('RUNNING', 'FAILED');


-- ============================================================================
-- MATERIALIZED VIEW: financial_summary_daily
-- PURPOSE: Pre-aggregated daily financial metrics for fast dashboard loading.
-- REFRESH: Daily after business day closes
-- ============================================================================

CREATE MATERIALIZED VIEW financial_summary_daily AS
SELECT 
    store_id,
    DATE(transaction_timestamp) AS business_date,
    COUNT(DISTINCT transaction_id) AS transaction_count,
    SUM(quantity) AS units_sold,
    SUM(line_total) AS revenue,
    SUM(quantity * cost_price_at_sale) AS cogs,
    SUM(line_total - (quantity * cost_price_at_sale)) AS gross_profit,
    ROUND((SUM(line_total - (quantity * cost_price_at_sale)) / NULLIF(SUM(line_total), 0) * 100)::numeric, 2) AS margin_percent,
    AVG(line_total) AS avg_line_value
FROM 
    transaction_lines tl
    JOIN transactions t ON tl.transaction_id = t.id
WHERE 
    t.status = 'COMPLETED'
    AND t.transaction_type = 'SALE'
GROUP BY 
    store_id, DATE(transaction_timestamp);

CREATE UNIQUE INDEX idx_fsd_store_date ON financial_summary_daily(store_id, business_date);

COMMENT ON MATERIALIZED VIEW financial_summary_daily IS 
    'Pre-aggregated daily financials. Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY financial_summary_daily; Run after daily close.';

