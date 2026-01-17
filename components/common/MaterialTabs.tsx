import React from 'react';

interface MaterialTabsProps {
  children: React.ReactNode;
  index: number;
  total: number;
  color?: string;
  onClick?: () => void;
  className?: string;
  isSelected?: boolean;
}

export const MaterialTabs: React.FC<MaterialTabsProps> = ({
  children,
  index,
  total,
  color = 'blue',
  onClick,
  className = '',
  isSelected = false,
}) => {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const isSingle = total === 1;

  // Calculate border radius class based on position
  let roundedClass = 'rounded-lg';
  if (isSingle) {
    roundedClass = 'rounded-3xl';
  } else if (isFirst) {
    roundedClass = 'rounded-t-3xl rounded-b-lg';
  } else if (isLast) {
    roundedClass = 'rounded-b-3xl rounded-t-lg';
  }

  return (
    <div
      onClick={onClick}
      className={`group relative h-[72px] px-4 flex items-center transition-all cursor-pointer overflow-hidden outline-none focus:outline-none ring-0 focus:ring-0 ${roundedClass} ${
        isSelected
          ? `bg-${color}-50 dark:bg-${color}-950/20`
          : 'bg-gray-50 dark:bg-white/5'
      } ${className}`}
    >
      {children}
    </div>
  );
};
