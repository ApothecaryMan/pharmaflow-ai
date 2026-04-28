/**
 * Intelligence Service - Provides analytics data for the Intelligence Dashboard
 *
 * Real data functions for Procurement, Risk, Financials, and Audit
 */

import type { Drug, Sale } from '../../types';
import type {
  AuditTransaction,
  ExpiryRiskItem,
  FinancialKPIs,
  ProcurementItem,
  ProcurementSummary,
  ProductFinancialItem,
  RiskSummary,
  CategoryFinancialItem,
} from '../../types/intelligence';
import { getDisplayName } from '../../utils/drugDisplayName';
import { employeeService } from '../hr/employeeService';
import { batchService } from '../inventory/batchService';
import { inventoryService } from '../inventory/inventoryService';
import { returnService } from '../returns/returnService';
import { salesService } from '../sales/salesService';
import { parseExpiryEndOfMonth } from '../../utils/expiryUtils';
import { money, pricing } from '../../utils/money';

// === Period Helpers ===

export type FinancialPeriod = 'this_month' | 'last_month' | 'last_3_months' | 'this_year';

function getDateRangeForPeriod(period: FinancialPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (period) {
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start, end: endOfLastMonth };
    }
    case 'last_3_months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return { start, end };
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end };
    }
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
  }
}

function getPreviousPeriodRange(period: FinancialPeriod): { start: Date; end: Date } {
  const now = new Date();

  switch (period) {
    case 'this_month': {
      // Previous month
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start, end };
    }
    case 'last_month': {
      // Month before last
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
      return { start, end };
    }
    case 'last_3_months': {
      // Previous 3 months before current 3
      const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - 3, 0, 23, 59, 59);
      return { start, end };
    }
    case 'this_year': {
      // Last year
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      return { start, end };
    }
    default:
      return getPreviousPeriodRange('this_month');
  }
}

function filterSalesByDateRange(sales: Sale[], start: Date, end: Date): Sale[] {
  return sales.filter((sale) => {
    const saleDate = new Date(sale.date);
    return saleDate >= start && saleDate <= end && sale.status === 'completed';
  });
}

// === Real Data Calculator Functions ===

interface PeriodMetrics {
  revenue: number;
  grossProfit: number;
  unitsSold: number;
  cogs: number;
}

function calculateMetrics(sales: Sale[], drugMap: Map<string, Drug>): PeriodMetrics {
  let revenue = 0;
  let grossProfit = 0;
  let unitsSold = 0;
  let cogs = 0;

  for (const sale of sales) {
    revenue = money.add(revenue, sale.total);

    for (const item of sale.items) {
      const drug = drugMap.get(item.id);
      const unitsPerPack = drug?.unitsPerPack || 1;
      
      // Normalize quantity to units for "unitsSold" metric
      const normalizedQuantity = item.isUnit ? item.quantity : item.quantity * unitsPerPack;
      
      const itemRevenue = money.multiply(item.price, item.quantity, 0);
      const itemCost = money.multiply(item.costPrice || 0, item.quantity, 0);

      unitsSold += normalizedQuantity;
      cogs = money.add(cogs, itemCost);
      grossProfit = money.add(grossProfit, money.subtract(itemRevenue, itemCost));
    }
  }

  return { revenue, grossProfit, unitsSold, cogs };
}

function calculateChange(
  current: number,
  previous: number
): { percent: number; direction: 'up' | 'down' | 'unchanged' } {
  if (previous === 0) {
    return { percent: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'unchanged' };
  }

  // Use high-precision percentage calculation
  const diff = current - previous;
  const percent = (diff / previous) * 100;
  const direction = percent > 0 ? 'up' : percent < 0 ? 'down' : 'unchanged';

  return { percent: Math.abs(Math.round(percent * 10) / 10), direction };
}

/**
 * Calculates Pareto ABC Classification
 * A = Top 80% of cumulative revenue
 * B = Next 15%
 * C = Bottom 5%
 */
function calculateParetoABC<T extends { revenue: number }>(items: T[]): (T & { abc_class: 'A' | 'B' | 'C' })[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = sorted.reduce((sum, item) => sum + item.revenue, 0);

  if (totalRevenue === 0) {
    return sorted.map(item => ({ ...item, abc_class: 'C' as const }));
  }

  let cumulativeRevenue = 0;
  return sorted.map(item => {
    cumulativeRevenue += item.revenue;
    const percentile = (cumulativeRevenue / totalRevenue) * 100;

    let abc_class: 'A' | 'B' | 'C' = 'C';
    if (percentile <= 80) abc_class = 'A';
    else if (percentile <= 95) abc_class = 'B';

    return { ...item, abc_class };
  });
}

