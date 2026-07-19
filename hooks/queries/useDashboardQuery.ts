import { useQuery } from '@tanstack/react-query';
import { STALE_TIMES } from '../../lib/queryClient';
import { supabase } from '../../lib/supabase';

export interface SlimDrug {
  id: string;
  name: string;
  dosageForm?: string;
  stock: number;
  category: string;
  publicPrice: number;
}

export interface SlimExpiringItem extends SlimDrug {
  expiryDate: string;
  batchId: string;
  batchQuantity: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  todayRevenue: number;
  todayTransactions: number;
  expiringSoonCount: number;
  recentPurchases: any[];
  lowStockItems: SlimDrug[];
  expiringItems: SlimExpiringItem[];
  inventoryValuation: number;
}

function toSlimDrug(db: any): SlimDrug {
  return {
    id: db.id,
    name: db.name,
    dosageForm: db.dosage_form || undefined,
    stock: db.stock ?? 0,
    category: db.category,
    publicPrice: db.public_price ?? 0,
  };
}

function toSlimExpiring(db: any): SlimExpiringItem {
  return {
    ...toSlimDrug(db),
    expiryDate: db.expiry_date || '',
    batchId: db.batch_id,
    batchQuantity: db.batch_quantity ?? 0,
  };
}

export function useDashboardStats(branchId: string) {
  return useQuery({
    queryKey: ['dashboard', 'stats', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const [
        { count: totalCount },
        { data: valueData },
        { data: lowStockData },
        { data: salesToday },
        { count: expiringCount },
        { data: recentPurchases },
        { data: lowStockRaw },
        { data: expiringRaw },
        { data: invValuation },
      ] = await Promise.all([
        supabase
          .from('drugs')
          .select('*', { count: 'exact', head: true })
          .eq('branch_id', branchId),
        supabase
          .from('drugs')
          .select('public_price, stock, units_per_pack')
          .eq('branch_id', branchId),
        supabase.from('drugs').select('stock, min_stock').eq('branch_id', branchId),
        supabase
          .from('sales')
          .select('total')
          .eq('branch_id', branchId)
          .eq('status', 'completed')
          .gte('date', todayStart)
          .lt('date', todayEnd),
        supabase
          .from('stock_batches')
          .select('*', { count: 'exact', head: true })
          .eq('branch_id', branchId)
          .lte('expiry_date', thirtyDaysFromNow)
          .gt('quantity', 0),
        supabase
          .from('purchases')
          .select('id, date, total, supplier_name, notes')
          .eq('branch_id', branchId)
          .order('date', { ascending: false })
          .limit(5),
        supabase.rpc('get_dashboard_low_stock', {
          p_branch_id: branchId,
          p_limit: 50,
        }),
        supabase.rpc('get_dashboard_expiring_items', {
          p_branch_id: branchId,
          p_days: 90,
          p_limit: 50,
        }),
        supabase.rpc('get_dashboard_inventory_valuation', {
          p_branch_id: branchId,
        }),
      ]);

      const totalValue = (valueData || []).reduce(
        (sum, d) => sum + (d.public_price || 0) * ((d.stock || 0) / (d.units_per_pack || 1)),
        0
      );
      const lowStockCount = (lowStockData || []).filter(
        (d) => (d.stock || 0) < (d.min_stock || 10) && (d.stock || 0) > 0
      ).length;
      const outOfStockCount = (lowStockData || []).filter((d) => (d.stock || 0) <= 0).length;
      const todayRevenue = (salesToday || []).reduce((sum, s) => sum + (s.total || 0), 0);

      const lowStockItems: SlimDrug[] = (lowStockRaw || []).map(toSlimDrug);
      const expiringItems: SlimExpiringItem[] = (expiringRaw || []).map(toSlimExpiring);
      const inventoryValuation = (invValuation as number) || 0;

      return {
        totalProducts: totalCount || 0,
        totalValue,
        lowStockCount,
        outOfStockCount,
        todayRevenue,
        todayTransactions: salesToday?.length || 0,
        expiringSoonCount: expiringCount || 0,
        recentPurchases: recentPurchases || [],
        lowStockItems,
        expiringItems,
        inventoryValuation,
      };
    },
    staleTime: STALE_TIMES.inventory,
    enabled: !!branchId,
  });
}
