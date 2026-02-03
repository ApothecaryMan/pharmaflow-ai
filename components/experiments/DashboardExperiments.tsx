import type React from 'react';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts';
import { CARD_BASE } from '../../utils/themeStyles';

interface DashboardExperimentsProps {
  color: string;
  t: any;
  language: string;
}

// ========== DUMMY DATA ==========

// 1. Line Chart - Sales Trend
const salesTrendData = [
  { name: 'Jan', sales: 4000 },
  { name: 'Feb', sales: 3000 },
  { name: 'Mar', sales: 5000 },
  { name: 'Apr', sales: 4780 },
  { name: 'May', sales: 5890 },
  { name: 'Jun', sales: 4390 },
  { name: 'Jul', sales: 6490 },
  { name: 'Aug', sales: 7200 },
  { name: 'Sep', sales: 6800 },
  { name: 'Oct', sales: 7800 },
  { name: 'Nov', sales: 8200 },
  { name: 'Dec', sales: 9400 },
];

// 2. Bar Chart - Revenue by Category
const categoryRevenueData = [
  { name: 'Antibiotics', revenue: 12400 },
  { name: 'Painkillers', revenue: 9800 },
  { name: 'Vitamins', revenue: 7600 },
  { name: 'Skincare', revenue: 5200 },
  { name: 'First Aid', revenue: 3100 },
];

// 3. Pie Chart - Customer Segments
const customerSegmentsData = [
  { name: 'Regular', value: 45, color: '#3b82f6' },
  { name: 'Premium', value: 25, color: '#8b5cf6' },
  { name: 'New', value: 20, color: '#10b981' },
  { name: 'Inactive', value: 10, color: '#f59e0b' },
];

// 4. Donut Chart - Stock Status
const stockStatusData = [
  { name: 'In Stock', value: 68, color: '#10b981' },
  { name: 'Low Stock', value: 22, color: '#f59e0b' },
  { name: 'Out of Stock', value: 10, color: '#ef4444' },
];

// 5. Area Chart - Daily Traffic
const dailyTrafficData = [
  { hour: '6AM', visitors: 20 },
  { hour: '8AM', visitors: 85 },
  { hour: '10AM', visitors: 150 },
  { hour: '12PM', visitors: 180 },
  { hour: '2PM', visitors: 160 },
  { hour: '4PM', visitors: 200 },
  { hour: '6PM', visitors: 250 },
  { hour: '8PM', visitors: 120 },
  { hour: '10PM', visitors: 50 },
];

// 6. Radial Bar - Performance Goals
const performanceGoalsData = [
  { name: 'Sales Target', value: 78, fill: '#3b82f6' },
  { name: 'Customer Satisfaction', value: 92, fill: '#10b981' },
  { name: 'Inventory Turnover', value: 65, fill: '#f59e0b' },
];

// 7. Progress Bars - Task Completion
const taskCompletionData = [
  { name: 'Orders Processed', completed: 156, total: 180, color: '#3b82f6' },
  { name: 'Prescriptions Filled', completed: 89, total: 100, color: '#10b981' },
  { name: 'Returns Handled', completed: 12, total: 15, color: '#f59e0b' },
  { name: 'Inventory Updated', completed: 45, total: 50, color: '#8b5cf6' },
];

// 8. Stat Card with Sparkline
const sparklineData = [
  { value: 30 },
  { value: 40 },
  { value: 35 },
  { value: 50 },
  { value: 49 },
  { value: 60 },
  { value: 70 },
  { value: 91 },
];

// 9. Heatmap - Weekly Activity
const heatmapData = [
  { day: 'Mon', morning: 45, afternoon: 78, evening: 32 },
  { day: 'Tue', morning: 52, afternoon: 85, evening: 40 },
  { day: 'Wed', morning: 48, afternoon: 90, evening: 38 },
  { day: 'Thu', morning: 55, afternoon: 82, evening: 45 },
  { day: 'Fri', morning: 60, afternoon: 95, evening: 55 },
  { day: 'Sat', morning: 70, afternoon: 75, evening: 60 },
  { day: 'Sun', morning: 35, afternoon: 45, evening: 25 },
];

// 10. Scatter Plot - Price vs Sales Correlation
const scatterData = [
  { price: 10, sales: 150 },
  { price: 15, sales: 120 },
  { price: 20, sales: 100 },
  { price: 25, sales: 85 },
  { price: 30, sales: 70 },
  { price: 35, sales: 55 },
  { price: 40, sales: 40 },
  { price: 50, sales: 30 },
  { price: 12, sales: 140 },
  { price: 18, sales: 110 },
  { price: 22, sales: 95 },
  { price: 28, sales: 75 },
];