// === Service Export ===

export const intelligenceService = {
  // === Procurement (REAL DATA) ===

  /**
   * Get Procurement Summary from real inventory data
   */
  getProcurementSummary: async (branchId?: string): Promise<ProcurementSummary> => {
    const items = await intelligenceService.getProcurementItems(branchId);

    const needingOrder = items.filter((i) => i.suggested_order_qty > 0);
    const outOfStock = items.filter((i) => i.stock_status === 'OUT_OF_STOCK');
    const avgConfidence =
      items.length > 0 ? items.reduce((sum, i) => sum + i.confidence_score, 0) / items.length : 0;

    return {
      items_needing_order: needingOrder.length,
      items_out_of_stock: outOfStock.length,
      avg_confidence_score: Math.round(avgConfidence),
      pending_po_count: 0, // Would need PO tracking
      pending_po_value: 0,
      estimated_lost_sales: outOfStock.reduce((sum, i) => money.add(sum, money.multiply(i.avg_daily_sales, 7 * 5000, 0)), 0), // Use 50.00 EGP (5000 Piastres) as avg price
    };
  },

  /**
   * Get Procurement Items from real inventory and sales data
   */
  getProcurementItems: async (branchId?: string): Promise<ProcurementItem[]> => {
    const drugs = await inventoryService.getAll(branchId);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // FETCH ONLY LAST 30 DAYS OF SALES (Significant performance gain)
    const recentSales = await salesService.getByDateRange(thirtyDaysAgo.toISOString(), now.toISOString(), branchId);
    
    // Filter completed sales (if not already filtered by service)
    const completedSales = recentSales.filter((s) => s.status === 'completed');

    const drugMap = new Map(drugs.map((d) => [d.id, d]));
    const allBatches = await batchService.getAllBatches(branchId);
    
    // Build stock map for fast lookup (Efficiency: O(N) instead of O(N^2) DB calls)
    const stockMap = new Map<string, number>();
    for (const b of allBatches) {
      stockMap.set(b.drugId, (stockMap.get(b.drugId) || 0) + b.quantity);
    }

    // Build velocity map per drug (normalized to units)
    const velocityMap = new Map<string, { last7: number; last14: number; last30: number }>();

    for (const sale of completedSales) {
      const saleDate = new Date(sale.date);

      for (const item of sale.items) {
        const drug = drugMap.get(item.id);
        if (!drug) continue;

        const unitsPerPack = drug.unitsPerPack || 1;
        const normalizedQty = item.isUnit ? item.quantity : item.quantity * unitsPerPack;

        const existing = velocityMap.get(item.id) || { last7: 0, last14: 0, last30: 0 };

        if (saleDate >= thirtyDaysAgo) {
          existing.last30 += normalizedQty;
          if (saleDate >= fourteenDaysAgo) {
            existing.last14 += normalizedQty;
            if (saleDate >= sevenDaysAgo) {
              existing.last7 += normalizedQty;
            }
          }
        }

        velocityMap.set(item.id, existing);
      }
    }

    const REORDER_POINT_DAYS = 14; // Default reorder point

    const rawItems = drugs.map((drug) => {
      const velocity = velocityMap.get(drug.id) || { last7: 0, last14: 0, last30: 0 };
      const avgDailySales = velocity.last30 / 30;

      // GET REAL STOCK FROM PRE-CALCULATED MAP
      const currentStock = stockMap.get(drug.id) || 0;

      // Stock days (how many days of stock left)
      const stockDays = avgDailySales > 0 ? currentStock / avgDailySales : null;

      // Stock status
      let stockStatus: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK';
      if (currentStock <= 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (stockDays !== null) {
        if (stockDays < 7) stockStatus = 'CRITICAL';
        else if (stockDays < REORDER_POINT_DAYS) stockStatus = 'LOW';
        else if (stockDays > 60) stockStatus = 'OVERSTOCK';
        else stockStatus = 'NORMAL';
      } else {
        // No sales velocity
        stockStatus = currentStock > 100 ? 'OVERSTOCK' : 'NORMAL';
      }

      // Trend detection
      const weeklyAvg = velocity.last7 / 7;
      const prevWeekAvg = (velocity.last14 - velocity.last7) / 7;
      let trend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
      if (weeklyAvg > prevWeekAvg * 1.2) trend = 'INCREASING';
      else if (weeklyAvg < prevWeekAvg * 0.8) trend = 'DECREASING';

      // Suggested order quantity
      const targetStock = REORDER_POINT_DAYS * avgDailySales * 1.5; // 1.5x buffer
      const suggestedQty = Math.max(0, Math.ceil(targetStock - currentStock));

      // Confidence score based on data quality
      const hasRecentSales = velocity.last7 > 0;
      const hasConsistentSales = velocity.last30 >= 5;
      const confidenceScore =
        hasRecentSales && hasConsistentSales ? 85 : hasConsistentSales ? 70 : 50;

      return {
        id: drug.id,
        product_id: drug.id,
        product_name: getDisplayName({ name: drug.name, dosageForm: drug.dosageForm }),
        sku: drug.barcode || drug.internalCode || drug.id.slice(-8),
        supplier_id: drug.supplierId || 'UNKNOWN',
        supplier_name: drug.supplierId ? `Supplier ${drug.supplierId}` : 'غير معروف', // Placeholder until supplierService is integrated
        category_id: drug.category || 'GENERAL',
        category_name: drug.category || 'عام',
        current_stock: currentStock,
        stock_days: stockDays ? Math.round(stockDays) : null,
        stock_status: stockStatus,
        reorder_point_days: REORDER_POINT_DAYS,
        avg_daily_sales: Math.round(avgDailySales * 10) / 10,
        velocity_breakdown: {
          last_7_days: velocity.last7,
          last_14_days: velocity.last14,
          last_30_days: velocity.last30,
          trend: trend,
        },
        velocity_cv: 0.2, // Would need more complex calculation
        seasonal_trajectory: 'STABLE' as const,
        seasonal_index_current: 1.0,
        seasonal_index_next: 1.0,
        seasonal_confidence: 'MEDIUM' as const,
        suggested_order_qty: suggestedQty,
        skip_reason:
          stockStatus === 'OVERSTOCK'
            ? 'مخزون زائد'
            : stockStatus === 'NORMAL'
              ? 'مخزون كافي'
              : null,
        confidence_score: confidenceScore,
        confidence_components: {
          velocity_stability: hasConsistentSales ? 80 : 50,
          data_recency: hasRecentSales ? 90 : 40,
          seasonality_certainty: 70,
          lead_time_reliability: 75,
        },
      };
    });

    // Final Pareto Classify
    const itemsWithABC = calculateParetoABC(rawItems.map(i => ({ ...i, revenue: i.avg_daily_sales * 30 })));
    
    return rawItems.map(item => {
      const abc = itemsWithABC.find(i => i.product_id === item.product_id)?.abc_class || 'C';
      
      // Determine data quality
      let dataQuality: 'GOOD' | 'SPARSE' | 'NEW_PRODUCT' | 'IRREGULAR' = 'GOOD';
      if (item.velocity_breakdown.last_30_days < 5) dataQuality = 'SPARSE';
      if (item.velocity_breakdown.last_30_days === 0) dataQuality = 'NEW_PRODUCT';

      return { 
        ...item, 
        abc_class: abc,
        data_quality_flag: dataQuality
      } as ProcurementItem;
    }).sort((a, b) => {
      const statusOrder = { OUT_OF_STOCK: 0, CRITICAL: 1, LOW: 2, NORMAL: 3, OVERSTOCK: 4 };
      return statusOrder[a.stock_status] - statusOrder[b.stock_status];
    });
  },

  // === Risk (REAL DATA) ===

  /**
   * Get Risk Summary computed from real batch expiry data
   */
  getRiskSummary: async (branchId?: string): Promise<RiskSummary> => {
    const riskItems = await intelligenceService.getExpiryRiskItems(branchId);

    const summary: RiskSummary = {
      total_value_at_risk: 0,
      total_batches_at_risk: riskItems.length,
      by_urgency: {
        critical: { count: 0, value: 0 },
        high: { count: 0, value: 0 },
        medium: { count: 0, value: 0 },
      },
      potential_recovery_value: 0,
    };

    for (const item of riskItems) {
      summary.total_value_at_risk = money.add(summary.total_value_at_risk, item.value_at_risk);
      summary.potential_recovery_value = money.add(summary.potential_recovery_value, item.expected_recovery_value || 0);

      if (item.risk_category === 'CRITICAL') {
        summary.by_urgency.critical.count++;
        summary.by_urgency.critical.value = money.add(summary.by_urgency.critical.value, item.value_at_risk);
      } else if (item.risk_category === 'HIGH') {
        summary.by_urgency.high.count++;
        summary.by_urgency.high.value = money.add(summary.by_urgency.high.value, item.value_at_risk);
      } else if (item.risk_category === 'MEDIUM') {
        summary.by_urgency.medium.count++;
        summary.by_urgency.medium.value = money.add(summary.by_urgency.medium.value, item.value_at_risk);
      }
    }

    return summary;
  },

  /**
   * Get Expiry Risk Items computed from real batch data
   */
  getExpiryRiskItems: async (branchId?: string): Promise<ExpiryRiskItem[]> => {
    const allBatches = await batchService.getAllBatches(branchId);
    const drugs = await inventoryService.getAll(branchId);
    const drugMap = new Map(drugs.map((d) => [d.id, d]));

    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Filter batches expiring within 90 days with stock > 0
    const expiringBatches = allBatches.filter((batch) => {
      const expiryDate = parseExpiryEndOfMonth(batch.expiryDate);
      return batch.quantity > 0 && expiryDate <= ninetyDaysFromNow && expiryDate > now;
    });

    const riskItems: ExpiryRiskItem[] = expiringBatches.map((batch) => {
      const drug = drugMap.get(batch.drugId);
      const expiryDate = parseExpiryEndOfMonth(batch.expiryDate);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Value at risk = quantity × cost price
      const valueAtRisk = money.multiply(batch.quantity, batch.costPrice, 0);

      // Risk category based on days
      let riskCategory: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      if (daysUntilExpiry < 30) {
        riskCategory = 'CRITICAL';
      } else if (daysUntilExpiry < 60) {
        riskCategory = 'HIGH';
      } else {
        riskCategory = 'MEDIUM';
      }

      // Risk score (0-100)
      const urgencyScore = Math.max(0, 100 - daysUntilExpiry);
      const valueScore = Math.min(100, (valueAtRisk / 1000) * 10);
      const riskScore = Math.round(urgencyScore * 0.6 + valueScore * 0.4);

      // Recommended action based on risk
      let recommendedAction:
        | 'DISCOUNT_AGGRESSIVE'
        | 'DISCOUNT_MODERATE'
        | 'MONITOR'
        | 'RETURN'
        | 'WRITE_OFF';
      let recommendedDiscount: number | null = null;

      if (daysUntilExpiry < 15) {
        recommendedAction = 'DISCOUNT_AGGRESSIVE';
        recommendedDiscount = 50;
      } else if (daysUntilExpiry < 30) {
        recommendedAction = 'DISCOUNT_MODERATE';
        recommendedDiscount = 30;
      } else if (daysUntilExpiry < 45) {
        recommendedAction = 'DISCOUNT_MODERATE';
        recommendedDiscount = 20;
      } else {
        recommendedAction = 'MONITOR';
      }

      // Expected recovery (based on discount)
      const expectedRecovery = recommendedDiscount
        ? pricing.afterDiscount(valueAtRisk, recommendedDiscount)
        : money.multiply(valueAtRisk, 80, 2); // 80% recovery if no specific discount

      return {
        id: batch.id,
        batch_id: batch.id,
        product_id: batch.drugId,
        product_name: drug
          ? getDisplayName({ name: drug.name, dosageForm: drug.dosageForm })
          : 'Unknown',
        batch_number: batch.batchNumber || batch.id.slice(-6),
        current_quantity: batch.quantity,
        expiry_date: batch.expiryDate,
        days_until_expiry: daysUntilExpiry,
        sellable_days_remaining: Math.max(0, daysUntilExpiry - 30), // Assume 30 days buffer
        value_at_risk: Math.round(valueAtRisk),
        risk_score: riskScore,
        risk_category: riskCategory,
        risk_score_breakdown: {
          urgency_score: urgencyScore,
          velocity_score: 0, // Would need sales velocity per batch — placeholder
          value_score: valueScore,
          calculation_explanation: `${daysUntilExpiry} days until expiry, ${batch.quantity} units remaining`,
        },
        clearance_analysis: {
          current_velocity: 1.0, 
          projected_units_sold: batch.quantity,
          projected_remaining: 0,
          will_clear_in_time: daysUntilExpiry > 30,
          required_velocity_to_clear: batch.quantity / daysUntilExpiry,
        },
        recommended_action: recommendedAction,
        recommended_discount_percent: recommendedDiscount,
        expected_recovery_value: expectedRecovery,
      };
    });

    // Sort by risk score descending
    return riskItems.sort((a, b) => b.risk_score - a.risk_score);
  },

  // === Financials (REAL DATA) ===

  /**
   * Get Financial KPIs computed from real sales data
   */
  getFinancialKPIs: async (
    period: FinancialPeriod = 'this_month',
    branchId?: string
  ): Promise<FinancialKPIs> => {
    const drugs = await inventoryService.getAll(branchId);
    const drugMap = new Map(drugs.map((d) => [d.id, d]));

    // Optimized Fetching: Only fetch for the periods we need
    const currentRange = getDateRangeForPeriod(period);
    const prevRange = getPreviousPeriodRange(period);
    
    // Determine the earliest start date to fetch everything in one query if possible
    const earliestStart = currentRange.start < prevRange.start ? currentRange.start : prevRange.start;
    const latestEnd = currentRange.end > prevRange.end ? currentRange.end : prevRange.end;
    
    const relevantSales = await salesService.getByDateRange(earliestStart.toISOString(), latestEnd.toISOString(), branchId);

    // Current period
    const currentSales = filterSalesByDateRange(relevantSales, currentRange.start, currentRange.end);
    const currentMetrics = calculateMetrics(currentSales, drugMap);

    // Previous period for comparison
    const prevSales = filterSalesByDateRange(relevantSales, prevRange.start, prevRange.end);
    const prevMetrics = calculateMetrics(prevSales, drugMap);

    // Calculate margin percentages
    const currentMargin =
      currentMetrics.revenue > 0 ? (currentMetrics.grossProfit / currentMetrics.revenue) * 100 : 0;
    const prevMargin =
      prevMetrics.revenue > 0 ? (prevMetrics.grossProfit / prevMetrics.revenue) * 100 : 0;

    const revenueChange = calculateChange(currentMetrics.revenue, prevMetrics.revenue);
    const profitChange = calculateChange(currentMetrics.grossProfit, prevMetrics.grossProfit);
    const unitsChange = calculateChange(currentMetrics.unitsSold, prevMetrics.unitsSold);
    const marginDiff = money.subtract(currentMargin, prevMargin);

    return {
      revenue: {
        value: currentMetrics.revenue,
        change_percent: revenueChange.percent,
        change_direction: revenueChange.direction,
      },
      gross_profit: {
        value: currentMetrics.grossProfit,
        change_percent: profitChange.percent,
        change_direction: profitChange.direction,
      },
      margin_percent: {
        value: currentMargin,
        change_points: marginDiff,
        change_direction: marginDiff > 0 ? 'up' : marginDiff < 0 ? 'down' : 'unchanged',
      },
      units_sold: {
        value: currentMetrics.unitsSold,
        change_percent: unitsChange.percent,
        change_direction: unitsChange.direction,
      },
    };
  },

  /**
   * Get Product-level financial breakdown from real sales data
   */
  getProductFinancials: async (
    period: FinancialPeriod = 'this_month',
    branchId?: string
  ): Promise<ProductFinancialItem[]> => {
    const drugs = await inventoryService.getAll(branchId);
    const drugMap = new Map(drugs.map((d) => [d.id, d]));

    const range = getDateRangeForPeriod(period);
    const periodSales = await salesService.getByDateRange(range.start.toISOString(), range.end.toISOString(), branchId);
    const completedSales = periodSales.filter(s => s.status === 'completed');

    // Aggregate by product
    const productAgg = new Map<
      string,
      {
        product_id: string;
        product_name: string;
        quantity_sold: number;
        revenue: number;
        cogs: number;
      }
    >();

    for (const sale of periodSales) {
      for (const item of sale.items) {
        const existing = productAgg.get(item.id) || {
          product_id: item.id,
          product_name: getDisplayName({ name: item.name, dosageForm: item.dosageForm }),
          quantity_sold: 0,
          revenue: 0,
          cogs: 0,
        };

        const itemRevenue = money.multiply(item.price, item.quantity, 0);
        const itemCost = money.multiply(item.costPrice || 0, item.quantity, 0);

        existing.quantity_sold += item.quantity;
        existing.revenue = money.add(existing.revenue, itemRevenue);
        existing.cogs = money.add(existing.cogs, itemCost);

        productAgg.set(item.id, existing);
      }
    }

    // Use Pareto Classification
    const rawResults = Array.from(productAgg.values()).map(p => ({
      id: p.product_id,
      product_id: p.product_id,
      product_name: p.product_name,
      quantity_sold: p.quantity_sold,
      revenue: p.revenue,
      cogs: p.cogs,
      gross_profit: money.subtract(p.revenue, p.cogs),
      margin_percent: p.revenue > 0 ? money.multiply(money.divide(money.subtract(p.revenue, p.cogs), p.revenue), 100, 0) : 0,
    }));

    const resultsWithABC = calculateParetoABC(rawResults);

    return resultsWithABC.sort((a, b) => b.revenue - a.revenue);
  },

  /**
   * Get Category-level financial breakdown
   */
  getCategoryFinancials: async (
    period: FinancialPeriod = 'this_month',
    branchId?: string
  ): Promise<CategoryFinancialItem[]> => {
    const products = await intelligenceService.getProductFinancials(period, branchId);
    
    const categoryAgg = new Map<string, CategoryFinancialItem>();
    
    for (const p of products) {
      // For now, we use a placeholder category if missing in ProductFinancialItem
      // In a real scenario, ProductFinancialItem should include category info
      const catId = 'GENERAL'; 
      const catName = 'عام';
      
      const existing = categoryAgg.get(catId) || {
        id: catId,
        category_id: catId,
        category_name: catName,
        products_count: 0,
        revenue: 0,
        cogs: 0,
        gross_profit: 0,
        margin_percent: 0,
        abc_distribution: { a: 0, b: 0, c: 0 }
      };
      
      existing.products_count++;
      existing.revenue = money.add(existing.revenue, p.revenue);
      existing.cogs = money.add(existing.cogs, p.cogs);
      existing.gross_profit = money.add(existing.gross_profit, p.gross_profit);
      
      if (p.abc_class === 'A') existing.abc_distribution.a++;
      else if (p.abc_class === 'B') existing.abc_distribution.b++;
      else existing.abc_distribution.c++;
      
      categoryAgg.set(catId, existing);
    }
    
    return Array.from(categoryAgg.values()).map(cat => ({
      ...cat,
      margin_percent: cat.revenue > 0 ? money.multiply(money.divide(cat.gross_profit, cat.revenue), 100, 0) : 0
    }));
  },

  // === Audit (REAL DATA) ===

  /**
   * Get Audit Transactions from real sales and returns data
   */
  getAuditTransactions: async (
    limit: number = 100,
    branchId?: string
  ): Promise<AuditTransaction[]> => {
    // Optimized: Use filter/limit if possible, or at least only fetch recent
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [sales, returns, employees] = await Promise.all([
      salesService.filter({ dateFrom: thirtyDaysAgo.toISOString() }, branchId),
      returnService.getAllSalesReturns(branchId), // returns are usually fewer, but could be filtered too
      employeeService.getAll(branchId),
    ]);

    const employeeMap = new Map(employees.map((e) => [e.id, e.name]));
    const transactions: AuditTransaction[] = [];

    // Convert sales to audit transactions (flatten items)
    for (const sale of sales) {
      if (sale.status !== 'completed') continue;

      const cashierName = sale.soldByEmployeeId
        ? employeeMap.get(sale.soldByEmployeeId) || 'غير معروف'
        : 'غير معروف';

      for (const item of sale.items) {
        transactions.push({
          id: `${sale.id}-${item.id}`,
          timestamp: sale.date,
          invoice_number: sale.dailyOrderNumber
            ? `INV-${sale.dailyOrderNumber}`
            : sale.id.slice(-6),
          type: 'SALE',
          cashier_name: cashierName,
          product_name: getDisplayName({ name: item.name, dosageForm: item.dosageForm }),
          quantity: item.quantity,
          amount: money.multiply(item.price, item.quantity, 0),
          has_anomaly: false,
        });
      }
    }

    // Convert returns to audit transactions
    for (const ret of returns) {
      const cashierName = ret.processedBy || 'غير معروف';

      for (const item of ret.items) {
        transactions.push({
          id: `${ret.id}-${item.drugId}`,
          timestamp: ret.date,
          invoice_number: `RET-${ret.id.slice(-6)}`,
          type: 'RETURN',
          cashier_name: cashierName,
          product_name: item.name,
          quantity: item.quantityReturned,
          amount: money.subtract(0, item.refundAmount),
          has_anomaly: ret.reason === 'other' || ret.reason === 'damaged',
          anomaly_reason:
            ret.reason === 'other'
              ? 'سبب غير محدد'
              : ret.reason === 'damaged'
                ? 'منتج تالف'
                : undefined,
        });
      }
    }

    // Sort by timestamp descending (newest first)
    transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Return limited results
    return transactions.slice(0, limit);
  },
};
