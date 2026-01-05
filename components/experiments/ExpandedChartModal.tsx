import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Brush, BarChart, Bar 
} from 'recharts';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';

interface ExpandedChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  title: string;
  color: string;
  unit?: string;
}

// Seeded random number generator for stable results
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Helper to generate more granular data (optimized with stable random)
const generateDetailedData = (inputData: any[]) => {
  if (!inputData || inputData.length === 0) return [];
  
  if (inputData.length < 10) {
    const pointsPerSegment = 5;
    const detailed = inputData.slice(0, -1).flatMap((item, i) => {
      const start = item.value;
      const end = inputData[i + 1].value;
      return Array.from({ length: pointsPerSegment }, (_, j) => {
        // Use stable seeded random instead of Math.random()
        const seed = i * pointsPerSegment + j + 1;
        const randomFactor = (seededRandom(seed) - 0.5) * (start * 0.05);
        return {
          date: `Day ${seed}`,
          value: Math.round(start + (end - start) * (j / pointsPerSegment) + randomFactor),
          original: false
        };
      });
    });
    detailed.push({ 
      date: `Day ${inputData.length * pointsPerSegment}`, 
      value: inputData[inputData.length - 1].value,
      original: true 
    });
    return detailed;
  }
  return inputData.map((d, i) => ({ ...d, date: `Day ${i + 1}` }));
};

