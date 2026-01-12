/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPANDED CHART MODAL - Modular Chart & Table Component
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * @file ExpandedChartModal.tsx
 * @description A highly configurable modal component for displaying interactive
 * charts and data tables with statistics, export capabilities, and various
 * visualization options.
 * 
 * @features
 * - 📊 Multiple chart types (Area Chart, Bar Chart)
 * - 📈 Real-time statistics (Current, Average, Min, Max)
 * - 🎨 Customizable colors and styling
 * - 📅 Period filtering (7D, 1M, 3M, All)
 * - 🔍 Interactive brush/zoom control
 * - 📋 Virtualized table view for performance
 * - 💾 Export capabilities (CSV, PNG, Print)
 * - 🎛️ Toggle-able features for maximum flexibility
 * 
 * @architecture
 * This component follows a modular architecture:
 * - Main Component: ExpandedChartModal (orchestrates everything)
 * - Sub-Components: StatsCard, ChartControls, ExportButtons, CustomTooltip, etc.
 * - Custom Hooks: useChartData, useBrush, useTableVirtualization
 * - Utility Functions: generateDetailedData, calculateStats, seededRandom
 * 
 * @usage_basic
 * ```tsx
 * <ExpandedChartModal
 *   isOpen={true}
 *   onClose={() => setIsOpen(false)}
 *   data={[
 *     { date: 'Jan', value: 1000 },
 *     { date: 'Feb', value: 1500 },
 *     { date: 'Mar', value: 1200 }
 *   ]}
 *   title="Sales Revenue"
 *   color="#3B82F6"
 *   unit="$"
 * />
 * ```
 * 
 * @usage_custom
 * ```tsx
 * <ExpandedChartModal
 *   isOpen={true}
 *   onClose={() => setIsOpen(false)}
 *   data={salesData}
 *   title="Monthly Revenue"
 *   color="#10B981"
 *   unit="EGP "
 *   // تخصيص الميزات المعروضة
 *   features={{
 *     showStats: true,              // عرض الإحصائيات
 *     showChartTypeToggle: false,   // إخفاء زر تبديل نوع الرسم
 *     showLineStyleToggle: false,   // إخفاء زر نمط الخط
 *     showPeriodSelector: true,     // عرض اختيار الفترة
 *     showBrush: true,             // عرض شريط التمرير
 *     showExportButtons: false,     // إخفاء أزرار التصدير
 *     showTableView: true,         // عرض خيار الجدول
 *     showDateRange: true,         // عرض نطاق التاريخ
 *   }}
 *   // إعدادات الرسم البياني
 *   chartConfig={{
 *     defaultChartType: 'bar',      // نوع الرسم الافتراضي
 *     defaultLineStyle: 'solid',    // نمط الخط الافتراضي
 *     defaultPeriod: '1m',         // الفترة الافتراضية
 *     enableAnimation: true,        // تفعيل الحركات
 *     chartHeight: 500,            // ارتفاع الرسم بالبكسل
 *   }}
 * />
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🤖 AI EDITING INSTRUCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * When modifying this file, you MUST:
 * 1. Update all relevant JSDoc comments when changing function signatures
 * 2. Update inline comments when changing logic flow
 * 3. Update the @usage examples if the API changes
 * 4. Keep Arabic comments synchronized with English ones
 * 5. Maintain the visual separators (═══) for section clarity
 * 6. Update the @features list if adding/removing capabilities
 * 7. Preserve the modular structure - don't merge separated components
 * 
 * عند تعديل هذا الملف، يجب عليك:
 * 1. تحديث جميع تعليقات JSDoc عند تغيير توقيعات الدوال
 * 2. تحديث التعليقات المضمنة عند تغيير منطق البرنامج
 * 3. تحديث أمثلة الاستخدام إذا تغيرت الواجهة البرمجية
 * 4. الحفاظ على تزامن التعليقات العربية مع الإنجليزية
 * 5. الحفاظ على الفواصل المرئية للوضوح
 * 6. تحديث قائمة الميزات عند الإضافة/الحذف
 * 7. الحفاظ على البنية المعيارية - عدم دمج المكونات المنفصلة
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback, memo, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Brush, BarChart, Bar 
} from 'recharts';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES - واجهات الأنواع
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main component props for ExpandedChartModal
 * Props الخاصة بالـ component الرئيسي
 * 
 * @interface ExpandedChartModalProps
 */
interface ExpandedChartModalProps {
  /** Whether the modal is open / هل النافذة مفتوحة */
  isOpen: boolean;
  
  /** Function to close the modal / دالة لإغلاق النافذة */
  onClose: () => void;
  
  /** Array of data points to display / مصفوفة نقاط البيانات للعرض */
  data: any[];
  
  /** Modal title / عنوان النافذة */
  title: string;
  
  /** Primary color for charts and highlights (hex format) / اللون الأساسي للرسومات */
  color: string;
  
  /** Unit symbol to display before values (e.g., "$", "EGP ") / رمز الوحدة */
  unit?: string;
  
  /**
   * Feature toggle configuration
   * إعدادات تفعيل/تعطيل الميزات
   * 
   * All features are enabled by default
   * جميع الميزات مفعلة افتراضياً
   */
  features?: {
    /** Show statistics cards (Current, Avg, Min, Max) / عرض بطاقات الإحصائيات */
    showStats?: boolean;
    
    /** Show chart type toggle (Area/Bar) / عرض زر تبديل نوع الرسم */
    showChartTypeToggle?: boolean;
    
    /** Show line style toggle (Solid/Dashed) - Area charts only / عرض زر نمط الخط */
    showLineStyleToggle?: boolean;
    
    /** Show period selector (7D, 1M, 3M, All) / عرض اختيار الفترة الزمنية */
    showPeriodSelector?: boolean;
    
    /** Show interactive brush/zoom slider / عرض شريط التمرير التفاعلي */
    showBrush?: boolean;
    
    /** Show export buttons (CSV, PNG, Print) / عرض أزرار التصدير */
    showExportButtons?: boolean;
    
    /** Show table view option / عرض خيار عرض الجدول */
    showTableView?: boolean;
    
    /** Show date range indicator / عرض مؤشر نطاق التاريخ */
    showDateRange?: boolean;
  };
  
  /**
   * Chart configuration options
   * خيارات إعداد الرسم البياني
   */
  chartConfig?: {
    /** Default chart type on load / نوع الرسم الافتراضي */
    defaultChartType?: 'area' | 'bar';
    
    /** Default line style for area charts / نمط الخط الافتراضي */
    defaultLineStyle?: 'solid' | 'dashed';
    
    /** Default time period filter / الفترة الزمنية الافتراضية */
    defaultPeriod?: string;
    
    /** Enable chart animations / تفعيل حركات الرسم */
    enableAnimation?: boolean;
    
    /** Chart container height in pixels / ارتفاع حاوية الرسم بالبكسل */
    chartHeight?: number;
  };
  
  /** Language for localization / اللغة للترجمة */
  language?: 'EN' | 'AR';
}

/**
 * Props for individual statistics cards
 * Props لبطاقات الإحصائيات الفردية
 * 
 * @interface StatsCardProps
 */
interface StatsCardProps {
  /** Card label (e.g., "Current Value", "Average") / تسمية البطاقة */
  label: string;
  
  /** Numeric or string value to display / القيمة العددية أو النصية */
  value: string | number;
  
  /** Optional color for the value text / لون اختياري للنص */
  color?: string;
  
  /** Optional percentage change to show trend / نسبة التغيير لعرض الاتجاه */
  change?: number;
  
  /** Unit symbol (e.g., "$", "kg") / رمز الوحدة */
  unit?: string;
}

/**
 * Props for chart control buttons group
 * Props لمجموعة أزرار التحكم في الرسم
 * 
 * @interface ChartControlsProps
 */
interface ChartControlsProps {
  /** Current view mode (chart or table) / وضع العرض الحالي */
  viewMode: 'chart' | 'table';
  
  /** Current chart type (area or bar) / نوع الرسم الحالي */
  chartType: 'area' | 'bar';
  
  /** Current line style for area charts / نمط الخط الحالي */
  lineStyle: 'solid' | 'dashed';
  
  /** Currently selected time period / الفترة الزمنية المختارة */
  period: string;
  
  /** Callback when view mode changes / Callback عند تغيير وضع العرض */
  onViewModeChange: (val: string) => void;
  
  /** Callback when chart type changes / Callback عند تغيير نوع الرسم */
  onChartTypeChange: (val: string) => void;
  
  /** Callback when line style changes / Callback عند تغيير نمط الخط */
  onLineStyleChange: (val: string) => void;
  
  /** Callback when period changes / Callback عند تغيير الفترة */
  onPeriodChange: (val: string) => void;
  
  /** Feature toggles from parent / إعدادات الميزات من المكون الأب */
  features: ExpandedChartModalProps['features'];
}

/**
 * Props for export action buttons
 * Props لأزرار التصدير
 * 
 * @interface ExportButtonsProps
 */
interface ExportButtonsProps {
  /** Handler for CSV export / معالج تصدير CSV */
  onExportCSV?: () => void;
  
  /** Handler for PNG export / معالج تصدير PNG */
  onExportPNG?: () => void;
  
  /** Handler for print action / معالج الطباعة */
  onPrint?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS - الوظائف المساعدة
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates a seeded random number for consistent random results
 * توليد رقم عشوائي مع بذرة للحصول على نتائج متسقة
 * 
 * @param {number} seed - The seed value / قيمة البذرة
 * @returns {number} A pseudo-random number between 0 and 1
 */
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * Generates detailed interpolated data from sparse input data
 * توليد بيانات تفصيلية من بيانات متفرقة
 * 
 * @param {any[]} inputData - Original data array
 * @returns {any[]} Expanded data with interpolated points
 */
const generateDetailedData = (inputData: any[]) => {
  // Handle empty data / معالجة البيانات الفارغة
  if (!inputData || inputData.length === 0) return [];
  
  // Interpolate if data is sparse / حساب نقاط إضافية إذا كانت البيانات متفرقة
  if (inputData.length < 10) {
    const pointsPerSegment = 5; // Points between each pair / نقاط بين كل زوج
    const detailed = inputData.slice(0, -1).flatMap((item, i) => {
      const start = item.value;
      const end = inputData[i + 1].value;
      return Array.from({ length: pointsPerSegment }, (_, j) => {
        const seed = i * pointsPerSegment + j + 1;
        const randomFactor = (seededRandom(seed) - 0.5) * (start * 0.05); // ±5% variance
        return {
          date: `Day ${seed}`,
          value: Math.round(start + (end - start) * (j / pointsPerSegment) + randomFactor),
          original: false // Interpolated point / نقطة محسوبة
        };
      });
    });
    detailed.push({ 
      date: `Day ${inputData.length * pointsPerSegment}`, 
      value: inputData[inputData.length - 1].value,
      original: true // Original data point / نقطة أصلية
    });
    return detailed;
  }
  // Data is already dense / البيانات كثيفة بالفعل
  return inputData.map((d, i) => ({ ...d, date: d.date || `Day ${i + 1}` }));
};

/**
 * Calculates statistical metrics from an array of values
 * حساب المقاييس الإحصائية من مصفوفة القيم
 * 
 * @param {number[]} values - Array of numeric values
 * @returns {Object} Statistics (sum, avg, min, max, current, change%)
 */
const calculateStats = (values: number[]) => {
  // Handle empty array / معالجة المصفوفة الفارغة
  if (values.length === 0) return { sum: 0, avg: 0, min: 0, max: 0, current: 0, change: 0 };
  
  const sum = values.reduce((a, b) => a + b, 0); // Total sum / المجموع
  const avg = Math.round(sum / values.length); // Average / المتوسط
  const min = Math.min(...values); // Minimum / الحد الأدنى
  const max = Math.max(...values); // Maximum / الحد الأقصى
  const current = values[values.length - 1]; // Last value / القيمة الأخيرة
  const previous = values[0]; // First value / القيمة الأولى
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0; // % change
  
  return { sum, avg, min, max, current, change };
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS - المكونات الفرعية
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Statistics Card Component - Displays a single stat with optional trend
 * مكون بطاقة الإحصائيات - يعرض إحصائية واحدة مع اتجاه اختياري
 * 
 * @component
 * @param {StatsCardProps} props - Component props
 */
const StatsCard: React.FC<StatsCardProps> = memo(({ label, value, color, change, unit = '' }) => (
  <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
    <div className="flex items-end gap-2 mt-1">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white" style={color ? { color } : undefined}>
        {typeof value === 'number' ? `${value.toLocaleString()}${unit}` : value}
      </h3>
      {change !== undefined && (
        <span className={`text-xs font-bold mb-1 ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {change > 0 ? '+' : ''}{change.toFixed(1)}%
        </span>
      )}
    </div>
  </div>
));
StatsCard.displayName = 'StatsCard';

