# Artifact 3: The "Data Contract" (API Response Specification)

## API Response Specifications

### Procurement Tab API Response

```typescript
/**
 * GET /api/v1/intelligence/procurement/items
 * 
 * Returns paginated list of products with procurement intelligence.
 * Used by: ProcurementTab.tsx → ProcurementGrid component
 */

interface ProcurementItemsResponse {
  // =========================================================================
  // METADATA
  // =========================================================================
  
  meta: {
    /**
     * Importance: CRITICAL
     * Usage: Pagination component (PageNavigator)
     */
    total_count: number;
    
    /**
     * Importance: CRITICAL
     * Usage: Pagination component
     */
    page: number;
    
    /**
     * Importance: CRITICAL
     * Usage: Pagination component
     */
    page_size: number;
    
    /**
     * Importance: HIGH
     * Usage: "Showing X of Y" text in grid header
     */
    total_pages: number;
    
    /**
     * Importance: MEDIUM
     * Usage: Cache invalidation, "Last updated" display
     */
    generated_at: string; // ISO 8601 timestamp
    
    /**
     * Importance: LOW
     * Usage: Debugging, support tickets
     */
    query_time_ms: number;
  };

  // =========================================================================
  // SUMMARY KPIs
  // =========================================================================
  
  summary: {
    /**
     * Importance: CRITICAL
     * Usage: ProcurementKPIs component → "Need to Order" card
     * Calculation: COUNT(*) WHERE stock_status IN ('OUT_OF_STOCK', 'CRITICAL', 'LOW')
     */
    items_needing_order: number;
    
    /**
     * Importance: CRITICAL
     * Usage: ProcurementKPIs component → "Out of Stock" card (red highlight)
     * Calculation: COUNT(*) WHERE stock_status = 'OUT_OF_STOCK'
     */
    items_out_of_stock: number;
    
    /**
     * Importance: HIGH
     * Usage: ProcurementKPIs component → "Avg Confidence" card
     * Calculation: AVG(reorder_confidence_score) for items needing order
     */
    avg_confidence_score: number;
    
    /**
     * Importance: HIGH
     * Usage: ProcurementKPIs component → "Pending POs" card
     */
    pending_po_count: number;
    
    /**
     * Importance: HIGH
     * Usage: ProcurementKPIs component → "Pending POs" card (value display)
     */
    pending_po_value: number;
    
    /**
     * Importance: MEDIUM
     * Usage: ProcurementKPIs component → "Lost Sales" card
     * Calculation: Estimated revenue lost due to stockouts
     */
    estimated_lost_sales: number;
  };

  // =========================================================================
  // ITEMS ARRAY
  // =========================================================================
  
  items: ProcurementItem[];
}

interface ProcurementItem {
  // =========================================================================
  // IDENTIFICATION
  // =========================================================================
  
  /**
   * Importance: CRITICAL
   * Usage: Row key, API calls for actions, navigation
   */
  product_id: string;
  
  /**
   * Importance: CRITICAL
   * Usage: Main display column in grid
   */
  product_name: string;
  
  /**
   * Importance: HIGH
   * Usage: Secondary text under product name, filtering
   */
  sku: string;
  
  /**
   * Importance: HIGH
   * Usage: Supplier filter, PO generation grouping
   */
  supplier_id: string;
  
  /**
   * Importance: HIGH
   * Usage: Display under product name: "Supplier: ABC Pharma"
   */
  supplier_name: string;
  
  /**
   * Importance: MEDIUM
   * Usage: Category filter dropdown
   */
  category_id: string;
  
  /**
   * Importance: MEDIUM
   * Usage: Display in expanded row details
   */
  category_name: string;

  // =========================================================================
  // STOCK METRICS
  // =========================================================================
  
  /**
   * Importance: CRITICAL
   * Usage: "Stock" column in grid
   * Tooltip: "Physical units currently on shelf"
   */
  current_stock: number;
  
  /**
   * Importance: CRITICAL
   * Usage: "Stock Days" column in grid
   * Tooltip: Shows calculation breakdown
   * Special: null means infinite (zero velocity)
   */
  stock_days: number | null;
  
  /**
   * Importance: CRITICAL
   * Usage: Row styling (conditional CSS classes)
   * Values: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK'
   */
  stock_status: string;
  
  /**
   * Importance: HIGH
   * Usage: Tooltip on stock_days: "Reorder when below X days"
   */
  reorder_point_days: number;

  // =========================================================================
  // VELOCITY METRICS
  // =========================================================================
  
  /**
   * Importance: CRITICAL
   * Usage: "Velocity" column in grid
   * Format: "X.X /day"
   */
  avg_daily_sales: number;
  
  /**
   * Importance: HIGH
   * Usage: Velocity tooltip breakdown
   */
  velocity_breakdown: {
    last_7_days: number;
    last_14_days: number;
    last_30_days: number;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  };
  
  /**
   * Importance: MEDIUM
   * Usage: Velocity tooltip: "Consistency: X%"
   * Lower = more predictable sales
   */
  velocity_cv: number;

  // =========================================================================
  // SEASONALITY
  // =========================================================================
  
  /**
   * Importance: CRITICAL
   * Usage: "Season Signal" column with icon
   * Values: 'RISING' (↗) | 'STABLE' (─) | 'DECLINING' (↘)
   */
  seasonal_trajectory: string;
  
  /**
   * Importance: HIGH
   * Usage: Seasonality tooltip: "Current month: +15% vs baseline"
   */
  seasonal_index_current: number;
  
  /**
   * Importance: HIGH
   * Usage: Seasonality tooltip: "Next month: -10% vs baseline"
   */
  seasonal_index_next: number;
  
  /**
   * Importance: MEDIUM
   * Usage: Seasonality tooltip: confidence indicator
   * Values: 'HIGH' | 'MEDIUM' | 'LOW'
   */
  seasonal_confidence: string;

  // =========================================================================
  // REORDER SUGGESTION
  // =========================================================================
  
  /**
   * Importance: CRITICAL
   * Usage: "Suggested Order" column (editable)
   * Special: 0 with skip_reason means "DO NOT ORDER"
   */
  suggested_order_qty: number;
  
  /**
   * Importance: HIGH
   * Usage: Display "SKIP" badge if present
   * Example: "Season ending, sufficient stock"
   */
  skip_reason: string | null;
  
  /**
   * Importance: CRITICAL
   * Usage: SuggestedOrderTooltip component - full breakdown
   */
  order_calculation: {
    forecasted_daily_demand: number;
    coverage_period_days: number;
    lead_time_days: number;
    safety_stock_qty: number;
    gross_need: number;
    current_stock: number;
    pending_po_qty: number;
    net_need: number;
    pack_size: number;
    rounded_qty: number;
    seasonal_adjustment: number | null;
  };
  
  /**
   * Importance: MEDIUM
   * Usage: Display in grid if pending PO exists
   */
  pending_po_qty: number;

  // =========================================================================
  // CONFIDENCE SCORE
  // =========================================================================
  
  /**
   * Importance: CRITICAL
   * Usage: "Confidence" column - visual dots/bar
   * Range: 0-100
   */
  confidence_score: number;
  
  /**
   * Importance: CRITICAL
   * Usage: ConfidenceTooltip component - breakdown
   */
  confidence_components: {
    /**
     * How consistent is the velocity data?
     */
    velocity_stability: number;
    
    /**
     * How recent is the sales data?
     */
    data_recency: number;
    
    /**
     * How confident are we in seasonal pattern?
     */
    seasonality_certainty: number;
    
    /**
     * How reliable is the supplier lead time?
     */
    lead_time_reliability: number;
  };
  
  /**
   * Importance: HIGH
   * Usage: Warning badge on row
   * Values: 'GOOD' | 'SPARSE' | 'NEW_PRODUCT' | 'IRREGULAR'
   */
  data_quality_flag: string;

  // =========================================================================
  // SUPPLIER INFO
  // =========================================================================
  
  /**
   * Importance: HIGH
   * Usage: Tooltip: "Avg lead time: X days"
   */
  avg_lead_time_days: number;
  
  /**
   * Importance: MEDIUM
   * Usage: Tooltip: "Lead time varies ±X days"
   */
  lead_time_variability: number;
  
  /**
   * Importance: LOW
   * Usage: Tooltip: "Last ordered: X days ago"
   */
  last_po_date: string | null;

  // =========================================================================
  // FINANCIALS (Quick Reference)
  // =========================================================================
  
  /**
   * Importance: MEDIUM
   * Usage: Expanded row details
   */
  unit_cost: number;
  
  /**
   * Importance: MEDIUM
   * Usage: Expanded row details
   */
  selling_price: number;
  
  /**
   * Importance: MEDIUM
   * Usage: Expanded row details: "Margin: X%"
   */
  margin_percent: number;
  
  /**
   * Importance: LOW
   * Usage: Expanded row, prioritization
   */
  abc_class: 'A' | 'B' | 'C';

  // =========================================================================
  // HISTORY (For Side Panel)
  // =========================================================================
  
  /**
   * Importance: MEDIUM
   * Usage: Side panel "Quick Stats"
   */
  last_stockout_date: string | null;
  
  /**
   * Importance: MEDIUM
   * Usage: Side panel: "Stockouts in last 90 days: X"
   */
  stockout_count_90d: number;
  
  /**
   * Importance: LOW
   * Usage: Side panel chart data
   */
  sales_history_30d: Array<{
    date: string;
    quantity: number;
  }>;
}
```