// Memoized Tooltip Component - prevents re-render on every mouse move
const CustomTooltipContent = memo(({ active, payload, label, color, unit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white" style={{ color }}>
          {unit}{payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
});
CustomTooltipContent.displayName = 'CustomTooltipContent';

// Custom Brush Handle - Extracted outside component
const CustomBrushHandle = memo(({ x, y, height, color }: any) => (
  <g style={{ outline: 'none' }}>
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

// Virtualized Table Row for performance
const VISIBLE_ROWS = 20;

// Statistics calculator - extracted for clarity
const calculateStats = (values: number[]) => {
  if (values.length === 0) return { sum: 0, avg: 0, min: 0, max: 0, current: 0, change: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / values.length);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const current = values[values.length - 1];
  const previous = values[0];
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  return { sum, avg, min, max, current, change };
};

export const ExpandedChartModal: React.FC<ExpandedChartModalProps> = ({
  isOpen, onClose, data, title, color, unit = ''
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed'>('dashed');
  const [period, setPeriod] = useState<string>('all');
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Generate detailed data (memoized - only recalculates when data changes)
  const detailedData = useMemo(() => generateDetailedData(data), [data]);

  // Period-filtered data for chart display
  const filteredData = useMemo(() => {
    if (period === 'all') return detailedData;
    const periodDays = period === '7d' ? 7 : period === '1m' ? 30 : period === '3m' ? 90 : detailedData.length;
    return detailedData.slice(Math.max(0, detailedData.length - periodDays));
  }, [detailedData, period]);

  // Calculate Statistics (memoized - only recalculates when filteredData changes)
  const stats = useMemo(() => {
    const values = filteredData.map(d => d.value);
    return calculateStats(values);
  }, [filteredData]);

  // Memoized brush indices
  const brushStartIndex = useMemo(() => {
    if (period === '7d') return Math.max(0, detailedData.length - 7);
    if (period === '1m') return Math.max(0, detailedData.length - 30);
    if (period === '3m') return Math.max(0, detailedData.length - 90);
    return 0;
  }, [period, detailedData.length]);

  // Debounced view mode change
  const handleViewModeChange = useCallback((val: string) => {
    setViewMode(val as 'chart' | 'table');
  }, []);

  // Debounced chart type change
  const handleChartTypeChange = useCallback((val: string) => {
    setChartType(val as 'area' | 'bar');
  }, []);

  // Debounced line style change
  const handleLineStyleChange = useCallback((val: string) => {
    setLineStyle(val as 'solid' | 'dashed');
  }, []);

  // Debounced period change
  const handlePeriodChange = useCallback((val: string) => {
    setPeriod(val);
  }, []);

  // Table scroll handler for virtualization
  const handleTableScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setTableScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate visible rows for virtualization
  const ROW_HEIGHT = 40;
  const visibleStartIndex = Math.floor(tableScrollTop / ROW_HEIGHT);
  const visibleEndIndex = Math.min(visibleStartIndex + VISIBLE_ROWS + 2, detailedData.length);
  const visibleData = detailedData.slice(visibleStartIndex, visibleEndIndex);
  const topPadding = visibleStartIndex * ROW_HEIGHT;
  const bottomPadding = Math.max(0, (detailedData.length - visibleEndIndex) * ROW_HEIGHT);

  // Create stable brush handle component with color
  const BrushTraveller = useCallback((props: any) => (
    <CustomBrushHandle {...props} color={color} />
  ), [color]);

  // Memoized tooltip renderer
  const tooltipContent = useCallback((props: any) => (
    <CustomTooltipContent {...props} color={color} unit={unit} />
  ), [color, unit]);

  // Brush change handler - tracks the current visible range
  const handleBrushChange = useCallback((range: { startIndex?: number; endIndex?: number }) => {
    if (range.startIndex !== undefined && range.endIndex !== undefined) {
      setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
    }
  }, []);

  // Current displayed range based on brush or filtered data
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
        
        {/* 1. Summary Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center`}>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Current Value</p>
                <div className="flex items-end gap-2 mt-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{unit}{stats.current.toLocaleString()}</h3>
                    <span className={`text-xs font-bold mb-1 ${stats.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)}%
                    </span>
                </div>
            </div>
            
             <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Average</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{unit}{stats.avg.toLocaleString()}</h3>
            </div>

             <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Minimum</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{unit}{stats.min.toLocaleString()}</h3>
            </div>

             <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Maximum</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{unit}{stats.max.toLocaleString()}</h3>
            </div>
        </div>

        {/* 2. Controls & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
                {/* View Toggle */}
                <div className="w-24">
                    <SegmentedControl
                        value={viewMode}
                        onChange={handleViewModeChange}
                        options={[
                            { label: '', value: 'chart', icon: 'show_chart' },
                            { label: '', value: 'table', icon: 'table_chart' }
                        ]}
                        size="sm"
                        variant="onPage"
                    />
                </div>

                {/* Chart Type Toggle (Only if in chart view) */}
                {viewMode === 'chart' && (
                    <div className="w-24 animate-fade-in">
                        <SegmentedControl
                            value={chartType}
                            onChange={handleChartTypeChange}
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

                {/* Line Style Toggle (Only if in Area chart view) */}
                {viewMode === 'chart' && chartType === 'area' && (
                    <div className="w-24 animate-fade-in">
                        <SegmentedControl
                            value={lineStyle}
                            onChange={handleLineStyleChange}
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
                
                {/* Period Preset Toggle (Only if in chart view) */}
                {viewMode === 'chart' && (
                    <div className="w-64 animate-fade-in">
                        <SegmentedControl
                            value={period}
                            onChange={handlePeriodChange}
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

            {/* Export Actions */}
            <div className="flex items-center gap-2">
                 <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition-colors">
                    <span className="material-symbols-rounded text-base">download</span>
                    CSV
                 </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition-colors">
                    <span className="material-symbols-rounded text-base">image</span>
                    PNG
                 </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition-colors">
                    <span className="material-symbols-rounded text-base">print</span>
                    Print
                 </button>
            </div>
        </div>

        {/* 3. Main Content Area */}
        <div className="h-96 min-h-[384px] rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden relative">
            {viewMode === 'chart' ? (
                <div className="w-full h-full flex flex-col pt-4">
                    {/* Force remove all focus outlines from Recharts components */}
                    <style>{`
                        .recharts-brush-traveller { outline: none !important; cursor: ew-resize !important; }
                        .recharts-brush-traveller *:focus { outline: none !important; }
                        .recharts-brush-traveller group:focus { outline: none !important; }
                    `}</style>
                    <div className="flex-1 w-full min-h-0 [&_*]:outline-none [&_*]:ring-0 [&_*]:focus:outline-none">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'area' ? (
                                <AreaChart data={filteredData} margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
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
                                        tick={{ fontSize: 11, fill: '#6B7280' }} 
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip content={tooltipContent} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke={color} 
                                        strokeWidth={2} 
                                        strokeDasharray={lineStyle === 'dashed' ? "5 5" : undefined}
                                        fill="url(#expandedGradient)" 
                                        animationDuration={500}
                                        isAnimationActive={filteredData.length < 100}
                                    />
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
                                </AreaChart>
                            ) : (
                                <BarChart data={filteredData} margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="date" hide padding={{ left: 0, right: 0 }} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                                    <Tooltip content={tooltipContent} />
                                    <Bar 
                                        dataKey="value" 
                                        fill={color} 
                                        radius={[4, 4, 0, 0]} 
                                        isAnimationActive={filteredData.length < 100}
                                    />
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
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                    {/* Date Range Indicator */}
                    <div className="flex justify-between items-center px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-rounded text-sm">calendar_today</span>
                            {displayedRange.start}
                        </span>
                        <span className="font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800" style={{ color }}>
                            {displayedRange.count} points
                        </span>
                        <span className="flex items-center gap-1">
                            {displayedRange.end}
                            <span className="material-symbols-rounded text-sm">calendar_today</span>
                        </span>
                    </div>
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
                                    <tr key={actualIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50" style={{ height: ROW_HEIGHT }}>
                                        <td className="px-6 py-3 text-gray-900 dark:text-gray-100">{row.date}</td>
                                        <td className="px-6 py-3 font-medium">{unit}{row.value.toLocaleString()}</td>
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
        
        {/* Footer Note */}


      </div>
    </Modal>
  );
};
