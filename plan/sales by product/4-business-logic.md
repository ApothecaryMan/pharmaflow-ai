# Artifact 4: Business Logic Algorithms

## Core Intelligence Calculation Functions

This document provides detailed implementations of the core business logic algorithms with comprehensive edge case handling.

---

## 1. calculateReorderConfidence()

### Purpose

Calculate a confidence score (0-100) for reorder suggestions based on multiple factors.

### Algorithm

```typescript
/**
 * Calculates confidence score for reorder suggestions
 * @param product - Product intelligence data
 * @returns Confidence score (0-100) and component breakdown
 */
function calculateReorderConfidence(product: ProductIntelligence): {
  score: number;
  components: ConfidenceComponents;
} {
  // Component 1: Velocity Stability (0-100)
  const velocityStability = calculateVelocityStability(
    product.velocity_coefficient_of_variation
  );

  // Component 2: Data Recency (0-100)
  const dataRecency = calculateDataRecency(
    product.last_sale_date,
    product.total_sales_data_points
  );

  // Component 3: Seasonality Certainty (0-100)
  const seasonalityCertainty = calculateSeasonalityCertainty(
    product.seasonal_confidence,
    product.seasonal_sample_years
  );

  // Component 4: Lead Time Reliability (0-100)
  const leadTimeReliability = calculateLeadTimeReliability(
    product.lead_time_variability,
    product.avg_lead_time_days,
    product.lead_time_sample_size
  );

  // Weighted composite score
  const score = Math.round(
    velocityStability * 0.35 +
      dataRecency * 0.25 +
      seasonalityCertainty * 0.2 +
      leadTimeReliability * 0.2
  );

  return {
    score: Math.max(0, Math.min(100, score)), // Clamp to 0-100
    components: {
      velocity_stability: Math.round(velocityStability),
      data_recency: Math.round(dataRecency),
      seasonality_certainty: Math.round(seasonalityCertainty),
      lead_time_reliability: Math.round(leadTimeReliability),
    },
  };
}

/**
 * Calculate velocity stability component
 * Lower CV = higher stability = higher score
 */
function calculateVelocityStability(cv: number | null): number {
  if (cv === null || cv === undefined) return 0;

  // Edge cases
  if (cv < 0) return 0; // Invalid data
  if (cv === 0) return 100; // Perfect stability

  // Scoring: CV < 0.2 = excellent, CV > 1.0 = poor
  if (cv <= 0.2) return 100;
  if (cv >= 1.0) return 20;

  // Linear interpolation
  return Math.round(100 - ((cv - 0.2) / 0.8) * 80);
}

/**
 * Calculate data recency component
 */
function calculateDataRecency(
  lastSaleDate: Date | null,
  dataPoints: number
): number {
  // Edge case: No sales history
  if (!lastSaleDate || dataPoints === 0) return 0;

  const daysSinceLastSale = daysBetween(lastSaleDate, new Date());

  // Scoring based on recency
  if (daysSinceLastSale <= 1) return 100;
  if (daysSinceLastSale <= 3) return 90;
  if (daysSinceLastSale <= 7) return 80;
  if (daysSinceLastSale <= 14) return 60;
  if (daysSinceLastSale <= 30) return 40;
  return 20;
}

/**
 * Calculate seasonality certainty component
 */
function calculateSeasonalityCertainty(
  confidence: "HIGH" | "MEDIUM" | "LOW",
  sampleYears: number
): number {
  // Edge case: No seasonal data
  if (!confidence || sampleYears === 0) return 50; // Neutral

  const baseScore = {
    HIGH: 90,
    MEDIUM: 60,
    LOW: 30,
  }[confidence];

  // Bonus for more years of data
  const yearsBonus = Math.min(10, sampleYears * 2);

  return Math.min(100, baseScore + yearsBonus);
}

/**
 * Calculate lead time reliability component
 */
function calculateLeadTimeReliability(
  variability: number | null,
  avgLeadTime: number | null,
  sampleSize: number
): number {
  // Edge cases
  if (variability === null || avgLeadTime === null) return 50; // Neutral
  if (sampleSize < 3) return 30; // Insufficient data
  if (avgLeadTime === 0) return 0; // Invalid

  // Calculate coefficient of variation for lead time
  const cv = variability / avgLeadTime;

  // Scoring: Low variability = high reliability
  if (cv <= 0.1) return 100; // Very reliable
  if (cv <= 0.2) return 85;
  if (cv <= 0.3) return 70;
  if (cv <= 0.5) return 50;
  return 30; // Unreliable
}
```

