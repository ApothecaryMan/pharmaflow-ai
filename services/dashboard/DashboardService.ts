import { money } from '../../utils/money';
import type { Customer, Drug, Sale, StockBatch, CartItem } from '../../types';

export interface DashboardProfitability {
  grossProfit: number;
  netProfit: number;
  marginPercent: number;
}

export interface DashboardEfficiency {
  turnoverRatio: number;
  daysOfInventory: number;
}

export interface DashboardMovement {
  critical: Drug[];
  lowStock: Drug[];
  lowStockCount: number;
  fastMoving: Drug[];
  slowMoving: Drug[];
  revenueAtRisk: number;
}

export interface SalesTrendData {
  name: string;
  sales: number;
}

export interface TopProduct {
  id: string;
  name: string;
  dosageForm?: string;
  qty: number;
  revenue: number;
}

export class DashboardService {
  /**
   * Calculates Total Revenue and Total Returns using precision math.
   * Net Revenue = Sum(Sale.netTotal ?? Sale.total)
   */
  static calculateRevenueAndReturns(sales: Sale[]): { totalRevenue: number; totalReturns: number } {
    let revenueCents = 0;
    let returnsCents = 0;

    sales.forEach((sale) => {
      let saleItemRevenueCents = 0;

      sale.items.forEach((item, idx) => {
        const lineKey = `${item.id}_${idx}`;
        const returnedQty =
          sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        
        const actualSoldQty = item.quantity - returnedQty;
        const itemPrice = item.price || 0;
        const itemDiscountPct = item.discount || 0; // Item-level discount %

        // 1. Calculate effective price after item discount
        // Price per unit = price * (1 - discount/100)
        const factorInt = 100 - itemDiscountPct;
        const netItemPrice = money.multiply(itemPrice, factorInt, 2);

        // 2. Revenue from items actually kept
        if (actualSoldQty > 0) {
          const lineRevenue = money.multiply(netItemPrice, actualSoldQty, 0);
          saleItemRevenueCents += money.toSmallestUnit(lineRevenue);
        }

        // 3. Value of items returned (at the price they were actually sold)
        if (returnedQty > 0) {
          const lineReturn = money.multiply(netItemPrice, returnedQty, 0);
          returnsCents += money.toSmallestUnit(lineReturn);
        }
      });

      // 4. Apply Global Sale Discount (if any)
      // Usually globalDiscount is a fixed amount subtracted from the total
      if (sale.globalDiscount && sale.globalDiscount > 0) {
        const globalDiscountCents = money.toSmallestUnit(sale.globalDiscount);
        saleItemRevenueCents = Math.max(0, saleItemRevenueCents - globalDiscountCents);
      }

      revenueCents += saleItemRevenueCents;
    });

    return {
      totalRevenue: money.fromSmallestUnit(revenueCents),
      totalReturns: money.fromSmallestUnit(returnsCents),
    };
  }

  /**
   * Calculates Cost of Goods Sold (COGS) using precision math.
   * COGS = Sum(ActualSoldQty * UnitCost)
   */
  static calculateCogs(sales: Sale[], inventory: Drug[]): number {
    let cogsCents = 0;

    sales.forEach((sale) => {
      sale.items.forEach((item, idx) => {
        const drug = inventory.find((d) => d.id === item.id);
        const costPrice = drug?.costPrice || 0;

        const lineKey = `${item.id}_${idx}`;
        const returnedQty =
          sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        const actualSoldQty = item.quantity - returnedQty;

        if (actualSoldQty > 0) {
          let effectiveCost: number;
          if (item.isUnit && item.unitsPerPack && item.unitsPerPack > 0) {
            effectiveCost = money.divide(costPrice, item.unitsPerPack);
          } else {
            effectiveCost = costPrice;
          }
          
          const lineCost = money.multiply(effectiveCost, actualSoldQty, 0);
          cogsCents += money.toSmallestUnit(lineCost);
        }
      });
    });

    return money.fromSmallestUnit(cogsCents);
  }

  /**
   * Calculates Inventory Valuation based on batches.
   */
  static calculateInventoryValuation(batches: StockBatch[], branchId?: string): number {
    let valuationCents = 0;

    const targetBatches = branchId 
      ? batches.filter(b => b.branchId === branchId) 
      : batches;

    targetBatches.forEach((batch) => {
      const batchValue = money.multiply(batch.costPrice || 0, batch.quantity || 0, 0);
      valuationCents += money.toSmallestUnit(batchValue);
    });

    return money.fromSmallestUnit(valuationCents);
  }

