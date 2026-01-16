import React from 'react';
import { CARD_BASE } from '../../utils/themeStyles';

const CARD_HOVER = ""; // No animations

export interface SmallCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconColor: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  subValue?: string;
  type?: string; 
  currencyLabel?: string;
}

export const SmallCard = ({ title, value, icon, iconColor, trend, trendValue, trendLabel, subValue, type, currencyLabel }: SmallCardProps) => (
  // Compact design: h-[84px], p-3
  <div className={`p-3 rounded-2xl ${CARD_BASE} ${CARD_HOVER} h-[84px] flex items-center gap-3`}>
    
    {/* Icon - Left Side */}
    <div className={`flex-shrink-0 text-${iconColor}-600 dark:text-${iconColor}-400`}>
      <span className="material-symbols-rounded text-[38px] leading-none">{icon}</span>
    </div>

    {/* Content - Right Side */}
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">{title}</p>
      
      <div className="flex items-center gap-2">
        <h4 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-baseline">
          {value}
          {type === 'currency' && (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ms-1">{currencyLabel || 'L.E'}</span>
          )}
        </h4>

        {/* Badge Next to Number (Includes Trend Value + Label/SubValue) */}
        {(trend || subValue) && (
           <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5 ${
             trend === 'up' 
               ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
               : trend === 'down'
               ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
               : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' // Neutral for subValue only
           }`}>
             {trend && (
                <>
                    <span>{trend === 'up' ? '▲' : '▼'}</span>
                    <span>{trendValue}</span>
                </>
             )}
             
             {/* Small Text Inside Badge */}
             {(trendLabel || subValue) && (
                 <span className={`font-medium ${trend ? 'opacity-80 ltr:border-l rtl:border-r border-current ltr:pl-1.5 rtl:pr-1.5' : ''}`}>
                    {subValue || trendLabel}
                 </span>
             )}
           </span>
         )}
      </div>
    </div>
  </div>
);