---

## 2. detectCashTrap()

### Purpose

Identify products tying up cash with low turnover and return.

### Algorithm

```typescript
/**
 * Detects if a product is a cash trap
 * @returns Score 0-100 (higher = worse cash trap)
 */
function detectCashTrap(product: ProductIntelligence): {
  score: number;
  isCashTrap: boolean;
  factors: CashTrapFactors;
} {
  // Factor 1: Stock Days (higher = worse)
  const stockDaysFactor = calculateStockDaysFactor(product.stock_days);

  // Factor 2: Velocity Trend (declining = worse)
  const velocityTrendFactor = calculateVelocityTrendFactor(
    product.velocity_trend,
    product.avg_daily_sales_7d,
    product.avg_daily_sales_30d
  );

  // Factor 3: Margin (low margin + high stock = worse)
  const marginFactor = calculateMarginFactor(
    product.margin_percent,
    product.current_stock,
    product.unit_cost
  );

  // Factor 4: Seasonal Exit (exiting peak season = risk)
  const seasonalFactor = calculateSeasonalFactor(
    product.seasonal_trajectory,
    product.seasonal_index_current,
    product.seasonal_index_next
  );

  // Weighted composite
  const score = Math.round(
    stockDaysFactor * 0.35 +
      velocityTrendFactor * 0.3 +
      marginFactor * 0.2 +
      seasonalFactor * 0.15
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    isCashTrap: score >= 70, // Threshold
    factors: {
      stock_days_factor: stockDaysFactor,
      velocity_trend_factor: velocityTrendFactor,
      margin_factor: marginFactor,
      seasonal_factor: seasonalFactor,
    },
  };
}

function calculateStockDaysFactor(stockDays: number | null): number {
  // Edge cases
  if (stockDays === null) return 100; // Infinite days = worst
  if (stockDays <= 0) return 0; // Out of stock = not a cash trap

  // Scoring
  if (stockDays <= 14) return 0; // Normal
  if (stockDays <= 30) return 20;
  if (stockDays <= 60) return 50;
  if (stockDays <= 90) return 75;
  return 100; // > 90 days = severe
}

function calculateVelocityTrendFactor(
  trend: "INCREASING" | "STABLE" | "DECREASING",
  velocity7d: number,
  velocity30d: number
): number {
  // Edge case: No data
  if (velocity7d === 0 && velocity30d === 0) return 100;

  // Trend-based base score
  const baseScore = {
    INCREASING: 0, // Good
    STABLE: 40, // Neutral
    DECREASING: 80, // Bad
  }[trend];

  // Calculate actual decline percentage
  if (velocity30d > 0) {
    const declinePercent = ((velocity30d - velocity7d) / velocity30d) * 100;

    if (declinePercent > 50) return 100; // Severe decline
    if (declinePercent > 0) return Math.min(100, baseScore + declinePercent);
  }

  return baseScore;
}

function calculateMarginFactor(
  marginPercent: number,
  stock: number,
  unitCost: number
): number {
  // Edge cases
  if (stock === 0) return 0; // No stock = no cash trap
  if (marginPercent < 0) return 100; // Negative margin = urgent

  const totalValue = stock * unitCost;

  // Low margin + high value = worse
  if (marginPercent < 10 && totalValue > 5000) return 100;
  if (marginPercent < 15 && totalValue > 3000) return 80;
  if (marginPercent < 20 && totalValue > 2000) return 60;
  if (marginPercent < 25) return 40;

  return 0; // Good margin
}

function calculateSeasonalFactor(
  trajectory: "RISING" | "STABLE" | "DECLINING",
  currentIndex: number,
  nextIndex: number
): number {
  // Edge case: No seasonal data
  if (!trajectory) return 0;

  if (trajectory === "DECLINING") {
    const decline = ((currentIndex - nextIndex) / currentIndex) * 100;

    if (decline > 30) return 100; // Severe seasonal exit
    if (decline > 20) return 70;
    if (decline > 10) return 40;
    return 20;
  }

  if (trajectory === "RISING") return 0; // Good sign

  return 10; // Stable = slight concern
}
```

