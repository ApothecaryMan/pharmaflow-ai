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
import { usePosSounds } from '../common/hooks/usePosSounds';
import { useSmartDirection } from '../common/SmartInputs';
import type { Employee } from '../../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATIC_DOCK_VIEWS = ['dashboard', 'medicine-search', 'pos', 'inventory', 'purchases'] as const;
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
  currentEmployeeId?: string | null;
  onSelectEmployee?: (id: string | null) => void;
  employees?: Employee[];
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
        relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full transition-all duration-500
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
        {/* Flat & Transparent Floating Bean (Enlarged to fill space) */}
        {isActive && (
          <div 
            className="absolute inset-0 bg-black/[0.1] dark:bg-white/10 rounded-full animate-scale-in pointer-events-none"
          />
        )}

        <div className='relative z-10 flex flex-col items-center justify-center min-h-[22px]'>
          {view === 'pos' ? (
            <svg
              className={`relative z-10 w-[20px] h-[20px] transition-transform duration-500 ${isActive ? 'scale-110' : ''}`}
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
              className={`relative z-10 material-symbols-rounded text-[22px] transition-all duration-500 ${isActive ? 'font-fill scale-110' : ''}`}
              aria-hidden='true'
            >
              {icon}
            </span>
          )}
        </div>
        <span className={`relative z-10 text-[9px] font-bold ${isActive ? 'opacity-100' : 'opacity-60'}`}>
          {label}
        </span>
      </button>
    );
  }
);

DockButton.displayName = 'DockButton';

// ============================================================================
// SUB-COMPONENT: Mobile Dock Login
// ============================================================================

interface MobileDockLoginProps {
  employees: Employee[];
  onSelectEmployee: (id: string | null) => void;
  language: 'EN' | 'AR';
}

