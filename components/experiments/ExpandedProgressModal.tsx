import type React from 'react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';

interface ExpandedProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentValue: number;
  maxValue: number;
  color: string;
  icon: string;
}

// Mock Data Generators
const generateTimelineData = (length: number, max: number) => {
  return Array.from({ length }, (_, i) => ({
    date: `Day ${i + 1}`,
    value: Math.min(max, Math.round(Math.random() * max * 0.8 + (i / length) * max * 0.2)),
  })).sort((a, b) => a.value - b.value); // Strictly increasing for progress usually
};

const generateMilestones = (count: number) => {
  const statuses = ['completed', 'completed', 'in-progress', 'pending', 'pending'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    title: `Milestone Phase ${i + 1}`,
    date: `2024-01-${10 + i}`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    description: 'Detailed description of this specific project phase and its requirements.',
  }));
};

export const ExpandedProgressModal: React.FC<ExpandedProgressModalProps> = ({
  isOpen,
  onClose,
  title,
  currentValue,
  maxValue,
  color,
  icon,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'milestones'>('timeline');

  // Derived State
  const percentage = Math.round((currentValue / maxValue) * 100);
  const timelineData = useMemo(() => generateTimelineData(14, maxValue), [maxValue]);
  const milestones = useMemo(() => generateMilestones(6), []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700'>
          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>{label}</p>
          <p className='text-lg font-bold text-gray-900 dark:text-white' style={{ color }}>
            {payload[0].value} / {maxValue}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle='Detailed Progress & Milestones'
      icon={icon}
      size='5xl'
    >
      <div className='space-y-6'>
        {/* 1. Header Metrics */}
        <div className='flex flex-col md:flex-row gap-4'>
          {/* Main Progress Circle Area */}
          <div
            className='flex-1 p-6 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center
              bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700
          '
          >
            <div className='relative z-10 text-center'>
              {/* Modern Progress Circle */}
              <div className='w-40 h-40 relative mx-auto mb-4 flex items-center justify-center'>
                <svg className='w-full h-full -rotate-90 transform' viewBox='0 0 100 100'>
                  {/* Track */}
                  <circle
                    cx='50'
                    cy='50'
                    r='42'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='6'
                    className='text-gray-100 dark:text-gray-700'
                  />
                  {/* Indicator */}
                  <circle
                    cx='50'
                    cy='50'
                    r='42'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='6'
                    strokeDasharray='264'
                    strokeDashoffset={264 - (264 * percentage) / 100}
                    strokeLinecap='round'
                    className={`transition-all duration-1000 ease-out filter drop-shadow-sm text-${color}-500`}
                  />
                </svg>

                {/* Inner Content */}
                <div className='absolute inset-0 flex flex-col items-center justify-center'>
                  <span
                    className={`text-4xl font-black text-gray-900 dark:text-white tracking-tight`}
                  >
                    {percentage}%
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider text-${color}-600 dark:text-${color}-400 mt-1`}
                  >
                    Complete
                  </span>
                </div>
              </div>

              <div className='flex flex-col items-center gap-1'>
                <div className='flex items-baseline gap-2'>
                  <h3 className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {currentValue.toLocaleString()}
                  </h3>
                  <span className='text-sm font-medium text-gray-400 uppercase tracking-wide'>
                    / {maxValue.toLocaleString()}
                  </span>
                </div>
                <p className='text-sm text-gray-500 font-medium'>Current Status Overview</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className='flex-1 grid grid-cols-2 gap-4'>
            <div className='p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center'>
              <div className='mb-2'>
                <span className='text-xs font-bold text-gray-400 uppercase tracking-wider'>
                  Velocity
                </span>
              </div>
              <h4 className='text-2xl font-bold text-gray-900 dark:text-white'>
                +24<span className='text-sm font-medium text-gray-400 ml-1'>/day</span>
              </h4>
              <p className='text-xs text-emerald-500 font-medium mt-1'>↑ 12% vs avg</p>
            </div>

            <div className='p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center'>
              <div className='mb-2'>
                <span className='text-xs font-bold text-gray-400 uppercase tracking-wider'>
                  Remaining
                </span>
              </div>
              <h4 className='text-2xl font-bold text-gray-900 dark:text-white'>
                {(maxValue - currentValue).toLocaleString()}
              </h4>
              <p className='text-xs text-blue-500 font-medium mt-1'>Est. 12 days left</p>
            </div>

            <div className='col-span-2 p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between'>
              <div>
                <p className='text-gray-400 text-xs font-bold uppercase tracking-wider mb-1'>
                  Project Health
                </p>
                <h4 className='text-lg font-bold text-gray-900 dark:text-white'>On Track</h4>
              </div>
              <div className='px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wide'>
                Healthy
              </div>
            </div>
          </div>
        </div>

        {/* 2. Controls */}
        <div className='flex items-center justify-between'>
          <div className='w-64'>
            <SegmentedControl
              value={viewMode}
              onChange={(val) => setViewMode(val as 'timeline' | 'milestones')}
              options={[
                { label: 'Timeline', value: 'timeline', icon: 'timeline' },
                { label: 'Milestones', value: 'milestones', icon: 'flag' },
              ]}
              size='sm'
              variant='onPage'
            />
          </div>

          <button className='flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition-colors'>
            <span className='material-symbols-rounded text-base'>edit</span>
            Edit Goals
          </button>
        </div>

        {/* 3. Content Area */}
        <div className='h-80 min-h-[320px] rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden relative'>
          {viewMode === 'timeline' ? (
            <div className='w-full h-full p-4'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id='progressGradient' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor={color} stopOpacity={0.3} />
                      <stop offset='95%' stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#E5E7EB' />
                  <XAxis dataKey='date' tick={{ fontSize: 12 }} stroke='#9CA3AF' />
                  <YAxis tick={{ fontSize: 12 }} stroke='#9CA3AF' />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type='monotone'
                    dataKey='value'
                    stroke={color}
                    strokeWidth={3}
                    fill='url(#progressGradient)'
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className='w-full h-full overflow-y-auto p-4 space-y-3'>
              {milestones.map((ms) => (
                <div
                  key={ms.id}
                  className='flex items-start gap-4 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                >
                  <div
                    className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center border-2 
                                ${
                                  ms.status === 'completed'
                                    ? 'bg-emerald-100 border-emerald-500 text-emerald-600'
                                    : ms.status === 'in-progress'
                                      ? `bg-${color}-50 border-${color}-500 text-${color}-600`
                                      : 'bg-gray-50 border-gray-300 text-gray-300'
                                }
                            `}
                  >
                    {ms.status === 'completed' && (
                      <span className='material-symbols-rounded text-sm'>check</span>
                    )}
                    {ms.status === 'in-progress' && (
                      <span className='w-2 h-2 rounded-full bg-current animate-pulse'></span>
                    )}
                  </div>
                  <div className='flex-1'>
                    <div className='flex justify-between items-start'>
                      <h4
                        className={`text-sm font-semibold ${ms.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}
                      >
                        {ms.title}
                      </h4>
                      <span className='text-xs text-gray-400 font-medium'>{ms.date}</span>
                    </div>
                    <p className='text-xs text-gray-500 mt-1'>{ms.description}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                                ${
                                  ms.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : ms.status === 'in-progress'
                                      ? `bg-${color}-100 text-${color}-700`
                                      : 'bg-gray-100 text-gray-500'
                                }
                            `}
                  >
                    {ms.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