---

## 3. calculateStockDays()

### Purpose

Calculate days of stock remaining at current sales velocity.

### Algorithm

```typescript
/**
 * Calculates stock days with comprehensive edge case handling
 */
function calculateStockDays(
  currentStock: number,
  avgDailySales: number
): number | null {
  // Edge Case 1: Zero or negative stock
  if (currentStock <= 0) return 0;

  // Edge Case 2: No sales velocity (division by zero)
  if (avgDailySales === 0 || avgDailySales === null) {
    return null; // Infinite days - product not selling
  }

  // Edge Case 3: Negative velocity (data error)
  if (avgDailySales < 0) {
    console.error("Negative velocity detected", { avgDailySales });
    return null;
  }

  // Standard calculation
  const stockDays = currentStock / avgDailySales;

  // Edge Case 4: Unrealistic values (data quality check)
  if (stockDays > 365) {
    console.warn("Stock days > 365, capping", { stockDays });
    return 365; // Cap at 1 year
  }

  if (stockDays < 0) {
    console.error("Negative stock days", { stockDays });
    return 0;
  }

  return Math.round(stockDays * 100) / 100; // 2 decimal places
}
```

---

## 4. calculateSeasonalityIndex()

### Purpose

Calculate monthly seasonality multipliers from historical data.

### Algorithm

```typescript
/**
 * Calculates seasonality indices for all 12 months
 * @param salesHistory - Array of { month: 1-12, year: number, sales: number }
 * @returns Array of seasonal indices (1.0 = baseline)
 */
function calculateSeasonalityIndex(
  salesHistory: MonthlySales[]
): SeasonalIndex[] {
  // Edge Case 1: Insufficient data
  if (!salesHistory || salesHistory.length < 12) {
    console.warn("Insufficient data for seasonality", {
      dataPoints: salesHistory?.length,
    });
    return createNeutralSeasonality(); // All 1.0
  }

  // Group by month
  const monthlyData: Map<number, number[]> = new Map();

  for (let month = 1; month <= 12; month++) {
    monthlyData.set(month, []);
  }

  salesHistory.forEach((record) => {
    if (record.month < 1 || record.month > 12) {
      console.error("Invalid month", record);
      return;
    }

    const sales = record.sales || 0;
    monthlyData.get(record.month)!.push(sales);
  });

  // Calculate overall average
  const allSales = salesHistory.map((r) => r.sales);
  const overallAvg = average(allSales);

  // Edge Case 2: Zero average (no sales)
  if (overallAvg === 0) {
    return createNeutralSeasonality();
  }

  // Calculate index for each month
  const indices: SeasonalIndex[] = [];

  for (let month = 1; month <= 12; month++) {
    const monthSales = monthlyData.get(month)!;

    // Edge Case 3: No data for this month
    if (monthSales.length === 0) {
      indices.push({
        month,
        index: 1.0,
        confidence: "LOW",
        sample_years: 0,
      });
      continue;
    }

    const monthAvg = average(monthSales);
    const index = monthAvg / overallAvg;

    // Edge Case 4: Divide by zero
    const finalIndex = isFinite(index) ? index : 1.0;

    // Calculate confidence based on sample size and consistency
    const stdDev = standardDeviation(monthSales);
    const cv = monthAvg > 0 ? stdDev / monthAvg : 0;

    let confidence: "HIGH" | "MEDIUM" | "LOW";
    if (monthSales.length >= 3 && cv < 0.3) {
      confidence = "HIGH";
    } else if (monthSales.length >= 2) {
      confidence = "MEDIUM";
    } else {
      confidence = "LOW";
    }

    indices.push({
      month,
      index: Math.round(finalIndex * 100) / 100,
      confidence,
      sample_years: monthSales.length,
      avg_monthly_sales: Math.round(monthAvg),
      std_dev: Math.round(stdDev),
    });
  }

  return indices;
}

function createNeutralSeasonality(): SeasonalIndex[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    index: 1.0,
    confidence: "LOW",
    sample_years: 0,
  }));
}
```