### Risk Tab API Response

```typescript
/**
 * GET /api/v1/intelligence/risk/expiring
 * 
 * Returns batches with expiry risk.
 * Used by: RiskTab.tsx → ExpiryRiskGrid component
 */

interface ExpiryRiskResponse {
  meta: {
    total_count: number;
    page: number;
    page_size: number;
    generated_at: string;
  };

  // =========================================================================
  // SUMMARY
  // =========================================================================
  
  summary: {
    /**
     * Importance: CRITICAL
     * Usage: RiskOverviewCards → "EXPIRING" card value
     */
    total_value_at_risk: number;
    
    /**
     * Importance: CRITICAL
     * Usage: RiskOverviewCards → "EXPIRING" card count
     */
    total_batches_at_risk: number;
    
    /**
     * Importance: HIGH
     * Usage: Sub-breakdown in card
     */
    by_urgency: {
      critical: { count: number; value: number }; // < 30 days
      high: { count: number; value: number };     // 30-60 days
      medium: { count: number; value: number };   // 60-90 days
    };
    
    /**
     * Importance: HIGH
     * Usage: RecommendedActionsPanel → summary
     */
    potential_recovery_value: number;
  };

  // =========================================================================
  // ITEMS
  // =========================================================================
  
  items: ExpiryRiskItem[];
}

interface ExpiryRiskItem {
  /**
   * Importance: CRITICAL
   * Usage: Row key, action APIs
   */
  batch_id: string;
  
  /**
   * Importance: CRITICAL
   * Usage: Product name in grid
   */
  product_id: string;
  product_name: string;
  
  /**
   * Importance: HIGH
   * Usage: "Batch" column
   */
  batch_number: string;
  
  /**
   * Importance: CRITICAL
   * Usage: "Qty" column
   */
  current_quantity: number;
  
  /**
   * Importance: CRITICAL
   * Usage: "Expiry Date" column
   */
  expiry_date: string; // ISO date
  
  /**
   * Importance: CRITICAL
   * Usage: "Days Left" column with color coding
   */
  days_until_expiry: number;
  
  /**
   * Importance: HIGH
   * Usage: Calculated: "Sellable until" considering min shelf life
   */
  sellable_days_remaining: number;
  
  /**
   * Importance: CRITICAL
   * Usage: "Value at Risk" column
   */
  value_at_risk: number;
  
  /**
   * Importance: CRITICAL
   * Usage: "Risk Score" column with visual indicator
   */
  risk_score: number;
  
  /**
   * Importance: HIGH
   * Usage: Row color coding
   * Values: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
   */
  risk_category: string;
  
  /**
   * Importance: CRITICAL
   * Usage: RiskScoreTooltip component
   */
  risk_score_breakdown: {
    urgency_score: number;
    velocity_score: number;
    value_score: number;
    calculation_explanation: string;
  };
  
  /**
   * Importance: HIGH
   * Usage: Inline message under row: "Velocity: 0.8/day → Won't clear"
   */
  clearance_analysis: {
    current_velocity: number;
    projected_units_sold: number;
    projected_remaining: number;
    will_clear_in_time: boolean;
    required_velocity_to_clear: number;
  };
  
  /**
   * Importance: CRITICAL
   * Usage: "Action" column button
   * Values: 'DISCOUNT_AGGRESSIVE' | 'DISCOUNT_MODERATE' | 'MONITOR' | 'RETURN' | 'WRITE_OFF'
   */
  recommended_action: string;
  
  /**
   * Importance: HIGH
   * Usage: CreateDiscountModal pre-fill
   */
  recommended_discount_percent: number | null;
  
  /**
   * Importance: HIGH
   * Usage: CreateDiscountModal: "Expected recovery: $X"
   */
  expected_recovery_value: number | null;
  
  /**
   * Importance: MEDIUM
   * Usage: Show "Already actioned" badge
   */
  action_taken: string | null;
  action_taken_at: string | null;
}
```

