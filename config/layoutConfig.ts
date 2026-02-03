/**
 * Layout Configuration
 * Defines sizing, spacing, and container classes for the main application shell.
 */

export const LAYOUT_CONFIG = {
  // Maximum width for standard pages (dashboards, lists, etc.)
  MAX_CONTENT_WIDTH: '110rem',

  // Breakpoint-specific horizontal padding
  HORIZONTAL_PADDING: 'px-4',

  // Page Spacing Configuration (Single source of truth)
  // You can use any CSS value here (px, rem, %, etc.)
  SPACING: {
    DESKTOP_TOP: '15px', // Space from the top (Desktop)
    DESKTOP_SIDES: '15px', // General side space (Desktop)
    DASHBOARD_DESKTOP_SIDES: '160px', // Specific side space for Dashboards (Desktop)
    DESKTOP_BOTTOM: '10px', // Space from the bottom (Desktop)
    MOBILE: '0px', // Horizontal space (Mobile)
    MOBILE_BOTTOM: '70px', // Bottom buffer for floating navbar (Mobile)
  },

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
  },
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

  const horizontal = LAYOUT_CONFIG.HORIZONTAL_PADDING;

  // 2. Full-bleed functional views (POS, Purchases)
  const isFullBleed = view.includes('pos') || view.includes('purchases');
  if (isFullBleed) {
    return `${base} w-full ${horizontal}`;
  }

  // 3. Standard maximum-width views (Dashboards, Settings, CRM)
  return `${base} w-full max-w-[${LAYOUT_CONFIG.MAX_CONTENT_WIDTH}] mx-auto ${horizontal}`;
};
