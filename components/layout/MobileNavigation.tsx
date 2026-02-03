// ============================================================================
// REFACTORED: MobileNavigation.tsx - Production-Ready Implementation
// ============================================================================

import React, { useCallback, useMemo } from 'react';
import { type MenuItem, PHARMACY_MENU } from '../../config/menuData';
import { canPerformAction, type UserRole } from '../../config/permissions';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { MobileDrawer } from './MobileDrawer';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATIC_DOCK_VIEWS = ['dashboard', 'pos', 'inventory', 'purchases'] as const;
type StaticDockView = (typeof STATIC_DOCK_VIEWS)[number];

const DEFAULT_ICON = 'circle';
const DEFAULT_LABEL = 'View';
const MAX_RECURSION_DEPTH = 10;

// ============================================================================
// TYPES
// ============================================================================

interface ViewMetadata {
  id: string;
  label: string;
  icon: string;
}

interface DynamicTab extends ViewMetadata {
  translatedLabel: string;
}

interface Theme {
  primary: string;
  hex: string;
}

interface Translations {
  nav?: {
    dashboard?: string;
    sales?: string;
    inventory?: string;
    purchase?: string;
  };
  profile: {
    role: string;
  };
  menu: {
    modules: string;
  };
}

interface MobileNavigationProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  filteredMenuItems: MenuItem[];
  activeModule: string;
  handleModuleChange: (id: string) => void;
  view: string;
  dashboardSubView: string;
  handleNavigate: (path: string) => void;
  handleViewChange: (view: string) => void;
  theme: Theme;
  t: Translations;
  language: 'EN' | 'AR';
  hideInactiveModules: boolean;
  userRole: UserRole;
  isStandalone: boolean;
  profileImage: string | null;
}

// ============================================================================
// UTILITY: Build View Lookup Map (Module-level cache)
// ============================================================================

const buildViewLookupMap = (items: MenuItem[], depth = 0): Map<string, ViewMetadata> => {
  const map = new Map<string, ViewMetadata>();

  if (depth > MAX_RECURSION_DEPTH) {
    console.warn('[MobileNavigation] Max recursion depth reached');
    return map;
  }

  for (const item of items) {
    // Skip string items (dividers)
    if (typeof item === 'string') continue;

    // Type guard: ensure item has required properties
    if (typeof item === 'object' && item && 'view' in item && item.view && 'label' in item) {
      const viewId = item.view as string;
      if (!map.has(viewId)) {
        map.set(viewId, {
          id: viewId,
          label: `${item.label || DEFAULT_LABEL}`,
          icon: `${'icon' in item && item.icon ? item.icon : DEFAULT_ICON}`,
        });
      }
    }

    if ('submenus' in item && Array.isArray(item.submenus)) {
      for (const submenu of item.submenus) {
        if (submenu.items) {
          // Filter out string items (dividers) before recursion
          const objectItems = submenu.items.filter(
            (subItem): subItem is Exclude<typeof subItem, string> => typeof subItem !== 'string'
          ) as MenuItem[];
          const nestedMap = buildViewLookupMap(objectItems, depth + 1);
          nestedMap.forEach((value, key) => {
            if (!map.has(key)) map.set(key, value);
          });
        }
      }
    }

    if ('items' in item && Array.isArray(item.items)) {
      const nestedMap = buildViewLookupMap(item.items, depth + 1);
      nestedMap.forEach((value, key) => {
        if (!map.has(key)) map.set(key, value);
      });
    }
  }

  return map;
};

// Pre-compute at module load (runs once)
const VIEW_LOOKUP_MAP = buildViewLookupMap(PHARMACY_MENU);

// ============================================================================
// UTILITY: Get Dynamic Tab
// ============================================================================

const getDynamicTab = (view: string, language: 'EN' | 'AR'): DynamicTab | null => {
  if (STATIC_DOCK_VIEWS.includes(view as StaticDockView)) {
    return null;
  }

  const metadata = VIEW_LOOKUP_MAP.get(view);
  if (!metadata) {
    return null;
  }

  try {
    const translatedLabel = getMenuTranslation(metadata.label, language);
    return {
      ...metadata,
      translatedLabel: translatedLabel || metadata.label, // Fallback
    };
  } catch (error) {
    console.error('[MobileNavigation] Translation error:', error);
    return {
      ...metadata,
      translatedLabel: metadata.label,
    };
  }
};

// ============================================================================
// SUB-COMPONENT: Dock Button
// ============================================================================

interface DockButtonProps {
  view: string;
  currentView: string;
  icon: string;
  label: string;
  theme: Theme;
  onClick: () => void;
  isDynamic?: boolean;
  'aria-label'?: string;
}

