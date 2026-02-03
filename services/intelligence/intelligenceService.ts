/**
 * Intelligence Service - Provides analytics data for the Intelligence Dashboard
 *
 * Contains both mock data functions (for Procurement/Risk) and real data functions (for Financials)
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
} from '../../types/intelligence';
import { getDisplayName } from '../../utils/drugDisplayName';
import { employeeService } from '../hr/employeeService';
import { batchService } from '../inventory/batchService';
import { inventoryService } from '../inventory/inventoryService';
import { returnService } from '../returns/returnService';
import { salesService } from '../sales/salesService';

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
    revenue += sale.total;

    for (const item of sale.items) {
      const quantity = item.quantity;
      const itemRevenue = item.price * quantity;
      const itemCost = (item.costPrice || 0) * quantity;

      unitsSold += quantity;
      cogs += itemCost;
      grossProfit += itemRevenue - itemCost;
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

  const percent = ((current - previous) / previous) * 100;
  const direction = percent > 0 ? 'up' : percent < 0 ? 'down' : 'unchanged';

  return { percent: Math.abs(Math.round(percent * 10) / 10), direction };
}

// === Service Export ===

export const intelligenceService = {
  // === Procurement (REAL DATA) ===

  /**
   * Get Procurement Summary from real inventory data
   */
  getProcurementSummary: async (): Promise<ProcurementSummary> => {
    const items = await intelligenceService.getProcurementItems();

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
      estimated_lost_sales: outOfStock.reduce((sum, i) => sum + i.avg_daily_sales * 7 * 50, 0), // Rough estimate
    };
  },

  /**
   * Get Procurement Items from real inventory and sales data
   */
  getProcurementItems: async (): Promise<ProcurementItem[]> => {
    const drugs = await inventoryService.getAll();
    const allSales = await salesService.getAll();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter completed sales
    const completedSales = allSales.filter((s) => s.status === 'completed');

    // Build velocity map per drug
    const velocityMap = new Map<string, { last7: number; last14: number; last30: number }>();

    for (const sale of completedSales) {
      const saleDate = new Date(sale.date);

      for (const item of sale.items) {
        const existing = velocityMap.get(item.id) || { last7: 0, last14: 0, last30: 0 };

        if (saleDate >= thirtyDaysAgo) {
          existing.last30 += item.quantity;
          if (saleDate >= fourteenDaysAgo) {
            existing.last14 += item.quantity;
            if (saleDate >= sevenDaysAgo) {
              existing.last7 += item.quantity;
            }
          }
        }

        velocityMap.set(item.id, existing);
      }
    }

    const REORDER_POINT_DAYS = 14; // Default reorder point

    const items: ProcurementItem[] = drugs.map((drug) => {
      const velocity = velocityMap.get(drug.id) || { last7: 0, last14: 0, last30: 0 };
      const avgDailySales = velocity.last30 / 30;

      // Stock days (how many days of stock left)
      const stockDays = avgDailySales > 0 ? drug.stock / avgDailySales : null;

      // Stock status
      let stockStatus: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK';
      if (drug.stock === 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (stockDays !== null && stockDays < 7) {
        stockStatus = 'CRITICAL';
      } else if (stockDays !== null && stockDays < REORDER_POINT_DAYS) {
        stockStatus = 'LOW';
      } else if (stockDays !== null && stockDays > 60) {
        stockStatus = 'OVERSTOCK';
      } else {
        stockStatus = 'NORMAL';
      }

      // Trend detection
      const weeklyAvg = velocity.last7 / 7;
      const prevWeekAvg = (velocity.last14 - velocity.last7) / 7;
      let trend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
      if (weeklyAvg > prevWeekAvg * 1.2) trend = 'INCREASING';
      else if (weeklyAvg < prevWeekAvg * 0.8) trend = 'DECREASING';

      // Suggested order quantity
      const targetStock = REORDER_POINT_DAYS * avgDailySales * 1.5; // 1.5x buffer
      const suggestedQty = Math.max(0, Math.ceil(targetStock - drug.stock));

      // Confidence score based on data quality
      const hasRecentSales = velocity.last7 > 0;
      const hasConsistentSales = velocity.last30 >= 5;
      const confidenceScore =
        hasRecentSales && hasConsistentSales ? 85 : hasConsistentSales ? 70 : 50;

      return {
        product_id: drug.id,
        product_name: getDisplayName({ name: drug.name, dosageForm: drug.dosageForm }),
        sku: drug.barcode || drug.internalCode || drug.id.slice(-8),
        supplier_id: drug.supplierId || 'UNKNOWN',
        supplier_name: 'المورد الافتراضي', // Would need supplier lookup
        category_id: drug.category || 'GENERAL',
        category_name: drug.category || 'عام',
        current_stock: drug.stock,
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
        abc_class: avgDailySales >= 1 ? 'A' : avgDailySales >= 0.3 ? 'B' : 'C',
        data_quality_flag: hasConsistentSales
          ? 'GOOD'
          : velocity.last30 > 0
            ? 'SPARSE'
            : 'NEW_PRODUCT',
      };
    });

    // Sort by urgency (OUT_OF_STOCK first, then CRITICAL, etc.)
    const statusOrder = { OUT_OF_STOCK: 0, CRITICAL: 1, LOW: 2, NORMAL: 3, OVERSTOCK: 4 };
    return items.sort((a, b) => statusOrder[a.stock_status] - statusOrder[b.stock_status]);
  },

  // === Risk (REAL DATA) ===

  /**
   * Get Risk Summary computed from real batch expiry data
   */
  getRiskSummary: async (): Promise<RiskSummary> => {
    const riskItems = await intelligenceService.getExpiryRiskItems();

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
      summary.total_value_at_risk += item.value_at_risk;
      summary.potential_recovery_value += item.expected_recovery_value || 0;

      if (item.risk_category === 'CRITICAL') {
        summary.by_urgency.critical.count++;
        summary.by_urgency.critical.value += item.value_at_risk;
      } else if (item.risk_category === 'HIGH') {
        summary.by_urgency.high.count++;
        summary.by_urgency.high.value += item.value_at_risk;
      } else if (item.risk_category === 'MEDIUM') {
        summary.by_urgency.medium.count++;
        summary.by_urgency.medium.value += item.value_at_risk;
      }
    }

    return summary;
  },

  /**
   * Get Expiry Risk Items computed from real batch data
   */
  getExpiryRiskItems: async (): Promise<ExpiryRiskItem[]> => {
    const allBatches = batchService.getAllBatches();
    const drugs = await inventoryService.getAll();
    const drugMap = new Map(drugs.map((d) => [d.id, d]));

    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Filter batches expiring within 90 days with stock > 0
    const expiringBatches = allBatches.filter((batch) => {
      const expiryDate = new Date(batch.expiryDate);
      return batch.quantity > 0 && expiryDate <= ninetyDaysFromNow && expiryDate > now;
    });

    const riskItems: ExpiryRiskItem[] = expiringBatches.map((batch) => {
      const drug = drugMap.get(batch.drugId);
      const expiryDate = new Date(batch.expiryDate);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Value at risk = quantity × cost price
      const valueAtRisk = batch.quantity * batch.costPrice;

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
        ? valueAtRisk * (1 - recommendedDiscount / 100)
        : valueAtRisk * 0.8;

      return {
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
          velocity_score: 50, // Placeholder - would need sales velocity data
          value_score: valueScore,
          calculation_explanation: `${daysUntilExpiry} days until expiry, ${batch.quantity} units at ${batch.costPrice} EGP each`,
        },
        clearance_analysis: {
          current_velocity: 0.5, // Placeholder
          projected_units_sold: Math.floor(batch.quantity * 0.5),
          projected_remaining: Math.ceil(batch.quantity * 0.5),
          will_clear_in_time: daysUntilExpiry > 60,
          required_velocity_to_clear: batch.quantity / daysUntilExpiry,
        },
        recommended_action: recommendedAction,
        recommended_discount_percent: recommendedDiscount,
        expected_recovery_value: Math.round(expectedRecovery),
      };
    });

    // Sort by risk score descending
    return riskItems.sort((a, b) => b.risk_score - a.risk_score);
  },

  // === Financials (REAL DATA) ===

  /**
   * Get Financial KPIs computed from real sales data
   */
  getFinancialKPIs: async (period: FinancialPeriod = 'this_month'): Promise<FinancialKPIs> => {
    const allSales = await salesService.getAll();
    const drugs = await inventoryService.getAll();
    const drugMap = new Map(drugs.map((d) => [d.id, d]));

    // Current period
    const currentRange = getDateRangeForPeriod(period);
    const currentSales = filterSalesByDateRange(allSales, currentRange.start, currentRange.end);
    const currentMetrics = calculateMetrics(currentSales, drugMap);

    // Previous period for comparison
    const prevRange = getPreviousPeriodRange(period);
    const prevSales = filterSalesByDateRange(allSales, prevRange.start, prevRange.end);
    const prevMetrics = calculateMetrics(prevSales, drugMap);

    // Calculate margin percentages
    const currentMargin =
      currentMetrics.revenue > 0 ? (currentMetrics.grossProfit / currentMetrics.revenue) * 100 : 0;
    const prevMargin =
      prevMetrics.revenue > 0 ? (prevMetrics.grossProfit / prevMetrics.revenue) * 100 : 0;

    const revenueChange = calculateChange(currentMetrics.revenue, prevMetrics.revenue);
    const profitChange = calculateChange(currentMetrics.grossProfit, prevMetrics.grossProfit);
    const unitsChange = calculateChange(currentMetrics.unitsSold, prevMetrics.unitsSold);
    const marginDiff = Math.round((currentMargin - prevMargin) * 10) / 10;

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
        value: Math.round(currentMargin * 10) / 10,
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
    period: FinancialPeriod = 'this_month'
  ): Promise<ProductFinancialItem[]> => {
    const allSales = await salesService.getAll();
    const drugs = await inventoryService.getAll();
    const drugMap = new Map(drugs.map((d) => [d.id, d]));

    const range = getDateRangeForPeriod(period);
    const periodSales = filterSalesByDateRange(allSales, range.start, range.end);

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

        const itemRevenue = item.price * item.quantity;
        const itemCost = (item.costPrice || 0) * item.quantity;

        existing.quantity_sold += item.quantity;
        existing.revenue += itemRevenue;
        existing.cogs += itemCost;

        productAgg.set(item.id, existing);
      }
    }

    // Convert to array and calculate derived fields
    const products = Array.from(productAgg.values())
      .map((p) => ({
        product_id: p.product_id,
        product_name: p.product_name,
        abc_class: classifyABC(
          p.revenue,
          Array.from(productAgg.values()).reduce((sum, x) => sum + x.revenue, 0)
        ) as 'A' | 'B' | 'C',
        quantity_sold: p.quantity_sold,
        revenue: p.revenue,
        cogs: p.cogs,
        gross_profit: p.revenue - p.cogs,
        margin_percent:
          p.revenue > 0 ? Math.round(((p.revenue - p.cogs) / p.revenue) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending

    return products;
  },

  // === Audit (REAL DATA) ===

  /**
   * Get Audit Transactions from real sales and returns data
   */
  getAuditTransactions: async (limit: number = 100): Promise<AuditTransaction[]> => {
    const [sales, returns, employees] = await Promise.all([
      salesService.getAll(),
      returnService.getAllSalesReturns(),
      employeeService.getAll(),
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
          amount: item.price * item.quantity,
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
          amount: -item.refundAmount,
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

/**
 * Simple ABC classification based on revenue contribution
 * A = Top 80% of revenue
 * B = Next 15%
 * C = Bottom 5%
 */
function classifyABC(productRevenue: number, totalRevenue: number): string {
  if (totalRevenue === 0) return 'C';
  const contribution = (productRevenue / totalRevenue) * 100;

  if (contribution >= 5) return 'A';
  if (contribution >= 1) return 'B';
  return 'C';
}