### Financials Tab API Response

```typescript
/**
 * GET /api/v1/intelligence/financials/summary
 * 
 * Returns financial KPIs and comparison.
 * Used by: FinancialsTab.tsx → FinancialKPIRow component
 */

interface FinancialSummaryResponse {
  // =========================================================================
  // PERIOD INFO
  // =========================================================================
  
  period: {
    /**
     * Importance: CRITICAL
     * Usage: Display in header: "Jan 1 - Jan 31, 2025"
     */
    start_date: string;
    end_date: string;
    
    /**
     * Importance: HIGH
     * Usage: Comparison display
     */
    comparison_period: {
      start_date: string;
      end_date: string;
      label: string; // "vs Prior Month"
    } | null;
  };

  // =========================================================================
  // PRIMARY KPIs
  // =========================================================================
  
  kpis: {
    /**
     * Importance: CRITICAL
     * Usage: FinancialKPIRow → Revenue card (main value)
     */
    revenue: {
      value: number;
      formatted: string; // "$127,450.00"
      
      /**
       * Comparison to prior period
       * Usage: Delta display: "[↑ 8.2%]"
       */
      change_percent: number | null;
      change_value: number | null;
      change_direction: 'up' | 'down' | 'unchanged' | null;
      
      /**
       * Usage: Drill-down: click to see breakdown
       */
      transaction_count: number;
    };
    
    /**
     * Importance: CRITICAL
     * Usage: FinancialKPIRow → COGS card
     */
    cogs: {
      value: number;
      formatted: string;
      change_percent: number | null;
      change_direction: 'up' | 'down' | 'unchanged' | null;
    };
    
    /**
     * Importance: CRITICAL
     * Usage: FinancialKPIRow → Gross Profit card (main value)
     */
    gross_profit: {
      value: number;
      formatted: string;
      change_percent: number | null;
      change_value: number | null;
      change_direction: 'up' | 'down' | 'unchanged' | null;
    };
    
    /**
     * Importance: CRITICAL
     * Usage: FinancialKPIRow → Margin % card
     */
    margin_percent: {
      value: number;
      formatted: string; // "24.51%"
      
      /**
       * Percentage points change (not percent)
       * Usage: "[↑ 0.8pp]"
       */
      change_points: number | null;
      change_direction: 'up' | 'down' | 'unchanged' | null;
      prior_value: number | null;
    };
    
    /**
     * Importance: HIGH
     * Usage: FinancialKPIRow → Units Sold card
     */
    units_sold: {
      value: number;
      formatted: string; // "8,942"
      change_percent: number | null;
      change_direction: 'up' | 'down' | 'unchanged' | null;
    };
    
    /**
     * Importance: HIGH
     * Usage: FinancialKPIRow → Avg Basket card
     */
    avg_basket_value: {
      value: number;
      formatted: string;
      change_percent: number | null;
      change_direction: 'up' | 'down' | 'unchanged' | null;
    };
  };

  // =========================================================================
  // DRILL-DOWN SUPPORT
  // =========================================================================
  
  /**
   * Importance: HIGH
   * Usage: DrillDownModal → Calculation verification section
   */
  audit_summary: {
    total_transactions: number;
    total_line_items: number;
    
    /**
     * Any discrepancies found in data
     */
    data_integrity_status: 'VERIFIED' | 'WARNINGS' | 'ERRORS';
    warnings: string[];
  };
}

/**
 * GET /api/v1/intelligence/financials/by-product
 * 
 * Returns product-level financial breakdown.
 * Used by: FinancialsTab.tsx → ProductFinancialsGrid component
 */

interface ProductFinancialsResponse {
  meta: {
    total_count: number;
    page: number;
    page_size: number;
  };
  
  items: ProductFinancialItem[];
}

interface ProductFinancialItem {
  /**
   * Importance: CRITICAL
   * Usage: Row key
   */
  product_id: string;
  
  /**
   * Importance: CRITICAL
   * Usage: Product name column
   */
  product_name: string;
  
  /**
   * Importance: HIGH
   * Usage: ABC column with badge styling
   */
  abc_class: 'A' | 'B' | 'C';
  
  /**
   * Importance: HIGH
   * Usage: "Qty Sold" column
   */
  quantity_sold: number;
  
  /**
   * Importance: CRITICAL
   *

<think>The user wants me to continue from where I left off. I was in the middle of the ProductFinancialsResponse interface in Artifact 3. Let me continue from there and complete the remaining artifacts.</think>```typescript
  /**
   * Importance: CRITICAL
   * Usage: "Revenue" column
   */
  revenue: number;
  
  /**
   * Importance: CRITICAL
   * Usage: "COGS" column
   */
  cogs: number;
  
  /**
   * Importance: CRITICAL
   * Usage: "Profit" column
   */
  gross_profit: number;
  
  /**
   * Importance: CRITICAL
   * Usage: "Margin %" column with conditional coloring
   * Color: Green > 25%, Yellow 15-25%, Red < 15%
   */
  margin_percent: number;
  
  /**
   * Importance: MEDIUM
   * Usage: Contribution to total revenue (for charts)
   */
  revenue_contribution_percent: number;
  
  /**
   * Importance: MEDIUM
   * Usage: Expanded row detail
   */
  avg_selling_price: number;
  
  /**
   * Importance: MEDIUM
   * Usage: Expanded row detail
   */
  avg_unit_cost: number;
  
  /**
   * Importance: LOW
   * Usage: Expanded row: transaction count for this product
   */
  transaction_count: number;
  
  /**
   * Importance: MEDIUM
   * Usage: Comparison column if compare mode on
   */
  prior_period?: {
    quantity_sold: number;
    revenue: number;
    margin_percent: number;
    change_percent: number;
  };
}
```

### Audit Tab API Response

```typescript
/**
 * GET /api/v1/intelligence/audit/transactions
 * 
 * Returns transaction log with anomaly flags.
 * Used by: AuditTab.tsx → TransactionLogGrid component
 */

