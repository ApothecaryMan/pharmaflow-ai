import React from 'react';

export interface StatusBarItemProps {
  /** Material Symbol icon name */
  icon?: string;
  /** Text label */
  label?: string;
  /** Tooltip text on hover */
  tooltip?: string;
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

/*
 * STYLE & SIZING GUIDELINES
 * -------------------------
 * This component is designed to be the BUILDING BLOCK of the status bar.
 * 
 * 1. HEIGHT MATCHING: 
 *    Uses `h-full` to automatically fill the parent's `h-6` (24px).
 *    This guarantees that hover effects and borders span the full height.
 * 
 * 2. CENTERING:
 *    Uses `flex items-center justify-center` to center content perfectly.
 * 
 * 3. FONT SPECS:
 *    - Size: text-[10px] (Small but readable)
 *    - Weight: bold (To standout at small size)
 *    - Case: uppercase (Uniform look)
 * 
 * 4. SPACING:
 *    - Padding: px-2.5 (Horizontal breathing room)
 *    - Gap: gap-1.5 (Space between icon and text)
 */
const variantStyles: Record<string, string> = {
  default: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10',
  success: 'text-emerald-500 hover:bg-emerald-500/10',
  warning: 'text-amber-500 hover:bg-amber-500/10',
  error: 'text-red-500 hover:bg-red-500/10',
  info: 'text-blue-500 hover:bg-blue-500/10',
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
  const baseClasses = `
    relative flex items-center justify-center gap-1.5 px-2.5 h-full text-[10px] font-bold tracking-wide
    transition-colors duration-150 select-none uppercase
    ${variantStyles[variant]}
    ${isClickable ? 'cursor-pointer' : 'cursor-default'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const content = (
    <>
      {icon && (
        <span className="material-symbols-rounded text-[14px] leading-none">
          {icon}
        </span>
      )}
      {label && <span className="pt-[1px]">{label}</span>}
      {children}
      {badge !== undefined && badge !== 0 && (
        <span 
          className={`absolute top-0.5 right-1.5 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full leading-none pt-[1px] ${
            (typeof badge === 'number' && badge > 9) || (typeof badge === 'string' && badge.length > 1)
              ? 'px-0.5 h-[10px] min-w-[10px]' 
              : 'w-[10px] h-[10px] aspect-square'
          }`}
        >
          {typeof badge === 'number' && badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  );

  if (tooltip) {
    return (
      <div
        className={baseClasses}
        onClick={onClick}
        title={tooltip}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={baseClasses}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {content}
    </div>
  );
};

export default StatusBarItem;
