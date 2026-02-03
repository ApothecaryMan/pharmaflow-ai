import { CartItem, type Sale } from '../types';

/**
 * Interface representing comprehensive sales statistics for an employee.
 * Includes basic sales metrics, profit analysis, and product breakdown.
 */
export interface EmployeeSalesStats {
  // Basic Metrics
  salesCount: number; // Number of transactions
  grossSales: number; // Total sales value before returns
  returns: number; // Total value of returned items
  netSales: number; // Final sales value (Gross - Returns)

  // Item Metrics
  totalItemsSold: number; // Total quantity of items sold (after returns)

  // Profit Metrics
  totalProfit: number; // Gross Profit (Sale Price - Cost Price)
  avgProfitPerSale: number; // Average profit per transaction
  profitMargin: number; // Profit as percentage of net sales (0-100)

  // Product Analysis
  mostSoldProduct?: {
    id: string;
    name: string;
    quantity: number;
  };

  // Best Performance Metrics
  highestInvoice?: {
    id: string;
    total: number;
    date: string;
  };

  highestPricedItemSold?: {
    id: string;
    name: string;
    price: number;
  };
}

/**
 * Date range filter options for analytics.
 */
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Calculates comprehensive sales statistics for a specific employee.
 *
 * Features:
 * - Filters by employee and optional date range
 * - Calculates gross/net sales with return deductions
 * - Computes profit metrics using item cost prices
 * - Identifies the most sold product by quantity
 *
 * @param employeeId - The unique ID of the employee
 * @param sales - All sales in the system
 * @param dateFilter - Optional date range to filter results
 * @returns EmployeeSalesStats object with all calculated metrics
 */
export function getEmployeeSalesStats(
  employeeId: string,
  sales: Sale[],
  dateFilter?: DateRangeFilter
): EmployeeSalesStats {
  // 1. Filter sales by employee
  let employeeSales = sales.filter((s) => s.soldByEmployeeId === employeeId);

  // 2. Apply date range filter if provided
  if (dateFilter?.startDate) {
    const start = dateFilter.startDate.getTime();
    employeeSales = employeeSales.filter((s) => new Date(s.date).getTime() >= start);
  }
  if (dateFilter?.endDate) {
    const end = dateFilter.endDate.getTime();
    employeeSales = employeeSales.filter((s) => new Date(s.date).getTime() <= end);
  }

  // 3. Calculate Gross Sales
  const grossSales = employeeSales.reduce((sum, s) => sum + s.total, 0);

  // 4. Calculate Returns (difference between total and netTotal)
  const returns = employeeSales.reduce((sum, s) => {
    return sum + (s.total - (s.netTotal ?? s.total));
  }, 0);

  const netSales = grossSales - returns;

  // 5. Calculate Total Items Sold & Profit
  // We need to track quantities and cost per item
  let totalItemsSold = 0;
  let totalProfit = 0;
  const productQuantities: Record<string, { name: string; quantity: number }> = {};

  employeeSales.forEach((sale) => {
    const returnedQty = sale.itemReturnedQuantities || {};

    sale.items.forEach((item) => {
      // Calculate sold quantity (original - returned)
      const returned = returnedQty[item.id] || 0;
      const soldQty = item.quantity - returned;

      if (soldQty > 0) {
        totalItemsSold += soldQty;

        // Calculate profit for this item
        // Profit = (Sale Price - Cost Price) * Quantity
        const salePrice = item.price;
        const costPrice = item.costPrice || 0;
        const itemProfit = (salePrice - costPrice) * soldQty;
        totalProfit += itemProfit;

        // Track quantities per product for "most sold"
        if (!productQuantities[item.id]) {
          productQuantities[item.id] = { name: item.name, quantity: 0 };
        }
        productQuantities[item.id].quantity += soldQty;
      }
    });
  });

  // 6. Find Most Sold Product
  let mostSoldProduct: EmployeeSalesStats['mostSoldProduct'];
  let maxQty = 0;

  Object.entries(productQuantities).forEach(([id, data]) => {
    if (data.quantity > maxQty) {
      maxQty = data.quantity;
      mostSoldProduct = { id, name: data.name, quantity: data.quantity };
    }
  });

  // 7. Find Highest Invoice
  let highestInvoice: EmployeeSalesStats['highestInvoice'];
  let maxInvoiceTotal = 0;

  employeeSales.forEach((sale) => {
    const saleTotal = sale.netTotal ?? sale.total;
    if (saleTotal > maxInvoiceTotal) {
      maxInvoiceTotal = saleTotal;
      highestInvoice = {
        id: sale.id,
        total: saleTotal,
        date: sale.date,
      };
    }
  });

  // 8. Find Highest Priced Item Sold
  let highestPricedItemSold: EmployeeSalesStats['highestPricedItemSold'];
  let maxItemPrice = 0;

  employeeSales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (item.price > maxItemPrice) {
        maxItemPrice = item.price;
        highestPricedItemSold = {
          id: item.id,
          name: item.name,
          price: item.price,
        };
      }
    });
  });

  // 9. Calculate Averages and Margins
  const salesCount = employeeSales.length;
  const avgProfitPerSale = salesCount > 0 ? totalProfit / salesCount : 0;
  const profitMargin = netSales > 0 ? (totalProfit / netSales) * 100 : 0;

  return {
    salesCount,
    grossSales,
    returns,
    netSales,
    totalItemsSold,
    totalProfit,
    avgProfitPerSale,
    profitMargin: parseFloat(profitMargin.toFixed(2)),
    mostSoldProduct,
    highestInvoice,
    highestPricedItemSold,
  };
}

