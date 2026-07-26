/**
 * Intelligence Service - Provides analytics data for the Intelligence Dashboard
 *
 * Real data functions for Procurement, Risk, Financials, and Audit
 */

import type {
  AuditTransaction,
  CategoryFinancialItem,
  ExpiryRiskItem,
  FinancialKPIs,
  FinancialReport,
  ProcurementItem,
  ProcurementSummary,
  ProductFinancialItem,
  RiskSummary,
} from '../../types/intelligence';
import { daysAgo, daysFromNow } from '../../utils/dateFormatter';
import { getDisplayName } from '../../utils/drugDisplayName';
import { parseExpiryEndOfMonth } from '../../utils/expiryUtils';
import { money, pricing } from '../../utils/money';
import type { FinancialPeriod } from '../financials/dateRangeService';
import { financialService } from '../financials/financialService';
import { employeeService } from '../hr/employeeService';
import { batchService } from '../inventory/batchService';
import { inventoryService } from '../inventory/inventoryService';
import { returnService } from '../returns/returnService';
import { salesService } from '../sales/salesService';
import { supplierService } from '../suppliers/supplierService';
import { purchaseService } from '../purchases/purchaseService';

// === Period Helpers ===

export type { FinancialPeriod };

/**
 * Calculates Pareto ABC Classification
 * A = Top 80% of cumulative revenue
 * B = Next 15%
 * C = Bottom 5%
 */
function calculateParetoABC<T extends { revenue: number }>(
  items: T[]
): (T & { abc_class: 'A' | 'B' | 'C' })[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = sorted.reduce((sum, item) => sum + item.revenue, 0);

  if (totalRevenue === 0) {
    return sorted.map((item) => ({ ...item, abc_class: 'C' as const }));
  }

  let cumulativeRevenue = 0;
  return sorted.map((item) => {
    cumulativeRevenue += item.revenue;
    const percentile = (cumulativeRevenue / totalRevenue) * 100;

    let abc_class: 'A' | 'B' | 'C' = 'C';
    if (percentile <= 80) abc_class = 'A';
    else if (percentile <= 95) abc_class = 'B';

    return { ...item, abc_class };
  });
}

// === Internal Data Loaders ===

async function _loadCoreData(branchId?: string, _options?: { signal?: AbortSignal }) {
  const fetchDrugs = inventoryService.getAll(branchId);
  const fetchBatches = batchService.getAllBatches(branchId);

  // In a real scenario, we would pass options.signal to these service methods too.
  // For now, we'll focus on the top-level orchestration.

  const [drugs, allBatches] = await Promise.all([fetchDrugs, fetchBatches]);

  const drugMap = new Map(drugs.map((d) => [d.id, d]));

  const now = new Date();
  const stockMap = new Map<string, number>();
  for (const b of allBatches) {
    if (b.expiryDate) {
      const batchExpiry = parseExpiryEndOfMonth(b.expiryDate);
      if (batchExpiry <= now) continue;
    }
    stockMap.set(b.drugId, (stockMap.get(b.drugId) || 0) + b.quantity);
  }

  return { drugs, drugMap, allBatches, stockMap };
}

// === Service Export ===

