import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import type { ReactNode } from 'react';
import { Tooltip } from './Tooltip';

/**
 * PageHeader Component
 *
 * DESIGN PRINCIPLES & STANDARDS:
 * 1. SLOTS ARCHITECTURE:
 *    - leftContent: Reserved for SEARCH (SearchInput) or NAVIGATION (Back buttons).
 *    - centerContent: Reserved for primary VIEW SWITCHERS (SegmentedControl).
 *      STRICT PROPS: variant="onPage", size="md", shape="pill", iconSize="--icon-lg", useGraphicFont={true}.
 *    - rightContent: Reserved for PRIMARY ACTIONS (Add buttons, Print, Export).
 *
 * 2. INTEGRATED HEADER PATTERN:
 *    - Management pages (Inventory, Customers, Employees, Suppliers) MUST use this 3-slot pattern.
 *    - Do NOT place the search bar inside the table; keep it in the PageHeader.leftContent.
 *
 * 3. VISUAL HIERARCHY:
 *    - title/subtitle should only be used if leftContent is empty, or as a secondary identity.
 *    - sticky=true is the default to maintain context during scroll.
 *
 * 4. EXPANDABLE BOTTOM SECTION:
 *    - bottomContent: Reserved for secondary metadata or SUMMARY STATS (InteractiveCard grid).
 *    - showBottom: Controlled by a toggle button (typically a material-symbols-rounded "expand_more" arrow).
 *    - The toggle button should be placed in the rightContent slot for consistency.
 */

interface PageHeaderProps {
  /** Main title of the page */
  title?: string | ReactNode;
  /** Secondary description or info below the title */
  subtitle?: string | ReactNode;
  /** Content for the beginning section (e.g., SearchInput, Back button, secondary actions) */
  leftContent?: ReactNode;
  /** Content for the middle section (e.g., Tab switchers) */
  centerContent?: ReactNode;
  /** Content for the end section (e.g., Primary buttons, Filters, Downloads) */
  rightContent?: ReactNode;
  /** Whether the header should stick to the top */
  sticky?: boolean;
  /** Whether to show a bottom border */
  border?: boolean;
  /** Additional custom classes */
  className?: string;
  /** Text direction (rtl/ltr) */
  dir?: 'rtl' | 'ltr';
  /** Margin bottom */
  mb?: string;
  /** Content for the bottom section (expandable) */
  bottomContent?: ReactNode;
  /** Whether to show the bottom section */
  showBottom?: boolean;
  /** Whether to show a built-in toggle button for the bottom section */
  showStatsToggle?: boolean;
  /** Callback when the toggle button is clicked */
  onToggleBottom?: () => void;
  /** Tooltip text for the toggle button */
  toggleTooltip?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  leftContent,
  centerContent,
  rightContent,
  sticky = false,
  border = false,
  className = '',
  dir,
  mb = 'mb-0',
  bottomContent,
  showBottom = false,
  showStatsToggle = false,
  onToggleBottom,
  toggleTooltip,
}) => {
  const baseClasses = `flex flex-col shrink-0 relative ${mb}`;
  const stickyClasses = sticky ? 'sticky top-0 z-40' : '';
  const borderClasses = border ? 'border-b border-zinc-200/50 dark:border-zinc-800/50' : '';

  return (
    <header className={`${baseClasses} ${stickyClasses} ${borderClasses} ${className}`} dir={dir}>
      {/* Top Row: Left, Center, Right slots */}
      <div className='flex flex-wrap md:flex-nowrap items-center justify-between w-full px-page py-3 md:py-3.5 gap-y-3'>
        {/* Left Section: Actions / Title */}
        <div className='w-full md:w-auto md:flex-1 flex justify-center md:justify-start items-center min-w-0 gap-2 md:gap-3 order-1 text-center md:text-start'>
          {leftContent}
          {title && (
            <div className='flex flex-col min-w-0 items-center md:items-start'>
              <h1 className='text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate tracking-tight page-title'>
                {title}
              </h1>
              {subtitle && (
                <p className='text-xs text-gray-500 dark:text-gray-400 truncate font-medium page-subtitle'>
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Center Section: Tabs / Switchers */}
        <div className='w-full md:w-auto md:flex-1 flex justify-center mx-0 md:mx-4 empty:hidden order-3 md:order-2 overflow-x-auto scrollbar-hide pb-1 md:pb-0 -mb-1 md:mb-0'>
          {centerContent}
        </div>

        {/* Right Section: Filters / Search / Actions */}
        <div className='w-full md:w-auto md:flex-1 flex justify-center md:justify-end items-center min-w-0 gap-2 md:gap-3 order-2 md:order-3'>
          {rightContent}
          {showStatsToggle && (
            <Tooltip content={toggleTooltip || (showBottom ? 'Hide Summary' : 'Show Summary')}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBottom?.();
                }}
                className='flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer'
                aria-label={showBottom ? 'Hide Summary' : 'Show Summary'}
              >
                <span className={`material-symbols-rounded ${showBottom ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Expandable Bottom Section */}
      {bottomContent && (
        <AnimatePresence initial={false}>
          {showBottom && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className='overflow-hidden'
            >
              <div className='px-page pb-4 pt-2'>
                {bottomContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </header>
  );
};

export default PageHeader;