const DockButton = React.memo<DockButtonProps>(
  ({
    view,
    currentView,
    icon,
    label,
    theme,
    onClick,
    isDynamic = false,
    'aria-label': ariaLabel,
  }) => {
    const isActive = view === currentView;

    return (
      <button
        onClick={onClick}
        className={`
        h-12 flex items-center justify-center rounded-[1.5rem] transition-fluid
        ${
          isActive
            ? `flex-grow bg-${theme.primary}-100 dark:bg-${theme.primary}-500/20 text-${theme.primary}-700 dark:text-${theme.primary}-300 px-4 gap-2 shadow-sm`
            : 'w-12 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }
        ${isDynamic ? 'animate-scale-in' : ''}
      `}
        aria-label={ariaLabel || label}
        aria-current={isActive ? 'page' : undefined}
        type='button'
      >
        {view === 'pos' ? (
          <svg
            className={`w-[24px] h-[24px] ${isActive ? '' : 'opacity-70'}`}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M4 4h3l1 10h10l1-10H7' />
            <circle cx='9' cy='19' r='1.5' />
            <circle cx='17' cy='19' r='1.5' />
          </svg>
        ) : (
          <span
            className={`material-symbols-rounded text-[24px] ${isActive ? 'font-fill' : ''}`}
            aria-hidden='true'
          >
            {icon}
          </span>
        )}
        <div
          className={`${isActive ? 'flex' : 'hidden'} items-center animate-word-entrance overflow-hidden`}
        >
          <div className='whitespace-nowrap font-bold text-sm truncate max-w-[80px]'>{label}</div>
        </div>
      </button>
    );
  }
);

DockButton.displayName = 'DockButton';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  mobileMenuOpen,
  setMobileMenuOpen,
  filteredMenuItems,
  activeModule,
  handleModuleChange,
  view,
  dashboardSubView,
  handleNavigate,
  handleViewChange,
  theme,
  t,
  language,
  hideInactiveModules,
  userRole,
  isStandalone,
  profileImage,
}) => {
  // Memoize dynamic tab
  const dynamicTab = useMemo(() => getDynamicTab(view, language), [view, language]);

  // Memoize callbacks
  const handleDrawerClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, [setMobileMenuOpen]);

  const handleDashboardClick = useCallback(() => {
    handleViewChange('dashboard');
  }, [handleViewChange]);

  const handlePosClick = useCallback(() => {
    handleViewChange('pos');
  }, [handleViewChange]);

  const handleInventoryClick = useCallback(() => {
    handleViewChange('inventory');
  }, [handleViewChange]);

  const handlePurchasesClick = useCallback(() => {
    handleViewChange('purchases');
  }, [handleViewChange]);

  const handleDynamicClick = useCallback(() => {
    if (dynamicTab) {
      handleViewChange(dynamicTab.id);
    }
  }, [dynamicTab, handleViewChange]);

  if (isStandalone) return null;

  return (
    <>
      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={handleDrawerClose}
        filteredMenuItems={filteredMenuItems}
        activeModule={activeModule}
        handleModuleChange={handleModuleChange}
        view={view}
        dashboardSubView={dashboardSubView}
        handleNavigate={handleNavigate}
        handleViewChange={handleViewChange}
        t={t}
        profileImage={profileImage}
      />

      {/* Mobile Floating Dock Navigation */}
      <nav
        className='md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-[400px] safe-area-bottom'
        aria-label='Primary navigation'
      >
        <div
          className={`
            flex items-center justify-between p-1.5 rounded-[2rem]
            bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl
            border border-gray-200/50 dark:border-gray-800/50
            shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
            transition-all duration-300 ease-out
          `}
        >
          {/* Static Dock Items */}
          {canPerformAction(userRole, 'reports.view_inventory') && (
            <DockButton
              view='dashboard'
              currentView={view}
              icon='dashboard_customize'
              label={t.nav?.dashboard || 'Dashboard'}
              theme={theme}
              onClick={handleDashboardClick}
            />
          )}

          {canPerformAction(userRole, 'sale.create') && (
            <DockButton
              view='pos'
              currentView={view}
              icon='point_of_sale'
              label={t.nav?.sales || 'Sales'}
              theme={theme}
              onClick={handlePosClick}
            />
          )}

          {canPerformAction(userRole, 'inventory.view') && (
            <DockButton
              view='inventory'
              currentView={view}
              icon='package_2'
              label={t.nav?.inventory || 'Inventory'}
              theme={theme}
              onClick={handleInventoryClick}
            />
          )}

          {canPerformAction(userRole, 'purchase.view') && (
            <DockButton
              view='purchases'
              currentView={view}
              icon='shopping_cart_checkout'
              label={t.nav?.purchase || 'Purchase'}
              theme={theme}
              onClick={handlePurchasesClick}
            />
          )}

          {/* Dynamic 5th Slot */}
          {dynamicTab && (
            <DockButton
              view={dynamicTab.id}
              currentView={view}
              icon={dynamicTab.icon}
              label={dynamicTab.translatedLabel}
              theme={theme}
              onClick={handleDynamicClick}
              isDynamic
            />
          )}
        </div>
      </nav>
    </>
  );
};

MobileNavigation.displayName = 'MobileNavigation';
