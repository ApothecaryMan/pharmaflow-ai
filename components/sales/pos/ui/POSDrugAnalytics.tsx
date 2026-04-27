import React, { useEffect, useState } from 'react';
import { salesService } from '../../../../services/sales/salesService';
import { useSettings } from '../../../../context';
import type { Drug } from '../../../../types';
import { PriceDisplay } from '../../../common/TanStackTable';
import { money } from '../../../../utils/currency';

interface POSDrugAnalyticsProps {
  viewingDrug: Drug;
  t: any;
}

interface DrugStats {
  totalQtySold: number;
  totalRevenue: number;
  lastSaleDate: string | null;
  saleCount: number;
}

export const POSDrugAnalytics: React.FC<POSDrugAnalyticsProps> = ({ viewingDrug, t }) => {
  const [stats, setStats] = useState<DrugStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { language } = useSettings();
  const currentLang = language.toLowerCase() as 'en' | 'ar';

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const sales = await salesService.getAll();
        const drugSales = sales.filter(s => 
          s.items.some(item => item.id === viewingDrug.id || item.barcode === viewingDrug.barcode)
        );

        const calculatedStats: DrugStats = {
          totalQtySold: 0,
          totalRevenue: 0,
          lastSaleDate: null,
          saleCount: drugSales.length
        };

        drugSales.forEach(sale => {
          const item = sale.items.find(i => i.id === viewingDrug.id || i.barcode === viewingDrug.barcode);
          if (item) {
            calculatedStats.totalQtySold += item.quantity;
            calculatedStats.totalRevenue = money.add(calculatedStats.totalRevenue, money.multiply(item.price, item.quantity, 0));
            
            if (!calculatedStats.lastSaleDate || new Date(sale.date) > new Date(calculatedStats.lastSaleDate)) {
              calculatedStats.lastSaleDate = sale.date;
            }
          }
        });

        setStats(calculatedStats);
      } catch (error) {
        console.error('Failed to fetch drug analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [viewingDrug.id, viewingDrug.barcode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/20 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shrink-0">
          <span className="material-symbols-rounded text-2xl">analytics</span>
        </div>
        <div>
          <h4 className="text-sm font-black text-amber-700 dark:text-amber-300 uppercase">
            {currentLang === 'ar' ? 'تحليلات حركة الصنف' : 'Item Movement Analytics'}
          </h4>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            {currentLang === 'ar' ? 'إحصائيات المبيعات التاريخية بناءً على سجل العمليات' : 'Historical performance based on local sales transactions.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
             {currentLang === 'ar' ? 'إجمالي المباع' : 'Total Units Sold'}
          </span>
          <span className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
            {stats?.totalQtySold || 0}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
             {currentLang === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            <PriceDisplay value={stats?.totalRevenue || 0} />
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
             {currentLang === 'ar' ? 'عدد العمليات' : 'Sale Count'}
          </span>
          <span className="text-2xl font-black text-primary-600 dark:text-primary-400 tabular-nums">
            {stats?.saleCount || 0}
          </span>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-gray-400">history</span>
            <span className="font-bold text-gray-700 dark:text-gray-300">
              {currentLang === 'ar' ? 'آخر عملية بيع:' : 'Last Sale Recorded:'}
            </span>
          </div>
          <span className="font-black text-gray-900 dark:text-gray-100 tabular-nums uppercase">
            {stats?.lastSaleDate ? new Date(stats.lastSaleDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : (currentLang === 'ar' ? 'لا يوجد تاريخ' : 'N/A')}
          </span>
        </div>
      </div>
    </div>
  );
};