// 11. Stacked Bar Chart - Monthly Sales by Category
const stackedBarData = [
  { month: 'Jan', medicine: 4000, cosmetics: 2400, equipment: 1200 },
  { month: 'Feb', medicine: 3000, cosmetics: 1398, equipment: 2210 },
  { month: 'Mar', medicine: 2000, cosmetics: 9800, equipment: 2290 },
  { month: 'Apr', medicine: 2780, cosmetics: 3908, equipment: 2000 },
  { month: 'May', medicine: 1890, cosmetics: 4800, equipment: 2181 },
  { month: 'Jun', medicine: 2390, cosmetics: 3800, equipment: 2500 },
];

// 12. Funnel Chart - Sales Pipeline
const funnelData = [
  { name: 'Visitors', value: 5000, fill: '#3b82f6' },
  { name: 'Leads', value: 3500, fill: '#6366f1' },
  { name: 'Quotes', value: 2200, fill: '#8b5cf6' },
  { name: 'Orders', value: 1400, fill: '#a855f7' },
  { name: 'Sales', value: 800, fill: '#10b981' },
];

// 13. Gauge - Target Achievement
const gaugeData = [{ name: 'Target', value: 78, fill: '#10b981' }];

// 14. Treemap - Category Distribution
const treemapData = [
  { name: 'Medicine', size: 4500, fill: '#3b82f6' },
  { name: 'Cosmetics', size: 3200, fill: '#8b5cf6' },
  { name: 'Equipment', size: 2100, fill: '#10b981' },
  { name: 'Vitamins', size: 1800, fill: '#f59e0b' },
  { name: 'First Aid', size: 1200, fill: '#ef4444' },
  { name: 'Baby Care', size: 900, fill: '#06b6d4' },
];

// 15. Composed Chart - Revenue vs Orders
const composedData = [
  { month: 'Jan', revenue: 4200, orders: 120 },
  { month: 'Feb', revenue: 3800, orders: 98 },
  { month: 'Mar', revenue: 5100, orders: 145 },
  { month: 'Apr', revenue: 4600, orders: 132 },
  { month: 'May', revenue: 5800, orders: 168 },
  { month: 'Jun', revenue: 6200, orders: 185 },
];

// ========== COLOR PALETTE ==========
const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  grid: { light: '#e2e8f0', dark: '#374151' },
  tick: { light: '#64748b', dark: '#9ca3af' },
  text: { light: '#374151', dark: '#e5e7eb' },
};

