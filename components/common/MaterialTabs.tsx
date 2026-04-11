import type React from 'react';

interface MaterialTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  index: number;
  total: number;
  color?: string;
  onClick?: () => void;
  className?: string;
  isSelected?: boolean;
  variant?: 'default' | 'compact';
  interactive?: boolean;
}

export const MaterialTabs: React.FC<MaterialTabsProps> = ({
  children,
  index,
  total,
  color = 'primary',
  onClick,
  className = '',
  isSelected = false,
  variant = 'default',
  interactive = true,
  ...rest
}) => {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const isSingle = total === 1;

  // Calculate border radius class based on position
  let roundedClass = 'rounded-lg';
  if (isSingle) {
    roundedClass = 'rounded-2xl';
  } else if (isFirst) {
    roundedClass = 'rounded-t-2xl rounded-b-md';
  } else if (isLast) {
    roundedClass = 'rounded-b-2xl rounded-t-md';
  }

  const heightClass = variant === 'compact' ? 'h-auto py-1.5 min-h-[34px]' : 'h-[72px]';

  const interactiveClasses = interactive 
    ? `cursor-pointer ${isSelected ? 'bg-gray-200 dark:bg-gray-800' : 'bg-gray-100/80 hover:bg-gray-200/70 dark:bg-white/5 dark:hover:bg-white/10'}`
    : `cursor-default ${isSelected ? 'bg-gray-200 dark:bg-gray-800' : 'bg-gray-100/50 dark:bg-white/5'}`;

  return (
    <div
      onClick={interactive ? onClick : undefined}
      {...rest}
      className={`group relative ${heightClass} px-4 flex items-center transition-all overflow-hidden outline-hidden focus:outline-hidden ring-0 focus:ring-0 ${roundedClass} ${interactiveClasses} ${className}`}
    >
      {children}
    </div>
  );
};
