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


