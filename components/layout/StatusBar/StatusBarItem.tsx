import type React from 'react';
import { useMemo } from 'react';
import { Tooltip } from '../../common/Tooltip';

export interface StatusBarItemProps {
  /** Material Symbol icon name */
  icon?: string;
  /** Text label */
  label?: string;
  /** Tooltip content on hover */
  tooltip?: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Badge counter (for notifications) */
  badge?: number | string;
  /** Visual variant */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  /** Additional className */
  className?: string;
  /** Children elements */
  children?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  default:
    'text-(--text-primary) opacity-85 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10',
  success: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10',
  warning: 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10',
  error: 'text-red-600 dark:text-red-400 hover:bg-red-500/10',
  info: 'text-primary-600 dark:text-primary-400 hover:bg-primary-500/10',
};

export const StatusBarItem: React.FC<StatusBarItemProps> = ({
  icon,
  label,
  tooltip,
  onClick,
  badge,
  variant = 'default',
  className = '',
  children,
}) => {
  const isClickable = !!onClick;

  // 1. Smart Memoization: Calculate classes only when dependencies change
  const baseClasses = useMemo(() => {
    return [
      'relative flex items-center justify-center gap-1.5 px-2.5 h-full text-[10px] font-bold tracking-wide transition-colors duration-150 select-none uppercase',
      variantStyles[variant],
      isClickable ? 'cursor-pointer' : 'cursor-default',
      className,
    ]
      .filter(Boolean)
      .join(' ');
  }, [variant, isClickable, className]);

  // 2. Extracted Content for Readability
  const renderContent = () => (
    <>
      {icon && (
        <span
          className='material-symbols-rounded leading-none'
          style={{ fontSize: 'var(--icon-base)' }}
        >
          {icon}
        </span>
      )}
      {label && <span className='pt-px'>{label}</span>}
      {children}
      {badge !== undefined && badge !== 0 && (
        <span
          className={`absolute top-0.5 right-1.5 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full leading-none pt-px
            ${
              (typeof badge === 'number' && badge > 9) ||
              (typeof badge === 'string' && badge.length > 1)
                ? 'px-0.5 h-[10px] min-w-[10px]'
                : 'w-[10px] h-[10px] aspect-square'
            }`}
        >
          {typeof badge === 'number' && badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  );

  // 3. Flattened Component Structure
  const Item = (
    <div
      className={baseClasses}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {renderContent()}
    </div>
  );

  return tooltip ? (
    <Tooltip
      content={tooltip}
      className='h-full'
      triggerClassName='h-full'
      tooltipClassName={
        typeof tooltip === 'string' ? 'font-bold uppercase tracking-wider z-60' : 'z-60'
      }
    >
      {Item}
    </Tooltip>
  ) : (
    Item
  );
};

export default StatusBarItem;