/**
 * Custom Tooltip for Charts - Shows data on hover
 * Tooltip مخصص للرسومات - يعرض البيانات عند التمرير
 * 
 * @component
 */
const CustomTooltipContent = memo(({ active, payload, label, color, unit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white" style={{ color }}>
          {payload[0].value.toLocaleString()}{unit}
        </p>
      </div>
    );
  }
  return null;
});
CustomTooltipContent.displayName = 'CustomTooltipContent';

/**
 * Custom Brush Handle for interactive slider
 * Handle مخصص لشريط التمرير التفاعلي
 * 
 * @component
 */
const CustomBrushHandle = memo(({ x, y, height, color }: any) => (
  <g style={{ outline: 'none' }}>
    {/* Main handle rectangle / المستطيل الأساسي */}
    <rect
      x={x - 4}
      y={y}
      width={8}
      height={height}
      fill="#fff"
      stroke={color}
      strokeWidth={2}
      rx={4}
      style={{ cursor: 'ew-resize', outline: 'none' }}
    />
    {/* Center grip line / خط المقبض المركزي */}
    <line
      x1={x}
      y1={y + height * 0.3}
      x2={x}
      y2={y + height * 0.7}
      stroke={color}
      strokeWidth={1}
    />
  </g>
));
CustomBrushHandle.displayName = 'CustomBrushHandle';

