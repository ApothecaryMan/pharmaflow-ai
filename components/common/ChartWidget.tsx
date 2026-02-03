import type React from 'react';
import { memo, useLayoutEffect, useRef, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SegmentedControl } from './SegmentedControl'; // Adjust path if needed

// --- Custom Tooltip Component ---
export const CustomTooltipContent = memo(
  ({
    active,
    payload,
    label,
    unit,
    employees,
    selectedEmployeeId,
    showComparison,
    primaryLabel,
  }: any) => {
    if (active && payload && payload.length) {
      // Find the main employee's data (sales)
      const mainData = payload.find((p: any) => p.dataKey === 'sales');
      const otherEmployees = payload.filter(
        (p: any) => p.dataKey !== 'sales' && p.dataKey !== 'profit'
      );

      return (
        <div className='backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 saturate-150 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 min-w-[180px]'>
          <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>{label}</p>

          {/* Main Employee */}
          {mainData && (
            <div className='mb-2'>
              <p className='text-xs text-gray-400 mb-0.5'>
                {primaryLabel ||
                  employees?.find((e: any) => e.id === selectedEmployeeId)?.name ||
                  'You'}
              </p>
              <p
                className='text-lg font-bold text-gray-900 dark:text-white'
                style={{ color: mainData.color || mainData.fill }}
              >
                <span dir='ltr'>{mainData.value.toLocaleString()}</span>{' '}
                <span className='text-sm'>{unit}</span>
              </p>
            </div>
          )}

          {/* Other Employees (Comparison) */}
          {showComparison && otherEmployees.length > 0 && (
            <div className='pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1'>
              {otherEmployees.map((emp: any, idx: number) => {
                const employee = employees?.find((e: any) => e.id === emp.dataKey);
                const name = employee?.name || emp.dataKey;

                return (
                  <div key={idx} className='flex items-center justify-between text-xs'>
                    <span className='text-gray-600 dark:text-gray-400'>{name}</span>
                    <span className='font-bold text-gray-700 dark:text-gray-300' dir='ltr'>
                      {emp.value.toLocaleString()} {unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    return null;
  }
);
CustomTooltipContent.displayName = 'CustomTooltipContent';

// --- ChartWidget Component ---

interface ChartWidgetProps {
  title: string;
  icon?: string;
  data: any[];
  dataKeys: {
    primary: string; // e.g., 'sales'
    comparison?: string[]; // IDs for comparison lines
  };
  color: string; // Hex color
  language: 'AR' | 'EN';
  unit?: string;

  // Context for Tooltip
  employees?: any[];
  selectedEmployeeId?: string;
  showComparison?: boolean;

  // Controls
  allowChartTypeSelection?: boolean;
  onExpand?: () => void;
  onChartTypeChange?: (type: 'area' | 'bar') => void;
  onComparisonChange?: (show: boolean) => void;

  // Customization
  xAxisInterval?: number | 'preserveStartEnd' | 'equidistantPreserveStart';

  // External State Control (Optional, component can manage self if not provided)
  chartType?: 'area' | 'bar';
  compareMode?: boolean;

  // Labels
  primaryLabel?: string;

  // Styling
  className?: string;
  chartClassName?: string;
  headerClassName?: string;
  chartMargin?: { top?: number; right?: number; bottom?: number; left?: number };

  children?: React.ReactNode;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  title,
  icon = 'bar_chart',
  data,
  dataKeys,
  color,
  language,
  unit = '',
  employees,
  selectedEmployeeId,
  showComparison = false,
  allowChartTypeSelection = true,
  onExpand,
  onChartTypeChange,
  onComparisonChange,
  chartType: externalChartType,
  xAxisInterval,
  primaryLabel,
  className,
  headerClassName,
  chartClassName,
  chartMargin,
  children,
}) => {
  const [internalChartType, setInternalChartType] = useState<'area' | 'bar'>('area');
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Delay rendering until container has valid dimensions
  useLayoutEffect(() => {
    const checkDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setIsReady(true);
          return true;
        }
      }
      return false;
    };

    // Check immediately
    if (checkDimensions()) return;

    // If not ready, use requestAnimationFrame to check after layout
    const rafId = requestAnimationFrame(() => {
      checkDimensions();
    });

    return () => cancelAnimationFrame(rafId);
  }, []);

  // Use external state if provided, otherwise internal
  const activeChartType = externalChartType || internalChartType;

  const handleChartTypeChange = (val: 'area' | 'bar') => {
    if (onChartTypeChange) onChartTypeChange(val);
    else setInternalChartType(val);
  };

  return (
    <div
      className={`lg:col-span-2 bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border-2 border-gray-200 dark:border-transparent group ${className || ''}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between mb-4 ${headerClassName || ''}`}>
        <h3 className='text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2'>
          <span className={`material-symbols-rounded text-${color}-500`} style={{ color }}>
            {icon}
          </span>
          {title}
        </h3>

        <div className='flex items-center gap-2'>
          {/* Optional Comparison Toggle (e.g. Single vs Group) */}
          {onComparisonChange &&
            dataKeys.comparison &&
            dataKeys.comparison.length > 0 &&
            activeChartType === 'area' && (
              <div className='ltr:mr-2 rtl:ml-2 scale-90 origin-right rtl:origin-left'>
                <SegmentedControl
                  options={[
                    { label: '', value: 'single', icon: 'person' },
                    {
                      label: '',
                      value: 'group',
                      icon: 'group',
                      count: `+${dataKeys.comparison.length}`,
                    },
                  ]}
                  value={showComparison ? 'group' : 'single'}
                  onChange={(val) => onComparisonChange(val === 'group')}
                  size='sm'
                  fullWidth={false}
                />
              </div>
            )}

          {/* Chart Type Toggle */}
          {allowChartTypeSelection && (
            <div className='w-24'>
              <SegmentedControl
                options={[
                  { label: '', value: 'area', icon: 'area_chart' },
                  { label: '', value: 'bar', icon: 'bar_chart' },
                ]}
                value={activeChartType}
                onChange={(val) => handleChartTypeChange(val as 'area' | 'bar')}
                size='sm'
                fullWidth={false}
                shape='pill'
              />
            </div>
          )}

          {onExpand && (
            <button
              onClick={onExpand}
              className='w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 opacity-0 group-hover:opacity-100'
              title={language === 'AR' ? 'توسيع الرسم البياني' : 'Expand Chart'}
            >
              <span className='material-symbols-rounded text-xl'>open_in_full</span>
            </button>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div
        ref={containerRef}
        className={`w-full ${chartClassName || 'h-[250px]'}`}
        style={{ minHeight: 200, minWidth: 100 }}
      >
        {isReady && (
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart
              data={data}
              margin={
                chartMargin || { top: 15, right: 0, left: language === 'AR' ? 30 : 0, bottom: 20 }
              }
            >
              <defs>
                <linearGradient
                  id={`gradient-${title.replace(/[^a-zA-Z0-9]/g, '-')}`}
                  x1='0'
                  y1='0'
                  x2='0'
                  y2='1'
                >
                  <stop offset='5%' stopColor={color} stopOpacity={0.3} />
                  <stop offset='95%' stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='var(--border-color)' />
              <XAxis
                dataKey='date'
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                interval={xAxisInterval ?? 'equidistantPreserveStart'}
                padding={{ left: 1, right: 3 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => value.toLocaleString('en-US')}
                tick={{
                  fill: 'var(--text-secondary)',
                  fontSize: 12,
                  textAnchor: 'end',
                  direction: 'ltr',
                }}
              />
              <Tooltip
                content={
                  <CustomTooltipContent
                    color={color}
                    unit={unit}
                    employees={employees}
                    selectedEmployeeId={selectedEmployeeId}
                    showComparison={showComparison}
                    primaryLabel={primaryLabel}
                  />
                }
                cursor={false}
              />

              {/* Comparison Lines - Other Employees (Gray Dashed) - Render FIRST (Background) - Only for Area Chart */}
              {showComparison &&
                activeChartType === 'area' &&
                dataKeys.comparison?.map((key) => (
                  <Area
                    key={key}
                    type='monotone'
                    dataKey={key}
                    stroke='#9ca3af'
                    strokeWidth={1.5}
                    strokeOpacity={0.5}
                    strokeDasharray='5 5'
                    fill='none'
                    animationDuration={500}
                    activeDot={false}
                  />
                ))}

              {/* Main Chart - Render LAST (On Top) */}
              {activeChartType === 'area' ? (
                <Area
                  type='monotone'
                  dataKey={dataKeys.primary}
                  stroke={color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#gradient-${title.replace(/[^a-zA-Z0-9]/g, '-')})`}
                  animationDuration={500}
                />
              ) : (
                <Bar
                  dataKey={dataKeys.primary}
                  fill={color}
                  radius={[20, 20, 20, 20]}
                  animationDuration={500}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer / Children (e.g. Shift Events) */}
      {children}
    </div>
  );
};
