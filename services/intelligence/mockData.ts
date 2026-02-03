/**
 * Mock data for Intelligence module development
 * This allows frontend development to proceed without backend implementation
 */

import type {
  ExpiryRiskItem,
  FinancialKPIs,
  ProcurementItem,
  ProcurementSummary,
  ProductFinancialItem,
  RiskSummary,
} from '../../types/intelligence';

// === PROCUREMENT MOCK DATA ===

export const mockProcurementSummary: ProcurementSummary = {
  items_needing_order: 14,
  items_out_of_stock: 3,
  avg_confidence_score: 87,
  pending_po_count: 2,
  pending_po_value: 12500,
  estimated_lost_sales: 450,
};

export const mockProcurementItems: ProcurementItem[] = [
  {
    product_id: 'PROD-101',
    product_name: 'Panadol Extra 500mg',
    sku: 'PAN-EXT-500',
    supplier_id: 'SUP-01',
    supplier_name: 'Pharma Overseas',
    category_id: 'CAT-01',
    category_name: 'Analgesics',
    current_stock: 12,
    stock_days: 4,
    stock_status: 'LOW',
    reorder_point_days: 10,
    avg_daily_sales: 3.2,
    velocity_breakdown: {
      last_7_days: 25,
      last_14_days: 48,
      last_30_days: 96,
      trend: 'STABLE',
    },
    velocity_cv: 0.15,
    seasonal_trajectory: 'STABLE',
    seasonal_index_current: 1.05,
    seasonal_index_next: 1.02,
    seasonal_confidence: 'HIGH',
    suggested_order_qty: 50,
    skip_reason: null,
    confidence_score: 92,
    confidence_components: {
      velocity_stability: 95,
      data_recency: 100,
      seasonality_certainty: 90,
      lead_time_reliability: 85,
    },
    abc_class: 'A',
    data_quality_flag: 'GOOD',
  },
  {
    product_id: 'PROD-102',
    product_name: 'Augmentin 1g Tablets',
    sku: 'AUG-1G',
    supplier_id: 'SUP-02',
    supplier_name: 'United Pharma',
    category_id: 'CAT-02',
    category_name: 'Antibiotics',
    current_stock: 0,
    stock_days: 0,
    stock_status: 'OUT_OF_STOCK',
    reorder_point_days: 7,
    avg_daily_sales: 1.5,
    velocity_breakdown: {
      last_7_days: 8,
      last_14_days: 22,
      last_30_days: 45,
      trend: 'INCREASING',
    },
    velocity_cv: 0.25,
    seasonal_trajectory: 'RISING',
    seasonal_index_current: 1.2,
    seasonal_index_next: 1.3,
    seasonal_confidence: 'MEDIUM',
    suggested_order_qty: 30,
    skip_reason: null,
    confidence_score: 85,
    confidence_components: {
      velocity_stability: 80,
      data_recency: 90,
      seasonality_certainty: 85,
      lead_time_reliability: 90,
    },
    abc_class: 'B',
    data_quality_flag: 'GOOD',
  },
  {
    product_id: 'PROD-103',
    product_name: 'Cataflam 50mg',
    sku: 'CAT-50',
    supplier_id: 'SUP-01',
    supplier_name: 'Pharma Overseas',
    category_id: 'CAT-01',
    category_name: 'Analgesics',
    current_stock: 150,
    stock_days: 45,
    stock_status: 'OVERSTOCK',
    reorder_point_days: 15,
    avg_daily_sales: 3.3,
    velocity_breakdown: {
      last_7_days: 20,
      last_14_days: 45,
      last_30_days: 100,
      trend: 'DECREASING',
    },
    velocity_cv: 0.1,
    seasonal_trajectory: 'DECLINING',
    seasonal_index_current: 0.9,
    seasonal_index_next: 0.85,
    seasonal_confidence: 'HIGH',
    suggested_order_qty: 0,
    skip_reason: 'Overstocked',
    confidence_score: 95,
    confidence_components: {
      velocity_stability: 98,
      data_recency: 100,
      seasonality_certainty: 95,
      lead_time_reliability: 90,
    },
    abc_class: 'A',
    data_quality_flag: 'GOOD',
  },
];