const MobileDockLogin: React.FC<MobileDockLoginProps> = ({ employees, onSelectEmployee, language }) => {
  const [step, setStep] = React.useState<'idle' | 'username' | 'password'>('idle');
  const [inputVal, setInputVal] = React.useState('');
  const [tempEmployee, setTempEmployee] = React.useState<Employee | null>(null);
  const [isError, setIsError] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const { playSuccess, playError } = usePosSounds();
  const dir = useSmartDirection(inputVal, language === 'AR' ? 'كلمة المرور...' : 'Password...');

  // Auto-focus logic when step changes to username or password
  React.useEffect(() => {
    if (step !== 'idle' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  const resetState = () => {
    setStep('idle');
    setInputVal('');
    setTempEmployee(null);
    setIsError(false);
    setShowPassword(false);
  };

  const handleStartLogin = () => {
    setStep('username');
    setInputVal('');
    setIsError(false);
  };

  const checkAuth = async () => {
    if (step === 'username') {
      const query = inputVal.trim().toLowerCase();
      if (!query) return;

      const found = employees.find(
        (emp) =>
          emp.name.toLowerCase().includes(query) ||
          emp.employeeCode.toLowerCase() === query ||
          (emp.username && emp.username.toLowerCase() === query)
      );

      if (found) {
        setTempEmployee(found);
        setStep('password');
        setInputVal('');
        setIsError(false);
      } else {
        setIsError(true);
        playError();
      }
    } else if (step === 'password') {
      if (tempEmployee) {
        const inputPass = inputVal.trim();
        const { verifyPassword } = await import('../../services/auth/hashUtils');

        let isValid = false;
        if (tempEmployee.password) {
          isValid = await verifyPassword(inputPass, tempEmployee.password);
        } else {
          isValid = inputPass.length > 0;
        }

        if (isValid) {
          playSuccess();
          onSelectEmployee(tempEmployee.id);
          resetState();
        } else {
          setIsError(true);
          playError();
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAuth();
    } else if (e.key === 'Escape') {
      resetState();
    }
  };

  const isRTL = language === 'AR';

  return (
    <div className='flex items-center justify-center w-full h-[54px] px-2'>
      {step === 'idle' ? (
        <button
          onClick={handleStartLogin}
          type='button'
          className='w-full max-w-[200px] flex items-center justify-center gap-2 py-2.5 rounded-full bg-black/10 dark:bg-white/10 text-gray-800 dark:text-gray-100 font-bold text-sm transition-all duration-300 hover:bg-black/20 dark:hover:bg-white/20 active:scale-95'
        >
          <span className='material-symbols-rounded text-lg'>login</span>
          <span>{isRTL ? 'تسجيل الدخول' : 'Login'}</span>
        </button>
      ) : (
        <div className='flex items-center w-full max-w-[260px] h-[40px] px-3 rounded-full bg-white/60 dark:bg-black/40 border border-gray-300 dark:border-gray-700 shadow-inner group'>
          <button 
            onClick={step === 'password' ? () => setShowPassword(!showPassword) : resetState} 
            className='mr-2 grid place-items-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors'
            type='button'
          >
            <span className='material-symbols-rounded text-[18px]'>
              {step === 'password' ? (showPassword ? 'visibility_off' : 'visibility') : 'close'}
            </span>
          </button>
          
          <input
            ref={inputRef}
            type={step === 'password' ? (showPassword ? 'text' : 'password') : 'text'}
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (isError) setIsError(false);
            }}
            dir={dir}
            onKeyDown={handleKeyDown}
            placeholder={
              step === 'username'
                ? isRTL ? 'اسم المستخدم...' : 'Username...'
                : isRTL ? 'كلمة المرور...' : 'Password...'
            }
            className={`flex-1 bg-transparent border-none outline-hidden text-[13px] font-bold text-gray-800 dark:text-white placeholder-gray-500 min-w-0 focus:ring-0 ${isError ? 'text-red-500 dark:text-red-400' : ''}`}
            autoComplete='off'
          />

          <button
            onClick={checkAuth}
            className={`hidden group-focus-within:grid place-items-center ml-2 transition-colors ${isError ? 'text-red-500' : 'text-blue-500 dark:text-blue-400 hover:text-blue-700'}`}
          >
            <span className='material-symbols-rounded text-[20px]'>
              {step === 'username' ? 'arrow_forward' : 'login'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

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
  currentEmployeeId,
  onSelectEmployee,
  employees = [],
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

  const handlePurchasesClick = useCallback(() => {
    handleViewChange('purchases');
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
        className='md:hidden fixed bottom-6 left-0 right-0 z-60 w-full safe-area-bottom px-4 pb-1 flex justify-center items-center gap-2.5'
        aria-label='Primary navigation'
      >
        {!currentEmployeeId ? (
          <div
            className={`
              relative flex items-stretch justify-around p-1 rounded-full w-[90%] max-w-[440px] mx-auto
              bg-black/[0.08] dark:bg-black/40 backdrop-blur-[40px]
              border border-black/10 dark:border-white/10
              shadow-xl shadow-black/5
              transition-all duration-500 ease-out
              overflow-hidden
            `}
          >
            <MobileDockLogin 
              employees={employees} 
              onSelectEmployee={onSelectEmployee!} 
              language={language}
            />
          </div>
        ) : (
          <>
            {/* Separate Search Button (Glass Circle) */}
            {canPerformAction(userRole, 'inventory.view') && (
              <div
                className={`
                  relative flex items-center justify-center rounded-full w-14 h-14 shrink-0
                  bg-black/[0.08] dark:bg-black/40 backdrop-blur-[40px]
                  border border-black/10 dark:border-white/10
                  shadow-xl shadow-black/5
                  transition-all duration-500 ease-out
                  ${view === 'medicine-search' ? 'ring-2 ring-black/10 dark:ring-white/10 ring-offset-2 ring-offset-transparent' : ''}
                `}
              >
                <button
                  onClick={handleMedicineSearchClick}
                  className={`
                    relative w-full h-full flex items-center justify-center rounded-full transition-all duration-500
                    ${view === 'medicine-search' 
                      ? 'text-black dark:text-white' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
                  `}
                  aria-label={language === 'AR' ? 'بحث' : 'Search'}
                  type='button'
                >
                  {view === 'medicine-search' && (
                    <div className="absolute inset-0 bg-black/[0.1] dark:bg-white/10 rounded-full animate-scale-in" />
                  )}
                  <span className={`relative z-10 material-symbols-rounded text-[26px] transition-all duration-500 ${view === 'medicine-search' ? 'font-fill scale-110' : ''}`}>
                    search
                  </span>
                </button>
              </div>
            )}

            {/* Main Navigation Dock */}
            <div
              className={`
                relative flex-1 flex items-stretch justify-around p-1 rounded-full max-w-[360px]
                bg-black/[0.08] dark:bg-black/40 backdrop-blur-[40px]
                border border-black/10 dark:border-white/10
                shadow-xl shadow-black/5
                transition-all duration-500 ease-out
                overflow-hidden
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

              {canPerformAction(userRole, 'purchase.view') && (
                <DockButton
                  view='purchases'
                  currentView={view}
                  icon='shopping_cart'
                  label={t.nav?.purchase || (language === 'AR' ? 'المشتريات' : 'Purchases')}
                  theme={theme}
                  onClick={handlePurchasesClick}
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
          </>
        )}
      </nav>
    </>
  );
};

MobileNavigation.displayName = 'MobileNavigation';
