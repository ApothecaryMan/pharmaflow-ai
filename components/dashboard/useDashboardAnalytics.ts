import React, { useMemo } from 'react';
import { Drug, Sale } from '../../types';
import { CalculationBlock, DetailMetric, CurrencyValue } from '../common/InsightTooltip';

interface AnalyticsProps {
  sales: Sale[];
  inventory: Drug[];
  totalExpenses: number;
  language?: string;
}

export const useDashboardAnalytics = ({ sales, inventory, totalExpenses, language }: AnalyticsProps) => {
  // 1. Core Revenue Calculation
  const { totalRevenue, totalReturns } = useMemo(() => {
    let rev = 0;
    let ret = 0;
    sales.forEach(sale => {
      rev += sale.netTotal ?? sale.total;
      // Calculate returns amount
      if (sale.hasReturns && sale.netTotal !== undefined) {
        ret += (sale.total - sale.netTotal);
      }
    });
    return { totalRevenue: rev, totalReturns: ret };
  }, [sales]);

  // 2. COGS & Inventory Valuation
  const { totalCogs, inventoryValuation } = useMemo(() => {
    let cogs = 0;
    let valuation = 0;

    // COGS Calculation (Weighted by actual sales and unit pricing)
    sales.forEach(sale => {
      sale.items.forEach((item, idx) => {
        const drug = inventory.find(d => d.id === item.id);
        const costPrice = drug?.costPrice || 0;
        
        const lineKey = `${item.id}_${idx}`;
        const returnedQty = sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        const actualSoldQty = item.quantity - returnedQty;
        
        if (actualSoldQty > 0) {
          let effectiveCost = costPrice;
          if (item.isUnit && item.unitsPerPack) {
            effectiveCost = costPrice / item.unitsPerPack;
          }
          cogs += actualSoldQty * effectiveCost;
        }
      });
    });

    // Inventory Valuation Calculation (Current asset value)
    inventory.forEach(drug => {
      valuation += drug.stock * drug.costPrice;
    });

    return { totalCogs: cogs, inventoryValuation: valuation };
  }, [sales, inventory]);

  // 3. Efficiency Metrics
  const { inventoryTurnoverRatio, daysOfInventory } = useMemo(() => {
    const turnover = inventoryValuation > 0 ? totalCogs / inventoryValuation : 0;
    const dailyCogs = totalCogs / 30 || 1;
    const days = inventoryValuation / dailyCogs;
    
    return { inventoryTurnoverRatio: turnover, daysOfInventory: days };
  }, [totalCogs, inventoryValuation]);

  // 4. Profitability Metrics
  const grossProfit = totalRevenue - totalCogs;
  const netProfit = grossProfit - totalExpenses;
  
  const profitMarginPercent = useMemo(() => {
    if (totalRevenue === 0) return 0;
    return (grossProfit / totalRevenue) * 100;
  }, [grossProfit, totalRevenue]);

  // 5. Customer Behavior
  const averageOrderValue = useMemo(() => {
    if (sales.length === 0) return 0;
    return totalRevenue / sales.length;
  }, [totalRevenue, sales.length]);

  const returnRate = useMemo(() => {
    const grossRevenue = totalRevenue + totalReturns;
    if (grossRevenue === 0) return 0;
    return (totalReturns / grossRevenue) * 100;
  }, [totalReturns, totalRevenue]);

  // 6. Movement & Impact Analysis
  const movingItemsAnalysis = useMemo(() => {
    const salesByDrug: Record<string, number> = {};
    let totalPotentialLoss = 0;
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        salesByDrug[item.id] = (salesByDrug[item.id] || 0) + item.quantity;
      });
    });
    
    const critical = inventory.filter(d => d.stock <= 3);
    
    // Revenue at Risk Forecast (1-week approximation)
    critical.forEach(d => {
       totalPotentialLoss += d.price * 5; 
    });
    
    return {
      critical,
      fastMoving: inventory.filter(d => (salesByDrug[d.id] || 0) >= 10),
      slowMoving: inventory.filter(d => (salesByDrug[d.id] || 0) < 3 && (salesByDrug[d.id] || 0) > 0),
      revenueAtRisk: totalPotentialLoss
    };
  }, [sales, inventory]);

  // 7. Health Grades
  const profitGrade = useMemo(() => {
    if (profitMarginPercent > 35) return { label: 'Excellent', color: 'emerald' as const };
    if (profitMarginPercent > 20) return { label: 'Healthy', color: 'blue' as const };
    return { label: 'Low Margin', color: 'amber' as const };
  }, [profitMarginPercent]);

  // --- TOOLTIP CONFIGURATIONS ---

  const revenueTooltip = useMemo(() => ({
    title: "Primary Metric",
    value: totalRevenue,
    valueLabel: "Net Revenue",
    icon: "payments",
    iconColorClass: "text-emerald-400",
    calculations: [{
      label: "Result = Σ (Sold - Returned)",
      math: React.createElement(React.Fragment, null, 
        React.createElement(CurrencyValue, { val: totalRevenue + totalReturns, language }),
        React.createElement("span", { className: "opacity-50" }, "-"),
        React.createElement(CurrencyValue, { val: totalReturns, language }),
        React.createElement("span", { className: "opacity-50" }, "="),
        React.createElement(CurrencyValue, { val: totalRevenue, language })
      )
    }],
    details: [
      { icon: 'shopping_cart', label: 'Avg. Order (AOV)', value: averageOrderValue },
      { icon: 'undo', label: 'Return Rate', value: `${returnRate.toFixed(1)}%`, colorClass: 'text-rose-300' }
    ]
  }), [totalRevenue, totalReturns, averageOrderValue, returnRate, language]);

  const inventoryTooltip = useMemo(() => ({
    title: "Asset Inventory",
    value: inventoryValuation,
    valueLabel: "Value",
    icon: "inventory_2",
    iconColorClass: "text-blue-400",
    calculations: [
      {
        label: "Turnover Ratio = COGS / Assets",
        math: React.createElement(React.Fragment, null, 
          React.createElement(CurrencyValue, { val: totalCogs, language }),
          React.createElement("span", { className: "opacity-50" }, "/"),
          React.createElement(CurrencyValue, { val: inventoryValuation, language }),
          React.createElement("span", { className: "opacity-50" }, "="),
          React.createElement("span", { className: "text-amber-300" }, `${inventoryTurnoverRatio.toFixed(2)}x`)
        )
      },
      {
        label: "Days Stock = Assets / (COGS / 30)",
        math: React.createElement(React.Fragment, null, 
          React.createElement("span", null, `${daysOfInventory.toFixed(0)} Days`),
          React.createElement("span", { className: "opacity-50 text-[10px]" }, "Rem. Velocity")
        )
      }
    ],
    details: [{
      icon: 'local_shipping', 
      label: 'Cost of Goods (COGS)=', 
      value: totalCogs,
      subLabel: 'COGS = Σ (Sold Qty × Unit Cost)'
    }]
  }), [inventoryValuation, totalCogs, inventoryTurnoverRatio, daysOfInventory, language]);

  const profitTooltip = useMemo(() => ({
    title: "Financial Result",
    value: grossProfit,
    valueLabel: "Gross Profit",
    icon: "account_balance",
    iconColorClass: "text-emerald-400",
    calculations: [
      {
        label: "Profit = Net Revenue - COGS",
        math: React.createElement(React.Fragment, null, 
          React.createElement(CurrencyValue, { val: totalRevenue, language }),
          React.createElement("span", { className: "opacity-50" }, "-"),
          React.createElement(CurrencyValue, { val: totalCogs, language }),
          React.createElement("span", { className: "opacity-50" }, "="),
          React.createElement(CurrencyValue, { val: grossProfit, language })
        )
      },
      {
        label: "Margin = (Profit / Revenue) × 100",
        math: React.createElement(React.Fragment, null, 
          React.createElement("span", { className: `text-${profitGrade.color}-400` }, `${profitMarginPercent.toFixed(1)}%`),
          React.createElement("span", { className: `text-${profitGrade.color}-400/50 px-1 rounded border border-current scale-75 uppercase` }, profitGrade.label)
        )
      }
    ],
    details: [{ icon: 'monitoring', label: 'Net Operating Profit', value: netProfit, colorClass: 'text-emerald-300' }]
  }), [grossProfit, totalRevenue, totalCogs, profitGrade, profitMarginPercent, netProfit, language]);

  const lowStockTooltip = useMemo(() => ({
    title: "Revenue at Risk",
    value: movingItemsAnalysis.revenueAtRisk,
    icon: "warning",
    iconColorClass: "text-rose-500",
    calculations: [{
      label: "Critical Status: Stock ≤ 3",
      math: React.createElement(React.Fragment, null, 
        React.createElement("span", null, `${movingItemsAnalysis.critical.length} Items`),
        React.createElement("span", { className: "opacity-50" }, "Impacts"),
        React.createElement("span", { className: "text-amber-300" }, `${movingItemsAnalysis.fastMoving.length} Fast Items`)
      )
    }],
    details: [
      { icon: 'warning', label: 'Critical Level', value: movingItemsAnalysis.critical.length, colorClass: 'text-rose-300', isCurrency: false },
      { icon: 'trending_down', label: 'Total Low Stock', value: inventory.filter(d => d.stock <= 10).length, isCurrency: false }
    ],
  }), [movingItemsAnalysis, inventory, language]);

  return {
    totalRevenue,
    totalReturns,
    totalCogs,
    inventoryValuation,
    inventoryTurnoverRatio,
    daysOfInventory,
    grossProfit,
    netProfit,
    profitMarginPercent,
    averageOrderValue,
    returnRate,
    movingItemsAnalysis,
    profitGrade,
    revenueTooltip,
    inventoryTooltip,
    profitTooltip,
    lowStockTooltip
  };
};
