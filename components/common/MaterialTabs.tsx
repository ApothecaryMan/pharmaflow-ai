import type React from 'react';

interface MaterialTabsProps extends React.HTMLAttributes<HTMLDivElement> {
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
  color = 'primary',
  onClick,
  className = '',
  isSelected = false,
  ...rest
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
      {...rest}
      className={`group relative h-[72px] px-4 flex items-center transition-all cursor-pointer overflow-hidden outline-hidden focus:outline-hidden ring-0 focus:ring-0 ${roundedClass} ${
        isSelected
          ? `bg-gray-200 dark:bg-gray-800`
          : 'bg-gray-100 hover:bg-gray-200/70 dark:bg-gray-800/40 dark:hover:bg-gray-700/50'
      } ${className}`}
    >
      {children}
    </div>
  );
};