---

## 5. calculateExpiryRiskScore()

### Purpose

Calculate risk score for batches approaching expiry.

### Algorithm

```typescript
/**
 * Calculates expiry risk score (0-100) for a batch
 */
function calculateExpiryRiskScore(batch: BatchInfo): {
  score: number;
  category: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  breakdown: RiskBreakdown;
} {
  // Component 1: Urgency Score (based on days until expiry)
  const urgencyScore = calculateUrgencyScore(
    batch.days_until_expiry,
    batch.sellable_days_remaining
  );

  // Component 2: Velocity Score (will it sell in time?)
  const velocityScore = calculateVelocityScore(
    batch.current_quantity,
    batch.current_daily_velocity,
    batch.sellable_days_remaining
  );

  // Component 3: Value Score (how much money at risk?)
  const valueScore = calculateValueScore(batch.value_at_risk);

  // Weighted composite
  const score = Math.round(
    urgencyScore * 0.5 + velocityScore * 0.35 + valueScore * 0.15
  );

  // Determine category
  let category: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  if (score >= 80) category = "CRITICAL";
  else if (score >= 60) category = "HIGH";
  else if (score >= 40) category = "MEDIUM";
  else category = "LOW";

  return {
    score: Math.max(0, Math.min(100, score)),
    category,
    breakdown: {
      urgency_score: urgencyScore,
      velocity_score: velocityScore,
      value_score: valueScore,
    },
  };
}

function calculateUrgencyScore(
  daysUntilExpiry: number,
  sellableDays: number
): number {
  // Edge cases
  if (daysUntilExpiry < 0) return 100; // Already expired!
  if (daysUntilExpiry === 0) return 100;

  // Use sellable days (accounting for min shelf life)
  const effectiveDays = Math.min(daysUntilExpiry, sellableDays);

  if (effectiveDays <= 7) return 100;
  if (effectiveDays <= 14) return 90;
  if (effectiveDays <= 30) return 75;
  if (effectiveDays <= 60) return 50;
  if (effectiveDays <= 90) return 30;
  return 10;
}

function calculateVelocityScore(
  quantity: number,
  velocity: number,
  daysRemaining: number
): number {
  // Edge cases
  if (quantity <= 0) return 0; // Nothing to worry about
  if (daysRemaining <= 0) return 100; // Time's up

  // No velocity = can't sell
  if (velocity === 0 || velocity === null) return 100;

  // Calculate projected remaining
  const projectedSold = velocity * daysRemaining;
  const projectedRemaining = quantity - projectedSold;

  // Will clear in time?
  if (projectedRemaining <= 0) return 0; // Will sell out

  // Calculate percentage that won't sell
  const wastePercent = (projectedRemaining / quantity) * 100;

  if (wastePercent >= 90) return 100; // Almost all will waste
  if (wastePercent >= 70) return 85;
  if (wastePercent >= 50) return 70;
  if (wastePercent >= 30) return 50;
  if (wastePercent >= 10) return 30;
  return 10;
}

function calculateValueScore(valueAtRisk: number): number {
  // Scale based on monetary impact
  if (valueAtRisk >= 10000) return 100;
  if (valueAtRisk >= 5000) return 80;
  if (valueAtRisk >= 2000) return 60;
  if (valueAtRisk >= 1000) return 40;
  if (valueAtRisk >= 500) return 20;
  return 10;
}
```

---

## 6. suggestReorderQuantity()

### Purpose

Calculate optimal reorder quantity considering multiple factors.

### Algorithm

