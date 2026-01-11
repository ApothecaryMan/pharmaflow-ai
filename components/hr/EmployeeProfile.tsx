import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Employee, Sale, ThemeColor } from '../../types';
import { getEmployeeSalesStats, getDateRange, getPreviousDateRange, DateRangeFilter } from '../../utils/employeeStats';
import { StatCard } from '../experiments/AdvancedSmCard';
import { ExpandingDropdown } from '../common/ExpandingDropdown';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, AreaChart, Area, PieChart, Pie, Cell, Brush 
} from 'recharts';
import { analyzeEmployeePerformance } from '../../services/geminiService';
import { EmployeeSalesStats } from '../../utils/employeeStats';
import { ExpandedChartModal } from '../experiments/ExpandedChartModal';

// AI Performance Summary Sub-Component
const AIPerformanceSummary: React.FC<{
  employee: Employee;
  stats: EmployeeSalesStats | null;
  previousStats: EmployeeSalesStats | null;
  dateFilterMode: string;
  language: 'EN' | 'AR';
  color: string;
}> = ({ employee, stats, language }) => {
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
  }, [employee.id]);

  // Generate static summary
  const staticSummary = stats?.salesCount && stats.salesCount > 0 
    ? (language === 'AR' 
        ? `حقق ${employee.name.split(' ')[0]} أداءً جيداً بإجمالي ${stats.salesCount} فاتورة وهامش ربح ${stats.profitMargin}%.` 
        : `${employee.name.split(' ')[0]} performed well with ${stats.salesCount} transactions and ${stats.profitMargin}% profit margin.`)
    : (language === 'AR' ? 'لا توجد بيانات كافية.' : 'Not enough data.');

  // Fetch quick 1-line summary
  const fetchShortSummary = async () => {
    if (!stats || loading) return;
    
    setLoading(true);
    setAiError(null);
    
    try {
      const result = await analyzeEmployeePerformance({
        employeeName: employee.name,
        period: 'month',
        totalSales: stats.netSales,
        netProfit: stats.totalProfit,
        profitMargin: stats.profitMargin,
        itemsSold: stats.totalItemsSold,
        transactionCount: stats.salesCount,
        topProduct: stats.mostSoldProduct?.name,
      }, language, 'short');
      
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
      const result = await analyzeEmployeePerformance({
        employeeName: employee.name,
        period: 'month',
        totalSales: stats.netSales,
        netProfit: stats.totalProfit,
        profitMargin: stats.profitMargin,
        itemsSold: stats.totalItemsSold,
        transactionCount: stats.salesCount,
        topProduct: stats.mostSoldProduct?.name,
      }, language, 'detailed');
      
      setDetailedSummary(result);
    } catch (e) {
      setDetailedSummary(language === 'AR' ? 'فشل تحميل التحليل المفصل.' : 'Failed to load detailed analysis.');
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
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <span className="material-symbols-rounded">psychology</span>
            {language === 'AR' ? 'ملخص الأداء' : 'Performance Insight'}
            {shortSummary && !aiError && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">AI</span>
            )}
            {aiError && (
              <div className="group relative cursor-help">
                <span className="text-xs bg-red-500/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="material-symbols-rounded text-sm">warning</span>
                  {language === 'AR' ? 'خطأ' : 'Error'}
                </span>
                {/* Tooltip for error message */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[200px] p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-center border border-white/10">
                  {aiError}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-t border-l border-white/10"></div>
                </div>
              </div>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {/* Quick AI Analysis Button */}
            <button 
              onClick={fetchShortSummary}
              disabled={loading}
              className={`px-4 h-[36px] rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all active:scale-95 flex items-center gap-2 text-sm font-medium shadow-sm ${loading ? 'opacity-80' : ''}`}
            >
              <span className={`material-symbols-rounded text-base ${loading ? 'animate-spin' : ''}`}>
                {loading ? 'progress_activity' : 'auto_awesome'}
              </span>
              <span>{loading ? (language === 'AR' ? 'جاري...' : 'Loading...') : (language === 'AR' ? 'تحليل سريع' : 'Quick AI')}</span>
            </button>
            
            {/* Expand to Detailed Modal Button */}
            <button 
              onClick={openDetailedModal}
              className="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all active:scale-95 shadow-sm"
              title={language === 'AR' ? 'تحليل مفصل' : 'Detailed Analysis'}
            >
              <span className="material-symbols-rounded text-base">open_in_full</span>
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <span className="animate-spin material-symbols-rounded text-lg">progress_activity</span>
            {language === 'AR' ? 'جاري التحليل...' : 'Analyzing...'}
          </div>
        ) : (
          <p className="text-white/90 text-sm leading-relaxed line-clamp-2">
            {shortSummary && !aiError ? shortSummary : staticSummary}
          </p>
        )}
      </div>

      {/* Detailed Analysis Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={language === 'AR' ? 'تحليل الأداء المفصل' : 'Detailed Performance Analysis'}
        icon="psychology"
        size="2xl"
        headerActions={
          <button
            onClick={() => fetchDetailedSummary(true)}
            disabled={loadingDetailed}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors ${loadingDetailed ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={`material-symbols-rounded text-lg ${loadingDetailed ? 'animate-spin' : ''}`}>
              refresh
            </span>
            {language === 'AR' ? 'إعادة توليد' : 'Regenerate'}
          </button>
        }
      >
        <div className="space-y-6">
          {(() => {
            // Helper: Detect if name is Arabic
            const isArabicName = /[\u0600-\u06FF]/.test(employee.name);
            // Helper: Get 2 initials
            const nameParts = employee.name.trim().split(/\s+/);
            const initials = nameParts.length >= 2
              ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`
              : employee.name.slice(0, 2);
            
            return (
              <div 
                dir={isArabicName ? 'rtl' : 'ltr'}
                className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-200 dark:shadow-none">
                  {initials.toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">{employee.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{employee.role}</p>
                </div>
              </div>
            );
          })()}

          {loadingDetailed ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-indigo-500/50">
              <span className="animate-spin material-symbols-rounded text-5xl">progress_activity</span>
              <p className="text-sm font-medium animate-pulse">
                {language === 'AR' ? 'جاري تحليل البيانات العميقة...' : 'Analyzing deep data insights...'}
              </p>
            </div>
          ) : (
            <div 
              className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line"
              dangerouslySetInnerHTML={{ 
                __html: (detailedSummary || '')
                  // Color-coded headings based on type (Arabic + English)
                  .replace(/\*\*(تقييم الربحية|Profitability Assessment):\*\*/gi, '<strong class="text-emerald-600 dark:text-emerald-400 text-base">$1:</strong>')
                  .replace(/\*\*(تقييم حجم السلة|Basket Size Evaluation):\*\*/gi, '<strong class="text-blue-600 dark:text-blue-400 text-base">$1:</strong>')
                  .replace(/\*\*(تقييم مهارات البيع الإضافي|Upselling Skills Assessment):\*\*/gi, '<strong class="text-amber-600 dark:text-amber-400 text-base">$1:</strong>')
                  .replace(/\*\*(التوصية الاستراتيجية|Strategic Recommendation):\*\*/gi, '<strong class="text-purple-600 dark:text-purple-400 text-base">$1:</strong>')
                  // Fallback for old format headings
                  .replace(/\*\*(نقطة القوة|Strength):\*\*/gi, '<strong class="text-emerald-600 dark:text-emerald-400">$1:</strong>')
                  .replace(/\*\*(فرصة التحسين|Improvement):\*\*/gi, '<strong class="text-amber-600 dark:text-amber-400">$1:</strong>')
                  .replace(/\*\*(التوصية|Recommendation):\*\*/gi, '<strong class="text-blue-600 dark:text-blue-400">$1:</strong>')
                  // Generic bold fallback
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-600 dark:text-indigo-400 font-bold">$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
              }}
            />
          )}
        </div>
      </Modal>
    </>
  );
};

