import { useMemo } from 'react';
import { useData } from '../services';

export interface TickerData {
  todaySales: number;
  completedInvoices: number;
  pendingInvoices: number;
  lowStockCount: number;
  shortagesCount: number;
  newCustomersToday: number;
  topSeller: { name: string; count: number } | null;
}

export const useDynamicTickerData = (): TickerData => {
  const { sales, inventory, customers, employees } = useData();

  const metrics = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();

    // 1. Sales Metrics (Today)
    const todaysSalesData = sales.filter(s => {
      const saleDate = new Date(s.updatedAt || s.date);
      return saleDate.toDateString() === today;
    });
    const todaySalesTotal = todaysSalesData.reduce((sum, s) => sum + (s.total || 0), 0);
    const completedInvoices = todaysSalesData.filter(s => s.status === 'completed').length;
    
    // Active/Pending orders (all that need attention)
    const pendingInvoices = sales.filter(s => 
      s.status === 'pending' || s.status === 'with_delivery' || s.status === 'on_way'
    ).length;

    // 2. Inventory Metrics
    let lowStockCount = 0;
    let shortagesCount = 0;

    inventory.forEach(item => {
      // Logic: Shortage if 0, Low if <= 10 (or item specific threshold if we had one)
      // Assuming 10 as generic low stock threshold for now
      if (item.stock <= 0) {
        shortagesCount++;
      } else if (item.stock <= 10) {
        lowStockCount++;
      }
    });

    // 3. Customer Metrics (New Today)
    // Check if createdAt exists on Customer type, if not fallback (customers usually have it)
    const newCustomersToday = customers.filter(c => 
      c.createdAt && new Date(c.createdAt).toDateString() === today
    ).length;

    // 4. Top Seller (Today)
    const salesByEmployee: Record<string, number> = {};
    todaysSalesData.forEach(sale => {
      if (sale.soldByEmployeeId) {
        salesByEmployee[sale.soldByEmployeeId] = (salesByEmployee[sale.soldByEmployeeId] || 0) + 1; // Count of invoices
        // Or should it be by Amount? Requirements usually vary. Ticker usually shows "Count" or just name.
        // DynamicTicker interface has `count`. So invoice count.
      }
    });

    let topSellerId: string | null = null;
    let maxSales = 0;

    Object.entries(salesByEmployee).forEach(([id, count]) => {
      if (count > maxSales) {
        maxSales = count;
        topSellerId = id;
      }
    });

    const topSellerName = topSellerId 
      ? employees.find(e => e.id === topSellerId)?.name || 'Unknown' 
      : null;

    return {
      todaySales: todaySalesTotal,
      completedInvoices,
      pendingInvoices,
      lowStockCount,
      shortagesCount,
      newCustomersToday,
      topSeller: topSellerName ? { name: topSellerName, count: maxSales } : null
    };

  }, [sales, inventory, customers, employees]);

  return metrics;
};