interface AuditTransactionsResponse {
  meta: {
    total_count: number;
    page: number;
    page_size: number;
    generated_at: string;
  };

  // =========================================================================
  // QUICK STATS
  // =========================================================================
  
  quick_stats: {
    /**
     * Importance: HIGH
     * Usage: QuickAuditButtons badge counts
     */
    voids_today: number;
    high_discounts_today: number;
    below_cost_sales_today: number;
    price_overrides_today: number;
    controlled_substance_sales_today: number;
    
    /**
     * Importance: HIGH
     * Usage: Alert banner if anomaly_count > threshold
     */
    total_anomalies_in_period: number;
  };

  // =========================================================================
  // TRANSACTIONS
  // =========================================================================
  
  items: AuditTransactionItem[];
}

interface AuditTransactionItem {
  /**
   * Importance: CRITICAL
   * Usage: Row key, detail API call
   */
  transaction_id: string;
  
  /**
   * Importance: CRITICAL
   * Usage: "Timestamp" column
   */
  timestamp: string; // ISO 8601
  
  /**
   * Importance: CRITICAL
   * Usage: "Invoice #" column, searchable
   */
  invoice_number: string;
  
  /**
   * Importance: CRITICAL
   * Usage: "Type" column with icon
   * Values: 'SALE' | 'RETURN' | 'VOID' | 'ADJUSTMENT'
   */
  transaction_type: string;
  