/**
 * Chart Controls Component - Groups all control toggles
 * مكون أدوات التحكم - يجمع كل أزرار التحكم في الرسم
 * 
 * @component
 * @param {ChartControlsProps} props - Component props
 */
const ChartControls: React.FC<ChartControlsProps> = memo(({ 
  viewMode, chartType, lineStyle, period,
  onViewModeChange, onChartTypeChange, onLineStyleChange, onPeriodChange,
  features
}) => (
  <div className="flex flex-wrap items-center gap-3">
    {/* View Toggle - Always available if showTableView enabled */}
    {/* زر التبديل بين الرسم والجدول - متاح دائماً إذا كان showTableView مفعل */}
    {features?.showTableView !== false && (
      <div className="w-24">
        <SegmentedControl
          value={viewMode}
          onChange={onViewModeChange}
          options={[
            { label: '', value: 'chart', icon: 'show_chart' },
            { label: '', value: 'table', icon: 'table_chart' }
          ]}
          size="sm"
          variant="onPage"
        />
      </div>
    )}

    {/* Chart Type Toggle - Only in chart view */}
    {/* زر نوع الرسم - يظهر فقط في وضع الرسم */}
    {viewMode === 'chart' && features?.showChartTypeToggle !== false && (
      <div className="w-24 animate-fade-in">
        <SegmentedControl
          value={chartType}
          onChange={onChartTypeChange}
          options={[
            { label: '', value: 'area', icon: 'area_chart' },
            { label: '', value: 'bar', icon: 'bar_chart' }
          ]}
          size="sm"
          variant="onPage"
          color="blue"
        />
      </div>
    )}

    {/* Line Style Toggle - Only with Area chart */}
    {/* زر نمط الخط - فقط مع رسم المساحة */}
    {viewMode === 'chart' && chartType === 'area' && features?.showLineStyleToggle !== false && (
      <div className="w-24 animate-fade-in">
        <SegmentedControl
          value={lineStyle}
          onChange={onLineStyleChange}
          options={[
            { label: '', value: 'solid', icon: 'remove' },
            { label: '', value: 'dashed', icon: 'more_horiz' }
          ]}
          size="sm"
          variant="onPage"
          color="gray"
        />
      </div>
    )}
    
    {/* Period Selector - Shows in chart view */}
    {/* اختيار الفترة - يظهر في وضع الرسم */}
    {viewMode === 'chart' && features?.showPeriodSelector !== false && (
      <div className="w-64 animate-fade-in">
        <SegmentedControl
          value={period}
          onChange={onPeriodChange}
          options={[
            { label: '7D', value: '7d' },
            { label: '1M', value: '1m' },
            { label: '3M', value: '3m' },
            { label: 'All', value: 'all' }
          ]}
          size="sm"
          variant="onPage"
          color="indigo"
        />
      </div>
    )}
  </div>
));
ChartControls.displayName = 'ChartControls';

