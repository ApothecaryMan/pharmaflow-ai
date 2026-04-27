import React, { ReactNode } from 'react';

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
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  leftContent,
  centerContent,
  rightContent,
  sticky = true,
  border = false,
  className = '',
  dir,
  mb = 'mb-6',
}) => {
  const baseClasses = `flex items-center justify-between shrink-0 px-page py-3.5 transition-all duration-300 ${mb}`;
  const stickyClasses = sticky ? 'sticky top-0 z-40' : '';
  const borderClasses = border ? 'border-b border-zinc-200/50 dark:border-zinc-800/50' : '';

  return (
    <header 
      className={`${baseClasses} ${stickyClasses} ${borderClasses} ${className}`}
      dir={dir}
    >
      {/* Left Section: Actions / Title */}
      <div className="flex-1 flex justify-start items-center min-w-0 gap-3">
        {leftContent}
        {title && (
          <div className="flex flex-col min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate tracking-tight page-title">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium page-subtitle">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Center Section: Tabs / Switchers */}
      <div className="flex-none mx-4 empty:hidden">
        {centerContent}
      </div>

      {/* Right Section: Filters / Search / Actions */}
      <div className="flex-1 flex justify-end items-center min-w-0 gap-3">
        {rightContent}
      </div>
    </header>
  );
};

export default PageHeader;