  /**
   * Importance: HIGH
   * Usage: Icon color/style within type
   */
  transaction_subtype: string | null;
  
  /**
   * Importance: CRITICAL
   * Usage: "Cashier" column
   */
  cashier_id: string;
  cashier_name: string;
  
  /**
   * Importance: HIGH
   * Usage: Detail view, if void required approval
   */
  approver_id: string | null;
  approver_name: string | null;
  
  /**
   * Importance: HIGH
   * Usage: "Product" column (primary product if multi-line)
   */
  primary_product_name: string | null;
  
  /**
   * Importance: HIGH
   * Usage: Show "+X more" if multi-line transaction
   */
  line_item_count: number;
  
  /**
   * Importance: CRITICAL
   * Usage: "Qty" column
   */
  total_quantity: number;
  
  /**
   * Importance: CRITICAL
   * Usage: "Amount" column
   */
  total_amount: number;
  
  /**
   * Importance: HIGH
   * Usage: Display if discount applied
   */
  discount_amount: number | null;
  discount_percent: number | null;
  
  /**
   * Importance: CRITICAL
   * Usage: "Flag" column - anomaly indicator icon
   */
  has_anomaly: boolean;
  
  /**
   * Importance: CRITICAL
   * Usage: Anomaly badge tooltip
   * Values: 'VOID_AFTER_CLOSE' | 'HIGH_DISCOUNT' | 'BELOW_COST' | 'QUANTITY_UNUSUAL' | etc.
   */
  anomaly_types: string[];
  
