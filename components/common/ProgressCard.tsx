import React from 'react';
import { CARD_BASE } from '../../utils/themeStyles';

const CARD_HOVER = ""; // No animations for now, matching source

interface ProgressCardProps {
  title: string;
  value: number;
  max: number;
  progressColor: string;
  icon: string;
  onClick?: () => void;
  // Double Bar Props
  value2?: number;
  max2?: number;
  progressColor2?: string;
  label2?: string;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({ 
  title, 
  value, 
  max, 
  progressColor, 
  icon, 
  onClick, 
  value2, 
  max2, 
  progressColor2, 
  label2 
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const percentage2 = value2 && max2 ? Math.min(100, Math.max(0, (value2 / max2) * 100)) : 0;
  
  return (
    <div 
        onClick={onClick}
        className={`p-5 rounded-3xl ${CARD_BASE} ${CARD_HOVER} h-36 flex flex-col justify-center ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className={`material-symbols-rounded text-3xl text-${progressColor}-500 dark:text-${progressColor}-400`}>{icon}</span>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            
            {/* Main Value with Tooltip */}
            <div className="relative group/tooltip w-fit">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white leading-none mt-1 cursor-help">{value}</h4>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                    Total: {max}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
            </div>

            {/* Secondary Value with Tooltip */}
            {value2 && (
               <div className="relative group/tooltip w-fit mt-0.5">
                   <p className="text-[10px] text-gray-400 cursor-help">{label2}: <span className="font-semibold text-gray-700 dark:text-gray-300">{value2}</span></p>
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        Total: {max2}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                   </div>
               </div>
            )}
          </div>
        </div>
      </div>
      
      <div className={`flex flex-col ${value2 ? 'gap-2 mt-2' : 'gap-3 mt-3'}`}>
          {/* First Bar */}
          <div>
            <div className={`relative w-full ${value2 ? 'h-2' : 'h-2.5'} bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden`}>
                <div 
                className={`absolute left-0 top-0 h-full rounded-full bg-${progressColor}-500`}
                style={{ width: `${percentage}%` }}
                />
            </div>
            <div className={`flex justify-between items-center ${value2 ? 'mt-0.5' : 'mt-1'}`}>
                <p className="text-[10px] font-medium text-gray-500">{title}</p>
                <p className="text-[10px] font-medium text-gray-900 dark:text-gray-300">{percentage.toFixed(0)}%</p>
            </div>
          </div>
          
          {/* Second Bar (Optional) */}
          {value2 && (
            <div>
                <div className="relative w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                    className={`absolute left-0 top-0 h-full rounded-full bg-${progressColor2 || 'gray'}-500`}
                    style={{ width: `${percentage2}%` }}
                    />
                </div>
                <div className="flex justify-between items-center mt-0.5">
                    <p className="text-[10px] font-medium text-gray-500">{label2}</p>
                    <p className="text-[10px] font-medium text-gray-900 dark:text-gray-300">{percentage2.toFixed(0)}%</p>
                </div>
            </div>
          )}
      </div>
    </div>
  );

};

// --- FlexDataCard ---

export interface FlexDataItem {
  label: string;
  value: string;
  percentage: number;
  color: string;
}

export interface FlexDataCardProps {
  items: FlexDataItem[];
  category: string;
  className?: string;
  onClick?: () => void;
}

export const FlexDataCard: React.FC<FlexDataCardProps> = ({ items, category, className = "", onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-3xl ${CARD_BASE} ${CARD_HOVER} flex items-center justify-between gap-4 ${onClick ? 'cursor-pointer' : 'cursor-default'} ${className}`}
    >
      {/* Category Label Section */}
      <div className="shrink-0">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest writing-mode-vertical sm:writing-mode-horizontal">
            {category}
        </span>
      </div>

      {/* Data Items Section */}
      <div className="flex-1 flex gap-6">
        {items.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col justify-center">
            {/* Header: Value & Label */}
            <div className="flex justify-between items-end mb-2">
               <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                 {item.value}
               </span>
               <span className="text-xs text-gray-500 font-medium">
                 {item.label}
               </span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                    className={`absolute ltr:left-0 rtl:right-0 top-0 h-full rounded-full bg-${item.color}-500`}
                    style={{ width: `${item.percentage}%` }}
                />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};



// --- SegmentedProgressCard (Risk Distribution Style) ---

export interface ProgressSegment {
  value: number;
  color: string; // Tailwind color class, e.g., 'bg-red-500'
  label: string;
  tooltip?: string;
}

export interface SegmentedProgressCardProps {
  title: string;
  segments: ProgressSegment[];
  sideStat?: {
    label: string;
    value: React.ReactNode;
    valueColor?: string; // Text color class
  };
  className?: string; // For grid column spanning
  compact?: boolean;
}

export const SegmentedProgressCard: React.FC<SegmentedProgressCardProps> = ({
  title,
  segments,
  sideStat,
  className = '',
  compact = false,
}) => {
  return (
    <div className={`${compact ? 'px-4 py-2 h-[84px] rounded-2xl' : 'p-6 rounded-3xl'} ${CARD_BASE} flex items-center ${compact ? 'gap-3' : 'gap-8'} ${className}`}>
      {/* Main Content (Title + Progress Bar + Legend) */}
      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
        {/* Header Row (Title + Legend in one row for compact) */}
        <div className={`flex justify-between items-end ${compact ? 'mb-2' : 'mb-4'}`}>
            
            {/* Legend - Responsive (On Left in RTL) */}
            <div className={`flex gap-3 text-xs text-gray-400 ${compact ? 'items-center' : 'justify-end'}`}>
              {segments.map((segment, index) => (
                <span key={index} className="flex items-center gap-1.5">
                  <span className={`${compact ? 'text-sm font-bold text-gray-700 dark:text-gray-300' : 'font-bold opacity-70'}`}>
                    {compact ? segment.value : `(${segment.value})`}
                  </span>
                  <span className={`${compact ? 'w-2.5 h-2.5' : 'w-2.5 h-2.5'} rounded-full ${segment.color}`} />
                  {(!compact) && (
                     <span className="font-semibold text-gray-600 dark:text-gray-300">
                       {segment.label}
                     </span>
                  )}
                </span>
              ))}
            </div>

             <h4 className={`${compact ? 'text-xs font-bold' : 'text-sm font-bold'} text-gray-500 dark:text-gray-400 truncate ml-2`}>
              {title}
            </h4>
        </div>
        
        {/* Progress Bar */}
        <div className={`flex gap-1 ${compact ? 'h-3' : 'h-3'} rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 w-full`}>
          {segments.map((segment, index) => (
            <div
              key={index}
              style={{ flex: segment.value }}
              className={`${segment.color} h-full transition-all duration-500`}
              title={segment.tooltip || `${segment.label}: ${segment.value}`}
            />
          ))}
        </div>
      </div>

      {/* Side Statistic */}
      {sideStat && (
        <div className={`hidden sm:flex ltr:border-l rtl:border-r border-gray-200 dark:border-gray-700 flex-col items-end justify-center ${compact ? 'min-w-[90px] ltr:pl-5 rtl:pr-5' : 'min-w-[160px] ltr:pl-8 rtl:pr-8'} text-right h-full`}>
          <div className={`${compact ? 'text-[11px]' : 'text-xs'} font-bold text-gray-500 dark:text-gray-400 mb-0.5 whitespace-nowrap`}>
            {sideStat.label}
          </div>
          <div className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight ${sideStat.valueColor || 'text-gray-900 dark:text-white'}`}>
            {sideStat.value}
          </div>
        </div>
      )}
    </div>
  );
};