// Theme color mapping for Recharts (since CSS variables don't always resolve inside SVG defs)
const THEME_COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6',
  purple: '#a855f7',
  green: '#22c55e',
  orange: '#f97316',
  red: '#ef4444',
  pink: '#ec4899',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  emerald: '#10b981',
  rose: '#f43f5e',
  fuchsia: '#d946ef',
  sky: '#0ea5e9',
  lime: '#84cc16'
};

interface EmployeeProfileProps {
  sales: Sale[];
  employees?: Employee[]; // Optional if we load from localStorage within component, but better passed as prop
  color: ThemeColor;
  t: any;
  language: 'EN' | 'AR';
}

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({
  sales,
  employees = [],
  color,
  t,
  language
}) => {
  // We need to manage the selected employee. 
  // Initially, it could be the first one or none.
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');

  // Load employees if not passed (fallback)
  const allEmployees = useMemo(() => {
    if (employees.length > 0) return employees;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_employees');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  }, [employees]);

  // Set default employee if not set
  React.useEffect(() => {
    if (!selectedEmployeeId && allEmployees.length > 0) {
      setSelectedEmployeeId(allEmployees[0].id);
    }
  }, [allEmployees, selectedEmployeeId]);

  const selectedEmployee = allEmployees.find(e => e.id === selectedEmployeeId);
  const chartColor = THEME_COLOR_HEX[color.name] || THEME_COLOR_HEX['blue'];

  // Date Filter Logic
  const dateRange = useMemo<DateRangeFilter | undefined>(() => {
    if (dateFilterMode === 'all') return undefined;
    return getDateRange(dateFilterMode);
  }, [dateFilterMode]);


  // Calculate Stats
  const stats = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return getEmployeeSalesStats(selectedEmployeeId, sales, dateRange);
  }, [selectedEmployeeId, sales, dateRange]);

  // Calculate Previous Stats for Trends
  const previousStats = useMemo(() => {
    if (!selectedEmployeeId || dateFilterMode === 'all') return null;
    const prevRange = getPreviousDateRange(dateFilterMode);
    return getEmployeeSalesStats(selectedEmployeeId, sales, prevRange);
  }, [selectedEmployeeId, sales, dateFilterMode]);

  // Helper to calculate trend percentage
  const getTrend = (current: number, previous: number): { trend?: 'up' | 'down'; value?: string } => {
    if (!previous) return { trend: undefined, value: undefined };
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    if (percentage === 0) return { trend: undefined, value: undefined };
    return {
      trend: percentage > 0 ? 'up' : 'down',
      value: `${Math.abs(percentage).toFixed(1)}%`
    };
  };

  // Chart Data Preparation (Last 7 periods based on filter)
  // For simplicity MVP, let's just show daily sales for the current filtered range or last 7 days
  const chartData = useMemo(() => {
     if (!selectedEmployeeId) return [];
     
     // Simple aggregation: Sales by Day for the selected period
     // If period is 'today', show by hour? (Too complex for MVP, stick to daily)
     const data: Record<string, { date: string; sales: number; profit: number }> = {};
     
     const relevantSales = sales.filter(s => 
        s.soldByEmployeeId === selectedEmployeeId &&
        (!dateRange?.startDate || new Date(s.date) >= dateRange.startDate) &&
        (!dateRange?.endDate || new Date(s.date) <= dateRange.endDate)
     );

     relevantSales.forEach(sale => {
        const dateKey = new Date(sale.date).toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' });
        if (!data[dateKey]) {
            data[dateKey] = { date: dateKey, sales: 0, profit: 0 };
        }
        data[dateKey].sales += sale.netTotal ?? sale.total;
        // Estimate profit for chart (complex logic duplicated here or we simplify)
        // Let's rely on total sales for chart visual now
     });

     return Object.values(data).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedEmployeeId, sales, dateRange, language]);


  if (!selectedEmployee) {
    return <div className="p-8 text-center text-gray-500">{t.common?.noData || 'No employees found'}</div>;
  }

  return (
    <div className="h-full space-y-6 animate-fade-in overflow-y-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
            {(() => {
                const nameParts = selectedEmployee.name.trim().split(/\s+/);
                const initials = nameParts.length > 1 
                    ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`
                    : selectedEmployee.name.slice(0, 2);
                return (
                    <div className={`w-16 h-16 rounded-full bg-${color.name}-100 dark:bg-${color.name}-900/30 flex items-center justify-center text-${color.name}-600 dark:text-${color.name}-400 text-xl font-bold uppercase ring-4 ring-${color.name}-200/50 dark:ring-${color.name}-800/30`}>
                        {initials}
                    </div>
                );
            })()}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedEmployee.name}</h1>
                <p className="text-gray-500 dark:text-gray-400">{selectedEmployee.role} • {selectedEmployee.employeeCode}</p>
            </div>
        </div>

        <div className="flex items-center gap-3">
             {/* Employee Selector */}
             <div className="w-56 h-9 relative z-50">
                <ExpandingDropdown
                    className="absolute top-0 left-0 w-full text-sm"
                    minHeight="36px"
                    items={allEmployees}
                    selectedItem={selectedEmployee}
                    isOpen={isEmployeeDropdownOpen}
                    onToggle={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                    onSelect={(emp) => {
                        setSelectedEmployeeId(emp.id);
                        setIsEmployeeDropdownOpen(false);
                    }}
                    renderItem={(emp) => (
                        <div className="flex flex-col py-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</span>
                            <span className="text-xs text-gray-500">{emp.role}</span>
                        </div>
                    )}
                    renderSelected={(emp) => (
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                            {emp ? emp.name : 'Select Employee'}
                        </span>
                    )}
                    keyExtractor={(emp) => emp.id}
                    variant="input"
                    color={color.name}
                />
             </div>

            {/* Date Filter */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {(['today', 'week', 'month', 'year', 'all'] as const).map(period => (
                    <button
                        key={period}
                        onClick={() => setDateFilterMode(period)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            dateFilterMode === period 
                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {(() => {
                const salesTrend = previousStats ? getTrend(stats.netSales, previousStats.netSales) : { trend: undefined, value: undefined };
                return (
                 <StatCard 
                    title={language === 'AR' ? 'إجمالي المبيعات' : 'Total Sales'}
                    value={Math.round(stats.netSales)}
                    type="currency"
                    trend={salesTrend.trend}
                    trendValue={salesTrend.value}
                    showTrend={!!salesTrend.value}
                    icon="payments"
                    iconColor="blue"
                    graphToken="sales"
                    currencyLabel={t.global?.currency || (language === 'AR' ? 'ج.م' : 'L.E')}
                 />
                );
             })()}

             {(() => {
                const profitTrend = previousStats ? getTrend(stats.totalProfit, previousStats.totalProfit) : { trend: undefined, value: undefined };
                return (
                 <StatCard 
                    title={language === 'AR' ? 'صافي الربح' : 'Net Profit'}
                    value={Math.round(stats.totalProfit)}
                    subValue={stats.profitMargin ? `${stats.profitMargin}% Margin` : undefined}
                    type="currency"
                    trend={profitTrend.trend}
                    trendValue={profitTrend.value}
                    showTrend={!!profitTrend.value}
                    icon="trending_up"
                    iconColor="emerald"
                    graphToken="profit"
                    currencyLabel={t.global?.currency || (language === 'AR' ? 'ج.م' : 'L.E')}
                 />
                );
             })()}

             {(() => {
                 const itemsTrend = previousStats ? getTrend(stats.totalItemsSold, previousStats.totalItemsSold) : { trend: undefined, value: undefined };
                 return (
                 <StatCard 
                    title={language === 'AR' ? 'القطع المباعة' : 'Items Sold'}
                    value={stats.totalItemsSold}
                    type="number"
                    trend={itemsTrend.trend}
                    trendValue={itemsTrend.value}
                    showTrend={!!itemsTrend.value}
                    icon="shopping_basket"
                    iconColor="purple"
                 />
                 );
             })()}

             {(() => {
                 const txTrend = previousStats ? getTrend(stats.salesCount, previousStats.salesCount) : { trend: undefined, value: undefined };
                 return (
                 <StatCard 
                    title={language === 'AR' ? 'عدد الفواتير' : 'Transactions'}
                    value={stats.salesCount}
                    subValue={stats.avgProfitPerSale ? `Avg Profit: ${Math.round(stats.avgProfitPerSale)}` : undefined}
                    type="number"
                    trend={txTrend.trend}
                    trendValue={txTrend.value}
                    showTrend={!!txTrend.value}
                    icon="receipt_long"
                    iconColor="orange"
                 />
                 );
             })()}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-rounded text-blue-500">bar_chart</span>
                {language === 'AR' ? 'تحليل المبيعات' : 'Sales Analytics'}
            </h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                        <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="sales" 
                            stroke={chartColor} 
                            fillOpacity={1} 
                            fill="url(#colorSales)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Top Product & Insights */}
        <div className="space-y-6">
             {/* Most Sold Product */}
             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-rounded text-yellow-500">trophy</span>
                    {language === 'AR' ? 'المنتج الأكثر مبيعاً' : 'Top Performing Product'}
                </h3>
                {stats?.mostSoldProduct ? (
                    <div className="flex flex-col items-center text-center p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                        <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm mb-3 text-3xl">
                             💊
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{stats.mostSoldProduct.name}</h4>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{stats.mostSoldProduct.id}</p>
                        <div className="badge bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold">
                            {stats.mostSoldProduct.quantity} {language === 'AR' ? 'قطعة مباعة' : 'Units Sold'}
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">{language === 'AR' ? 'لا توجد بيانات' : 'No data available'}</p>
                )}
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
    </div>
  );
};