  /**
   * Importance: HIGH
   * Usage: Anomaly severity (color of flag icon)
   */
  anomaly_severity: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  
  /**
   * Importance: MEDIUM
   * Usage: Quick filter chip
   */
  payment_method: string;
  
  /**
   * Importance: LOW
   * Usage: Detail view
   */
  terminal_id: string;
}

/**
 * GET /api/v1/intelligence/audit/transactions/:transactionId
 * 
 * Returns full transaction detail for modal.
 * Used by: AuditTab.tsx → TransactionDetailModal component
 */

interface TransactionDetailResponse {
  // =========================================================================
  // HEADER
  // =========================================================================
  
  header: {
    transaction_id: string;
    invoice_number: string;
    timestamp: string;
    transaction_type: string;
    status: string;
    
    /**
     * Importance: CRITICAL
     * Usage: Modal header display
     */
    cashier: {
      id: string;
      name: string;
      employee_id: string;
    };
    
    approver: {
      id: string;
      name: string;
      employee_id: string;
    } | null;
    
    terminal_id: string;
    store_name: string;
  };

  // =========================================================================
  // LINE ITEMS
  // =========================================================================
  
  /**
   * Importance: CRITICAL
   * Usage: Line items table in modal
   */
  line_items: Array<{
    line_id: string;
    product_id: string;
    product_name: string;
    sku: string;
    batch_number: string | null;
    
    quantity: number;
    unit_price: number;
    
    /**
     * Importance: HIGH
     * Usage: Show if price was overridden
     */
    original_price: number | null;
    price_override_reason: string | null;
    
    discount_percent: number | null;
    discount_amount: number | null;
    discount_reason: string | null;
    
    line_total: number;
    
    /**
     * Importance: HIGH
     * Usage: Flag icon on line item
     */
    cost_at_sale: number;
    is_below_cost: boolean;
    
    /**
     * Importance: MEDIUM
     * Usage: Regulatory flag for controlled substances
     */
    is_controlled_substance: boolean;
    prescription_number: string | null;
  }>;

  // =========================================================================
  // TOTALS
  // =========================================================================
  
  totals: {
    subtotal: number;
    total_discount: number;
    tax: number;
    grand_total: number;
    payment_method: string;
    payment_reference: string | null;
  };

  // =========================================================================
  // ANOMALY ANALYSIS
  // =========================================================================
  
  /**
   * Importance: CRITICAL
   * Usage: Anomaly section in modal (if applicable)
   */
  anomaly_analysis: {
    has_anomalies: boolean;
    
    anomalies: Array<{
      type: string;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      description: string;
      
      /**
       * E.g., for HIGH_DISCOUNT: the threshold that was exceeded
       */
      threshold: string | null;
      actual_value: string | null;
      
      /**
       * Which line item, if applicable
       */
      line_id: string | null;
    }>;
  };

  // =========================================================================
  // FULL AUDIT TRAIL
  // =========================================================================
  
  /**
   * Importance: CRITICAL
   * Usage: Timeline component at bottom of modal
   */
  audit_trail: Array<{
    event_id: string;
    timestamp: string;
    event_type: string;
    description: string;
    user_name: string;
    
    /**
     * Before/after for changes
     */
    old_value: string | null;
    new_value: string | null;
  }>;

  // =========================================================================
  // RELATED TRANSACTIONS
  // =========================================================================
  