// === RISK MOCK DATA ===

export const mockRiskSummary: RiskSummary = {
  total_value_at_risk: 4500,
  total_batches_at_risk: 12,
  by_urgency: {
    critical: { count: 3, value: 1200 },
    high: { count: 5, value: 2000 },
    medium: { count: 4, value: 1300 },
  },
  potential_recovery_value: 2800,
};

export const mockExpiryRiskItems: ExpiryRiskItem[] = [
  {
    batch_id: 'BATCH-001',
    product_id: 'PROD-205',
    product_name: 'Omega-3 Fish Oil',
    batch_number: 'B-2205',
    current_quantity: 15,
    expiry_date: '2026-03-15',
    days_until_expiry: 55,
    sellable_days_remaining: 25,
    value_at_risk: 4500,
    risk_score: 85,
    risk_category: 'CRITICAL',
    risk_score_breakdown: {
      urgency_score: 90,
      velocity_score: 80,
      value_score: 85,
      calculation_explanation: 'High value item expiring soon with slow velocity',
    },
    clearance_analysis: {
      current_velocity: 0.1,
      projected_units_sold: 2,
      projected_remaining: 13,
      will_clear_in_time: false,
      required_velocity_to_clear: 0.6,
    },
    recommended_action: 'DISCOUNT_AGGRESSIVE',
    recommended_discount_percent: 50,
    expected_recovery_value: 2250,
  },
  {
    batch_id: 'BATCH-002',
    product_id: 'PROD-210',
    product_name: 'Vitamin C 1000mg',
    batch_number: 'B-2210',
    current_quantity: 40,
    expiry_date: '2026-04-20',
    days_until_expiry: 91,
    sellable_days_remaining: 61,
    value_at_risk: 1200,
    risk_score: 65,
    risk_category: 'HIGH',
    risk_score_breakdown: {
      urgency_score: 60,
      velocity_score: 70,
      value_score: 65,
      calculation_explanation: 'Moderate value, moderate velocity',
    },
    clearance_analysis: {
      current_velocity: 0.5,
      projected_units_sold: 30,
      projected_remaining: 10,
      will_clear_in_time: false,
      required_velocity_to_clear: 0.65,
    },
    recommended_action: 'DISCOUNT_MODERATE',
    recommended_discount_percent: 25,
    expected_recovery_value: 900,
  },
];

// === FINANCIALS MOCK DATA ===

export const mockFinancialKPIs: FinancialKPIs = {
  revenue: {
    value: 125000,
    change_percent: 12.5,
    change_direction: 'up',
  },
  gross_profit: {
    value: 35000,
    change_percent: 8.2,
    change_direction: 'up',
  },
  margin_percent: {
    value: 28,
    change_points: -1.2,
    change_direction: 'down',
  },
  units_sold: {
    value: 4500,
    change_percent: 15.0,
    change_direction: 'up',
  },
};

export const mockProductFinancials: ProductFinancialItem[] = [
  {
    product_id: 'PROD-101',
    product_name: 'Panadol Extra 500mg',
    abc_class: 'A',
    quantity_sold: 500,
    revenue: 15000,
    cogs: 12000,
    gross_profit: 3000,
    margin_percent: 20,
  },
  {
    product_id: 'PROD-102',
    product_name: 'Augmentin 1g',
    abc_class: 'A',
    quantity_sold: 200,
    revenue: 18000,
    cogs: 14000,
    gross_profit: 4000,
    margin_percent: 22.2,
  },
  {
    product_id: 'PROD-305',
    product_name: 'Cheap Bandages',
    abc_class: 'C',
    quantity_sold: 50,
    revenue: 500,
    cogs: 200,
    gross_profit: 300,
    margin_percent: 60,
  },
];
