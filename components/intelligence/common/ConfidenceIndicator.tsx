import type React from 'react';

interface ConfidenceIndicatorProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  score,
  size = 'md',
  showLabel = true,
}) => {
  // Determine color based on score
  let colorClass = 'bg-red-500';
  let textColorClass = 'text-red-600 dark:text-red-400';

  if (score >= 80) {
    colorClass = 'bg-emerald-500';
    textColorClass = 'text-emerald-600 dark:text-emerald-400';
  } else if (score >= 50) {
    colorClass = 'bg-amber-400';
    textColorClass = 'text-amber-600 dark:text-amber-400';
  }

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  return (
    <div className='flex items-center gap-3'>
      <div
        className={`flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden ${heightClass} min-w-[60px]`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs font-bold w-8 text-right ${textColorClass}`}>{score}%</span>
      )}
    </div>
  );
};