  /**
   * Importance: MEDIUM
   * Usage: "Related" section - e.g., if this is a void, show original
   */
  related_transactions: Array<{
    transaction_id: string;
    invoice_number: string;
    relationship: 'ORIGINAL' | 'VOIDED_BY' | 'RETURN_OF';
    amount: number;
  }>;
}
```

### Dashboard API Response

```typescript
/**
 * GET /api/v1/intelligence/dashboard/overview
 * 
 * Returns aggregated KPIs for dashboard widgets.
 * Used by: DashboardPage.tsx → All widgets
 */

interface DashboardOverviewResponse {
  /**
   * Importance: CRITICAL
   * Usage: "Last updated" display, auto-refresh trigger
   */
  generated_at: string;
  store_id: string;
  store_name: string;

  // =========================================================================
  // TODAY'S PULSE
  // =========================================================================
  
  todays_pulse: {
    /**
     * Importance: CRITICAL
     * Usage: TodaysPulseWidget → Revenue (big number)
     */
    revenue_today: number;
    revenue_vs_same_day_last_week: number; // percent change
    
    /**
     * Importance: HIGH
     * Usage: TodaysPulseWidget → Transactions count
     */
    transactions_today: number;
    
    /**
     * Importance: HIGH
     * Usage: TodaysPulseWidget → Avg basket
     */
    avg_basket_today: number;
    
    /**
     * Importance: MEDIUM
     * Usage: Mini sparkline of hourly sales
     */
    hourly_sales: Array<{
      hour: number; // 0-23
      revenue: number;
    }>;
  };

  // =========================================================================
  // PROCUREMENT SNAPSHOT
  // =========================================================================
  
  procurement_snapshot: {
    /**
     * Importance: CRITICAL
     * Usage: ProcurementSnapshotWidget → Main number
     */
    items_need_reorder: number;
    
    /**
     * Importance: CRITICAL
     * Usage: Red alert style
     */
    items_out_of_stock: number;
    
    /**
     * Importance: HIGH
     * Usage: Click-through filter
     */
    items_critical: number;
    
    /**
     * Importance: HIGH
     * Usage: Pending work indicator
     */
    pending_po_count: number;
    pending_po_value: number;
    
    /**
     * Importance: MEDIUM
     * Usage: "Top stockouts" list
     */
    top_stockouts: Array<{
      product_id: string;
      product_name: string;
      days_out_of_stock: number;
      estimated_lost_revenue: number;
    }>;
  };

  // =========================================================================
  // FINANCIAL SNAPSHOT
  // =========================================================================
  
  financial_snapshot: {
    /**
     * Importance: CRITICAL
     * Usage: FinancialSnapshotWidget → MTD Revenue
     */
    mtd_revenue: number;
    mtd_revenue_vs_prior: number; // percent
    
    /**
     * Importance: CRITICAL
     * Usage: FinancialSnapshotWidget → MTD Margin
     */
    mtd_margin_percent: number;
    mtd_margin_vs_prior: number; // percentage points
    
    /**
     * Importance: HIGH
     * Usage: Progress toward goal
     */
    monthly_target: number | null;
    target_achievement_percent: number | null;
  };

  // =========================================================================
  // RISK SNAPSHOT
  // =========================================================================
  
  risk_snapshot: {
    /**
     * Importance: CRITICAL
     * Usage: RiskSnapshotWidget → Expiring value
     */
    expiring_value_30d: number;
    expiring_batch_count: number;
    
    /**
     * Importance: HIGH
     * Usage: RiskSnapshotWidget → Cash traps
     */
    cash_trap_value: number;
    cash_trap_count: number;
    
    /**
     * Importance: HIGH
     * Usage: RiskSnapshotWidget → Dead stock
     */
    dead_stock_value: number;
    dead_stock_count: number;
    
    /**
     * Importance: CRITICAL
     * Usage: Combined risk total
     */
    total_value_at_risk: number;
  };

  // =========================================================================
  // ACTIVE ALERTS
  // =========================================================================
  
  /**
   * Importance: CRITICAL
   * Usage: AlertsWidget → List of alerts
   */
  active_alerts: Array<{
    alert_id: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    domain: string;
    title: string;
    description: string;
    monetary_impact: number | null;
    created_at: string;
    deep_link_tab: string;
    deep_link_params: object;
  }>;
  
  alert_counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}
```


