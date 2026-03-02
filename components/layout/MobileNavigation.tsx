// ============================================================================
// REFACTORED: MobileNavigation.tsx - Production-Ready Implementation
// ============================================================================

import React, { useCallback, useMemo } from 'react';
import { type MenuItem, PHARMACY_MENU } from '../../config/menuData';
import { canPerformAction, type UserRole } from '../../config/permissions';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { MobileDrawer } from './MobileDrawer';
import { MobileMedicineSearch } from '../mobile/MobileMedicineSearch';
import { useData } from '../../services/DataContext';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATIC_DOCK_VIEWS = ['dashboard', 'medicine-search', 'pos', 'inventory'] as const;
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
        relative flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-full transition-all duration-500
        ${
          isActive
            ? `text-black dark:text-white z-10`
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }
        ${isDynamic ? 'animate-scale-in' : ''}
      `}
        aria-label={ariaLabel || label}
        aria-current={isActive ? 'page' : undefined}
        type='button'
      >
        <div className='relative z-10 flex flex-col items-center justify-center min-h-[30px]'>
          {view === 'pos' ? (
            <svg
              className={`relative z-10 w-[22px] h-[22px] transition-transform duration-500 ${isActive ? 'scale-110' : ''}`}
              viewBox='0 0 24 24'
              fill={isActive ? 'currentColor' : 'none'}
              stroke='currentColor'
              strokeWidth='2.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M4 4h3l1 10h10l1-10H7' />
              <circle cx='9' cy='19' r='1.5' />
              <circle cx='17' cy='19' r='1.5' />
            </svg>
          ) : (
            <span
              className={`relative z-10 material-symbols-rounded text-[24px] transition-all duration-500 ${isActive ? 'font-fill scale-110' : ''}`}
              aria-hidden='true'
            >
              {icon}
            </span>
          )}

          {/* Flat & Transparent Floating Bean (Icon Only) */}
          {isActive && (
            <div 
              className="absolute inset-x-[-14px] inset-y-[1px] bg-black/[0.08] dark:bg-white/10 rounded-full animate-scale-in pointer-events-none"
            />
          )}
        </div>
        <span className={`relative z-10 text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-60'}`}>
          {label}
        </span>
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

  const handleMedicineSearchClick = useCallback(() => {
    handleViewChange('medicine-search');
  }, [handleViewChange]);

  const handlePosClick = useCallback(() => {
    handleViewChange('pos');
  }, [handleViewChange]);

  const handleInventoryClick = useCallback(() => {
    handleViewChange('inventory');
  }, [handleViewChange]);

  const handleDynamicClick = useCallback(() => {
    if (dynamicTab) handleViewChange(dynamicTab.id);
  }, [dynamicTab, handleViewChange]);

  // --- RENDERING ---
  if (isStandalone) return null;

  const { inventory } = useData();

  return (
    <>
      {/* Mobile Search View Content - Overlay when active */}
      {view === 'medicine-search' && (
        <div className="md:hidden fixed inset-0 z-50 bg-gray-50 dark:bg-[#06080F] animate-fade-in">
          <MobileMedicineSearch 
            inventory={inventory} 
            color={theme.primary}
            onScanClick={() => console.log('Scan clicked')}
          />
        </div>
      )}
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

      {/* Mobile Liquid Glass Navigation Bar */}
      <nav
        className='md:hidden fixed bottom-6 left-0 right-0 z-60 w-full safe-area-bottom px-4 pb-1'
        aria-label='Primary navigation'
      >
        <div
          className={`
            relative flex items-stretch justify-around p-1 rounded-full
            bg-black/[0.08] dark:bg-black/40 backdrop-blur-[40px]
            border border-black/10 dark:border-white/10
            shadow-xl shadow-black/5
            transition-all duration-500 ease-out
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
          ) || null}

          {canPerformAction(userRole, 'inventory.view') && (
            <DockButton
              view='medicine-search'
              currentView={view}
              icon='search'
              label={language === 'AR' ? 'بحث' : 'Search'}
              theme={theme}
              onClick={handleMedicineSearchClick}
            />
          ) || null}

          {canPerformAction(userRole, 'sale.create') && (
            <DockButton
              view='pos'
              currentView={view}
              icon='point_of_sale'
              label={t.nav?.sales || 'Sales'}
              theme={theme}
              onClick={handlePosClick}
            />
          ) || null}

          {canPerformAction(userRole, 'inventory.view') && (
            <DockButton
              view='inventory'
              currentView={view}
              icon='package_2'
              label={t.nav?.inventory || 'Inventory'}
              theme={theme}
              onClick={handleInventoryClick}
            />
          ) || null}

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
