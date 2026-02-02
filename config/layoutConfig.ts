/**
 * Layout Configuration
 * Defines sizing, spacing, and container classes for the main application shell.
 */

export const LAYOUT_CONFIG = {
  // Maximum width for standard pages (dashboards, lists, etc.)
  MAX_CONTENT_WIDTH: '110rem',
  
  // Breakpoint-specific horizontal padding
  HORIZONTAL_PADDING: 'px-4 md:px-[50px]',
  
  // Bottom padding for mobile navigation clearance
  MOBILE_NAV_PADDING: 'pb-32 md:pb-[3px]',

  // Sidebar width
  SIDEBAR_WIDTH: 'w-72',

  // Modal size mappings
  MODAL_SIZES: {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-full m-4',
  }
} as const;

/**
 * Generates the CSS classes for the main content surface container.
 * 
 * @param view - The current active view/route ID
 * @param isStandalone - Whether the view is rendered outside the main layout shell
 * @returns A string of Tailwind CSS classes
 */
export const getContentContainerClasses = (view: string, isStandalone: boolean): string => {
  // Initial common classes
  const base = 'h-full overflow-y-auto scrollbar-hide main-content-scroll';
  
  // 1. Standalone views (Login, etc.) take full screen
  if (isStandalone) {
    return `${base} w-full`;
  }

  // 2. Full-bleed functional views (POS, Purchases)
  const isFullBleed = view.includes('pos') || view.includes('purchases');
  if (isFullBleed) {
    return `${base} w-full ${LAYOUT_CONFIG.HORIZONTAL_PADDING} pt-8 ${LAYOUT_CONFIG.MOBILE_NAV_PADDING}`;
  }

  // 3. Standard maximum-width views (Dashboards, Settings, CRM)
  return `${base} w-full max-w-[${LAYOUT_CONFIG.MAX_CONTENT_WIDTH}] mx-auto ${LAYOUT_CONFIG.HORIZONTAL_PADDING} pt-5 ${LAYOUT_CONFIG.MOBILE_NAV_PADDING}`;
};
