import type React from 'react';
import { useState } from 'react';
import { CARD_BASE } from '../../../utils/themeStyles';
import { useSettings } from '../../../context/SettingsContext';

export interface PerformanceGoalItem {
  name: string;
  translationKey: string;
  icon: string;
  value: number;
  fill: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
}

interface PerformanceGoalsCardProps {
  data: PerformanceGoalItem[];
  isRTL: boolean;
  labels: {
    card6: string;
    salesTarget: string;
    customerSatisfaction: string;
    inventoryTurnover: string;
    [key: string]: string;
  };
}

export const PerformanceGoalsCard: React.FC<PerformanceGoalsCardProps> = ({
  data,
  isRTL,
  labels,
}) => {
  const { darkMode: isDark } = useSettings();
  const [legendLayout, setLegendLayout] = useState<'horizontal' | 'vertical'>('vertical');

  const renderRadialChart = () => (
    <svg viewBox='0 0 100 55' className='w-full h-full'>
      {/* Outer Track (Yellow - Inventory Turnover - 65%) */}
      <path
        d='M 4 50 A 46 46 0 0 1 96 50'
        fill='none'
        stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
        strokeWidth='8'
        strokeLinecap='round'
      />
      <path
        d='M 4 50 A 46 46 0 0 1 96 50'
        fill='none'
        stroke='#f59e0b'
        strokeWidth='8'
        strokeLinecap='round'
        pathLength='100'
        strokeDasharray='100'
        style={{
          strokeDashoffset: 100 - data[2].value,
          transition: 'stroke-dashoffset 1s ease-in-out',
        }}
      />

      {/* Middle Track (Green - Customer Satisfaction - 92%) */}
      <path
        d='M 14 50 A 36 36 0 0 1 86 50'
        fill='none'
        stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
        strokeWidth='8'
        strokeLinecap='round'
      />
      <path
        d='M 14 50 A 36 36 0 0 1 86 50'
        fill='none'
        stroke='#10b981'
        strokeWidth='8'
        strokeLinecap='round'
        pathLength='100'
        strokeDasharray='100'
        style={{
          strokeDashoffset: 100 - data[1].value,
          transition: 'stroke-dashoffset 1s ease-in-out',
        }}
      />

      {/* Inner Track (Blue - Sales Target - 78%) */}
      <path
        d='M 24 50 A 26 26 0 0 1 76 50'
        fill='none'
        stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
        strokeWidth='8'
        strokeLinecap='round'
      />
      <path
        d='M 24 50 A 26 26 0 0 1 76 50'
        fill='none'
        stroke='#3b82f6'
        strokeWidth='8'
        strokeLinecap='round'
        pathLength='100'
        strokeDasharray='100'
        style={{
          strokeDashoffset: 100 - data[0].value,
          transition: 'stroke-dashoffset 1s ease-in-out',
        }}
      />

      {/* Circles with numbers at the start (base) of each curve */}
      {/* Outer (Yellow) */}
      <circle cx='4' cy='50' r='3.5' fill={isDark ? data[2].bgDark : data[2].bgLight} />
      <text x='4' y='50' textAnchor='middle' fontSize='3.2' fontWeight='900' fill={isDark ? data[2].textDark : data[2].textLight} dominantBaseline='central'>
        {data[2].value}
      </text>

      {/* Middle (Green) */}
      <circle cx='14' cy='50' r='3.5' fill={isDark ? data[1].bgDark : data[1].bgLight} />
      <text x='14' y='50' textAnchor='middle' fontSize='3.2' fontWeight='900' fill={isDark ? data[1].textDark : data[1].textLight} dominantBaseline='central'>
        {data[1].value}
      </text>

      {/* Inner (Blue) */}
      <circle cx='24' cy='50' r='3.5' fill={isDark ? data[0].bgDark : data[0].bgLight} />
      <text x='24' y='50' textAnchor='middle' fontSize='3.2' fontWeight='900' fill={isDark ? data[0].textDark : data[0].textLight} dominantBaseline='central'>
        {data[0].value}
      </text>
    </svg>
  );

  return (
    <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
      <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='material-symbols-rounded text-indigo-500'>
            track_changes
          </span>
          {labels.card6}
        </div>
        {/* Horizontal / Vertical layout selector */}
        <div className='flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-[10px]'>
          <button
            onClick={() => setLegendLayout('horizontal')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              legendLayout === 'horizontal'
                ? 'bg-white dark:bg-gray-700 shadow-xs font-semibold text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {isRTL ? 'أفقي' : 'Horizontal'}
          </button>
          <button
            onClick={() => setLegendLayout('vertical')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              legendLayout === 'vertical'
                ? 'bg-white dark:bg-gray-700 shadow-xs font-semibold text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {isRTL ? 'رأسي' : 'Vertical'}
          </button>
        </div>
      </h3>

      <div className='flex-1 flex items-center justify-center w-full min-h-0'>
        {legendLayout === 'horizontal' ? (
          <div className='flex flex-col items-center justify-center w-full h-full'>
            <div className='w-64 h-36 relative mt-0 shrink-0'>
              {renderRadialChart()}
            </div>
            <div className='w-full grid grid-cols-3 gap-2 px-1 mt-6 shrink-0'>
              {data.map((item) => (
                <div
                  key={item.name}
                  className='flex items-center gap-2 p-1 rounded-2xl min-w-0 h-12'
                  style={{
                    background: `linear-gradient(${isRTL ? 'to left' : 'to right'}, ${isDark ? item.fill : item.bgLight} ${item.value}%, ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'} ${item.value}%)`
                  }}
                >
                  <div
                    className='flex items-center justify-center w-8 h-10 rounded-xl shrink-0 text-white'
                    style={{ backgroundColor: isDark ? item.bgDark : item.fill }}
                  >
                    <span
                      className='material-symbols-rounded text-[18px]'
                      style={{ color: item.bgLight }}
                    >
                      {item.icon}
                    </span>
                  </div>
                  <div className='flex flex-col min-w-0 justify-center'>
                    <span
                      className='text-[11px] leading-none line-clamp-1 truncate font-extrabold mb-0.5'
                      style={{ color: isDark ? item.textDark : item.textLight }}
                    >
                      {labels[item.translationKey] || item.name}
                    </span>
                    <span
                      className='font-black text-base leading-none'
                      style={{ color: isDark ? item.textDark : item.textLight }}
                    >
                      {item.value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className='flex flex-row items-center justify-between w-full gap-4 px-2 h-[152px] shrink-0'>
            {/* Left Side: The Curve */}
            <div className='w-64 h-36 relative flex items-center justify-center shrink-0'>
              {renderRadialChart()}
            </div>
            {/* Right Side: The 3 Stacked Cards */}
            <div className='flex-1 flex flex-col justify-between h-[152px] gap-1 min-w-0'>
              {data.map((item) => (
                <div
                  key={item.name}
                  className='flex items-center gap-2 p-1 rounded-2xl min-w-0 h-12'
                  style={{
                    background: `linear-gradient(${isRTL ? 'to left' : 'to right'}, ${isDark ? item.fill : item.bgLight} ${item.value}%, ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'} ${item.value}%)`
                  }}
                >
                  {/* Icon inside a rectangle */}
                  <div
                    className='flex items-center justify-center w-8 h-10 rounded-xl shrink-0 text-white'
                    style={{ backgroundColor: isDark ? item.bgDark : item.fill }}
                  >
                    <span
                      className='material-symbols-rounded text-[18px]'
                      style={{ color: item.bgLight }}
                    >
                      {item.icon}
                    </span>
                  </div>
                  {/* Name and Number next to it */}
                  <div className='flex flex-col min-w-0 justify-center'>
                    <span
                      className='text-[11px] leading-none line-clamp-1 truncate font-extrabold mb-0.5'
                      style={{ color: isDark ? item.textDark : item.textLight }}
                    >
                      {labels[item.translationKey] || item.name}
                    </span>
                    <span
                      className='font-black text-base leading-none'
                      style={{ color: isDark ? item.textDark : item.textLight }}
                    >
                      {item.value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