  /**
   * Calculates Profitability metrics using precision math.
   */
  static calculateProfitability(revenue: number, cogs: number, expenses: number): DashboardProfitability {
    const grossProfit = money.subtract(revenue, cogs);
    const netProfit = money.subtract(grossProfit, expenses);
    
    let marginPercent = 0;
    if (revenue > 0) {
      // (Profit / Revenue) * 100
      marginPercent = money.multiply(money.divide(grossProfit, revenue), 100, 0);
    }

    return {
      grossProfit,
      netProfit,
      marginPercent,
    };
  }

  /**
   * Calculates Efficiency metrics.
   */
  static calculateEfficiency(cogs: number, valuation: number): DashboardEfficiency {
    const turnoverRatio = valuation > 0 ? money.divide(cogs, valuation) : 0;
    const dailyCogs = money.divide(cogs, 30) || 0.01; // Avoid 0 division
    const daysOfInventory = money.divide(valuation, dailyCogs);

    return {
      turnoverRatio,
      daysOfInventory,
    };
  }

  /**
   * Analyzes movement and identifies critical/fast/slow items.
   */
  static analyzeMovement(
    sales: Sale[], 
    inventory: Drug[], 
    batches: StockBatch[], 
    branchId?: string
  ): DashboardMovement {
    const netSalesByDrug: Record<string, number> = {};

    // 1. Calculate Net Sales per Drug (Item-aware)
    sales.forEach((sale) => {
      sale.items.forEach((item, idx) => {
        const lineKey = `${item.id}_${idx}`;
        const returnedQty =
          sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        const actualQty = item.quantity - returnedQty;
        
        if (actualQty !== 0) {
          netSalesByDrug[item.id] = (netSalesByDrug[item.id] || 0) + actualQty;
        }
      });
    });

    // 2. Pre-calculate stock levels (Optimized O(B))
    const stockMap: Record<string, number> = {};
    batches.forEach(b => {
      if (!branchId || b.branchId === branchId) {
        stockMap[b.drugId] = (stockMap[b.drugId] || 0) + (b.quantity || 0);
      }
    });

    // 3. Categorize drugs
    const critical = inventory.filter((d) => (stockMap[d.id] || 0) <= 3);
    const lowStock = inventory.filter((d) => {
      const stock = stockMap[d.id] || 0;
      return stock > 3 && stock <= 10;
    });

    // 4. Revenue at Risk (Precision Math)
    let revenueAtRisk = 0;
    critical.forEach((d) => {
      // Risk = price * 5 (expected weekly demand placeholder)
      revenueAtRisk = money.add(revenueAtRisk, money.multiply(d.price || 0, 5, 0));
    });

    return {
      critical,
      lowStock,
      lowStockCount: critical.length + lowStock.length,
      fastMoving: inventory.filter((d) => (netSalesByDrug[d.id] || 0) >= 10),
      slowMoving: inventory.filter(
        (d) => (netSalesByDrug[d.id] || 0) < 3 && (netSalesByDrug[d.id] || 0) > 0
      ),
      revenueAtRisk,
    };
  }

  /**
   * Calculates averages and rates with precision.
   */
  static calculateAverages(sales: Sale[]): { avgOrderValue: number; returnRate: number } {
    const { totalRevenue, totalReturns } = this.calculateRevenueAndReturns(sales);
    
    const avgOrderValue = sales.length > 0 ? money.divide(totalRevenue, sales.length) : 0;
    
    const grossRevenue = money.add(totalRevenue, totalReturns);
    const returnRate = grossRevenue > 0 ? money.multiply(money.divide(totalReturns, grossRevenue), 100, 0) : 0;

    return { avgOrderValue, returnRate };
  }