/**
 * Export Buttons Component - Provides data export options
 * مكون أزرار التصدير - يوفر خيارات تصدير البيانات
 * 
 * @component
 * @param {ExportButtonsProps} props - Component props
 */
const ExportButtons: React.FC<ExportButtonsProps> = memo(({ onExportCSV, onExportPNG, onPrint }) => (
  <div className="flex items-center gap-2">
    {/* CSV Export Button / زر تصدير CSV */}
    <button 
      onClick={onExportCSV}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition-colors"
    >
      <span className="material-symbols-rounded text-base">download</span>
      CSV
    </button>
    
    {/* PNG Export Button / زر تصدير PNG */}
    <button 
      onClick={onExportPNG}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition-colors"
    >
      <span className="material-symbols-rounded text-base">image</span>
      PNG
    </button>
    
    {/* Print Button / زر الطباعة */}
    <button 
      onClick={onPrint}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition-colors"
    >
      <span className="material-symbols-rounded text-base">print</span>
      Print
    </button>
  </div>
));
ExportButtons.displayName = 'ExportButtons';

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM HOOKS - Hooks مخصصة
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Custom hook for processing and filtering chart data
 * Hook مخصص لمعالجة وتصفية بيانات الرسم
 * 
 * @param {any[]} data - Raw data array / مصفوفة البيانات الخام
 * @param {string} period - Selected time period / الفترة الزمنية المختارة
 * @returns {Object} Processed data and statistics
 * @returns {any[]} return.detailedData - Interpolated detailed data
 * @returns {any[]} return.filteredData - Period-filtered data
 * @returns {Object} return.stats - Calculated statistics
 */
