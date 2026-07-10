import type React from 'react';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useTypography } from '../../context/TypographyContext';
import { CARD_BASE } from '../../utils/themeStyles';

export interface PerformanceGoalItem {
  name: string; // The display name (pre-translated)
  icon: string;
  value: number;
  fill: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
}

interface PerformanceGoalsCardProps {
  title: string;
  data: PerformanceGoalItem[];
}

export const PerformanceGoalsCard: React.FC<PerformanceGoalsCardProps> = ({ title, data = [] }) => {
  const { darkMode: isDark } = useTheme();
  const { language } = useTypography();
  const [legendLayout, setLegendLayout] = useState<'horizontal' | 'vertical'>('vertical');

  const isRTL = language === 'AR';
  const step = 10;
  const strokeWidth = 8;

  const renderRadialChart = () => {
    // Generate track parameters dynamically
    const tracks = data.map((item, index) => {
      const radius = 46 - (data.length - 1 - index) * step;
      const angle = Math.PI * (1 - item.value / 100);
      const cx = 50 + radius * Math.cos(angle);
      const cy = 50 - radius * Math.sin(angle);
      return {
        ...item,
        radius,
        cx,
        cy,
      };
    });

    return (
      <svg viewBox='0 0 100 55' className='w-full h-full'>
        {/* Unfilled background tracks */}
        {tracks.map((track) => (
          <path
            key={`bg-${track.name}`}
            d={`M ${50 - track.radius} 50 A ${track.radius} ${track.radius} 0 0 1 ${50 + track.radius} 50`}
            fill='none'
            stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
          />
        ))}

        {/* Active colored tracks */}
        {tracks.map((track) => (
          <path
            key={`active-${track.name}`}
            d={`M ${50 - track.radius} 50 A ${track.radius} ${track.radius} 0 0 1 ${50 + track.radius} 50`}
            fill='none'
            stroke={track.fill}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            pathLength='100'
            strokeDasharray='100'
            style={{
              strokeDashoffset: 100 - track.value,
              transition: 'stroke-dashoffset 1s ease-in-out',
            }}
          />
        ))}

        {/* Dynamic value badges positioned at the end of each active curve */}
        {tracks.map((track) => (
          <g key={`badge-${track.name}`}>
            <circle
              cx={track.cx}
              cy={track.cy}
              r='3.5'
              fill={isDark ? track.bgDark : track.bgLight}
            />
            <text
              x={track.cx}
              y={track.cy}
              textAnchor='middle'
              fontSize='3.2'
              fontWeight='900'
              fill={isDark ? track.textDark : track.textLight}
              dominantBaseline='central'
            >
              {track.value}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className={`p-5 rounded-3xl ${CARD_BASE} h-72 flex flex-col`}>
      <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='material-symbols-rounded text-indigo-500'>track_changes</span>
          {title}
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
            <div className='w-64 h-36 relative mt-0 shrink-0'>{renderRadialChart()}</div>
            <div className='w-full grid grid-cols-3 gap-2 px-1 mt-6 shrink-0'>
              {data.map((item) => (
                <div
                  key={item.name}
                  className='flex items-center gap-2 p-1 rounded-2xl min-w-0 h-12'
                  style={{
                    background: `linear-gradient(${isRTL ? 'to left' : 'to right'}, ${isDark ? item.fill : item.bgLight} ${item.value}%, ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'} ${item.value}%)`,
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
                      className='text-[9.5px] xs:text-[10.5px] leading-tight font-extrabold mb-0.5 break-words whitespace-normal'
                      style={{ color: isDark ? item.textDark : item.textLight }}
                    >
                      {item.name}
                    </span>
                    <span
                      className='font-black text-[13px] xs:text-sm leading-none'
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
                    background: `linear-gradient(${isRTL ? 'to left' : 'to right'}, ${isDark ? item.fill : item.bgLight} ${item.value}%, ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'} ${item.value}%)`,
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
                      className='text-[9.5px] xs:text-[10.5px] leading-tight font-extrabold mb-0.5 break-words whitespace-normal'
                      style={{ color: isDark ? item.textDark : item.textLight }}
                    >
                      {item.name}
                    </span>
                    <span
                      className='font-black text-[13px] xs:text-sm leading-none'
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
