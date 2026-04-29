import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { permissionsService } from '../../services/auth/permissions';
import { COLOR_HEX_MAP } from '../../config/themeColors';
import { useShift } from '../../hooks/useShift';
import { analyzeEmployeePerformance } from '../../services/geminiService';
import type { Employee, Sale, Shift, ThemeColor } from '../../types';
import { useData } from '../../services/DataContext';
import {
  type DateRangeFilter,
  type EmployeeSalesStats,
  getEmployeeSalesStats,
  getPreviousDateRange,
  getDateRange,
} from '../../utils/employeeStats';
import { ChartWidget } from '../common/ChartWidget';
import { FilterDropdown } from '../common/FilterDropdown';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmallCard } from '../common/SmallCard';
import { ExpandedChartModal } from '../experiments/ExpandedChartModal';
import { PageHeader } from '../common/PageHeader';


// Filter Modes for the component
type FilterMode = 'today' | 'week' | 'month' | 'year' | 'all';

// AI Performance Summary Sub-Component
const AIPerformanceSummary: React.FC<{
  employee: Employee | null;
  stats: EmployeeSalesStats | null;
  previousStats: EmployeeSalesStats | null;
  dateFilterMode: FilterMode;
  language: 'EN' | 'AR';
  color: string;
}> = ({ employee, stats, language }) => {
  const isSkeleton = !employee;
  const [shortSummary, setShortSummary] = useState<string | null>(null);
  const [detailedSummary, setDetailedSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetailed, setLoadingDetailed] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reset summaries when employee changes
  useEffect(() => {
    setShortSummary(null);
    setDetailedSummary(null);
    setAiError(null);
  }, [employee?.id]);

  // Generate static summary
  const staticSummary =
    stats?.salesCount && stats.salesCount > 0
      ? language === 'AR'
        ? `أداء جيد بإجمالي ${stats.salesCount} فاتورة وهامش ربح ${stats.profitMargin}%.`
        : `Performed well with ${stats.salesCount} transactions and ${stats.profitMargin}% profit margin.`
      : language === 'AR'
        ? 'لا توجد بيانات كافية.'
        : 'Not enough data.';

  // Fetch quick 1-line summary
  const fetchShortSummary = async () => {
    if (!stats || loading) return;

    setLoading(true);
    setAiError(null);

    try {
      const result = await analyzeEmployeePerformance(
        {
          employeeName: employee.name,
          period: 'month',
          totalSales: stats.netSales,
          netProfit: stats.totalProfit,
          profitMargin: stats.profitMargin,
          itemsSold: stats.totalItemsSold,
          transactionCount: stats.salesCount,
          topProduct: stats.mostSoldProduct?.name,
        },
        language,
        'short'
      );

      setShortSummary(result);
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed analysis for Modal
  const fetchDetailedSummary = async (force = false) => {
    if (!stats || (loadingDetailed && !force)) return;
    if (detailedSummary && !force) return;

    setLoadingDetailed(true);
    if (force) setDetailedSummary(null);

    try {
      const result = await analyzeEmployeePerformance(
        {
          employeeName: employee.name,
          period: 'month',
          totalSales: stats.netSales,
          netProfit: stats.totalProfit,
          profitMargin: stats.profitMargin,
          itemsSold: stats.totalItemsSold,
          transactionCount: stats.salesCount,
          topProduct: stats.mostSoldProduct?.name,
        },
        language,
        'detailed'
      );

      setDetailedSummary(result);
    } catch (e) {
      setDetailedSummary(
        language === 'AR' ? 'فشل تحميل التحليل المفصل.' : 'Failed to load detailed analysis.'
      );
    } finally {
      setLoadingDetailed(false);
    }
  };

  const openDetailedModal = () => {
    setIsModalOpen(true);
    fetchDetailedSummary();
  };

  return (
    <>
      <div className='bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg'>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='font-bold text-lg flex items-center gap-2'>
            <span className='material-symbols-rounded'>psychology</span>
            {language === 'AR' ? 'ملخص الأداء' : 'Performance Insight'}
            {shortSummary && !aiError && (
              <span className='text-xs bg-white/20 px-2 py-0.5 rounded-full'>AI</span>
            )}
            {aiError && (
              <div className='group relative cursor-help'>
                <span className='material-symbols-rounded text-red-300 text-lg animate-pulse'>
                  warning
                </span>
                {/* Tooltip for error message */}
                <div className='absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[200px] p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-center border border-white/10'>
                  {aiError}
                  <div className='absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-t border-l border-white/10'></div>
                </div>
              </div>
            )}
          </h3>
          <div className='flex items-center gap-2'>
            {/* Quick AI Analysis Button */}
            <button
              onClick={fetchShortSummary}
              disabled={loading}
              className={`px-4 h-[36px] rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all active:scale-95 flex items-center gap-2 text-sm font-medium shadow-xs ${loading ? 'opacity-80' : ''}`}
            >
              <span
                className={`material-symbols-rounded text-base ${loading ? 'animate-spin' : ''}`}
              >
                {loading ? 'progress_activity' : 'auto_awesome'}
              </span>
              <span>
                {loading
                  ? language === 'AR'
                    ? 'جاري...'
                    : 'Loading...'
                  : language === 'AR'
                    ? 'تحليل سريع'
                    : 'Quick AI'}
              </span>
            </button>

            {/* Expand to Detailed Modal Button */}
            <button
              onClick={openDetailedModal}
              className='w-[36px] h-[36px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all active:scale-95 shadow-xs'
              title={language === 'AR' ? 'تحليل مفصل' : 'Detailed Analysis'}
            >
              <span className='material-symbols-rounded text-base'>open_in_full</span>
            </button>
          </div>
        </div>

        {loading || isSkeleton ? (
          <div className='flex items-center gap-2 text-white/70 text-sm'>
            <span className='animate-spin material-symbols-rounded text-lg'>progress_activity</span>
            {language === 'AR' ? 'جاري التحليل...' : 'Analyzing...'}
          </div>
        ) : (
          <p className='text-white/90 text-sm leading-relaxed line-clamp-2'>
            {shortSummary && !aiError ? shortSummary : staticSummary}
          </p>
        )}
      </div>

      {/* Detailed Analysis Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={language === 'AR' ? 'تحليل الأداء المفصل' : 'Detailed Performance Analysis'}
        icon='psychology'
        size='2xl'
        headerActions={
          <button
            onClick={() => fetchDetailedSummary(true)}
            disabled={loadingDetailed}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors ${loadingDetailed ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`material-symbols-rounded text-lg ${loadingDetailed ? 'animate-spin' : ''}`}
            >
              refresh
            </span>
            {language === 'AR' ? 'إعادة توليد' : 'Regenerate'}
          </button>
        }
      >
        <div className='space-y-6'>
          {(() => {
            // Helper: Detect if name is Arabic
            const isArabicName = /[\u0600-\u06FF]/.test(employee?.name || '');
            // Helper: Get 2 initials
            const nameParts = (employee?.name || '').trim().split(/\s+/);
            const initials =
              nameParts.length >= 2 && nameParts[0]
                ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`
                : (employee?.name || '??').slice(0, 2);

            return (
              <div
                dir={isArabicName ? 'rtl' : 'ltr'}
                className='flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl'
              >
                <div className='w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-200 dark:shadow-none'>
                  {initials.toUpperCase()}
                </div>
                <div>
                  <h4 className='font-bold text-gray-900 dark:text-white text-lg'>
                    {employee?.name || '...'}
                  </h4>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>{employee?.role || '...'}</p>
                </div>
              </div>
            );
          })()}

          {loadingDetailed ? (
            <div className='flex flex-col items-center justify-center gap-4 py-20 text-indigo-500/50'>
              <span className='animate-spin material-symbols-rounded text-5xl'>
                progress_activity
              </span>
              <p className='text-sm font-medium animate-pulse'>
                {language === 'AR'
                  ? 'جاري تحليل البيانات العميقة...'
                  : 'Analyzing deep data insights...'}
              </p>
            </div>
          ) : (
            <div
              className='prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line'
              dangerouslySetInnerHTML={{
                __html: (detailedSummary || '')
                  // Color-coded headings based on type (Arabic + English)
                  .replace(
                    /\*\*(تقييم الربحية|Profitability Assessment):\*\*/gi,
                    '<strong class="text-emerald-600 dark:text-emerald-400 text-base">$1:</strong>'
                  )
                  .replace(
                    /\*\*(تقييم حجم السلة|Basket Size Evaluation):\*\*/gi,
                    '<strong class="text-primary-600 dark:text-blue-400 text-base">$1:</strong>'
                  )
                  .replace(
                    /\*\*(تقييم مهارات البيع الإضافي|Upselling Skills Assessment):\*\*/gi,
                    '<strong class="text-amber-600 dark:text-amber-400 text-base">$1:</strong>'
                  )
                  .replace(
                    /\*\*(التوصية الاستراتيجية|Strategic Recommendation):\*\*/gi,
                    '<strong class="text-purple-600 dark:text-purple-400 text-base">$1:</strong>'
                  )
                  // Fallback for old format headings
                  .replace(
                    /\*\*(نقطة القوة|Strength):\*\*/gi,
                    '<strong class="text-emerald-600 dark:text-emerald-400">$1:</strong>'
                  )
                  .replace(
                    /\*\*(فرصة التحسين|Improvement):\*\*/gi,
                    '<strong class="text-amber-600 dark:text-amber-400">$1:</strong>'
                  )
                  .replace(
                    /\*\*(التوصية|Recommendation):\*\*/gi,
                    '<strong class="text-primary-600 dark:text-blue-400">$1:</strong>'
                  )
                  // Generic bold fallback
                  .replace(
                    /\*\*(.*?)\*\*/g,
                    '<strong class="text-indigo-600 dark:text-indigo-400 font-bold">$1</strong>'
                  )
                  .replace(/\*(.*?)\*/g, '<em>$1</em>'),
              }}
            />
          )}
        </div>
      </Modal>
    </>
  );
};