const useChartData = (data: any[], period: string) => {
  // Generate detailed data with interpolation مع الحفظ في الذاكرة
  // Memoized to avoid recalculation on every render
  const detailedData = useMemo(() => generateDetailedData(data), [data]);
  
  // Filter data based on selected period
  // تصفية البيانات بناءً على الفترة المختارة
  const filteredData = useMemo(() => {
    if (period === 'all') return detailedData;
    const periodDays = period === '7d' ? 7 : period === '1m' ? 30 : period === '3m' ? 90 : detailedData.length;
    return detailedData.slice(Math.max(0, detailedData.length - periodDays));
  }, [detailedData, period]);

  // Calculate statistics from filtered data
  // حساب الإحصائيات من البيانات المصفاة
  const stats = useMemo(() => {
    const values = filteredData.map(d => d.value);
    return calculateStats(values);
  }, [filteredData]);

  return { detailedData, filteredData, stats };
};

/**
 * Custom hook for brush/zoom slider functionality
 * Hook مخصص لوظيفة شريط التمرير والتكبير
 * 
 * @param {any[]} filteredData - Filtered data array / البيانات المصفاة
 * @returns {Object} Brush state and handlers
 * @returns {Object|null} return.brushRange - Current brush selection range
 * @returns {Function} return.handleBrushChange - Brush change handler
 * @returns {Object} return.displayedRange - Displayed date range info
 */
const useBrush = (filteredData: any[]) => {
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(null);

  // Handle brush range changes / معالجة تغييرات نطاق الشريط
  const handleBrushChange = useCallback((range: { startIndex?: number; endIndex?: number }) => {
    if (range.startIndex !== undefined && range.endIndex !== undefined) {
      setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
    }
  }, []);

  // Calculate the currently displayed range
  // حساب النطاق المعروض حالياً
  const displayedRange = useMemo(() => {
    if (brushRange && filteredData.length > 0) {
      const start = filteredData[brushRange.startIndex]?.date || filteredData[0]?.date;
      const end = filteredData[brushRange.endIndex]?.date || filteredData[filteredData.length - 1]?.date;
      const count = brushRange.endIndex - brushRange.startIndex + 1;
      return { start, end, count };
    }
    return {
      start: filteredData[0]?.date || 'Start',
      end: filteredData[filteredData.length - 1]?.date || 'End',
      count: filteredData.length
    };
  }, [brushRange, filteredData]);

  return { brushRange, handleBrushChange, displayedRange };
};

/**
 * Custom hook for table virtualization (performance optimization)
 * Hook مخصص لجدول افتراضي (تحسين الأداء)
 * 
 * Only renders visible rows instead of the entire table for better performance
 * يعرض فقط الصفوف المرئية بدلاً من الجدول بالكامل لأداء أفضل
 * 
 * @param {any[]} detailedData - Full detailed data / البيانات الكاملة
 * @param {number} rowHeight - Height of each row in pixels / ارتفاع كل صف
 * @param {number} visibleRows - Number of visible rows / عدد الصفوف المرئية
 * @returns {Object} Virtualization state and handlers
 */
