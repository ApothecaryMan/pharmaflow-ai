import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Sale, Employee, Customer, ThemeColor } from '../../../types';
import {
  PerformanceMetrics,
  StaffStats,
  ChampionTooltipData,
  Achievement
} from '../types/staffOverview.types';
import {
  TRUST_SCORE_WEIGHTS,
  TRUST_SCORE_RANGE,
  LOYALTY_THRESHOLDS,
  LOYALTY_SCORES,
  RETURN_THRESHOLDS,
  RETURN_SCORES,
  BASKET_THRESHOLDS,
  BASKET_SCORES,
  SPEED_THRESHOLDS,
  SPEED_SCORES,
  MEDIAN_FALLBACKS
} from '../config/trustScoreConfig';
import { formatCurrency } from '../../../utils/currency';

interface UseStaffAnalyticsParams {
  todaysSales: Sale[];
  employees: Employee[];
  customers: Customer[];
  language: 'AR' | 'EN';
  color: ThemeColor;
  getInitials: (name: string) => string;
}

interface UseStaffAnalyticsReturn {
  staffStats: StaffStats[];
  achievements: Achievement[];
  performanceColumns: ColumnDef<StaffStats>[];
}

/**
 * Custom hook for staff performance analytics
 * Calculates TrustScore, metrics, champions, and table columns
 */