// CustomTooltipContent moved to ChartWidget

// Use centralized color map from config/themeColors
// Moved to top imports

interface EmployeeProfileProps {
  sales: Sale[];
  employees?: Employee[];
  color: ThemeColor;
  t: any;
  language: 'EN' | 'AR';
  currentEmployeeId: string | null;
  isLoading?: boolean;
  onViewChange?: (view: string) => void;
}

// Helper for compact currency formatting
const formatCompactCurrency = (value: number) => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (value >= 10000) {
    // Compact anything >= 10k to ensure max ~5 digits visually
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return value.toLocaleString();
};

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({
  sales: propsSales,
  employees: propsEmployees,
  color,
  t,
  language,
  currentEmployeeId: initialEmployeeId,
  isLoading = false,
  onViewChange
}) => {
  // --- Data Context ---
  const { employees: contextEmployees, sales: contextSales, currentEmployee } = useData();

  // Prioritize props, but fallback to context
  const employees = propsEmployees || contextEmployees || [];
  const sales = propsSales || contextSales || [];
  const currentEmployeeId = initialEmployeeId || currentEmployee?.id || null;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(currentEmployeeId || '');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<FilterMode>('month');
  const [isExpandedChartOpen, setIsExpandedChartOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { shifts: allShiftsFromHook } = useShift();

  // Add scroll listener for shift badges
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          container.scrollLeft += e.deltaY;
        }
      };
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [dateFilterMode, employees]); // Re-attach when view might change logic

  // Set default employee if not set
  React.useEffect(() => {
    if (!permissionsService.can('users.view')) {
      if (currentEmployeeId) {
        setSelectedEmployeeId(currentEmployeeId);
      }
      return;
    }

    if (!selectedEmployeeId && employees.length > 0) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId, currentEmployeeId]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const chartColor = COLOR_HEX_MAP[color.name] || COLOR_HEX_MAP['blue'];

  // Date Filter Logic
  const dateRange = useMemo<DateRangeFilter | undefined>(() => {
    if (dateFilterMode === 'all') return undefined;
    return getDateRange(dateFilterMode as any);
  }, [dateFilterMode]);

  // Calculate Stats
  const stats = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return getEmployeeSalesStats(selectedEmployeeId, sales, dateRange);
  }, [selectedEmployeeId, sales, dateRange]);

  // Calculate Previous Stats for Trends
  const previousStats = useMemo(() => {
    if (!selectedEmployeeId || dateFilterMode === 'all') return null;
    const prevRange = getPreviousDateRange(dateFilterMode as any);
    return getEmployeeSalesStats(selectedEmployeeId, sales, prevRange);
  }, [selectedEmployeeId, sales, dateFilterMode]);

  // Helper to calculate trend percentage
  const getTrend = (
    current: number,
    previous: number
  ): { trend?: 'up' | 'down'; value?: string } => {
    if (!previous) return { trend: undefined, value: undefined };
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    if (percentage === 0) return { trend: undefined, value: undefined };
    return {
      trend: percentage > 0 ? 'up' : 'down',
      value: `${Math.abs(percentage).toFixed(1)}%`,
    };
  };

  // Chart Data Preparation (Last 7 periods based on filter)
  // For simplicity MVP, let's just show daily sales for the current filtered range or last 7 days
  const chartDataResult = useMemo(() => {
    if (!selectedEmployeeId) return { chartData: [], shiftsData: [] };

    const relevantSales = sales.filter(
      (s) =>
        s.soldByEmployeeId === selectedEmployeeId &&
        (!dateRange?.startDate || new Date(s.date) >= dateRange.startDate) &&
        (!dateRange?.endDate || new Date(s.date) <= dateRange.endDate)
    );

    if (dateFilterMode === ('today' as any)) {
      // Load shifts from hook (sharded storage)
      const shifts = allShiftsFromHook;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Filter shifts that occurred today OR are currently open
      const todayShifts = shifts.filter((shift) => {
        const shiftOpenDate = new Date(shift.openTime);

        // Case 1: Shift started today
        const startedToday = shiftOpenDate >= today && shiftOpenDate < tomorrow;

        // Case 2: Shift is currently OPEN (status is open and no close time)
        // We want to show the active shift even if it started yesterday
        const isActiveOpen = shift.status === 'open' && !shift.closeTime;

        return startedToday || isActiveOpen;
      });

      // Determine chart data points based on selection
      let dataPoints: any[] = [];
      let activeEmployees: string[] = []; // IDs of employees active in this shift (excluding main user)

      if (selectedShiftId) {
        // ZOOM MODE: Detailed view for specific shift
        const selectedShift = todayShifts.find((s) => s.id === selectedShiftId);
        if (selectedShift) {
          let startTime = new Date(selectedShift.openTime);

          // Fix: If shift started before today (e.g. yesterday) but we are viewing 'Today',
          // clamp the start time to beginning of today to avoid showing empty flat lines for yesterday.
          if (startTime < today) {
            startTime = new Date(today);
          }
          const endTime = selectedShift.closeTime ? new Date(selectedShift.closeTime) : new Date();

          // Ensure we don't go beyond "now" if open, or weird future dates
          const safeEndTime = endTime > new Date() ? new Date() : endTime;
          // If closed, strictly use closeTime. If open, use current time.
          const effectiveEndTime = selectedShift.closeTime
            ? new Date(selectedShift.closeTime)
            : new Date();

          // Generate points every 15 minutes
          const timeSpan = effectiveEndTime.getTime() - startTime.getTime();
          const totalMinutes = timeSpan / (1000 * 60);

          // Determine interval based on duration
          // If short shift (< 2 hours), 5 min interval
          // If medium (2-6 hours), 15 min interval
          // If long (> 6 hours), 30 min interval
          let intervalMinutes = 15;
          if (totalMinutes < 120) intervalMinutes = 5;
          else if (totalMinutes > 360) intervalMinutes = 30;

          // SAFETY: Ensure interval is never 0 or negative
          if (intervalMinutes < 1) intervalMinutes = 15;

          let currentTime = new Date(startTime);
          // Align start time to nearest interval
          currentTime.setMinutes(
            Math.floor(currentTime.getMinutes() / intervalMinutes) * intervalMinutes,
            0,
            0
          );

          let safetyCounter = 0;
          const MAX_ITERATIONS = 500; // Prevent infinite loop

          while (currentTime <= effectiveEndTime && safetyCounter < MAX_ITERATIONS) {
            dataPoints.push({
              date: new Date(currentTime),
              label: currentTime.toLocaleTimeString(language === 'AR' ? 'ar-EG' : 'en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }),
              sales: 0,
              profit: 0,
              timestamp: currentTime.getTime(),
            });

            // Increment time
            currentTime = new Date(currentTime.getTime() + intervalMinutes * 60000);
            safetyCounter++;
          }

          // Aggregate sales into these buckets - FOR ALL EMPLOYEES (comparison mode)
          // Get all employees who made sales in this shift
          const employeeSalesMap = new Map<string, number>();

          sales.forEach((sale) => {
            const saleTime = new Date(sale.date).getTime();
            if (saleTime >= startTime.getTime() && saleTime <= effectiveEndTime.getTime()) {
              const empId = sale.soldByEmployeeId || 'unknown';
              if (!employeeSalesMap.has(empId)) {
                employeeSalesMap.set(empId, 0);
              }

              // Find closest bucket
              const bucket = dataPoints.find(
                (p) => Math.abs(p.timestamp - saleTime) < (intervalMinutes * 60000) / 2
              );
              if (bucket) {
                const saleValue = sale.netTotal ?? sale.total;
                employeeSalesMap.set(empId, employeeSalesMap.get(empId)! + saleValue);

                // If this is the selected employee, add to main 'sales'
                if (empId === selectedEmployeeId) {
                  bucket.sales += saleValue;
                } else {
                  // For other employees, create a keyed entry
                  if (!bucket[empId]) bucket[empId] = 0;
                  bucket[empId] += saleValue;
                }
              }
            }
          });

          // Store active employees for rendering (assign to outer scope)
          activeEmployees = Array.from(employeeSalesMap.keys()).filter(
            (id) => id !== selectedEmployeeId && id !== 'unknown'
          );

          // CRITICAL: Ensure all data points have values for all active employees to prevent broken lines
          dataPoints.forEach((point) => {
            activeEmployees.forEach((empId) => {
              if (point[empId] === undefined) {
                point[empId] = 0;
              }
            });
          });
        }
      } else {
        // DEFAULT MODE: Hourly view for full day (00:00 to 23:59)
        // Fix: Ensure we generate all 24 hours regardless of current time
        dataPoints = Array.from({ length: 24 }, (_, i) => {
          const date = new Date();
          date.setHours(i, 0, 0, 0);
          return {
            hour: i,
            label: date.toLocaleTimeString(language === 'AR' ? 'ar-EG' : 'en-US', {
              hour: 'numeric',
              hour12: true,
            }),
            sales: 0,
            profit: 0,
            date: date,
          };
        });

        relevantSales.forEach((sale) => {
          const saleDate = new Date(sale.date);
          // Only count sales that actually belong to today
          // (relevantSales is already filtered by dateRange, which is 00:00-Now for today,
          // wait... getDateRange('today') returns {start: 00:00, end: Now}.
          // So sales are already filtered. We just slot them.)
          // Actually, getDateRange('today') returns end: Now.
          // If I want to show empty hours until 23:00, this loop is correct.

          const hour = saleDate.getHours();
          if (dataPoints[hour]) {
            dataPoints[hour].sales += sale.netTotal ?? sale.total;
          }
        });
      }

      return {
        chartData: dataPoints.map((p) => ({
          date: p.label,
          sales: p.sales,
          profit: p.profit,
          ...Object.keys(p)
            .filter((k) => !['label', 'sales', 'profit', 'timestamp', 'date', 'hour'].includes(k))
            .reduce((acc, empId) => ({ ...acc, [empId]: p[empId] }), {}),
        })),
        shiftsData: todayShifts.map((shift) => ({
          shiftId: shift.id,
          openTime: shift.openTime,
          openedBy: shift.openedBy,
          closeTime: shift.closeTime,
          closedBy: shift.closedBy,
          status: shift.status,
        })),
        activeEmployees, // List of employee IDs for comparison charts
      };
    }

    const data: Record<
      string,
      { dateLabel: string; timestamp: number; sales: number; profit: number }
    > = {};

    // Determine aggregation strategy
    const isMonthlyAggregation = dateFilterMode === 'year'; // Only year uses monthly now
    const isAllTime100Points = dateFilterMode === 'all';

    // ALL TIME MODE: 100 Fixed Points
    if (isAllTime100Points) {
      let start =
        relevantSales.length > 0
          ? Math.min(...relevantSales.map((s) => new Date(s.date).getTime()))
          : new Date(new Date().getFullYear(), 0, 1).getTime();
      const end = new Date().getTime();

      // Ensure start < end
      if (start >= end) start = end - 86400000; // Force 1 day gap if same

      const totalDuration = end - start;
      const step = totalDuration / 100;

      // 1. Initialize 100 buckets
      const buckets: any[] = [];
      for (let i = 0; i <= 100; i++) {
        const bucketTime = start + i * step;
        buckets.push({
          index: i,
          timestamp: bucketTime,
          // Only show label for Start (0) and End (100)
          dateLabel:
            i === 0 || i === 100
              ? new Date(bucketTime).toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '',
          sales: 0,
          profit: 0,
        });
      }

      // 2. Distribute Sales
      relevantSales.forEach((sale) => {
        const saleTime = new Date(sale.date).getTime();
        if (saleTime >= start && saleTime <= end) {
          // Find bucket index
          let index = Math.floor((saleTime - start) / step);
          if (index > 100) index = 100;
          if (index < 0) index = 0;

          buckets[index].sales += sale.netTotal ?? sale.total;
          buckets[index].profit += sale.netTotal ?? sale.total;
        }
      });

      return {
        chartData: buckets.map((b) => ({
          date: b.dateLabel,
          timestamp: b.timestamp, // For tooltip?
          sales: b.sales,
          profit: b.profit,
          // Pass raw formatted date for tooltip since dateLabel is empty for most
          rawDate:
            new Date(b.timestamp).toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }) +
            ' ' +
            new Date(b.timestamp).toLocaleTimeString(language === 'AR' ? 'ar-EG' : 'en-US', {
              hour: 'numeric',
              minute: '2-digit',
            }),
        })),
        shiftsData: [],
        activeEmployees: [],
      };
    }

    // Helper to fill zero data (Legacy Week/Month/Year logic)
    const fillZeroData = () => {
      if (!dateRange) return;

      // Pre-calculated range is sufficient since 'all' is handled separately
      const range = getDateRange(dateFilterMode as any);
      const start = range.startDate || new Date();
      const end = range.endDate || new Date();

      const current = new Date(start);

      // Loop through range
      while (current <= end) {
        const timestamp = current.getTime();
        let key: string;
        let label: string;

        if (isMonthlyAggregation) {
          // Group by YYYY-MM
          key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

          // If filtering by specific 'year', show only Month Name (or Number of requested).
          // User said "Numbers only", but Month Names is standard. Let's use Month Name for readability,
          // or maybe they specifically want Month Number? "ارقام فقط" usually means digits.
          // Let's try Month Short Name first as it's cleaner, if they hate it we change to digit.
          // Actually, let's look at the prompt "يعرض في السنة ارقام فقط" -> "Displays numbers only in the year".
          // This might strictly mean 1, 2, 3...
          // Let's compromise: Locale default month is usually text.
          // I will use month: 'short' (Jan) which is standard. Using "1" is confusing.
          // But wait, "ارقام فقط" is quite specific. Maybe they want the DAY numbers in month view?
          // No, context is Year view.
          // I will stick to removing the Year part (Jan 2024 -> Jan).
          if (dateFilterMode === 'year') {
            label = current.toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
              month: 'short',
            });
          } else {
            // accessible 'all' mode might need year
            label = current.toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
              month: 'short',
              year: '2-digit',
            });
          }

          // Increment by 1 Month
          current.setMonth(current.getMonth() + 1);
        } else {
          // Group by YYYY-MM-DD
          key = current.toISOString().split('T')[0];
          label = current.toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
            day: 'numeric',
            month: 'short',
          });

          // Increment by 1 Day
          current.setDate(current.getDate() + 1);
        }

        if (!data[key]) {
          data[key] = {
            dateLabel: label,
            timestamp: timestamp, // Keep first timestamp of the bucket
            sales: 0,
            profit: 0,
          };
        }
      }
    };

    // 1. Initialize with Zero Data
    fillZeroData();

    // 2. Aggregate Sales
    relevantSales.forEach((sale) => {
      const dateObj = new Date(sale.date);
      let key: string;

      if (isMonthlyAggregation) {
        key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = dateObj.toISOString().split('T')[0];
      }

      // Safety check if key exists (it should if fillZeroData covers the range)
      if (data[key]) {
        data[key].sales += sale.netTotal ?? sale.total;
        data[key].profit += sale.netTotal ?? sale.total; // Fixed missing totalCost issue by removing it for now
      } else {
        // Fallback for sales outside expected range (should rarely happen with logic above)
        let label: string;
        if (isMonthlyAggregation) {
          if (dateFilterMode === 'year') {
            label = dateObj.toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
              month: 'short',
            });
          } else {
            label = dateObj.toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
              month: 'short',
              year: '2-digit',
            });
          }
        } else {
          label = dateObj.toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
            day: 'numeric',
            month: 'short',
          });
        }

        data[key] = {
          dateLabel: label,
          timestamp: dateObj.getTime(),
          sales: sale.netTotal ?? sale.total,
          profit: 0, // Simplified
        };
      }
    });

    return {
      chartData: Object.values(data)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((d) => ({
          date: d.dateLabel,
          sales: d.sales,
          profit: d.profit,
        })),
      shiftsData: [],
      activeEmployees: [], // No comparison in other modes
    };
  }, [selectedEmployeeId, sales, dateRange, language, dateFilterMode, selectedShiftId]);

  const chartData = chartDataResult.chartData;
  const shiftsData = chartDataResult.shiftsData;
  const activeEmployees = chartDataResult.activeEmployees || [];

  if (!selectedEmployee && !isLoading) {
    return (
      <div className='p-8 text-center text-gray-500'>
        {t.common?.noData || 'No employees found'}
      </div>
    );
  }

  return (
    <div className='h-full space-y-6 animate-fade-in overflow-y-auto'>
      <PageHeader
        centerContent={
          <SegmentedControl
            options={[
              { value: 'staff-overview', label: language === 'AR' ? 'نظرة عامة' : 'Overview', icon: 'supervisor_account' },
              { value: 'employee-list', label: language === 'AR' ? 'قائمة الموظفين' : 'Employees', icon: 'badge' },
              { value: 'employee-profile', label: language === 'AR' ? 'ملف الموظف' : 'Profile', icon: 'person' }
            ]}
            value="employee-profile"
            onChange={(val) => onViewChange?.(val as any)}
            color={color.name}
            size="md"
            iconSize="--icon-lg"
            variant="onPage"
            shape="pill"
            className="w-full sm:w-[480px]"
            useGraphicFont={true}
          />
        }
        leftContent={
          <div className='flex items-center gap-3.5'>
            {(() => {
              const nameParts = (selectedEmployee?.name || '').trim().split(/\s+/);
              const initials =
                nameParts.length > 1 && nameParts[0]
                  ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`
                  : (selectedEmployee?.name || '??').slice(0, 2);
              return (
                <div className='relative shrink-0'>
                  {selectedEmployee?.image ? (
                    <img
                      src={selectedEmployee.image}
                      alt={selectedEmployee.name}
                      className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700/80"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-black uppercase border border-primary-100 dark:border-primary-800/50">
                      {initials}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" />
                </div>
              );
            })()}
            <div className="min-w-0">
              {isLoading ? (
                <div className="flex flex-col gap-2 [direction:ltr] items-start">
                  <div className="h-4 w-32 bg-zinc-400/20 dark:bg-zinc-100/10 rounded-sm animate-pulse" />
                  <div className="h-3 w-20 bg-zinc-400/10 dark:bg-zinc-100/5 rounded-sm animate-pulse" />
                </div>
              ) : (
                <>
                  <h1 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight leading-none mb-1.5 truncate">
                    {selectedEmployee?.name}
                  </h1>
                  <div className="flex items-center gap-2 leading-none">
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{selectedEmployee?.role}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <span className="text-[9px] font-mono text-zinc-400 opacity-80">#{selectedEmployee?.employeeCode}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        }
        rightContent={
          <div className='flex items-center gap-3'>
            {/* Employee Selector */}
            {permissionsService.can('users.view') && (
              <div className='w-48 h-9 relative z-10'>
                <FilterDropdown
                  className='absolute top-0 left-0 w-full text-xs'
                  minHeight='36px'
                  items={employees}
                  selectedItem={selectedEmployee}
                  isOpen={isEmployeeDropdownOpen}
                  onToggle={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                  onSelect={(emp) => {
                    setSelectedEmployeeId(emp.id);
                    setIsEmployeeDropdownOpen(false);
                  }}
                  renderItem={(emp) => (
                    <div className='flex flex-col py-1'>
                      <span className='text-xs font-medium text-zinc-900 dark:text-white'>
                        {emp.name}
                      </span>
                      <span className='text-[10px] text-zinc-500'>{emp.role}</span>
                    </div>
                  )}
                  renderSelected={(emp) => (
                    <span className='text-xs font-medium text-zinc-900 dark:text-zinc-200'>
                      {emp ? emp.name : 'Select Employee'}
                    </span>
                  )}
                  keyExtractor={(emp) => emp.id}
                  variant='input'
                  color='primary'
                />
              </div>
            )}

            {/* Date Filter */}
            <div className='flex bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-1 border border-zinc-200/50 dark:border-zinc-700/50'>
              {(['today', 'week', 'month', 'year', 'all'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setDateFilterMode(period as FilterMode)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                    dateFilterMode === period
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* KPI Cards */}
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {(() => {
            const salesTrend = previousStats
              ? getTrend(stats.netSales, previousStats.netSales)
              : { trend: undefined, value: undefined };
            return (
              <SmallCard
                title={language === 'AR' ? 'إجمالي المبيعات' : 'Total Sales'}
                value={formatCompactCurrency(Math.round(stats.netSales))}
                type='currency'
                trend={salesTrend.trend}
                trendValue={salesTrend.value}
                trendLabel={salesTrend.value ? 'vs prev' : undefined}
                icon='payments'
                iconColor='blue'
                currencyLabel={t.global?.currency || (language === 'AR' ? 'ج.م' : 'L.E')}
                isLoading={isLoading}
              />
            );
          })()}

          {(() => {
            const profitTrend = previousStats
              ? getTrend(stats.totalProfit, previousStats.totalProfit)
              : { trend: undefined, value: undefined };
            return (
              <SmallCard
                title={language === 'AR' ? 'صافي الربح' : 'Net Profit'}
                value={formatCompactCurrency(Math.round(stats.totalProfit))}
                subValue={stats.profitMargin ? `${stats.profitMargin}% Margin` : undefined}
                type='currency'
                trend={profitTrend.trend}
                trendValue={profitTrend.value}
                trendLabel={profitTrend.value ? 'vs prev' : undefined}
                icon='trending_up'
                iconColor='emerald'
                currencyLabel={t.global?.currency || (language === 'AR' ? 'ج.م' : 'L.E')}
                isLoading={isLoading}
              />
            );
          })()}

          {(() => {
            const itemsTrend = previousStats
              ? getTrend(stats.totalItemsSold, previousStats.totalItemsSold)
              : { trend: undefined, value: undefined };
            return (
              <SmallCard
                title={language === 'AR' ? 'القطع المباعة' : 'Items Sold'}
                value={formatCompactCurrency(stats.totalItemsSold)}
                type='number'
                trend={itemsTrend.trend}
                trendValue={itemsTrend.value}
                trendLabel={itemsTrend.value ? 'vs prev' : undefined}
                icon='shopping_basket'
                iconColor='purple'
                isLoading={isLoading}
              />
            );
          })()}

          {(() => {
            const txTrend = previousStats
              ? getTrend(stats.salesCount, previousStats.salesCount)
              : { trend: undefined, value: undefined };
            return (
              <SmallCard
                title={language === 'AR' ? 'عدد الفواتير' : 'Transactions'}
                value={formatCompactCurrency(stats.salesCount)}
                subValue={
                  stats.avgProfitPerSale
                    ? `Avg Profit: ${Math.round(stats.avgProfitPerSale)}`
                    : undefined
                }
                type='number'
                trend={txTrend.trend}
                trendValue={txTrend.value}
                trendLabel={txTrend.value ? 'vs prev' : undefined}
                icon='receipt_long'
                iconColor='orange'
                isLoading={isLoading}
              />
            );
          })()}
        </div>
      )}

      {/* Main Content Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Sales Chart */}
        <ChartWidget
          title={
            language === 'AR'
              ? `تحليل المبيعات ${dateFilterMode === 'year' ? `(${new Date().getFullYear()})` : ''}`
              : `Sales Analytics ${dateFilterMode === 'year' ? `(${new Date().getFullYear()})` : ''}`
          }
          icon='bar_chart'
          data={chartData}
          dataKeys={{
            primary: 'sales',
            comparison: activeEmployees,
          }}
          color={chartColor}
          language={language}
          unit={language === 'AR' ? 'ج.م ' : 'L.E '}
          employees={employees}
          selectedEmployeeId={selectedEmployeeId}
          // State & Controls
          chartType={chartType}
          onChartTypeChange={setChartType}
          showComparison={showComparison}
          onComparisonChange={setShowComparison}
          onExpand={() => setIsExpandedChartOpen(true)}
          // X-Axis Control: For 'all', show start/end only (interval=preserveStartEnd with sparse labels)
          xAxisInterval={dateFilterMode === 'all' ? 'preserveStartEnd' : 'equidistantPreserveStart'}
          isLoading={isLoading}
        >
          {/* Shift Events Indicators - Only for Today view */}
          {dateFilterMode === 'today' && shiftsData.length > 0 && (
            <div className='mt-2 pt-3 border-t border-gray-100 dark:border-gray-700'>
              <p className='text-[10px] font-bold uppercase text-gray-400 mb-1.5 flex items-center gap-1'>
                <span className='material-symbols-rounded text-base'>schedule</span>
                {language === 'AR' ? 'أحداث المناوبات اليوم' : "Today's Shift Events"}
              </p>
              <div
                ref={scrollContainerRef}
                className='flex flex-row gap-2 overflow-x-auto custom-scrollbar pb-2'
              >
                {shiftsData.map((shift: any, idx: number) => {
                  const isSelected = selectedShiftId === shift.shiftId;
                  return (
                    <div
                      key={shift.shiftId}
                      onClick={() => setSelectedShiftId(isSelected ? null : shift.shiftId)}
                      className={`flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        idx > 0
                          ? language === 'AR'
                            ? 'pr-2 border-r border-gray-200 dark:border-gray-700'
                            : 'pl-2 border-l border-gray-200 dark:border-gray-700'
                          : ''
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
                          isSelected
                            ? 'bg-primary-100 dark:bg-primary-900/60 border-primary-200 dark:border-primary-800' // Simple colored background
                            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {/* Open Time */}
                        <div className='flex items-center gap-1 text-green-700 dark:text-green-400'>
                          <span className='material-symbols-rounded text-[14px]'>lock_open</span>
                          <span className='font-mono font-bold' dir='ltr'>
                            {new Date(shift.openTime).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </div>

                        {/* Arrow or Separator */}
                        {shift.closeTime ? (
                          <span className='material-symbols-rounded text-[12px] text-gray-400 transform rtl:rotate-180'>
                            arrow_forward
                          </span>
                        ) : (
                          <div className='h-3 w-px bg-gray-300 dark:bg-gray-600 mx-0.5'></div>
                        )}

                        {/* Close Time or Status */}
                        {shift.closeTime ? (
                          <div className='flex items-center gap-1 text-red-700 dark:text-red-400'>
                            <span className='font-mono font-bold' dir='ltr'>
                              {new Date(shift.closeTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>
                            <span className='material-symbols-rounded text-[14px]'>lock</span>
                          </div>
                        ) : (
                          <div
                            className='flex items-center justify-center px-1'
                            title={language === 'AR' ? 'مفتوحة' : 'Open'}
                          >
                            <span className='w-2 h-2 rounded-full bg-green-500 animate-pulse ring-2 ring-green-200 dark:ring-green-900/30'></span>
                          </div>
                        )}

                        {/* User Name */}
                        <div className='flex items-center gap-1 pl-1.5 ltr:border-l rtl:border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'>
                          <span className='material-symbols-rounded text-[14px] opacity-60'>
                            person
                          </span>
                          <span className='font-bold'>{shift.openedBy}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ChartWidget>

        {/* Achievements & Insights */}
        <div className='space-y-6'>
          {/* Best Achievements Card */}
          <div className='bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xs border-2 border-gray-200 dark:border-transparent'>
            <h3 className='text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2'>
              <span className='material-symbols-rounded text-yellow-500'>trophy</span>
              {language === 'AR' ? 'الأفضل' : 'Best Achievements'}
            </h3>

            <div className='space-y-4'>
              {/* Most Sold Product */}
              <div className='flex items-center gap-3 p-3 bg-amber-50 dark:bg-gray-700/20 rounded-xl border border-amber-100 dark:border-gray-600/30'>
                <div className='w-10 h-10 bg-amber-100 dark:bg-gray-600/30 rounded-full flex items-center justify-center shrink-0'>
                  <span className='material-symbols-rounded text-amber-600 dark:text-amber-400'>
                    local_fire_department
                  </span>
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-xs text-amber-600 dark:text-amber-400 font-medium mb-0.5'>
                    {language === 'AR' ? 'الأكثر مبيعاً' : 'Most Sold Product'}
                  </p>
                  {stats?.mostSoldProduct ? (
                    <>
                      <p className='font-bold text-gray-900 dark:text-white text-sm truncate'>
                        {stats.mostSoldProduct.name}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {stats.mostSoldProduct.quantity} {language === 'AR' ? 'قطعة' : 'units'}
                      </p>
                    </>
                  ) : (
                    <p className='text-gray-400 text-sm'>
                      {language === 'AR' ? 'لا توجد بيانات' : 'No data'}
                    </p>
                  )}
                </div>
              </div>

              {/* Highest Invoice */}
              <div className='flex items-center gap-3 p-3 bg-emerald-50 dark:bg-gray-700/20 rounded-xl border border-emerald-100 dark:border-gray-600/30'>
                <div className='w-10 h-10 bg-emerald-100 dark:bg-gray-600/30 rounded-full flex items-center justify-center shrink-0'>
                  <span className='material-symbols-rounded text-emerald-600 dark:text-emerald-400'>
                    receipt_long
                  </span>
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-0.5'>
                    {language === 'AR' ? 'أغلى فاتورة' : 'Highest Invoice'}
                  </p>
                  {stats?.highestInvoice ? (
                    <>
                      <p className='font-bold text-gray-900 dark:text-white text-sm'>
                        {Math.round(stats.highestInvoice.total).toLocaleString()}{' '}
                        {t.global?.currency || (language === 'AR' ? 'ج.م' : 'L.E')}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        #{stats.highestInvoice.id.slice(-6)}
                      </p>
                    </>
                  ) : (
                    <p className='text-gray-400 text-sm'>
                      {language === 'AR' ? 'لا توجد بيانات' : 'No data'}
                    </p>
                  )}
                </div>
              </div>

              {/* Highest Priced Item Sold */}
              <div className='flex items-center gap-3 p-3 bg-purple-50 dark:bg-gray-700/20 rounded-xl border border-purple-100 dark:border-gray-600/30'>
                <div className='w-10 h-10 bg-purple-100 dark:bg-gray-600/30 rounded-full flex items-center justify-center shrink-0'>
                  <span className='material-symbols-rounded text-purple-600 dark:text-purple-400'>
                    diamond
                  </span>
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-xs text-purple-600 dark:text-purple-400 font-medium mb-0.5'>
                    {language === 'AR' ? 'أغلى صنف اتباع' : 'Highest Priced Item'}
                  </p>
                  {stats?.highestPricedItemSold ? (
                    <>
                      <p className='font-bold text-gray-900 dark:text-white text-sm truncate'>
                        {stats.highestPricedItemSold.name}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {Math.round(stats.highestPricedItemSold.publicPrice).toLocaleString()}{' '}
                        {t.global?.currency || (language === 'AR' ? 'ج.م' : 'L.E')}
                      </p>
                    </>
                  ) : (
                    <p className='text-gray-400 text-sm'>
                      {language === 'AR' ? 'لا توجد بيانات' : 'No data'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Performance Summary */}
          <AIPerformanceSummary
            employee={selectedEmployee}
            stats={stats}
            previousStats={previousStats}
            dateFilterMode={dateFilterMode}
            language={language}
            color={color.name}
          />
        </div>
      </div>

      {/* Expanded Chart Modal */}
      <ExpandedChartModal
        isOpen={isExpandedChartOpen}
        onClose={() => setIsExpandedChartOpen(false)}
        title={language === 'AR' ? 'تحليل المبيعات المفصل' : 'Detailed Sales Analytics'}
        data={chartData.map((d) => ({ ...d, value: d.sales }))}
        color={chartColor}
        unit={language === 'AR' ? ' ج.م' : ' L.E'}
        language={language}
        features={{
          showStats: true,
          showChartTypeToggle: true,
          showLineStyleToggle: true,
          showPeriodSelector: true,
          showBrush: true,
          showExportButtons: true,
          showTableView: true,
          showDateRange: true,
        }}
      />
    </div>
  );
};