const useTableVirtualization = (detailedData: any[], rowHeight = 40, visibleRows = 20) => {
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  // Handle scroll events / معالجة أحداث التمرير
  const handleTableScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setTableScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate which rows are currently visible
  // حساب الصفوف المرئية حالياً
  const visibleStartIndex = Math.floor(tableScrollTop / rowHeight);
  const visibleEndIndex = Math.min(visibleStartIndex + visibleRows + 2, detailedData.length);
  const visibleData = detailedData.slice(visibleStartIndex, visibleEndIndex);
  
  // Calculate padding for smooth scrolling
  // حساب المساحة للتمرير السلس
  const topPadding = visibleStartIndex * rowHeight;
  const bottomPadding = Math.max(0, (detailedData.length - visibleEndIndex) * rowHeight);

  return { 
    tableRef, 
    handleTableScroll, 
    visibleData, 
    visibleStartIndex, 
    topPadding, 
    bottomPadding,
    rowHeight
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT - المكون الرئيسي
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ExpandedChartModal - Main modal component for chart visualization
 * المكون الرئيسي لنافذة الرسوم البيانية الموسعة
 * 
 * A highly modular and configurable chart modal with multiple visualization
 * options, statistics, and export capabilities.
 * 
 * @component
 * @param {ExpandedChartModalProps} props - Component properties
 * 
 * @example
 * // Basic usage
 * <ExpandedChartModal
 *   isOpen={true}
 *   onClose={() => setIsOpen(false)}
 *   data={chartData}
 *   title="Sales Analytics"
 *   color="#3B82F6"
 *   unit="$"
 * />
 * 
 * @example
 * // Advanced usage with custom configuration
 * <ExpandedChartModal
 *   isOpen={true}
 *   onClose={() => setIsOpen(false)}
 *   data={chartData}
 *   title="Revenue Analysis"
 *   color="#10B981"
 *   unit="EGP "
 *   features={{
 *     showStats: true,
 *     showChartTypeToggle: false,
 *     showBrush: true
 *   }}
 *   chartConfig={{
 *     defaultChartType: 'bar',
 *     defaultPeriod: '1m',
 *     chartHeight: 500
 *   }}
 * />
 */

export const ExpandedChartModal: React.FC<ExpandedChartModalProps> = ({
  isOpen, 
  onClose, 
  data, 
  title, 
  color, 
  unit = '',
  // Default features - All enabled by default / جميع الميزات مفعلة افتراضياً
  features = {
    showStats: true,
    showChartTypeToggle: true,
    showLineStyleToggle: true,
    showPeriodSelector: true,
    showBrush: true,
    showExportButtons: true,
    showTableView: true,
    showDateRange: true,
  },
  // Default chart config / الإعدادات الافتراضية للرسم
  chartConfig = {
    defaultChartType: 'area',
    defaultLineStyle: 'dashed',
    defaultPeriod: 'all',
    enableAnimation: true,
    chartHeight: 384,
  },
  language = 'EN'
}) => {
  // ═════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT - إدارة الحالة
  // ═════════════════════════════════════════════════════════════════
  
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart'); // Current view
  const [chartType, setChartType] = useState<'area' | 'bar'>(chartConfig.defaultChartType || 'area'); // Chart type
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed'>(chartConfig.defaultLineStyle || 'dashed'); // Line style
  const [period, setPeriod] = useState<string>(chartConfig.defaultPeriod || 'all'); // Time period

  // ═════════════════════════════════════════════════════════════════
  // CUSTOM HOOKS - استخدام الـ Hooks المخصصة
  // ═════════════════════════════════════════════════════════════════
  
  const { detailedData, filteredData, stats } = useChartData(data, period); // Data processing
  const { brushRange, handleBrushChange, displayedRange } = useBrush(filteredData); // Brush control
  const { 
    tableRef, 
    handleTableScroll, 
    visibleData, 
    visibleStartIndex, 
    topPadding, 
    bottomPadding,
    rowHeight
  } = useTableVirtualization(detailedData); // Table virtualization

  // ═════════════════════════════════════════════════════════════════
  // EVENT HANDLERS - معالجات الأحداث
  // ═════════════════════════════════════════════════════════════════
  const handleViewModeChange = useCallback((val: string) => setViewMode(val as 'chart' | 'table'), []);
  const handleChartTypeChange = useCallback((val: string) => setChartType(val as 'area' | 'bar'), []);
  const handleLineStyleChange = useCallback((val: string) => setLineStyle(val as 'solid' | 'dashed'), []);
  const handlePeriodChange = useCallback((val: string) => setPeriod(val), []);

  // ═════════════════════════════════════════════════════════════════
  // MEMOIZED COMPONENTS - مكونات محفوظة في الذاكرة
  // ═════════════════════════════════════════════════════════════════
  
  // Memoized brush handle with color prop / Handle محفوظة مع اللون
  const BrushTraveller = useCallback((props: any) => <CustomBrushHandle {...props} color={color} />, [color]);
  
  // Memoized tooltip with color and unit / Tooltip محفوظة مع اللون والوحدة  
  const tooltipContent = useCallback((props: any) => <CustomTooltipContent {...props} color={color} unit={unit} />, [color, unit]);

  // ═════════════════════════════════════════════════════════════════
  // EXPORT FUNCTIONS - وظائف التصدير
  // ═════════════════════════════════════════════════════════════════
  
  /**
   * Export data to CSV format
   * تصدير البيانات بصيغة CSV
   * TODO: Implement CSV generation and download
   */
  const handleExportCSV = useCallback(() => {
    console.log('Exporting CSV...');
    // Implementation needed: Generate CSV from detailedData
  }, []);

  /**
   * Export chart as PNG image
   * تصدير الرسم كصورة PNG
   * TODO: Implement chart screenshot and download
   */
  const handleExportPNG = useCallback(() => {
    console.log('Exporting PNG...');
    // Implementation needed: Capture chart as image
  }, []);

  /**
   * Print chart
   * طباعة الرسم
   * TODO: Implement print functionality
   */
  const handlePrint = useCallback(() => {
    console.log('Printing...');
    // Implementation needed: Prepare and print chart
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Detailed Analysis & History"
      icon="analytics"
      size="5xl"
    >
      <div className="space-y-6">
        
        {/* ═══════════════════════════════════════════════════════════════
            SECTION 1: STATISTICS CARDS
            عرض بطاقات الإحصائيات (اختياري)
            Shows current value with trend, average, min, and max
            ═══════════════════════════════════════════════════════════════ */}
        {features.showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard label="Current Value" value={stats.current} unit={unit} change={stats.change} />
            <StatsCard label="Total" value={stats.sum} unit={unit} />
            <StatsCard label="Average" value={stats.avg} unit={unit} />
            <StatsCard label="Maximum" value={stats.max} unit={unit} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 2: CONTROLS & ACTIONS
            أدوات التحكم وأزرار الإجراءات
            Displays chart controls and export buttons based on features
            ═══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Chart Control Toggles / أزرار التحكم في الرسم */}
          <ChartControls
            viewMode={viewMode}
            chartType={chartType}
            lineStyle={lineStyle}
            period={period}
            onViewModeChange={handleViewModeChange}
            onChartTypeChange={handleChartTypeChange}
            onLineStyleChange={handleLineStyleChange}
            onPeriodChange={handlePeriodChange}
            features={features}
          />

          {/* Export Action Buttons (Optional) / أزرار التصدير (اختياري) */}
          {features.showExportButtons && (
            <ExportButtons
              onExportCSV={handleExportCSV}
              onExportPNG={handleExportPNG}
              onPrint={handlePrint}
            />
          )}
        </div>

        {/* 3. Main Content Area - Chart or Table */}
        <div 
          className="min-h-[384px] rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden relative"
          style={{ height: chartConfig.chartHeight }}
        >
          {viewMode === 'chart' ? (
            <div className="w-full h-full flex flex-col pt-4">
              {/* Remove focus outlines */}
              <style>{`
                .recharts-brush-traveller { outline: none !important; cursor: ew-resize !important; }
                .recharts-brush-traveller *:focus { outline: none !important; }
                .recharts-brush-traveller group:focus { outline: none !important; }
              `}</style>
              
              <div className="flex-1 w-full min-h-0 [&_*]:outline-none [&_*]:ring-0 [&_*]:focus:outline-none">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area' ? (
                    <AreaChart data={filteredData} margin={{ top: 20, right: 0, left: language === 'AR' ? 50 : 0, bottom: 20 }}>
                      <defs>
                        <linearGradient id="expandedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" hide padding={{ left: 0, right: 0 }} />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fontSize: 11, fill: '#6B7280', dx: language === 'AR' ? -40 : 0, textAnchor: 'end' }} 
                        tickFormatter={(value) => `${value}${unit}`}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip content={tooltipContent} cursor={false} />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={color} 
                        strokeWidth={2} 
                        strokeDasharray={lineStyle === 'dashed' ? "5 5" : undefined}
                        fill="url(#expandedGradient)" 
                        animationDuration={500}
                        isAnimationActive={chartConfig.enableAnimation && filteredData.length < 100}
                      />
                      {features.showBrush && (
                        <Brush 
                          dataKey="date" 
                          height={30} 
                          stroke="transparent"
                          fill="transparent"
                          traveller={BrushTraveller}
                          startIndex={0}
                          gap={5}
                          onChange={handleBrushChange}
                        >
                          <AreaChart>
                            <Area dataKey="value" fill={color} stroke="none" fillOpacity={0.1} dot={false} activeDot={false} />
                          </AreaChart>
                        </Brush>
                      )}
                    </AreaChart>
                  ) : (
                    <BarChart data={filteredData} margin={{ top: 20, right: 0, left: language === 'AR' ? 50 : 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" hide padding={{ left: 0, right: 0 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6B7280', dx: language === 'AR' ? -40 : 0, textAnchor: 'end' }} tickFormatter={(value) => `${value}${unit}`} />
                      <Tooltip content={tooltipContent} cursor={{ fill: 'transparent' }} />
                      <Bar 
                        dataKey="value" 
                        fill={color} 
                        radius={[50, 50, 50, 50]} 
                        maxBarSize={60}
                        activeBar={{ fill: color, opacity: 0.6 }} // Change shade on hover (suitable for light/dark) / تغيير الدرجة عند التمرير
                        isAnimationActive={chartConfig.enableAnimation && filteredData.length < 100}
                      />
                      {features.showBrush && (
                        <Brush 
                          dataKey="date" 
                          height={40} 
                          stroke="transparent"
                          fill="transparent"
                          traveller={BrushTraveller}
                          startIndex={0}
                          gap={5}
                          onChange={handleBrushChange}
                        >
                          <BarChart>
                            <Bar dataKey="value" fill={color} opacity={0.2} />
                          </BarChart>
                        </Brush>
                      )}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              
              {/* Date Range Indicator - قابل للإخفاء */}
              {features.showDateRange && (
                <div className="flex justify-between items-center px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-rounded text-sm">calendar_today</span>
                    {displayedRange.start}
                  </span>
                  <span className="font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800" style={{ color }}>
                    {displayedRange.count} {language === 'AR' ? 'سجل' : 'records'}
                  </span>
                  <span className="flex items-center gap-1">
                    {displayedRange.end}
                    <span className="material-symbols-rounded text-sm">calendar_today</span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Virtualized Table View */
            <div 
              ref={tableRef}
              className="w-full h-full overflow-auto"
              onScroll={handleTableScroll}
            >
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500">Date Point</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Value</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {/* Top spacer for virtualization */}
                  {topPadding > 0 && (
                    <tr style={{ height: topPadding }}>
                      <td colSpan={3}></td>
                    </tr>
                  )}
                  {/* Only render visible rows */}
                  {visibleData.map((row, idx) => {
                    const actualIdx = visibleStartIndex + idx;
                    const prevValue = actualIdx > 0 ? detailedData[actualIdx - 1]?.value : null;
                    return (
                      <tr key={actualIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50" style={{ height: rowHeight }}>
                        <td className="px-6 py-3 text-gray-900 dark:text-gray-100">{row.date}</td>
                        <td className="px-6 py-3 font-medium">{row.value.toLocaleString()}{unit}</td>
                        <td className="px-6 py-3">
                          {prevValue !== null ? (
                            <span className={row.value >= prevValue ? 'text-emerald-500' : 'text-rose-500'}>
                              {row.value >= prevValue ? '↑' : '↓'}
                              {Math.abs(((row.value - prevValue) / prevValue) * 100).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Bottom spacer for virtualization */}
                  {bottomPadding > 0 && (
                    <tr style={{ height: bottomPadding }}>
                      <td colSpan={3}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
};
