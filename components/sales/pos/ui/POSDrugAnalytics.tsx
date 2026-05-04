import React, { useEffect, useState } from 'react';
import { salesService } from '../../../../services/sales/salesService';
import { useSettings } from '../../../../context';
import type { Drug } from '../../../../types';
import { PriceDisplay } from '../../../common/TanStackTable';
import { money } from '../../../../utils/currency';
import { Tooltip } from '../../../common/Tooltip';
import { resolveUnits } from '../../../../utils/stockOperations';
import { formatStockAmount } from '../../../../utils/inventory';

interface POSDrugAnalyticsProps {
  viewingDrug: Drug;
  t: any;
}

interface DrugStats {
  totalQtySold: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  lastSaleDate: string | null;
  saleCount: number;
  dailyVelocity: number;
  daysOfCover: number | '∞';
  expiryStatus: 'safe' | 'near' | 'critical' | 'expired';
  daysToExpiry: number;
  expectedWaste: number; 
  profitPerUnit: number;
  stockValue: number; // New: Total monetary value of current stock
  avgQtyPerSale: number; // New: Average units sold per transaction
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

const formatCompact = (val: number, lang: string) => {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(val);
};

const formatDrugQty = (units: number, unitsPerPack: number, lang: string) => {
  const packs = units / (unitsPerPack || 1);
  const isInteger = Number.isInteger(packs);
  const packsStr = isInteger ? packs.toString() : parseFloat(packs.toFixed(2)).toString();
  const packLabel = lang === 'ar' ? 'علبة' : 'Packs';
  
  return `${packsStr} ${packLabel}`;
};

// ─── INTERNAL MINI-COMPONENTS (Rule 5) ─────────────────────────────────────

const StatCard: React.FC<{
  icon: string;
  label: string;
  value: React.ReactNode;
  subtitle: string;
  iconColor: string;
  textColor: string;
}> = ({ icon, label, value, subtitle, iconColor, textColor }) => (
  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
    <div className="flex items-center gap-2 mb-3">
      <span className={`material-symbols-rounded ${iconColor}`} style={{ fontSize: 'var(--icon-lg)', lineHeight: 1 }}>{icon}</span>
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
    </div>
    <div className="flex flex-col">
      <span className={`text-2xl font-black tabular-nums ${textColor}`}>{value}</span>
      <span className="text-[10px] font-bold text-gray-500 mt-1">{subtitle}</span>
    </div>
  </div>
);

const InfoRow: React.FC<{
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  hint?: string;
  isLast?: boolean;
  tooltip?: string;
}> = ({ label, value, valueClass = '', hint, isLast = false, tooltip }) => (
  <div className={`flex justify-between items-center py-2 ${!isLast ? 'border-b border-gray-50 dark:border-gray-800/50' : ''}`}>
    <div className="flex flex-col">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      {hint && <span className="text-[9px] text-gray-400 font-medium">{hint}</span>}
    </div>
    {tooltip ? (
      <Tooltip content={tooltip}>
        <span className={`text-xs font-black px-2 py-0.5 rounded-md ${valueClass}`}>
          {value}
        </span>
      </Tooltip>
    ) : (
      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${valueClass}`}>
        {value}
      </span>
    )}
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

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

        const now = new Date();
        let firstSaleDate = now;
        let totalQty = 0;
        let totalRev = 0;
        let totalCost = 0;
        let lastDate: string | null = null;

        drugSales.forEach(sale => {
          const saleDate = new Date(sale.date);
          const item = sale.items.find(i => i.id === viewingDrug.id || i.barcode === viewingDrug.barcode);
          
          if (item) {
            const unitsPerPack = viewingDrug.unitsPerPack || 1;
            // Use the standard utility to resolve quantity into units
            const normalizedQty = resolveUnits(item.quantity, !!item.isUnit, unitsPerPack);
            
            totalQty += normalizedQty;
            
            // Revenue: item.publicPrice is already the correct price for the selection (unit or pack)
            totalRev = money.add(totalRev, money.multiply(item.publicPrice, item.quantity, 0));
            
            // Cost: Calculate based on unit cost for precision
            const packCost = item.costPrice || viewingDrug.costPrice || 0;
            const unitCost = viewingDrug.unitCostPrice || (packCost / unitsPerPack);
            const actualCost = item.isUnit ? unitCost : packCost;
            
            totalCost = money.add(totalCost, money.multiply(actualCost, item.quantity, 0));
            
            if (saleDate < firstSaleDate) firstSaleDate = saleDate;
            if (!lastDate || saleDate > new Date(lastDate)) lastDate = sale.date;
          }
        });

        const effectiveDays = Math.max(1, Math.ceil((now.getTime() - firstSaleDate.getTime()) / (1000 * 60 * 60 * 24)));
        const dailyVelocity = totalQty / effectiveDays;
        
        const daysToExpiry = viewingDrug.expiryDate 
          ? Math.ceil((new Date(viewingDrug.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        let expiryStatus: DrugStats['expiryStatus'] = 'safe';
        if (daysToExpiry <= 0) expiryStatus = 'expired';
        else if (daysToExpiry <= 90) expiryStatus = 'critical';
        else if (daysToExpiry <= 180) expiryStatus = 'near';

        setStats({
          totalQtySold: totalQty,
          totalRevenue: totalRev,
          totalProfit: money.subtract(totalRev, totalCost),
          profitMargin: totalRev > 0 ? ((totalRev - totalCost) / totalRev) * 100 : 0,
          lastSaleDate: lastDate,
          saleCount: drugSales.length,
          dailyVelocity,
          daysOfCover: dailyVelocity > 0 ? Math.floor(viewingDrug.stock / dailyVelocity) : '∞',
          expiryStatus,
          daysToExpiry,
          expectedWaste: dailyVelocity > 0 && daysToExpiry > 0 
            ? Math.max(0, Math.floor(viewingDrug.stock - (dailyVelocity * daysToExpiry)))
            : (daysToExpiry <= 0 ? viewingDrug.stock : 0),
          profitPerUnit: money.subtract(viewingDrug.publicPrice, viewingDrug.costPrice || 0),
          stockValue: money.multiply(viewingDrug.costPrice || viewingDrug.publicPrice, viewingDrug.stock, 0),
          avgQtyPerSale: drugSales.length > 0 ? totalQty / drugSales.length : 0
        });
      } catch (error) {
        console.error('Failed to fetch drug analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [viewingDrug.id, viewingDrug.barcode, viewingDrug.costPrice, viewingDrug.stock, viewingDrug.publicPrice]);

  // Rule 7: Config-Driven UI
  const metricsConfig = [
    {
      icon: 'payments',
      label: currentLang === 'ar' ? 'إجمالي الربح' : 'Total Profit',
      value: <PriceDisplay value={stats?.totalProfit || 0} compact />,
      subtitle: currentLang === 'ar' ? 'صافي العائد من المبيعات' : 'Net returns from sales',
      iconColor: 'text-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      icon: 'account_balance_wallet',
      label: currentLang === 'ar' ? 'قيمة المخزون' : 'Stock Value',
      value: <PriceDisplay value={stats?.stockValue || 0} compact />,
      subtitle: currentLang === 'ar' ? 'رأس مال مجمد في الرف' : 'Capital tied on shelf',
      iconColor: 'text-indigo-500',
      textColor: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      icon: 'trending_up',
      label: currentLang === 'ar' ? 'معدل المبيعات' : 'Sales Velocity',
      value: formatCompact(stats?.dailyVelocity || 0, currentLang),
      subtitle: currentLang === 'ar' ? 'قطعة / يومياً' : 'Units per day',
      iconColor: 'text-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400'
    },
    {
      icon: 'shopping_basket',
      label: currentLang === 'ar' ? 'مرات البيع' : 'Sale Frequency',
      value: formatCompact(stats?.saleCount || 0, currentLang),
      subtitle: currentLang === 'ar' ? 'عدد الفواتير المسجلة' : 'Recorded transactions',
      iconColor: 'text-purple-500',
      textColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: 'groups',
      label: currentLang === 'ar' ? 'متوسط الطلب' : 'Avg Demand',
      value: stats?.avgQtyPerSale.toFixed(1),
      subtitle: currentLang === 'ar' ? 'قطعة لكل عميل' : 'Units per customer',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-600 dark:text-blue-400'
    }
  ];

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>
  );

  return (
    <div className="space-y-6" dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
      {/* 1. Profitability & Financials (Rule 4: Functional Iteration) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-4">
        {metricsConfig.map((metric, i) => <StatCard key={i} {...metric} />)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2. Inventory Intelligence */}
        <section className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h5 className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">
                {currentLang === 'ar' ? 'ذكاء المخزون' : 'Inventory Intelligence'}
              </h5>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                {currentLang === 'ar' ? 'توقعات الاستهلاك' : 'Consumption Forecast'}
              </p>
            </div>
            <span className="material-symbols-rounded text-gray-400" style={{ fontSize: 'var(--icon-sm)', lineHeight: 1 }}>insights</span>
          </div>

          <div className="flex flex-col gap-1">
            <InfoRow 
              label={currentLang === 'ar' ? 'مدة كفاية المخزون' : 'Stock Coverage'}
              value={`${stats?.daysOfCover} ${currentLang === 'ar' ? 'يوم' : 'Days'}`}
              valueClass={stats?.daysOfCover !== '∞' && Number(stats?.daysOfCover) < 7 
                ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
                : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}
              tooltip={currentLang === 'ar' 
                ? `${formatDrugQty(viewingDrug.stock, viewingDrug.unitsPerPack || 1, 'ar')} ÷ ${((stats?.dailyVelocity || 0) / (viewingDrug.unitsPerPack || 1)).toFixed(2)} علبة/يوم = ${stats?.daysOfCover} يوم` 
                : `${formatDrugQty(viewingDrug.stock, viewingDrug.unitsPerPack || 1, 'en')} ÷ ${((stats?.dailyVelocity || 0) / (viewingDrug.unitsPerPack || 1)).toFixed(2)} packs/day = ${stats?.daysOfCover} days`}
            />
            <InfoRow 
              label={currentLang === 'ar' ? 'حالة الصلاحية' : 'Expiry Status'}
              value={stats?.expiryStatus === 'expired' ? (currentLang === 'ar' ? 'منتهي' : 'Expired') :
                     stats?.expiryStatus === 'critical' ? (currentLang === 'ar' ? 'حرجة (<90 يوم)' : 'Critical (<90d)') :
                     stats?.expiryStatus === 'near' ? (currentLang === 'ar' ? 'قريبة (<6 شهور)' : 'Near (<6m)') :
                     (currentLang === 'ar' ? 'آمنة' : 'Safe')}
              valueClass={stats?.expiryStatus === 'critical' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                          stats?.expiryStatus === 'expired' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                          'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}
              tooltip={currentLang === 'ar' 
                ? `متبقي ${stats?.daysToExpiry} يوم على الانتهاء` 
                : `${stats?.daysToExpiry} days remaining until expiration`}
            />
            <InfoRow 
              label={currentLang === 'ar' ? 'توقعات الهالك' : 'Expiry Waste Forecast'}
              hint={currentLang === 'ar' ? 'بناءً على معدل البيع الحالي' : 'Based on current velocity'}
              value={formatDrugQty(stats?.expectedWaste || 0, viewingDrug.unitsPerPack || 1, currentLang)}
              valueClass={(stats?.expectedWaste || 0) > 0 ? 'bg-red-50 text-red-600 animate-pulse dark:bg-red-900/20 dark:text-red-400' : 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}
              tooltip={currentLang === 'ar' 
                ? `${formatDrugQty(viewingDrug.stock, viewingDrug.unitsPerPack || 1, 'ar')} مخزون - (${((stats?.dailyVelocity || 0) / (viewingDrug.unitsPerPack || 1)).toFixed(2)} علبة/يوم × ${stats?.daysToExpiry} يوم) = ${formatDrugQty(stats?.expectedWaste || 0, viewingDrug.unitsPerPack || 1, 'ar')}` 
                : `${formatDrugQty(viewingDrug.stock, viewingDrug.unitsPerPack || 1, 'en')} stock - (${((stats?.dailyVelocity || 0) / (viewingDrug.unitsPerPack || 1)).toFixed(2)} packs/day × ${stats?.daysToExpiry} days) = ${formatDrugQty(stats?.expectedWaste || 0, viewingDrug.unitsPerPack || 1, 'en')}`}
            />
            <InfoRow 
              label={currentLang === 'ar' ? 'حالة الطلب' : 'Restock Recommendation'}
              value={viewingDrug.stock <= (viewingDrug.minStock || 0) 
                ? (currentLang === 'ar' ? 'يجب الطلب فوراً' : 'Order Now') 
                : (currentLang === 'ar' ? 'المخزون كافٍ' : 'Stock Sufficient')}
              valueClass={viewingDrug.stock <= (viewingDrug.minStock || 0) ? 'text-red-500' : 'text-emerald-500'}
              isLast
            />
          </div>
        </section>

        {/* 3. Performance KPIs */}
        <section className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
          <div>
            <h5 className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight mb-4">
              {currentLang === 'ar' ? 'مؤشرات الأداء' : 'Performance KPIs'}
            </h5>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <span className="text-[9px] font-black text-gray-400 uppercase block mb-1">
                  {currentLang === 'ar' ? 'الربح في القطعة' : 'Profit/Unit'}
                </span>
                <span className="text-lg font-black text-emerald-600">
                  <PriceDisplay value={stats?.profitPerUnit || 0} />
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <span className="text-[9px] font-black text-gray-400 uppercase block mb-1">
                  {currentLang === 'ar' ? 'إجمالي الوحدات' : 'Total Units'}
                </span>
                <span className="text-lg font-black text-gray-700 dark:text-gray-200">
                  {formatDrugQty(stats?.totalQtySold || 0, viewingDrug.unitsPerPack || 1, currentLang)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase">{currentLang === 'ar' ? 'آخر عملية:' : 'Last Recorded:'}</span>
            <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 tabular-nums">
              {stats?.lastSaleDate ? new Date(stats.lastSaleDate).toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US') : '---'}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