```typescript
/**
 * Suggests optimal reorder quantity
 */
function suggestReorderQuantity(product: ProductIntelligence): {
  quantity: number;
  reasoning: ReorderReasoning;
  skipOrder: boolean;
  skipReason?: string;
} {
  // Edge Case 1: No velocity data
  if (
    !product.weighted_avg_daily_sales ||
    product.weighted_avg_daily_sales === 0
  ) {
    return {
      quantity: 0,
      reasoning: {} as any,
      skipOrder: true,
      skipReason: "No sales history - unable to forecast demand",
    };
  }

  // Edge Case 2: Declining season
  if (
    product.seasonal_trajectory === "DECLINING" &&
    product.seasonal_index_next < 0.7
  ) {
    return {
      quantity: 0,
      reasoning: {} as any,
      skipOrder: true,
      skipReason: "Exiting peak season - avoid overstock",
    };
  }

  // Step 1: Forecast daily demand (with seasonal adjustment)
  const baseVelocity = product.weighted_avg_daily_sales;
  const seasonalAdjustment = product.seasonal_index_next || 1.0;
  const forecastedDailyDemand = baseVelocity * seasonalAdjustment;

  // Step 2: Calculate coverage period
  const coveragePeriodDays = product.reorder_point_days || 14;

  // Step 3: Calculate safety stock
  const leadTimeDays = product.avg_lead_time_days || 3;
  const leadTimeVariability = product.lead_time_variability || 0;

  // Safety stock = (max lead time - avg lead time) * daily demand
  const maxLeadTime = leadTimeDays + leadTimeVariability * 2; // 2 std dev
  const safetyStockQty = Math.ceil(
    (maxLeadTime - leadTimeDays) * forecastedDailyDemand
  );

  // Step 4: Calculate gross need
  const grossNeed = Math.ceil(
    forecastedDailyDemand * coveragePeriodDays + safetyStockQty
  );

  // Step 5: Subtract current stock
  const currentStock = product.current_stock || 0;

  // Step 6: Subtract pending PO quantity
  const pendingPOQty = product.pending_po_qty || 0;

  // Step 7: Calculate net need
  const netNeed = grossNeed - currentStock - pendingPOQty;

  // Edge Case 3: Already have enough stock
  if (netNeed <= 0) {
    return {
      quantity: 0,
      reasoning: {
        forecasted_daily_demand: forecastedDailyDemand,
        coverage_period_days: coveragePeriodDays,
        lead_time_days: leadTimeDays,
        safety_stock_qty: safetyStockQty,
        gross_need: grossNeed,
        current_stock: currentStock,
        pending_po_qty: pendingPOQty,
        net_need: netNeed,
      },
      skipOrder: true,
      skipReason: "Sufficient stock available",
    };
  }

  // Step 8: Round to pack size
  const packSize = product.pack_size || 1;
  const roundedQty = Math.ceil(netNeed / packSize) * packSize;

  return {
    quantity: roundedQty,
    reasoning: {
      forecasted_daily_demand: Math.round(forecastedDailyDemand * 100) / 100,
      coverage_period_days: coveragePeriodDays,
      lead_time_days: leadTimeDays,
      safety_stock_qty: safetyStockQty,
      gross_need: grossNeed,
      current_stock: currentStock,
      pending_po_qty: pendingPOQty,
      net_need: netNeed,
      pack_size: packSize,
      rounded_qty: roundedQty,
      seasonal_adjustment: seasonalAdjustment,
    },
    skipOrder: false,
  };
}
```

---

## Edge Cases Summary

### Global Edge Case Handling Principles

1. **Division by Zero**: Always check denominator before division
2. **Null/Undefined**: Provide default values or neutral scores
3. **Negative Values**: Log errors and return safe defaults
4. **Infinite Values**: Check `isFinite()` before using results
5. **Empty Arrays**: Check length before processing
6. **Data Quality**: Cap unrealistic values to reasonable ranges
7. **Missing Data**: Return neutral scores (50) rather than 0 or 100
8. **Performance**: All functions target < 10ms execution time

---

## Testing Recommendations

See Artifact 5 for comprehensive unit test suite covering all edge cases.