  /**
   * Aggregates sales dynamics including hourly, customer, and payment distributions.
   */
  static getSalesDynamics(sales: Sale[], customers: Customer[]) {
    const hourlyRevenue: Record<number, number> = {};
    const hourlyTransactions: Record<number, number> = {};
    
    let cashRevenue = 0;
    let cardRevenue = 0;
    let cashCount = 0;
    let cardCount = 0;

    let vipTransactions = 0;
    let registeredTransactions = 0;

    let deliveryCount = 0;
    let walkInCount = 0;

    sales.forEach((sale) => {
      const { totalRevenue } = this.calculateRevenueAndReturns([sale]);
      const hour = new Date(sale.date).getHours();

      // Hourly
      hourlyRevenue[hour] = (hourlyRevenue[hour] || 0) + totalRevenue;
      hourlyTransactions[hour] = (hourlyTransactions[hour] || 0) + 1;

      // Payments
      if (sale.paymentMethod === 'visa') {
        cardRevenue = money.add(cardRevenue, totalRevenue);
        cardCount++;
      } else {
        cashRevenue = money.add(cashRevenue, totalRevenue);
        cashCount++;
      }

      // Order Types
      if (sale.saleType === 'delivery') {
        deliveryCount++;
      } else {
        walkInCount++;
      }

      // Customers
      const customer = customers.find(c => c.code === sale.customerCode || c.name === sale.customerName);
      if (customer) {
        registeredTransactions++;
        if ((customer.totalPurchases || 0) >= 1000) {
          vipTransactions++;
        }
      }
    });

    const totalTransactions = sales.length;
    const peakHourEntry = Object.entries(hourlyRevenue).sort((a, b) => b[1] - a[1])[0];

    return {
      hourly: {
        revenueMap: hourlyRevenue,
        transactionsMap: hourlyTransactions,
        peakHour: peakHourEntry ? parseInt(peakHourEntry[0]) : null,
        peakRevenue: peakHourEntry ? peakHourEntry[1] : 0,
      },
      payments: {
        cashRevenue,
        cardRevenue,
        cashCount,
        cardCount,
        cashRate: totalTransactions > 0 ? (cashCount / totalTransactions) * 100 : 0,
        cardRate: totalTransactions > 0 ? (cardCount / totalTransactions) * 100 : 0,
      },
      customers: {
        vipTransactions,
        registeredTransactions,
        newCustomersToday: sales.filter(s => s.customerName && !customers.find(c => c.name === s.customerName)).length,
        vipRate: totalTransactions > 0 ? (vipTransactions / totalTransactions) * 100 : 0,
        registeredRate: totalTransactions > 0 ? (registeredTransactions / totalTransactions) * 100 : 0,
        anonymousRate: totalTransactions > 0 ? (1 - registeredTransactions / totalTransactions) * 100 : 0,
      },
      orderTypes: {
        deliveryCount,
        walkInCount,
        deliveryRate: totalTransactions > 0 ? (deliveryCount / totalTransactions) * 100 : 0,
        walkInRate: totalTransactions > 0 ? (1 - deliveryCount / totalTransactions) * 100 : 0,
      }
    };
  }

  /**
   * Aggregates top selling products.
   */
  static getTopSelling(sales: Sale[], limit: number = 5): TopProduct[] {
    const productMap: Record<string, TopProduct> = {};

    sales.forEach((sale) => {
      sale.items.forEach((item, idx) => {
        const lineKey = `${item.id}_${idx}`;
        const returnedQty =
          sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        const actualQty = item.quantity - returnedQty;

        if (actualQty > 0) {
          const itemPrice = item.price || 0;
          const itemDiscountPct = item.discount || 0;
          
          // Effective revenue after item discount
          const factorInt = 100 - itemDiscountPct;
          const netItemPrice = money.multiply(itemPrice, factorInt, 2);
          const lineRevenue = money.multiply(netItemPrice, actualQty, 0);

          if (!productMap[item.id]) {
            productMap[item.id] = {
              id: item.id,
              name: item.name,
              dosageForm: item.dosageForm,
              qty: 0,
              revenue: 0,
            };
          }

          const entry = productMap[item.id];
          entry.qty += actualQty;
          entry.revenue = money.add(entry.revenue, lineRevenue);
        }
      });
    });

    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  /**
   * Filters and sorts items expiring soon.
   */
  static getExpiringSoon(
    inventory: Drug[], 
    batches: StockBatch[], 
    branchId: string, 
    months: number = 3
  ): any[] {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setMonth(today.getMonth() + months);

    const branchBatches = batches.filter(b => b.branchId === branchId && b.quantity > 0);
    
    return inventory
      .filter((d) => {
        const drugBatches = branchBatches.filter(b => b.drugId === d.id);
        return drugBatches.some(b => {
          const expDate = new Date(b.expiryDate);
          return expDate >= today && expDate <= futureDate;
        });
      })
      .map(d => {
         const drugBatches = branchBatches.filter(b => b.drugId === d.id);
         const earliestBatch = drugBatches.sort((a, b) => 
           new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
         )[0];
         
         return {
           ...d,
           expiryDate: earliestBatch?.expiryDate || d.expiryDate
         };
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }

  /**
   * Aggregates sales trend data for charts.
   */
  static getSalesTrends(sales: Sale[], days: number = 7): SalesTrendData[] {
    const trendMap: Record<string, number> = {};
    
    // Sort sales by date ascending for processing
    const sortedSales = [...sales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sortedSales.forEach((sale) => {
      const date = new Date(sale.date).toLocaleDateString('en-US', { weekday: 'short' });
      const saleVal = sale.netTotal ?? sale.total;
      trendMap[date] = money.add(trendMap[date] || 0, saleVal);
    });

    // Get last 'days' entries
    const entries = Object.entries(trendMap).map(([name, sales]) => ({ name, sales }));
    return entries.slice(-days);
  }
}