/**
 * Ranks employees based on their net sales performance.
 *
 * @param employeeIds - List of employee IDs to analyze
 * @param sales - Collection of all sales
 * @param limit - Maximum number of top performers (default: 5)
 * @param dateFilter - Optional date range filter
 * @returns Sorted array of top performers with stats
 */
export function getTopEmployeesBySales(
  employeeIds: string[],
  sales: Sale[],
  limit: number = 5,
  dateFilter?: DateRangeFilter
): Array<{ employeeId: string; stats: EmployeeSalesStats }> {
  const results = employeeIds.map((id) => ({
    employeeId: id,
    stats: getEmployeeSalesStats(id, sales, dateFilter),
  }));

  return results.sort((a, b) => b.stats.netSales - a.stats.netSales).slice(0, limit);
}

/**
 * Ranks employees based on profit margin.
 * Useful for identifying high-value sellers.
 *
 * @param employeeIds - List of employee IDs
 * @param sales - Collection of all sales
 * @param dateFilter - Optional date range filter
 * @returns Sorted array by profit margin (highest first)
 */
export function getTopEmployeesByProfit(
  employeeIds: string[],
  sales: Sale[],
  dateFilter?: DateRangeFilter
): Array<{ employeeId: string; stats: EmployeeSalesStats }> {
  const results = employeeIds.map((id) => ({
    employeeId: id,
    stats: getEmployeeSalesStats(id, sales, dateFilter),
  }));

  return results.sort((a, b) => b.stats.totalProfit - a.stats.totalProfit);
}

/**
 * Helper: Get date range for common periods.
 */
export function getDateRange(period: 'today' | 'week' | 'month' | 'year'): DateRangeFilter {
  const now = new Date();
  const startDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7); // Last 7 days
      break;
    case 'month':
      startDate.setDate(now.getDate() - 30); // Last 30 days
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  return { startDate, endDate: now };
}

/**
 * Calculates the previous date range for trend analysis.
 * e.g., if period is 'week' (last 7 days), returns the 7 days prior to that.
 */
export function getPreviousDateRange(period: 'today' | 'week' | 'month' | 'year'): DateRangeFilter {
  const currentRange = getDateRange(period);
  if (!currentRange.startDate || !currentRange.endDate) return {};

  const duration = currentRange.endDate.getTime() - currentRange.startDate.getTime();

  // End date of previous range is start date of current range
  const endDate = new Date(currentRange.startDate);

  // Start date is end date - duration
  const startDate = new Date(endDate.getTime() - duration);

  return { startDate, endDate };
}