export const intelligenceService = {
  // === Procurement (REAL DATA) ===

  /**
   * Get Procurement Summary from real inventory data
   * Delegates to getProcurementData for single-pass computation.
   */
  getProcurementSummary: async (
    branchId?: string,
    options?: { signal?: AbortSignal }
  ): Promise<ProcurementSummary> => {
    const { summary } = await intelligenceService.getProcurementData(branchId, options);
    return summary;
  },

  /**
   * Single procurement computation — returns items and summary from one pass
   * to avoid re-computing the full dataset for both views.
   */
  getProcurementData: async (
    branchId?: string,
    options?: { signal?: AbortSignal }
  ): Promise<{ items: ProcurementItem[]; summary: ProcurementSummary }> => {
    const {
      drugs,
      drugMap,
      allBatches: _allBatches,
      stockMap,
    } = await _loadCoreData(branchId, options);

    const now = new Date();
    const thirtyDaysAgo = daysAgo(30, now);
    const fourteenDaysAgo = daysAgo(14, now);
    const sevenDaysAgo = daysAgo(7, now);

    const recentSales = await salesService.getByDateRange(
      thirtyDaysAgo.toISOString(),
      now.toISOString(),
      branchId
    );
    const completedSales = recentSales.filter((s) => s.status === 'completed');

    // Build supplier name map (non-critical — fallback keeps empty map)
    let supplierMap = new Map<string, string>();
    try {
      const suppliers = await supplierService.getAll(branchId);
      supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
    } catch { /* non-critical */ }

    // Build velocity map per drug (normalized to units)
    const velocityMap = new Map<string, { last7: number; last14: number; last30: number }>();

    for (const sale of completedSales) {
      const saleDate = new Date(sale.date);

      for (const item of (sale.items || [])) {
        const drug = drugMap.get(item.id);
        if (!drug) continue;

        const unitsPerPack = item.unitsPerPack ?? drug.unitsPerPack ?? 1;
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

    // Apply net-demand adjustment: subtract demand-reducing returns from velocity
    const DEMAND_REDUCING_REASONS = new Set(['customer_request', 'expired', 'other']);
    try {
      const allReturns = await returnService.getAllSalesReturns(branchId);
      for (const ret of allReturns) {
        const retDate = new Date(ret.date);
        if (retDate < thirtyDaysAgo) continue;
        for (const rItem of ret.items) {
          if (!rItem.reason || !DEMAND_REDUCING_REASONS.has(rItem.reason)) continue;
          const drug = drugMap.get(rItem.drugId);
          if (!drug) continue;
          const unitsPerPack = drug.unitsPerPack ?? 1;
          const normalizedQty = rItem.isUnit ? rItem.quantityReturned : rItem.quantityReturned * unitsPerPack;
          const existing = velocityMap.get(rItem.drugId) || { last7: 0, last14: 0, last30: 0 };
          existing.last30 = Math.max(0, existing.last30 - normalizedQty);
          if (retDate >= fourteenDaysAgo) {
            existing.last14 = Math.max(0, existing.last14 - normalizedQty);
            if (retDate >= sevenDaysAgo) {
              existing.last7 = Math.max(0, existing.last7 - normalizedQty);
            }
          }
          velocityMap.set(rItem.drugId, existing);
        }
      }
    } catch {
      // Return fetch is non-critical for procurement; velocity stays at gross
    }

    // Build on-order quantity map from pending purchases
    const onOrderMap = new Map<string, number>();
    try {
      const pendingPurchases = await purchaseService.getPending(branchId);
      for (const po of pendingPurchases) {
        for (const poItem of po.items) {
          const unitsPerPackPO = poItem.unitsPerPack ?? 1;
          const normalizedQty = poItem.isUnit ? poItem.quantity : poItem.quantity * unitsPerPackPO;
          const current = onOrderMap.get(poItem.drugId) || 0;
          onOrderMap.set(poItem.drugId, current + normalizedQty);
        }
      }
    } catch {
      // On-order fetch is non-critical; suggested qty stays at gross need
    }

    const REORDER_POINT_DAYS = 14; // Default reorder point

    const rawItems = drugs.map((drug) => {
      const velocity = velocityMap.get(drug.id) || { last7: 0, last14: 0, last30: 0 };
      const avgDailySales = velocity.last30 / 30;

      const currentStock = stockMap.get(drug.id) || 0;

      const stockDays = avgDailySales > 0 ? currentStock / avgDailySales : null;

      let stockStatus: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK';
      if (currentStock <= 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (stockDays !== null) {
        if (stockDays < 7) stockStatus = 'CRITICAL';
        else if (stockDays < REORDER_POINT_DAYS) stockStatus = 'LOW';
        else if (stockDays > 60) stockStatus = 'OVERSTOCK';
        else stockStatus = 'NORMAL';
      } else {
        stockStatus = currentStock > 100 ? 'OVERSTOCK' : 'NORMAL';
      }

      const weeklyAvg = velocity.last7 / 7;
      const prevWeekAvg = (velocity.last14 - velocity.last7) / 7;
      let trend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
      if (weeklyAvg > prevWeekAvg * 1.2) trend = 'INCREASING';
      else if (weeklyAvg < prevWeekAvg * 0.8) trend = 'DECREASING';

      const targetStock = REORDER_POINT_DAYS * avgDailySales * 1.5;
      const minStock = drug.minStock ?? 0;
      const unitsPerPack = drug.unitsPerPack || 1;
      const safetyStockPacks =
        avgDailySales > 0 ? Math.max(0, Math.ceil((targetStock - currentStock) / unitsPerPack)) : 0;
      const minStockReplenishPacks =
        currentStock <= minStock * unitsPerPack && minStock > 0
          ? Math.max(0, minStock - Math.floor(currentStock / unitsPerPack))
          : 0;
      const suggestedQty = Math.max(safetyStockPacks, minStockReplenishPacks);
      const onOrderUnits = onOrderMap.get(drug.id) || 0;
      const onOrderPacks = Math.ceil(onOrderUnits / unitsPerPack);
      const netSuggestedQty = Math.max(0, suggestedQty - onOrderPacks);

      const hasRecentSales = velocity.last7 > 0;
      const hasConsistentSales = velocity.last30 >= 5;
      const confidenceScore =
        hasRecentSales && hasConsistentSales ? 85 : hasConsistentSales ? 70 : 50;

      const unitPrice = drug.unitPrice
        ?? (drug.publicPrice ? drug.publicPrice / (drug.unitsPerPack || 1) : 0);

      // Estimate 7-day lost sales at unit price (only meaningful when out of stock)
      const estimatedLostSales7day = stockStatus === 'OUT_OF_STOCK' && avgDailySales > 0
        ? money.multiply(7 * unitPrice, Math.round(avgDailySales * 10000), 4)
        : 0;

      const supplierName = drug.supplierId
        ? (supplierMap.get(drug.supplierId) || drug.supplierId)
        : 'UNKNOWN';

      return {
        id: drug.id,
        product_id: drug.id,
        product_name: getDisplayName({ name: drug.name, dosageForm: drug.dosageForm }),
        sku: drug.barcode || drug.internalCode || drug.id.slice(-8),
        supplier_id: drug.supplierId || 'UNKNOWN',
        supplier_name: supplierName,
        category_id: drug.category || 'GENERAL',
        category_name: drug.category || 'GENERAL',
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
        velocity_cv: 0.2,
        seasonal_trajectory: 'STABLE' as const,
        seasonal_index_current: 1.0,
        seasonal_index_next: 1.0,
        seasonal_confidence: 'MEDIUM' as const,
        suggested_order_qty: netSuggestedQty,
        skip_reason:
          stockStatus === 'OVERSTOCK'
            ? 'OVERSTOCK'
            : stockStatus === 'NORMAL'
              ? 'SUFFICIENT_STOCK'
              : null,
        confidence_score: confidenceScore,
        confidence_components: {
          velocity_stability: hasConsistentSales ? 80 : 50,
          data_recency: hasRecentSales ? 90 : 40,
          seasonality_certainty: 70,
          lead_time_reliability: 75,
        },
        estimated_lost_sales_7day: estimatedLostSales7day,
      };
    });

    // Pareto ABC classification — build index Map for O(1) lookup
    const abcItems = calculateParetoABC(
      rawItems.map((i) => ({ ...i, revenue: i.avg_daily_sales * 30 }))
    );
    const abcMap = new Map(abcItems.map((i) => [i.product_id, i.abc_class]));

    const items = rawItems
      .map((item) => {
        const abc = abcMap.get(item.product_id) || 'C';

        let dataQuality: 'GOOD' | 'SPARSE' | 'NEW_PRODUCT' | 'IRREGULAR' = 'GOOD';
        if (item.velocity_breakdown.last_30_days < 5) dataQuality = 'SPARSE';
        if (item.velocity_breakdown.last_30_days === 0) dataQuality = 'NEW_PRODUCT';

        return {
          ...item,
          abc_class: abc,
          data_quality_flag: dataQuality,
        } as ProcurementItem;
      })
      .sort((a, b) => {
        const statusOrder = { OUT_OF_STOCK: 0, CRITICAL: 1, LOW: 2, NORMAL: 3, OVERSTOCK: 4 };
        return statusOrder[a.stock_status] - statusOrder[b.stock_status];
      });

    const needingOrder = items.filter((i) => i.suggested_order_qty > 0);
    const avgConfidence =
      items.length > 0 ? items.reduce((sum, i) => sum + i.confidence_score, 0) / items.length : 0;

    return {
      items,
      summary: {
        items_needing_order: needingOrder.length,
        items_out_of_stock: items.filter((i) => i.stock_status === 'OUT_OF_STOCK').length,
        avg_confidence_score: Math.round(avgConfidence),
        pending_po_count: 0,
        pending_po_value: 0,
        estimated_lost_sales: items.reduce(
          (sum, i) => money.add(sum, i.estimated_lost_sales_7day),
          0
        ),
      },
    };
  },

  /**
   * Get Procurement Items from real inventory and sales data
   * Delegates to getProcurementData for single-pass computation.
   */
  getProcurementItems: async (
    branchId?: string,
    options?: { signal?: AbortSignal }
  ): Promise<ProcurementItem[]> => {
    const { items } = await intelligenceService.getProcurementData(branchId, options);
    return items;
  },

  // === Risk (REAL DATA) ===

  /**
   * Get Risk Summary computed from real batch expiry data
   */
  getRiskSummary: async (
    branchId?: string,
    options?: { signal?: AbortSignal }
  ): Promise<RiskSummary> => {
    const riskItems = await intelligenceService.getExpiryRiskItems(branchId, options);

    const summary: RiskSummary = {
      total_value_at_risk: 0,
      total_batches_at_risk: riskItems.length,
      by_urgency: {
        expired: { count: 0, value: 0 },
        critical: { count: 0, value: 0 },
        high: { count: 0, value: 0 },
        medium: { count: 0, value: 0 },
      },
      potential_recovery_value: 0,
    };

    for (const item of riskItems) {
      summary.total_value_at_risk = money.add(summary.total_value_at_risk, item.value_at_risk);
      summary.potential_recovery_value = money.add(
        summary.potential_recovery_value,
        item.expected_recovery_value || 0
      );

      if (item.risk_category === 'EXPIRED') {
        summary.by_urgency.expired.count++;
        summary.by_urgency.expired.value = money.add(
          summary.by_urgency.expired.value,
          item.value_at_risk
        );
      } else if (item.risk_category === 'CRITICAL') {
        summary.by_urgency.critical.count++;
        summary.by_urgency.critical.value = money.add(
          summary.by_urgency.critical.value,
          item.value_at_risk
        );
      } else if (item.risk_category === 'HIGH') {
        summary.by_urgency.high.count++;
        summary.by_urgency.high.value = money.add(
          summary.by_urgency.high.value,
          item.value_at_risk
        );
      } else if (item.risk_category === 'MEDIUM') {
        summary.by_urgency.medium.count++;
        summary.by_urgency.medium.value = money.add(
          summary.by_urgency.medium.value,
          item.value_at_risk
        );
      }
    }

    return summary;
  },

  /**
   * Get Expiry Risk Items computed from real batch data
   */
  getExpiryRiskItems: async (
    branchId?: string,
    options?: { signal?: AbortSignal }
  ): Promise<ExpiryRiskItem[]> => {
    const { drugs: _drugs, drugMap, allBatches } = await _loadCoreData(branchId, options);

    const now = new Date();
    const SELLABLE_BUFFER_DAYS = 30;
    const RISK_LOOKAHEAD_DAYS = 90;
    const VELOCITY_LOOKBACK_DAYS = 30;
    const ninetyDaysFromNow = daysFromNow(RISK_LOOKAHEAD_DAYS, now);
    const velocityLookback = daysAgo(VELOCITY_LOOKBACK_DAYS, now);

    // Fetch sales for velocity calculation
    const recentSales = await salesService.getByDateRange(
      velocityLookback.toISOString(),
      now.toISOString(),
      branchId
    );
    const completedSales = recentSales.filter((s) => s.status === 'completed');

    // Build velocity map per drug (normalized units)
    const velocityMap = new Map<string, number>();
    for (const sale of completedSales) {
      for (const item of (sale.items || [])) {
        const drug = drugMap.get(item.id);
        if (!drug) continue;
        const unitsPerPack = item.unitsPerPack ?? drug.unitsPerPack ?? 1;
        const normalizedQty = item.isUnit ? item.quantity : item.quantity * unitsPerPack;
        velocityMap.set(item.id, (velocityMap.get(item.id) || 0) + normalizedQty);
      }
    }

    // Include expired + batches expiring within 90 days with stock > 0
    const expiringBatches = allBatches.filter((batch) => {
      const expiryDate = parseExpiryEndOfMonth(batch.expiryDate);
      return batch.quantity > 0 && expiryDate <= ninetyDaysFromNow;
    });

    const riskItems: ExpiryRiskItem[] = expiringBatches.map((batch) => {
      const drug = drugMap.get(batch.drugId);
      const expiryDate = parseExpiryEndOfMonth(batch.expiryDate);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      const isExpired = daysUntilExpiry <= 0;
      const sellableDaysRemaining = isExpired
        ? 0
        : Math.max(0, daysUntilExpiry - SELLABLE_BUFFER_DAYS);

      // Value at risk = quantity × cost price
      const valueAtRisk = money.multiply(batch.quantity, batch.costPrice, 0);

      // Real sales velocity (units/day)
      const rawTotalUnits = velocityMap.get(batch.drugId) || 0;
      const currentVelocity = Math.round((rawTotalUnits / VELOCITY_LOOKBACK_DAYS) * 10) / 10;

      // Clearance projections
      const projectedUnitsSold = Math.round(currentVelocity * sellableDaysRemaining);
      const projectedRemaining = Math.max(0, batch.quantity - projectedUnitsSold);
      const willClearInTime = !isExpired && projectedUnitsSold >= batch.quantity;
      const requiredVelocityToClear = sellableDaysRemaining > 0
        ? Math.round((batch.quantity / sellableDaysRemaining) * 10) / 10
        : 0;

      // Risk category + score
      let riskCategory: ExpiryRiskItem['risk_category'];
      if (isExpired) {
        riskCategory = 'EXPIRED';
      } else if (daysUntilExpiry < SELLABLE_BUFFER_DAYS) {
        riskCategory = 'CRITICAL';
      } else if (daysUntilExpiry < 60) {
        riskCategory = 'HIGH';
      } else {
        riskCategory = 'MEDIUM';
      }

      const urgencyScore = isExpired ? 100 : Math.max(0, 100 - daysUntilExpiry);
      const velocityScore = !isExpired && requiredVelocityToClear > 0
        ? Math.min(100, Math.round((currentVelocity / requiredVelocityToClear) * 100))
        : isExpired
          ? 0
          : 100;
      const valueScore = Math.min(100, Math.round((valueAtRisk / 1000) * 10));
      const riskScore = Math.round(urgencyScore * 0.4 + velocityScore * 0.3 + valueScore * 0.3);

      // Recommended action
      let recommendedAction: ExpiryRiskItem['recommended_action'];
      let recommendedDiscount: number | null = null;

      if (isExpired) {
        recommendedAction = 'WRITE_OFF';
      } else if (daysUntilExpiry < 15) {
        recommendedAction = 'DISCOUNT_AGGRESSIVE';
        recommendedDiscount = 50;
      } else if (daysUntilExpiry < SELLABLE_BUFFER_DAYS) {
        recommendedAction = 'DISCOUNT_MODERATE';
        recommendedDiscount = 30;
      } else if (daysUntilExpiry < 45) {
        recommendedAction = 'DISCOUNT_MODERATE';
        recommendedDiscount = 20;
      } else {
        recommendedAction = 'MONITOR';
      }

      const expectedRecovery = isExpired
        ? 0
        : recommendedDiscount
          ? pricing.afterDiscount(valueAtRisk, recommendedDiscount)
          : money.multiply(valueAtRisk, 80, 2);

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
        sellable_days_remaining: sellableDaysRemaining,
        value_at_risk: Math.round(valueAtRisk),
        risk_score: riskScore,
        risk_category: riskCategory,
        risk_score_breakdown: {
          urgency_score: urgencyScore,
          velocity_score: velocityScore,
          value_score: valueScore,
          calculation_explanation: `${daysUntilExpiry} days until expiry, ${batch.quantity} units remaining at ${currentVelocity} units/day`,
        },
        clearance_analysis: {
          current_velocity: currentVelocity,
          projected_units_sold: projectedUnitsSold,
          projected_remaining: projectedRemaining,
          will_clear_in_time: willClearInTime,
          required_velocity_to_clear: requiredVelocityToClear,
        },
        recommended_action: recommendedAction,
        recommended_discount_percent: recommendedDiscount,
        expected_recovery_value: expectedRecovery,
      };
    });

    return riskItems.sort((a, b) => b.risk_score - a.risk_score);
  },

  // === Financials (REAL DATA) ===

  /**
   * Get Financial KPIs computed from real sales data
   */
  getFinancialKPIs: async (
    period: FinancialPeriod = 'this_month',
    branchId?: string,
    _options?: { signal?: AbortSignal }
  ): Promise<FinancialKPIs> => {
    return financialService.getFinancialKPIs(period, branchId);
  },

  /**
   * Get Product-level financial breakdown from real sales data
   */
  getProductFinancials: async (
    period: FinancialPeriod = 'this_month',
    branchId?: string,
    _options?: { signal?: AbortSignal }
  ): Promise<ProductFinancialItem[]> => {
    return financialService.getTopProducts(period, branchId, 1000);
  },

  /**
   * Get Category-level financial breakdown
   */
  getCategoryFinancials: async (
    period: FinancialPeriod = 'this_month',
    branchId?: string,
    _options?: { signal?: AbortSignal }
  ): Promise<CategoryFinancialItem[]> => {
    const [rawCategories, topProducts, drugs] = await Promise.all([
      financialService.getCategoryBreakdown(period, branchId),
      financialService.getTopProducts(period, branchId, 1000),
      inventoryService.getAll(branchId),
    ]);

    const drugCategoryMap = new Map(drugs.map((d) => [d.id, d.category]));

    const categoryProducts = new Map<string, ProductFinancialItem[]>();
    for (const p of topProducts) {
      const cat = drugCategoryMap.get(p.product_id) || 'GENERAL';
      const list = categoryProducts.get(cat);
      if (list) {
        list.push(p);
      } else {
        categoryProducts.set(cat, [p]);
      }
    }

    return rawCategories.map((c) => {
      const productsInCategory = categoryProducts.get(c.category) || [];
      const count = productsInCategory.length;
      const aCount = productsInCategory.filter((p) => p.abc_class === 'A').length;
      const bCount = productsInCategory.filter((p) => p.abc_class === 'B').length;
      const cCount = productsInCategory.filter((p) => p.abc_class === 'C').length;

      return {
        id: c.category,
        category_id: c.category,
        category_name: c.category,
        products_count: count,
        revenue: c.revenue,
        cogs: c.cogs,
        gross_profit: c.profit,
        margin_percent: c.revenue > 0 ? Math.round((c.profit / c.revenue) * 100) : 0,
        abc_distribution: {
          a: aCount,
          b: bCount,
          c: cCount,
        },
      };
    });
  },

  // === Audit (REAL DATA) ===

  /**
   * Get Audit Transactions from real sales and returns data
   */
  getAuditTransactions: async (
    limit: number = 100,
    branchId?: string,
    _options?: { signal?: AbortSignal }
  ): Promise<AuditTransaction[]> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [sales, returns, employees] = await Promise.all([
      salesService.filter({ dateFrom: thirtyDaysAgo.toISOString() }, branchId),
      returnService.getAllSalesReturns(branchId),
      employeeService.getAll(branchId),
    ]);

    const thirtyDaysAgoDate = thirtyDaysAgo.getTime();
    const employeeMap = new Map(employees.map((e) => [e.id, e.name]));
    const transactions: AuditTransaction[] = [];

    for (const sale of sales) {
      if (sale.status !== 'completed') continue;

      const cashierName = employeeMap.get(sale.soldByEmployeeId!) || 'UNKNOWN';

      for (const item of (sale.items || [])) {
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
          amount: money.multiply(
            item.isUnit ? money.divide(item.publicPrice, item.unitsPerPack || 1) : item.publicPrice,
            item.quantity,
            0
          ),
          has_anomaly: false,
          anomaly_reason: 'NOT_CHECKED',
        });
      }
    }

    for (const ret of returns) {
      if (new Date(ret.date).getTime() < thirtyDaysAgoDate) continue;

      const cashierName = ret.processedBy || 'UNKNOWN';

      for (let i = 0; i < ret.items.length; i++) {
        const item = ret.items[i];
        transactions.push({
          id: `${ret.id}-${i}-${item.drugId}`,
          timestamp: ret.date,
          invoice_number: `RET-${ret.id.slice(-6)}`,
          type: 'RETURN',
          cashier_name: cashierName,
          product_name: item.name,
          quantity: item.quantityReturned,
          amount: money.subtract(0, item.refundAmount),
          has_anomaly: false,
          anomaly_reason: 'NOT_CHECKED',
        });
      }
    }

    transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return transactions.slice(0, limit);
  },

  /**
   * Get Server-side Financial Report (RPC) with Client-side Fallback
   * This is the source of truth for P&L.
   * We now use a robust client-side calculation as the primary engine to avoid
   * SQL RPC mismatches and ensure data consistency across all sales versions.
   */
  getFinancialReport: async (
    dateFrom: string,
    dateTo: string,
    branchId?: string,
    _options?: { signal?: AbortSignal }
  ): Promise<FinancialReport> => {
    return financialService.getFinancialReport(dateFrom, dateTo, branchId);
  },
};
