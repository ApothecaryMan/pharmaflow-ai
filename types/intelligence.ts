/**
 * @fileoverview Intelligence Module Type Definitions
 *
 * Contains interfaces for the Sales by Product Intelligence feature:
 * - Procurement (Ordering suggestions, velocity)
 * - Risk (Expiry, cash traps)
 * - Financials (Margins, profitability)
 * - Audit (Transaction history)
 */

// ============================================================================
// PROCUREMENT DOMAIN
// ============================================================================

export interface ProcurementItem {
  product_id: string;
  product_name: string;
  sku: string;
  supplier_id: string;
  supplier_name: string;
  category_id: string;
  category_name: string;
  current_stock: number;

  /** Null means infinite (zero velocity) */
  stock_days: number | null;

  stock_status: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK';
  reorder_point_days: number;

  avg_daily_sales: number;
  velocity_breakdown: {
    last_7_days: number;
    last_14_days: number;
    last_30_days: number;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  };

  /** Lower is better (more consistent sales) */
  velocity_cv: number;

  seasonal_trajectory: 'RISING' | 'STABLE' | 'DECLINING';
  seasonal_index_current: number;
  seasonal_index_next: number;
  seasonal_confidence: 'HIGH' | 'MEDIUM' | 'LOW';

  suggested_order_qty: number;
  skip_reason: string | null;

  confidence_score: number;
  confidence_components: {
    velocity_stability: number;
    data_recency: number;
    seasonality_certainty: number;
    lead_time_reliability: number;
  };

  abc_class: 'A' | 'B' | 'C';
  data_quality_flag: 'GOOD' | 'SPARSE' | 'NEW_PRODUCT' | 'IRREGULAR';
}

export interface ProcurementSummary {
  items_needing_order: number;
  items_out_of_stock: number;
  avg_confidence_score: number;
  pending_po_count: number;
  pending_po_value: number;
  estimated_lost_sales: number;
}

// ============================================================================
// RISK DOMAIN
// ============================================================================

export interface ExpiryRiskItem {
  batch_id: string;
  product_id: string;
  product_name: string;
  batch_number: string;
  current_quantity: number;
  expiry_date: string;
  days_until_expiry: number;
  sellable_days_remaining: number;

  value_at_risk: number;
  risk_score: number;
  risk_category: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  risk_score_breakdown: {
    urgency_score: number;
    velocity_score: number;
    value_score: number;
    calculation_explanation: string;
  };

  clearance_analysis: {
    current_velocity: number;
    projected_units_sold: number;
    projected_remaining: number;
    will_clear_in_time: boolean;
    required_velocity_to_clear: number;
  };

  recommended_action:
    | 'DISCOUNT_AGGRESSIVE'
    | 'DISCOUNT_MODERATE'
    | 'MONITOR'
    | 'RETURN'
    | 'WRITE_OFF';
  recommended_discount_percent: number | null;
  expected_recovery_value: number | null;
}

export interface RiskSummary {
  total_value_at_risk: number;
  total_batches_at_risk: number;
  by_urgency: {
    critical: { count: number; value: number }; // < 30 days
    high: { count: number; value: number }; // 30-60 days
    medium: { count: number; value: number }; // 60-90 days
  };
  potential_recovery_value: number;
}

// ============================================================================
// FINANCIALS DOMAIN
// ============================================================================

export interface ProductFinancialItem {
  product_id: string;
  product_name: string;
  abc_class: 'A' | 'B' | 'C';
  quantity_sold: number;
  revenue: number;
  cogs: number; // Cost of Goods Sold
  gross_profit: number;
  /** Percentage margin (0-100) */
  margin_percent: number;
}

export interface FinancialKPIs {
  revenue: {
    value: number;
    change_percent: number;
    change_direction: 'up' | 'down' | 'unchanged';
  };
  gross_profit: {
    value: number;
    change_percent: number;
    change_direction: 'up' | 'down' | 'unchanged';
  };
  margin_percent: {
    value: number;
    change_points: number;
    change_direction: 'up' | 'down' | 'unchanged';
  };
  units_sold: {
    value: number;
    change_percent: number;
    change_direction: 'up' | 'down' | 'unchanged';
  };
}

// ============================================================================
// AUDIT DOMAIN
// ============================================================================

export interface AuditTransaction {
  id: string;
  timestamp: string;
  invoice_number: string;
  type: 'SALE' | 'RETURN' | 'VOID' | 'ADJUSTMENT';
  cashier_name: string;
  product_name: string;
  quantity: number;
  amount: number;
  has_anomaly: boolean;
  anomaly_reason?: string;
}