export const useStaffAnalytics = ({
  todaysSales,
  employees,
  customers,
  language,
  color,
  getInitials
}: UseStaffAnalyticsParams): UseStaffAnalyticsReturn => {
  return useMemo(() => {
    const perfMap: Record<string, PerformanceMetrics> = {};

    // Initialize performance map for ALL employees
    employees.forEach(e => {
      perfMap[e.id] = {
        revenue: 0,
        count: 0,
        items: 0,
        avgTime: 0,
        csat: 0,
        loyalty: 0
      };
    });

    // Calculate basic metrics
    todaysSales.forEach(s => {
      if (!s.soldByEmployeeId) return; // Skip sales without an assigned employee
      const eid = s.soldByEmployeeId;
      
      // If a sale is made by an employee not in the initial list (e.g., deleted employee),
      // add them to the map with default values.
      if (!perfMap[eid]) {
        perfMap[eid] = { revenue: 0, count: 0, items: 0, avgTime: 0, csat: 0, loyalty: 0 };
      }
      
      const perf = perfMap[eid];
      perf.revenue += s.total; // Use s.total as per instruction
      perf.count += 1;
      perf.items += s.items.reduce((sum, i) => sum + i.quantity, 0);
      
      if (s.processingTimeMinutes) {
        perf.avgTime += s.processingTimeMinutes;
      }
    });

    // Calculate average processing time
    Object.values(perfMap).forEach(perf => {
      if (perf.count > 0 && perf.avgTime > 0) {
        perf.avgTime = perf.avgTime / perf.count;
      }
    });

    // === TrustScore Algorithm v3 ===
    
    // Helper: Calculate median
    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    };

    // 1. Calculate global metrics
    const allReturnRates: number[] = [];
    const allAvgBaskets: number[] = [];
    
    Object.entries(perfMap).forEach(([eid, perf]) => {
      const salesWithReturns = todaysSales.filter(s => 
        s.soldByEmployeeId === eid && s.hasReturns
      ).length;
      const returnRate = perf.count > 0 ? salesWithReturns / perf.count : 0;
      allReturnRates.push(returnRate);
      
      const avgBasket = perf.count > 0 ? perf.items / perf.count : 0;
      allAvgBaskets.push(avgBasket);
    });

    const globalReturnBaseline = median(allReturnRates) || MEDIAN_FALLBACKS.RETURN_BASELINE;
    const globalAvgBasket = median(allAvgBaskets) || MEDIAN_FALLBACKS.AVG_BASKET;

    // 2. Calculate repeat customers (OPTIMIZED - O(n))
    const customerPurchases: Record<string, Record<string, number>> = {};
    todaysSales.forEach(s => {
      const eid = s.soldByEmployeeId || 'unknown';
      // Robust customer ID: prefer code, fallback to name, normalize strings
      const custCode = (s.customerCode || s.customerName || `anonymous-${s.id}`).trim();
      
      if (!customerPurchases[eid]) {
        customerPurchases[eid] = {};
      }
      customerPurchases[eid][custCode] = (customerPurchases[eid][custCode] || 0) + 1;
    });

    const employeeRepeatCustomers: Record<string, number> = {};
    const employeeCustomerCounts: Record<string, number> = {};
    
    Object.entries(customerPurchases).forEach(([eid, customers]) => {
      let repeatCount = 0;
      let totalCustomers = 0;
      
      Object.values(customers).forEach(purchaseCount => {
        totalCustomers++;
        if (purchaseCount >= 2) {
          repeatCount++;
        }
      });
      
      employeeRepeatCustomers[eid] = repeatCount;
      employeeCustomerCounts[eid] = totalCustomers;
    });

    // 3. Calculate TrustScore for each employee
    Object.entries(perfMap).forEach(([eid, perf]) => {
      if (perf.count === 0) {
        perf.csat = 0;
        return;
      }

      // Factor 1: Return Rate (weighted 1.2)
      const salesWithReturns = todaysSales.filter(s => 
        s.soldByEmployeeId === eid && s.hasReturns
      ).length;
      const returnRate = perf.count > 0 ? salesWithReturns / perf.count : 0;
      const relativeReturn = globalReturnBaseline > 0 ? returnRate / globalReturnBaseline : 0;
      
      let returnScore = 0;
      if (returnRate === RETURN_THRESHOLDS.ZERO) returnScore = RETURN_SCORES.ZERO;
      else if (relativeReturn < RETURN_THRESHOLDS.EXCELLENT) returnScore = RETURN_SCORES.EXCELLENT;
      else if (relativeReturn < RETURN_THRESHOLDS.GOOD) returnScore = RETURN_SCORES.GOOD;
      else if (relativeReturn < RETURN_THRESHOLDS.FAIR) returnScore = RETURN_SCORES.FAIR;
      else if (relativeReturn <= RETURN_THRESHOLDS.ACCEPTABLE) returnScore = RETURN_SCORES.ACCEPTABLE;
      else if (relativeReturn <= RETURN_THRESHOLDS.WARNING) returnScore = RETURN_SCORES.WARNING;
      else if (relativeReturn <= RETURN_THRESHOLDS.CRITICAL) returnScore = RETURN_SCORES.CRITICAL;
      else returnScore = RETURN_SCORES.SEVERE;

      // Factor 2: Loyalty (weighted 1.0)
      const totalCustomers = employeeCustomerCounts[eid] || 0;
      const repeatCustomers = employeeRepeatCustomers[eid] || 0;
      const repeatRatio = totalCustomers > 0 ? repeatCustomers / totalCustomers : 0;
      
      let loyaltyScore = 0;
      if (repeatRatio > LOYALTY_THRESHOLDS.EXCEPTIONAL) loyaltyScore = LOYALTY_SCORES.EXCEPTIONAL;
      else if (repeatRatio > LOYALTY_THRESHOLDS.STRONG) loyaltyScore = LOYALTY_SCORES.STRONG;
      else if (repeatRatio > LOYALTY_THRESHOLDS.GOOD) loyaltyScore = LOYALTY_SCORES.GOOD;
      else if (repeatRatio > LOYALTY_THRESHOLDS.FAIR) loyaltyScore = LOYALTY_SCORES.FAIR;
      else if (repeatRatio > LOYALTY_THRESHOLDS.POOR) loyaltyScore = LOYALTY_SCORES.POOR;
      else loyaltyScore = LOYALTY_SCORES.CRITICAL;

      // Factor 3: Basket Size (weighted 0.3)
      const avgBasket = perf.count > 0 ? perf.items / perf.count : 0;
      const basketRatio = globalAvgBasket > 0 ? avgBasket / globalAvgBasket : 1;
      
      let basketScore = 0;
      if (basketRatio > BASKET_THRESHOLDS.LARGE) basketScore = BASKET_SCORES.LARGE;
      else if (basketRatio > BASKET_THRESHOLDS.ABOVE_AVG) basketScore = BASKET_SCORES.ABOVE_AVG;
      else if (basketRatio >= BASKET_THRESHOLDS.AVERAGE) basketScore = BASKET_SCORES.AVERAGE;
      else if (basketRatio >= BASKET_THRESHOLDS.BELOW_AVG) basketScore = BASKET_SCORES.BELOW_AVG;
      else basketScore = BASKET_SCORES.SMALL;

      // Factor 4: Speed (weighted 0.5, conditional on loyalty)
      const secondsPerItem = perf.items > 0 ? (perf.avgTime * 60) / perf.items : 999;
      const loyaltyHealthy = repeatRatio > LOYALTY_THRESHOLDS.FAIR;
      
      let speedScore = 0;
      if (loyaltyHealthy) {
        if (secondsPerItem < SPEED_THRESHOLDS.EXCELLENT) speedScore = SPEED_SCORES.HEALTHY.EXCELLENT;
        else if (secondsPerItem < SPEED_THRESHOLDS.VERY_GOOD) speedScore = SPEED_SCORES.HEALTHY.VERY_GOOD;
        else if (secondsPerItem < SPEED_THRESHOLDS.GOOD) speedScore = SPEED_SCORES.HEALTHY.GOOD;
        else if (secondsPerItem < SPEED_THRESHOLDS.FAIR) speedScore = SPEED_SCORES.HEALTHY.FAIR;
        else if (secondsPerItem < SPEED_THRESHOLDS.AVERAGE) speedScore = SPEED_SCORES.HEALTHY.AVERAGE;
        else if (secondsPerItem < SPEED_THRESHOLDS.SLOW) speedScore = SPEED_SCORES.HEALTHY.SLOW;
        else speedScore = SPEED_SCORES.HEALTHY.VERY_SLOW;
      } else {
        if (secondsPerItem < SPEED_THRESHOLDS.VERY_GOOD) speedScore = SPEED_SCORES.UNHEALTHY.FAST;
        else if (secondsPerItem < SPEED_THRESHOLDS.AVERAGE) speedScore = SPEED_SCORES.UNHEALTHY.AVERAGE;
        else speedScore = SPEED_SCORES.UNHEALTHY.SLOW;
      }

      // Final TrustScore Calculation
      const rawScore = TRUST_SCORE_WEIGHTS.BASE + 
        (returnScore * TRUST_SCORE_WEIGHTS.RETURN) + 
        (loyaltyScore * TRUST_SCORE_WEIGHTS.LOYALTY) + 
        (basketScore * TRUST_SCORE_WEIGHTS.BASKET) + 
        (speedScore * TRUST_SCORE_WEIGHTS.SPEED);

      perf.csat = Math.max(TRUST_SCORE_RANGE.MIN, Math.min(TRUST_SCORE_RANGE.MAX, rawScore));
      
      // Store repeat metrics
      perf.repeatCustomers = repeatCustomers;
      perf.repeatRatio = repeatRatio;
      perf.totalCustomers = totalCustomers;
    });

    // Calculate loyalty (new customers registered today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    customers.forEach(c => {
      if (c.createdAt && c.registeredByEmployeeId) {
        const createdDate = new Date(c.createdAt);
        if (createdDate >= today && createdDate < tomorrow) {
          const eid = c.registeredByEmployeeId;
          if (perfMap[eid]) {
            perfMap[eid].loyalty += 1;
          }
        }
      }
    });

    // Build staff stats
    const staffStats: StaffStats[] = Object.entries(perfMap).map(([id, stats]) => {
      const employee = employees.find(e => e.id === id);
      return {
        id,
        name: employee?.name || (language === 'AR' ? 'بائع غير معروف' : 'Unknown Seller'),
        image: employee?.image,
        ...stats
      };
    });

    // Find champions (optimized single pass)
    const champions = staffStats.reduce((acc, staff) => {
      if (!acc.revenue || staff.revenue > acc.revenue.revenue) acc.revenue = staff;
      if (staff.count > 0 && staff.avgTime > 0) {
        if (!acc.speed || staff.avgTime < acc.speed.avgTime) acc.speed = staff;
      }
      if (!acc.invoices || staff.count > acc.invoices.count) acc.invoices = staff;
      if (!acc.csat || staff.csat > acc.csat.csat) acc.csat = staff;
      // Loyalty Master: Prioritize new registrations today
      const staffLoyaltyCount = staff.loyalty || 0;
      const currentLoyaltyCount = acc.loyalty?.loyalty || 0;
      if (!acc.loyalty || staffLoyaltyCount > currentLoyaltyCount) {
        acc.loyalty = staff;
      } else if (staffLoyaltyCount === currentLoyaltyCount && staffLoyaltyCount > 0) {
        // Tie-breaker: Use repeatRatio if registrations are tied and > 0
        if ((staff.repeatRatio || 0) > (acc.loyalty?.repeatRatio || 0)) {
          acc.loyalty = staff;
        }
      } else if (staffLoyaltyCount === 0 && (staff.repeatRatio || 0) > (acc.loyalty?.repeatRatio || 0)) {
        // Fallback: If no one registered anyone today, use repeatRatio
        acc.loyalty = staff;
      }
      return acc;
    }, {} as {
      revenue?: StaffStats;
      speed?: StaffStats;
      invoices?: StaffStats;
      csat?: StaffStats;
      loyalty?: StaffStats;
    });

    const revenueHero = champions.revenue;
    const speedMaster = champions.speed;
    const invoiceKing = champions.invoices;
    const csatHero = champions.csat;
    const loyaltyMaster = champions.loyalty;

    // Assign titles to staff stats
    staffStats.forEach(staff => {
      const titles: StaffStats['titles'] = [];
      if (revenueHero && staff.id === revenueHero.id) titles.push({ type: 'revenue', label: language === 'AR' ? 'بطل الإيرادات' : 'Revenue Hero', icon: 'emoji_events', color: 'amber' });
      if (speedMaster && staff.id === speedMaster.id) titles.push({ type: 'speed', label: language === 'AR' ? 'سيد السرعة' : 'Speed Master', icon: 'bolt', color: 'blue' });
      if (invoiceKing && staff.id === invoiceKing.id) titles.push({ type: 'invoices', label: language === 'AR' ? 'ملك الفواتير' : 'Invoice King', icon: 'article', color: 'emerald' });
      if (csatHero && staff.id === csatHero.id) titles.push({ type: 'csat', label: language === 'AR' ? 'بطل الرضا' : 'Satisfaction Hero', icon: 'star', color: 'violet' });
      if (loyaltyMaster && staff.id === loyaltyMaster.id) titles.push({ type: 'loyalty', label: language === 'AR' ? 'جامع الولاء' : 'Loyalty Master', icon: 'person_add', color: 'orange' });
      staff.titles = titles;
    });

    // Tooltip generator
    const getHeroTooltip = (hero: StaffStats | undefined, type: 'revenue' | 'speed' | 'invoices' | 'csat' | 'loyalty'): ChampionTooltipData => {
      if (!hero) return { 
        title: '', 
        value: 0, 
        calculations: [], 
        details: [],
        icon: '',
        iconColorClass: ''
      };
      
      if (type === 'revenue') {
        return {
          title: language === 'AR' ? 'بطل الإيرادات' : 'Revenue Hero',
          value: hero.revenue,
          isCurrency: true,
          valueLabel: language === 'AR' ? 'إجمالي' : 'Total',
          icon: 'payments',
          iconColorClass: 'text-amber-500',
          calculations: [
             { label: language === 'AR' ? 'عدد الفواتير' : 'Invoices', math: hero.count, isCurrency: false },
             { label: language === 'AR' ? 'متوسط الفاتورة' : 'Avg Invoice', math: hero.revenue / (hero.count || 1), isCurrency: true }
          ],
          details: [
            { icon: 'trending_up', label: language === 'AR' ? 'الأداء' : 'Performance', value: language === 'AR' ? 'الأعلى مبيعات' : 'Top Seller', isCurrency: false },
            { icon: 'inventory_2', label: language === 'AR' ? 'المنتجات' : 'Items', value: hero.items, isCurrency: false }
          ]
        };
      } else if (type === 'speed') {
        return {
          title: language === 'AR' ? 'سيد السرعة' : 'Speed Master',
          value: `${hero.avgTime.toFixed(1)}m`,
          isCurrency: false,
          valueLabel: language === 'AR' ? 'لكل فاتورة' : 'per invoice',
          icon: 'avg_time',
          iconColorClass: 'text-blue-500',
          calculations: [
            { label: language === 'AR' ? 'عدد الفواتير' : 'Invoices', math: hero.count, isCurrency: false },
             { label: language === 'AR' ? 'الإيرادات' : 'Revenue', math: hero.revenue, isCurrency: true }
          ],
          details: [
             { icon: 'bolt', label: language === 'AR' ? 'السرعة' : 'Speed', value: language === 'AR' ? 'الأسرع' : 'Fastest', isCurrency: false },
             { icon: 'check_circle', label: language === 'AR' ? 'الكفاءة' : 'Efficiency', value: language === 'AR' ? 'عالية' : 'High', isCurrency: false }
          ]
        };
      } else if (type === 'csat') {
        return {
          title: language === 'AR' ? 'بطل رضا العملاء' : 'CSAT Hero',
          value: hero.csat.toFixed(1),
          isCurrency: false,
          valueLabel: language === 'AR' ? 'نجوم' : 'stars',
          icon: 'star',
          iconColorClass: 'text-violet-500',
          calculations: [
            { label: language === 'AR' ? 'التقييمات' : 'Ratings', math: hero.count, isCurrency: false },
            { label: language === 'AR' ? 'الإيجابية' : 'Positivity', math: '98%', isCurrency: false }
          ],
          details: [
            { icon: 'sentiment_very_satisfied', label: language === 'AR' ? 'الخدمة' : 'Service', value: language === 'AR' ? 'ممتازة' : 'Excellent', isCurrency: false },
            { icon: 'thumb_up', label: language === 'AR' ? 'الثقة' : 'Trust', value: language === 'AR' ? 'عالية جداً' : 'Very High', isCurrency: false }
          ]
        };
      } else if (type === 'loyalty') {
        const repeatPercent = ((hero.repeatRatio || 0) * 100).toFixed(0);
        const totalCust = hero.totalCustomers || 0;
        const repeatCust = hero.repeatCustomers || 0;
        
        return {
          title: language === 'AR' ? 'سيد الولاء' : 'Loyalty Master',
          value: repeatPercent,
          isCurrency: false,
          valueLabel: language === 'AR' ? '% عملاء راجعين' : '% repeat',
          icon: 'person_add',
          iconColorClass: 'text-orange-500',
          calculations: [
            { label: language === 'AR' ? 'إجمالي العملاء' : 'Total Customers', math: totalCust, isCurrency: false },
            { label: language === 'AR' ? 'عملاء راجعين' : 'Repeat Customers', math: repeatCust, isCurrency: false }
          ],
          details: [
            { icon: 'group_add', label: language === 'AR' ? 'عملاء جدد' : 'New Registered', value: hero.loyalty, isCurrency: false },
            { icon: 'star', label: language === 'AR' ? 'التقييم' : 'Trust Score', value: hero.csat.toFixed(1), isCurrency: false }
          ]
        };
      } else {
        return {
          title: language === 'AR' ? 'ملك الفواتير' : 'Invoice King',
          value: hero.count,
          isCurrency: false,
          valueLabel: language === 'AR' ? 'فاتورة' : 'invoices',
          icon: 'receipt_long',
          iconColorClass: 'text-emerald-500',
          calculations: [
            { label: language === 'AR' ? 'الإيرادات' : 'Revenue', math: hero.revenue, isCurrency: true },
            { label: language === 'AR' ? 'المنتجات' : 'Items', math: hero.items, isCurrency: false }
          ],
          details: [
            { icon: 'local_activity', label: language === 'AR' ? 'النشاط' : 'Activity', value: language === 'AR' ? 'الأكثر نشاطاً' : 'Most Active', isCurrency: false },
            { icon: 'shopping_cart', label: language === 'AR' ? 'المنتجات' : 'Items', value: hero.items, isCurrency: false }
          ]
        };
      }
    };

    // Achievements
    const achievements: Achievement[] = [
      {
        id: 'revenue',
        type: 'revenue' as const,
        label: language === 'AR' ? 'بطل الإيرادات' : 'Revenue Hero',
        hero: revenueHero,
        tooltip: getHeroTooltip(revenueHero, 'revenue'),
        icon: 'emoji_events',
        color: 'amber'
      },
      {
        id: 'speed',
        type: 'speed' as const,
        label: language === 'AR' ? 'سيد السرعة' : 'Speed Master',
        hero: speedMaster,
        tooltip: getHeroTooltip(speedMaster, 'speed'),
        icon: 'bolt',
        color: 'blue'
      },
      {
        id: 'invoices',
        type: 'invoices' as const,
        label: language === 'AR' ? 'ملك الفواتير' : 'Invoice King',
        hero: invoiceKing,
        tooltip: getHeroTooltip(invoiceKing, 'invoices'),
        icon: 'article',
        color: 'emerald'
      },
      {
        id: 'csat',
        type: 'csat' as const,
        label: language === 'AR' ? 'بطل الرضا' : 'Satisfaction Hero',
        hero: csatHero,
        tooltip: getHeroTooltip(csatHero, 'csat'),
        icon: 'star',
        color: 'violet'
      },
      {
        id: 'loyalty',
        type: 'loyalty' as const,
        label: language === 'AR' ? 'جامع الولاء' : 'Loyalty Master',
        hero: loyaltyMaster,
        tooltip: getHeroTooltip(loyaltyMaster, 'loyalty'),
        icon: 'person_add',
        color: 'orange'
      }
    ];

    // Performance columns
    const performanceColumns: ColumnDef<StaffStats>[] = [
      {
        header: '',
        accessorKey: 'id', // just a key
        cell: ({ row, table }) => {
          const idx = table.getRowModel().rows.indexOf(row);
          if (idx > 2) return (
            <div className="flex justify-center">
              <span className="inline-flex items-center justify-center w-7 h-7 text-gray-300 dark:text-gray-700 text-[11px] font-bold">
                {idx + 1}
              </span>
            </div>
          );

          const textColors = [
            'text-amber-500 dark:text-amber-400 drop-shadow-[0_2px_2px_rgba(251,191,36,0.2)]', // Gold
            'text-slate-400 dark:text-slate-500 drop-shadow-[0_2px_2px_rgba(148,163,184,0.2)]', // Silver
            'text-orange-500 dark:text-orange-400 drop-shadow-[0_2px_2px_rgba(249,115,22,0.2)]' // Bronze
          ];

          return (
            <div className="flex justify-center">
              <span className={`text-3xl font-black italic tracking-tighter ${textColors[idx]} leading-none`}>
                {idx + 1}
              </span>
            </div>
          );
        },
        meta: { width: 40, align: 'center' }
      },
      {
        header: language === 'AR' ? 'الموظف' : 'Employee',
        accessorKey: 'name',
        cell: ({ row }) => {
          const staff = row.original;
          return (
            <div className="flex items-center gap-3 justify-start">
              {staff.image ? (
                <img src={staff.image} alt={staff.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-100 dark:border-gray-800" />
              ) : (
                <div className={`w-9 h-9 rounded-full bg-${color}-50 dark:bg-${color}-900/20 flex items-center justify-center text-${color}-600 dark:text-${color}-400 text-xs font-bold shrink-0 border border-${color}-100 dark:border-${color}-900/30`}>
                  {getInitials(staff.name)}
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-center gap-2 min-w-0">
                <span className="font-bold text-gray-900 dark:text-gray-100 truncate">{staff.name}</span>
                
                {staff.titles && staff.titles.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {staff.titles.map((title, i) => (
                      <div 
                        key={i}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-${title.color}-50 dark:bg-${title.color}-900/20 border border-${title.color}-100 dark:border-${title.color}-900/30 text-${title.color}-600 dark:text-${title.color}-400 shadow-sm`}
                        title={title.label}
                      >
                        <span className="material-symbols-rounded text-[12px]">{title.icon}</span>
                        <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">
                          {title.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        },
        meta: { width: 310, align: 'start' }
      },
      {
        header: language === 'AR' ? 'الإيرادات' : 'Revenue',
        accessorKey: 'revenue',
        cell: ({ getValue }) => (
          <span className="font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(getValue() as number, 'EGP', language === 'AR' ? 'ar' : 'en', 0)}
          </span>
        ),
        meta: { align: 'center' }
      },
      {
        header: language === 'AR' ? 'الفواتير' : 'Invoices',
        accessorKey: 'count',
        meta: { align: 'center' }
      },
      {
        header: language === 'AR' ? 'المنتجات' : 'Items',
        accessorKey: 'items',
        meta: { align: 'center' }
      },
      {
        header: language === 'AR' ? 'متوسط الوقت' : 'Avg Time',
        accessorKey: 'avgTime',
        cell: ({ getValue }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {(getValue() as number).toFixed(1)} min
          </span>
        ),
        meta: { align: 'center', smartDate: false }
      },
      {
        header: language === 'AR' ? 'الرضا' : 'CSAT',
        accessorKey: 'csat',
        cell: ({ getValue }) => (
          <div className="flex items-center justify-center gap-1 text-violet-500 font-bold">
            <span className="material-symbols-rounded text-sm">star</span>
            {(getValue() as number).toFixed(1)}
          </div>
        ),
        meta: { align: 'center', smartDate: false }
      },
      {
        header: language === 'AR' ? 'الولاء' : 'Loyalty',
        accessorKey: 'repeatRatio',
        cell: ({ getValue }) => (
          <div className="flex items-center justify-center gap-1 text-orange-500 font-bold">
            <span className="material-symbols-rounded text-sm">cached</span>
            {((getValue() as number || 0) * 100).toFixed(0)}%
          </div>
        ),
        meta: { align: 'center', smartDate: false }
      }
    ];

    return { staffStats, achievements, performanceColumns };
  }, [todaysSales, employees, customers, language, color, getInitials]);
};
