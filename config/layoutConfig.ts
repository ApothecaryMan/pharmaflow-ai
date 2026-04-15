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
    DESKTOP_TOP: '1rem', // Previously 15px
    DESKTOP_SIDES: '9.375rem', // Previously 150px
    DASHBOARD_DESKTOP_SIDES: '10rem', // Previously 160px
    DESKTOP_BOTTOM: '0.625rem', // Previously 10px
    MOBILE: '0rem',
    MOBILE_BOTTOM: '4.375rem', // Previously 70px
  },

  // Sidebar width
  SIDEBAR_WIDTH: 'w-72',
  SIDEBAR_MINI_WIDTH: 'w-20',

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
 * @param layout - The layout mode defined in pageRegistry
 * @param isStandalone - Whether the view is rendered outside the main layout shell
 * @returns A string of Tailwind CSS classes
 */
export const getContentContainerClasses = (
  layout: 'standard' | 'full-bleed' | 'dashboard' | 'split' | 'auth' | 'full-screen' | undefined,
  isStandalone: boolean
): string => {
  // Initial common classes
  // Note: scrollbar-hide is replaced by standard Tailwind/CSS overflow control
  const base = 'h-full overflow-y-auto main-content-scroll scrollbar-gutter-stable';

  // 1. Standalone / Auth views take full screen with no padding
  if (isStandalone || layout === 'auth' || layout === 'full-screen') {
    return `${base} w-full ${layout === 'full-screen' ? 'h-full p-0 m-0 overflow-hidden' : ''}`;
  }

  // 2. Full-bleed views (e.g. POS)
  if (layout === 'full-bleed') {
    return `${base} w-full px-page`;
  }

  // 3. Standard / Dashboard views with Max Width and Padding
  // py-page ensures consistent vertical spacing from top/bottom
  return `${base} w-full max-w-page mx-auto px-page py-page`;
};