// ========== COMPONENT ==========
export const DashboardExperiments: React.FC<DashboardExperimentsProps> = ({
  color,
  t,
  language,
}) => {
  const isRTL = language === 'AR';

  // Detect dark mode
  const isDark = useMemo(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  }, []);

  // Chart styling based on theme
  const chartStyle = useMemo(
    () => ({
      grid: isDark ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light,
      tick: isDark ? CHART_COLORS.tick.dark : CHART_COLORS.tick.light,
      text: isDark ? CHART_COLORS.text.dark : CHART_COLORS.text.light,
    }),
    [isDark]
  );

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700'>
          <p className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'>{label}</p>
          <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
            ${payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // Simple Tooltip for non-currency values
  const SimpleTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700'>
          <p className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'>
            {label || payload[0].payload?.name}
          </p>
          <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
            {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const labels = {
    title: isRTL ? 'تجارب بطاقات لوحة التحكم' : 'Dashboard Card Experiments',
    card1: isRTL ? 'اتجاه المبيعات (مخطط خطي)' : 'Sales Trend (Line Chart)',
    card2: isRTL ? 'الإيرادات حسب الفئة (مخطط شريطي)' : 'Revenue by Category (Bar Chart)',
    card3: isRTL ? 'شرائح العملاء (مخطط دائري)' : 'Customer Segments (Pie Chart)',
    card4: isRTL ? 'حالة المخزون (مخطط دائري مفرغ)' : 'Stock Status (Donut Chart)',
    card5: isRTL ? 'حركة الزوار اليومية (مخطط مساحي)' : 'Daily Traffic (Area Chart)',
    card6: isRTL ? 'أهداف الأداء (مخطط شعاعي)' : 'Performance Goals (Radial Bar)',
    card7: isRTL ? 'إنجاز المهام (أشرطة التقدم)' : 'Task Completion (Progress Bars)',
    card8: isRTL ? 'إحصائية سريعة (مع خط مصغر)' : 'Quick Stat (with Sparkline)',
    card9: isRTL ? 'نشاط أسبوعي (خريطة حرارية)' : 'Weekly Activity (Heatmap)',
    card10: isRTL ? 'السعر مقابل المبيعات (مخطط انتشار)' : 'Price vs Sales (Scatter Plot)',
    card11: isRTL ? 'المبيعات الشهرية (أعمدة مكدسة)' : 'Monthly Sales (Stacked Bar)',
    card12: isRTL ? 'قمع المبيعات' : 'Sales Funnel',
    card13: isRTL ? 'مؤشر الهدف' : 'Target Gauge',
    card14: isRTL ? 'أفضل المنتجات (أعمدة أفقية)' : 'Top Products (Horizontal Bar)',
    card15: isRTL ? 'الإيرادات مقابل الطلبات (مخطط مركب)' : 'Revenue vs Orders (Composed)',
    totalRevenue: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
    vsLastMonth: isRTL ? 'مقارنة بالشهر الماضي' : 'vs last month',
    morning: isRTL ? 'صباحاً' : 'Morning',
    afternoon: isRTL ? 'ظهراً' : 'Afternoon',
    evening: isRTL ? 'مساءً' : 'Evening',
  };

  // Get heatmap color based on value
  const getHeatmapColor = (value: number) => {
    const intensity = value / 100;
    if (isDark) {
      // Dark mode: Blue shades with opacity
      return {
        bg: `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`,
        text: intensity > 0.5 ? '#ffffff' : '#9ca3af',
      };
    } else {
      // Light mode: Blue shades
      return {
        bg: `rgba(59, 130, 246, ${0.1 + intensity * 0.7})`,
        text: intensity > 0.5 ? '#ffffff' : '#374151',
      };
    }
  };

  return (
    <div
      className='h-full overflow-y-auto pe-2 space-y-6 animate-fade-in pb-10'
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <h2 className='text-2xl font-bold tracking-tight mb-6 type-expressive text-gray-900 dark:text-gray-100'>
        {labels.title}
      </h2>

      {/* Grid Layout for Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
        {/* Card 1: Line Chart - Sales Trend */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-blue-500 text-[20px]'>show_chart</span>
            {labels.card1}
          </h3>
          <div className='flex-1' dir='ltr'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={salesTrendData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id='lineGradient1' x1='0' y1='0' x2='1' y2='0'>
                    <stop offset='0%' stopColor='#3b82f6' />
                    <stop offset='100%' stopColor='#8b5cf6' />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke={chartStyle.grid} />
                <XAxis
                  dataKey='name'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: chartStyle.grid, strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line
                  type='monotone'
                  dataKey='sales'
                  stroke='url(#lineGradient1)'
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Bar Chart - Revenue by Category */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-emerald-500 text-[20px]'>bar_chart</span>
            {labels.card2}
          </h3>
          <div className='flex-1' dir='ltr'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart
                data={categoryRevenueData}
                margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id='barGradient1' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='#10b981' />
                    <stop offset='100%' stopColor='#059669' />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke={chartStyle.grid} />
                <XAxis
                  dataKey='name'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 9 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey='revenue' fill='url(#barGradient1)' radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Pie Chart - Customer Segments */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-blue-500 text-[20px]'>pie_chart</span>
            {labels.card3}
          </h3>
          <div className='flex-1 flex items-center'>
            <ResponsiveContainer width='55%' height='100%'>
              <PieChart>
                <Pie
                  data={customerSegmentsData}
                  dataKey='value'
                  cx='50%'
                  cy='50%'
                  outerRadius={60}
                  strokeWidth={0}
                >
                  {customerSegmentsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<SimpleTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className='flex-1 space-y-2 ps-2'>
              {customerSegmentsData.map((item) => (
                <div key={item.name} className='flex items-center gap-2 text-xs'>
                  <div
                    className='w-2.5 h-2.5 rounded-full shrink-0'
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className='text-gray-600 dark:text-gray-400 truncate'>{item.name}</span>
                  <span className='font-bold text-gray-800 dark:text-gray-200 ms-auto'>
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 4: Donut Chart - Stock Status */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-emerald-500 text-[20px]'>
              donut_large
            </span>
            {labels.card4}
          </h3>
          <div className='flex-1 flex items-center'>
            <ResponsiveContainer width='55%' height='100%'>
              <PieChart>
                <Pie
                  data={stockStatusData}
                  dataKey='value'
                  cx='50%'
                  cy='50%'
                  innerRadius={35}
                  outerRadius={60}
                  strokeWidth={0}
                >
                  {stockStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<SimpleTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className='flex-1 space-y-2 ps-2'>
              {stockStatusData.map((item) => (
                <div key={item.name} className='flex items-center gap-2 text-xs'>
                  <div
                    className='w-2.5 h-2.5 rounded-full shrink-0'
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className='text-gray-600 dark:text-gray-400 truncate'>{item.name}</span>
                  <span className='font-bold text-gray-800 dark:text-gray-200 ms-auto'>
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 5: Area Chart - Daily Traffic */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-violet-500 text-[20px]'>area_chart</span>
            {labels.card5}
          </h3>
          <div className='flex-1' dir='ltr'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart
                data={dailyTrafficData}
                margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id='areaGradient1' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#8b5cf6' stopOpacity={0.7} />
                    <stop offset='95%' stopColor='#8b5cf6' stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke={chartStyle.grid} />
                <XAxis
                  dataKey='hour'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <Tooltip
                  content={<SimpleTooltip />}
                  cursor={{ stroke: chartStyle.grid, strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                  type='monotone'
                  dataKey='visitors'
                  stroke='#8b5cf6'
                  fill='url(#areaGradient1)'
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 6: Radial Bar - Performance Goals */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-blue-500 text-[20px]'>speed</span>
            {labels.card6}
          </h3>
          <div className='flex-1 flex flex-col items-center justify-center'>
            <ResponsiveContainer width='100%' height={150}>
              <RadialBarChart
                cx='50%'
                cy='100%'
                innerRadius='55%'
                outerRadius='130%'
                barSize={18}
                data={performanceGoalsData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  background={{ fill: isDark ? '#374151' : '#e5e7eb' }}
                  dataKey='value'
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className='w-full grid grid-cols-3 gap-2 px-2 mt-4'>
              {performanceGoalsData.map((item) => (
                <div key={item.name} className='flex flex-col items-center text-center'>
                  <div className='flex items-center gap-1.5 mb-1'>
                    <div
                      className='w-2.5 h-2.5 rounded-full shrink-0'
                      style={{ backgroundColor: item.fill }}
                    ></div>
                    <span className='font-bold text-gray-800 dark:text-gray-200 text-lg'>
                      {item.value}%
                    </span>
                  </div>
                  <span className='text-gray-500 dark:text-gray-400 text-[10px] leading-tight line-clamp-2 w-full'>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 7: Progress Bars - Task Completion */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-blue-500 text-[20px]'>checklist</span>
            {labels.card7}
          </h3>
          <div className='flex-1 flex flex-col justify-center space-y-4'>
            {taskCompletionData.map((item) => {
              const percentage = Math.round((item.completed / item.total) * 100);
              return (
                <div key={item.name}>
                  <div className='flex justify-between items-center text-xs mb-1.5'>
                    <span className='text-gray-600 dark:text-gray-400'>{item.name}</span>
                    <span className='font-bold text-gray-800 dark:text-gray-200'>
                      {item.completed}/{item.total}
                    </span>
                  </div>
                  <div className='w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                    <div
                      className='h-full rounded-full transition-all duration-500'
                      style={{ width: `${percentage}%`, backgroundColor: item.color }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 8: Stat Card with Sparkline - FIXED GLOW CARD */}
        <div
          className='p-5 rounded-3xl h-72 flex flex-col shadow-lg border border-white/10 relative overflow-hidden'
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          }}
        >
          {/* Glow effect overlay */}
          <div
            className='absolute inset-0 opacity-30'
            style={{
              background:
                'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)',
            }}
          />

          <h3 className='text-sm font-semibold text-white/90 mb-3 flex items-center gap-2 relative z-10'>
            <span className='material-symbols-rounded text-white text-[20px]'>trending_up</span>
            {labels.card8}
          </h3>

          <div className='flex-1 flex flex-col justify-between relative z-10'>
            <div>
              <p className='text-xs text-white/70 uppercase font-bold tracking-wider mb-1'>
                {labels.totalRevenue}
              </p>
              <p className='text-4xl font-bold text-white'>$94,560</p>
              <div className='flex items-center gap-1.5 mt-3'>
                <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-sm font-medium'>
                  <span className='material-symbols-rounded text-[14px]'>arrow_upward</span>
                  +12.5%
                </span>
                <span className='text-white/60 text-xs'>{labels.vsLastMonth}</span>
              </div>
            </div>

            <div className='h-16 mt-4 -mx-2'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={sparklineData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id='sparklineGradient1' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='0%' stopColor='#ffffff' stopOpacity={0.35} />
                      <stop offset='100%' stopColor='#ffffff' stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className='bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg'>
                            <p className='text-white font-bold text-sm'>
                              ${payload[0].value.toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{
                      stroke: 'rgba(255,255,255,0.3)',
                      strokeWidth: 1,
                      strokeDasharray: '3 3',
                    }}
                  />
                  <Area
                    type='monotone'
                    dataKey='value'
                    stroke='rgba(255,255,255,0.8)'
                    fill='url(#sparklineGradient1)'
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Card 9: Heatmap - Weekly Activity */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-blue-500 text-[20px]'>
              calendar_view_week
            </span>
            {labels.card9}
          </h3>
          <div className='flex-1 overflow-auto'>
            <table className='w-full text-xs'>
              <thead>
                <tr>
                  <th className='text-start text-gray-500 dark:text-gray-400 pb-2 font-medium w-12'></th>
                  <th className='text-center text-gray-500 dark:text-gray-400 pb-2 font-medium'>
                    {labels.morning}
                  </th>
                  <th className='text-center text-gray-500 dark:text-gray-400 pb-2 font-medium'>
                    {labels.afternoon}
                  </th>
                  <th className='text-center text-gray-500 dark:text-gray-400 pb-2 font-medium'>
                    {labels.evening}
                  </th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row) => (
                  <tr key={row.day}>
                    <td className='py-1 text-gray-600 dark:text-gray-400 font-medium text-[11px]'>
                      {row.day}
                    </td>
                    {(['morning', 'afternoon', 'evening'] as const).map((period) => {
                      const value = row[period];
                      const colors = getHeatmapColor(value);
                      return (
                        <td key={period} className='p-0.5'>
                          <div
                            className='w-full h-7 rounded-md flex items-center justify-center font-bold text-[11px] transition-colors'
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                            }}
                          >
                            {value}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 10: Scatter Plot - Price vs Sales */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-amber-500 text-[20px]'>
              scatter_plot
            </span>
            {labels.card10}
          </h3>
          <div className='flex-1' dir='ltr'>
            <ResponsiveContainer width='100%' height='100%'>
              <ScatterChart margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' stroke={chartStyle.grid} />
                <XAxis
                  type='number'
                  dataKey='price'
                  name='Price'
                  unit='$'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <YAxis
                  type='number'
                  dataKey='sales'
                  name='Sales'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className='bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700'>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            Price:{' '}
                            <span className='font-bold text-gray-800 dark:text-gray-200'>
                              ${payload[0].payload.price}
                            </span>
                          </p>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            Sales:{' '}
                            <span className='font-bold text-gray-800 dark:text-gray-200'>
                              {payload[0].payload.sales}
                            </span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name='Products' data={scatterData} fill='#f59e0b' />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 11: Stacked Bar Chart - Monthly Sales */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-blue-500 text-[20px]'>
              stacked_bar_chart
            </span>
            {labels.card11}
          </h3>
          <div className='flex-1' dir='ltr'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={stackedBarData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke={chartStyle.grid} />
                <XAxis
                  dataKey='month'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className='bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700'>
                          <p className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2'>
                            {label}
                          </p>
                          {payload.map((entry: any, idx: number) => (
                            <p key={idx} className='text-xs' style={{ color: entry.fill }}>
                              {entry.name}:{' '}
                              <span className='font-bold'>${entry.value.toLocaleString()}</span>
                            </p>
                          ))}
                          <p className='text-xs font-bold text-gray-700 dark:text-gray-300 mt-1 pt-1 border-t border-gray-200 dark:border-gray-600'>
                            Total: $
                            {payload
                              .reduce((sum: number, e: any) => sum + e.value, 0)
                              .toLocaleString()}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey='medicine'
                  name='Medicine'
                  stackId='a'
                  fill='#3b82f6'
                  radius={[0, 0, 0, 0]}
                />
                <Bar dataKey='cosmetics' name='Cosmetics' stackId='a' fill='#8b5cf6' />
                <Bar
                  dataKey='equipment'
                  name='Equipment'
                  stackId='a'
                  fill='#10b981'
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 12: Funnel Chart - Sales Pipeline */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-violet-500 text-[20px]'>filter_alt</span>
            {labels.card12}
          </h3>
          <div className='flex-1 flex items-center'>
            <ResponsiveContainer width='60%' height='100%'>
              <FunnelChart>
                <Tooltip content={<SimpleTooltip />} />
                <Funnel dataKey='value' data={funnelData} isAnimationActive>
                  <LabelList position='center' fill='#fff' fontSize={10} fontWeight='bold' />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
            <div className='flex-1 space-y-1.5 ps-2'>
              {funnelData.map((item, idx) => (
                <div key={item.name} className='flex items-center gap-2 text-xs'>
                  <div
                    className='w-2.5 h-2.5 rounded-full shrink-0'
                    style={{ backgroundColor: item.fill }}
                  ></div>
                  <span className='text-gray-600 dark:text-gray-400'>{item.name}</span>
                  <span className='font-bold text-gray-800 dark:text-gray-200 ms-auto'>
                    {item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 13: Gauge - Target Achievement */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-emerald-500 text-[20px]'>speed</span>
            {labels.card13}
          </h3>
          <div className='flex-1 flex flex-col items-center justify-center'>
            <ResponsiveContainer width='100%' height={140}>
              <RadialBarChart
                cx='50%'
                cy='100%'
                innerRadius='70%'
                outerRadius='100%'
                barSize={16}
                data={gaugeData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  background={{ fill: isDark ? '#374151' : '#e5e7eb' }}
                  dataKey='value'
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className='text-center -mt-8'>
              <p className='text-4xl font-bold text-gray-900 dark:text-gray-100'>
                {gaugeData[0].value}%
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                {isRTL ? 'تحقيق الهدف' : 'Target Achieved'}
              </p>
            </div>
          </div>
        </div>

        {/* Card 14: Horizontal Bar Chart - Top Products */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-amber-500 text-[20px]'>leaderboard</span>
            {labels.card14}
          </h3>
          <div className='flex-1' dir='ltr'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart
                data={[
                  { name: 'Paracetamol', sales: 1250, fill: '#3b82f6' },
                  { name: 'Ibuprofen', sales: 980, fill: '#8b5cf6' },
                  { name: 'Vitamin C', sales: 820, fill: '#10b981' },
                  { name: 'Amoxicillin', sales: 650, fill: '#f59e0b' },
                  { name: 'Omeprazole', sales: 520, fill: '#ef4444' },
                ]}
                layout='vertical'
                margin={{ top: 5, right: 20, left: 70, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray='3 3' horizontal={false} stroke={chartStyle.grid} />
                <XAxis
                  type='number'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <YAxis
                  type='category'
                  dataKey='name'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                  width={65}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className='bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700'>
                          <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                            {payload[0].payload.name}
                          </p>
                          <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                            {payload[0].value} units
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey='sales' radius={[0, 6, 6, 0]}>
                  {[
                    { fill: '#3b82f6' },
                    { fill: '#8b5cf6' },
                    { fill: '#10b981' },
                    { fill: '#f59e0b' },
                    { fill: '#ef4444' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 15: Composed Chart - Revenue vs Orders */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-blue-500 text-[20px]'>insights</span>
            {labels.card15}
          </h3>
          <div className='flex-1' dir='ltr'>
            <ResponsiveContainer width='100%' height='100%'>
              <ComposedChart
                data={composedData}
                margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke={chartStyle.grid} />
                <XAxis
                  dataKey='month'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <YAxis
                  yAxisId='left'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <YAxis
                  yAxisId='right'
                  orientation='right'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartStyle.tick, fontSize: 10 }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className='bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700'>
                          <p className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'>
                            {label}
                          </p>
                          <p className='text-sm text-blue-600 dark:text-blue-400'>
                            Revenue:{' '}
                            <span className='font-bold'>
                              ${payload[0]?.value?.toLocaleString()}
                            </span>
                          </p>
                          <p className='text-sm text-emerald-600 dark:text-emerald-400'>
                            Orders: <span className='font-bold'>{payload[1]?.value}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ stroke: chartStyle.grid, strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Bar
                  yAxisId='left'
                  dataKey='revenue'
                  fill='#3b82f6'
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Line
                  yAxisId='right'
                  type='monotone'
                  dataKey='orders'
                  stroke='#10b981'
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
