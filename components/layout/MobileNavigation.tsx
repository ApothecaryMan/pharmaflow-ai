// ============================================================================
// REFACTORED: MobileNavigation.tsx - Production-Ready Implementation
// ============================================================================

import React, { useCallback, useMemo } from 'react';
import { type MenuItem, PHARMACY_MENU } from '../../config/menuData';
import { useInventory } from '../../hooks/queries/useInventoryQuery';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { permissionsService } from '../../services/auth/permissionsService';
import { useAuthStore } from '../../stores/authStore';
import type { CartItem, Drug, Employee, ViewState } from '../../types';
import { resolvePrice } from '../../utils/stockUtils';
import { useContextMenu } from '../common/ContextMenu';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { getIconByName } from '../common/Icons';
import { useSmartDirection } from '../common/SmartInputs';
import { MobileMedicineSearch } from '../mobile/MobileMedicineSearch';
import { MobileSearchCartDrawer } from '../mobile/MobileSearchCartDrawer';
import { MobileDrawer } from './MobileDrawer';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATIC_DOCK_VIEWS = [
  'dashboard',
  'medicine-search',
  'pos',
  'inventory',
  'purchases',
] as const;
type StaticDockView = (typeof STATIC_DOCK_VIEWS)[number];

const DEFAULT_ICON = 'circle';
const DEFAULT_LABEL = 'View';
const MAX_RECURSION_DEPTH = 10;

// ============================================================================
// TYPES
// ============================================================================

interface ViewMetadata {
  id: ViewState;
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
  view: ViewState;
  dashboardSubView: string;
  handleNavigate: (path: ViewState) => void;
  handleViewChange: (view: ViewState) => void;
  theme: Theme;
  t: Translations;
  language: 'EN' | 'AR';
  hideInactiveModules: boolean;
  isStandalone: boolean;
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
          id: viewId as ViewState,
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

const getDynamicTab = (view: ViewState | string, language: 'EN' | 'AR'): DynamicTab | null => {
  if (STATIC_DOCK_VIEWS.includes(view as StaticDockView)) {
    return null;
  }

  const metadata = VIEW_LOOKUP_MAP.get(view as string);
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
  view: ViewState | string;
  currentView: ViewState | string;
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
    label: _label,
    theme: _theme,
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
        aria-label={ariaLabel || _label}
        aria-current={isActive ? 'page' : undefined}
        type='button'
      >
        {/* Flat & Transparent Floating Bean (Enlarged to fill space) */}
        {isActive && (
          <div className='absolute inset-0 bg-black/[0.1] dark:bg-white/10 rounded-full animate-scale-in pointer-events-none' />
        )}

        <div className='relative z-10 flex flex-col items-center justify-center min-h-[22px]'>
          {(() => {
            const IconComponent = getIconByName(icon);
            return (
              <IconComponent
                size={22}
                active={isActive}
                className={`relative z-10 transition-all duration-500 ${isActive ? 'scale-110' : ''}`}
              />
            );
          })()}
        </div>
        <span
          className={`relative z-10 text-[9px] font-bold ${isActive ? 'opacity-100' : 'opacity-60'}`}
        >
          {_label}
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

const MobileDockLogin: React.FC<MobileDockLoginProps> = ({
  employees,
  onSelectEmployee,
  language,
}) => {
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

  const handleBiometricLogin = async () => {
    if (!tempEmployee?.biometricCredentialId) return;

    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const { generateChallenge, bufferToBase64, isWebAuthnSupported } = await import(
        '../../utils/webAuthnUtils'
      );
      const { authService } = await import('../../services/auth/authService');

      if (!(await isWebAuthnSupported())) {
        setIsError(true);
        playError();
        return;
      }

      const challengeBase64 = bufferToBase64(generateChallenge());
      const asseResp = await startAuthentication({
        optionsJSON: {
          challenge: challengeBase64,
          rpId: window.location.hostname,
          allowCredentials: [
            {
              id: tempEmployee.biometricCredentialId,
              type: 'public-key',
              transports: ['internal'],
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        } as any,
        mediation: 'optional',
      } as any);

      if (asseResp) {
        const result = await authService.loginWithBiometric(asseResp.id, employees);
        if (result) {
          playSuccess();
          onSelectEmployee(result.id);
          resetState();
        } else {
          setIsError(true);
          playError();
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setIsError(true);
      playError();
    }
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
    <div className='flex items-center justify-center w-full h-[54px]'>
      {step === 'idle' ? (
        <button
          onClick={handleStartLogin}
          type='button'
          className='w-full h-full flex items-center justify-center gap-2 rounded-full text-gray-800 dark:text-gray-100 font-bold text-[15px] transition-all duration-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]'
        >
          <span className='material-symbols-rounded text-[22px]'>login</span>
          <span>{isRTL ? 'تسجيل الدخول' : 'Login'}</span>
        </button>
      ) : (
        <div className='flex items-center w-full h-full px-4 rounded-full group transition-all duration-300'>
          {/* Leading Actions (Right in RTL, Left in LTR) */}
          <div className='flex items-center gap-1 me-2 min-w-[28px]'>
            <button
              onClick={
                step === 'password'
                  ? () => {
                      setStep('username');
                      setInputVal(tempEmployee?.username || tempEmployee?.employeeCode || '');
                      setIsError(false);
                      setShowPassword(false);
                    }
                  : resetState
              }
              className='grid place-items-center w-7 h-7 rounded-full transition-colors text-gray-500 hover:text-gray-800 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
              type='button'
              title={step === 'password' ? (isRTL ? 'الرجوع' : 'Back') : isRTL ? 'إلغاء' : 'Cancel'}
            >
              <span className='material-symbols-rounded text-[20px]'>
                {step === 'password' ? (isRTL ? 'arrow_forward' : 'arrow_back') : 'close'}
              </span>
            </button>

            {step === 'password' && (
              <button
                onClick={() => setShowPassword(!showPassword)}
                className='grid place-items-center w-7 h-7 rounded-full transition-colors text-gray-500 hover:text-gray-800 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
                type='button'
                title={isRTL ? 'إظهار كلمة المرور' : 'Toggle Password'}
              >
                <span className='material-symbols-rounded text-[20px]'>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            )}
          </div>

          {/* Input Field */}
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
                ? isRTL
                  ? 'اسم المستخدم...'
                  : 'Username...'
                : isRTL
                  ? 'كلمة المرور...'
                  : 'Password...'
            }
            className={`flex-1 bg-transparent border-none outline-hidden text-center text-[15px] font-bold text-gray-800 dark:text-white placeholder-gray-500/70 min-w-0 focus:ring-0 ${isError ? 'text-red-500 dark:text-red-400' : ''}`}
            autoComplete='off'
          />

          {/* Trailing Actions (Left in RTL, Right in LTR) */}
          <div className='flex items-center gap-1 ms-2 min-w-[28px] justify-end'>
            {step === 'password' && tempEmployee?.biometricCredentialId && (
              <button
                onClick={handleBiometricLogin}
                className='grid place-items-center w-7 h-7 rounded-full transition-colors text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30'
                type='button'
                title={isRTL ? 'الدخول بالبصمة' : 'Login with Fingerprint'}
              >
                <span className='material-symbols-rounded text-[22px]'>fingerprint</span>
              </button>
            )}

            <button
              onClick={checkAuth}
              className={`grid place-items-center w-7 h-7 rounded-full transition-all ${isError ? 'text-red-500' : 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30'} ${inputVal ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'} duration-200`}
              type='button'
            >
              <span className='material-symbols-rounded text-[22px]'>
                {step === 'username' ? (isRTL ? 'arrow_back' : 'arrow_forward') : 'login'}
              </span>
            </button>
          </div>
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
  hideInactiveModules: _hideInactiveModules,
  isStandalone,
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

  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const isSearchActive = view === 'medicine-search' || isCartOpen;
  const branchKey = isSearchActive ? activeBranchId : '';
  const { data: inventory = [] } = useInventory(branchKey);
  const { playSuccess } = usePosSounds();
  const { showMenu } = useContextMenu();

  // --- CART LOGIC ---
  const addToCart = React.useCallback(
    (drug: Drug, isUnit: boolean = false, quantity: number = 1) => {
      setCart((prev) => {
        const existing = prev.find((item) => item.id === drug.id && item.isUnit === isUnit);
        if (existing) {
          return prev.map((item) =>
            item.id === drug.id && item.isUnit === isUnit
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }

        return [
          ...prev,
          {
            ...drug,
            quantity,
            isUnit,
            publicPrice: resolvePrice(drug.publicPrice, isUnit, drug.unitsPerPack, drug.unitPrice),
          },
        ];
      });
      if (window.navigator.vibrate) window.navigator.vibrate(10);
      playSuccess();
    },
    [playSuccess]
  );

  const removeFromCart = React.useCallback((id: string, isUnit: boolean) => {
    setCart((prev) => prev.filter((item) => !(item.id === id && item.isUnit === isUnit)));
  }, []);

  const removeDrugFromCart = React.useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = React.useCallback((id: string, isUnit: boolean, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id && item.isUnit === isUnit) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const toggleUnitMode = React.useCallback((id: string, currentIsUnit: boolean) => {
    setCart((prev) => {
      const item = prev.find((i) => i.id === id && i.isUnit === currentIsUnit);
      if (!item) return prev;

      const otherModeExists = prev.find((i) => i.id === id && i.isUnit !== currentIsUnit);
      if (otherModeExists) return prev; // Don't toggle if already exists in other mode (just one per mode)

      return prev.map((i) =>
        i.id === id && i.isUnit === currentIsUnit ? { ...i, isUnit: !currentIsUnit } : i
      );
    });
  }, []);

  const updateItemDiscount = React.useCallback((id: string, isUnit: boolean, discount: number) => {
    setCart((prev) =>
      prev.map((item) => (item.id === id && item.isUnit === isUnit ? { ...item, discount } : item))
    );
  }, []);

  const switchBatchWithAutoSplit = React.useCallback(
    (currentItem: CartItem, newBatch: any, packQty: number, unitQty: number) => {
      setCart((prev) => {
        // Remove all entries for this drug (name+dosageForm)
        const filtered = prev.filter(
          (i) => i.name !== currentItem.name || i.dosageForm !== currentItem.dosageForm
        );
        const newItems: CartItem[] = [];

        if (packQty > 0) {
          newItems.push({
            ...newBatch,
            quantity: packQty,
            isUnit: false,
            discount: currentItem.discount || 0,
          });
        }
        if (unitQty > 0) {
          newItems.push({
            ...newBatch,
            quantity: unitQty,
            isUnit: true,
            discount: currentItem.discount || 0,
          });
        }

        return [...filtered, ...newItems];
      });
    },
    []
  );

  const batchesMap = React.useMemo(() => {
    const map = new Map<string, any[]>();
    inventory.forEach((drug) => {
      const key = `${drug.name}|${drug.dosageForm}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(drug);
    });
    return map;
  }, [inventory]);

  const grossSubtotal = React.useMemo(
    () => cart.reduce((acc, item) => acc + item.publicPrice * item.quantity, 0),
    [cart]
  );
  const cartTotal = React.useMemo(
    () =>
      cart.reduce((acc, item) => {
        const linePrice = item.publicPrice * item.quantity;
        const discountAmount = ((item.discount || 0) / 100) * linePrice;
        return acc + linePrice - discountAmount;
      }, 0),
    [cart]
  );
  const cartTotalItems = React.useMemo(() => cart.length, [cart]);

  // --- RENDERING ---
  if (isStandalone) return null;

  return (
    <>
      {/* Mobile Search View Content - Overlay when active */}
      {view === 'medicine-search' && (
        <div className='md:hidden fixed inset-0 z-50 bg-gray-50 dark:bg-[#06080F] '>
          <MobileMedicineSearch
            inventory={inventory}
            color={theme.primary}
            onScanClick={() => console.log('Scan clicked')}
            cart={cart}
            setCart={setCart}
            onAddToCart={addToCart}
            onRemoveFromCart={removeFromCart}
            onUpdateQuantity={updateQuantity}
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
        currentEmployeeId={currentEmployeeId}
        employees={employees}
        onLogout={() => onSelectEmployee?.(null)}
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
            {permissionsService.can('inventory.view') && (
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
                  onClick={() => {
                    if (view === 'medicine-search' && cart.length > 0) {
                      setIsCartOpen(true);
                    } else {
                      handleMedicineSearchClick();
                    }
                  }}
                  className={`
 relative w-full h-full flex items-center justify-center rounded-full transition-all duration-500
 ${
   view === 'medicine-search'
     ? 'text-black dark:text-white'
     : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
 }
 `}
                  aria-label={language === 'AR' ? 'بحث' : 'Search'}
                  type='button'
                >
                  {view === 'medicine-search' && (
                    <div className='absolute inset-0 bg-black/[0.1] dark:bg-white/10 rounded-full animate-scale-in' />
                  )}
                  <span
                    className={`relative z-10 material-symbols-rounded text-[26px] transition-all duration-500 ${view === 'medicine-search' ? 'font-fill scale-110' : ''}`}
                  >
                    {cart.length > 0 && view === 'medicine-search' ? 'shopping_bag' : 'search'}
                  </span>
                  {cart.length > 0 && (
                    <div className='absolute -top-1 -right-1 z-20 w-5 h-5 bg-primary-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg animate-scale-in border-2 border-white dark:border-[#06080F]'>
                      {cart.length}
                    </div>
                  )}
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
              {permissionsService.can('reports.view_inventory') && (
                <DockButton
                  view='dashboard'
                  currentView={view}
                  icon='dashboard_customize'
                  label={t.nav?.dashboard || 'Dashboard'}
                  theme={theme}
                  onClick={handleDashboardClick}
                />
              )}

              {permissionsService.can('sale.create') && (
                <DockButton
                  view='pos'
                  currentView={view}
                  icon='point_of_sale'
                  label={t.nav?.sales || 'Sales'}
                  theme={theme}
                  onClick={handlePosClick}
                />
              )}

              {permissionsService.can('purchase.view') && (
                <DockButton
                  view='purchases'
                  currentView={view}
                  icon='shopping_cart_checkout'
                  label={t.nav?.purchase || (language === 'AR' ? 'المشتريات' : 'Purchases')}
                  theme={theme}
                  onClick={handlePurchasesClick}
                />
              )}

              {permissionsService.can('inventory.view') && (
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

      <MobileSearchCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        total={cartTotal}
        grossSubtotal={grossSubtotal}
        totalItems={cartTotalItems}
        updateItemDiscount={updateItemDiscount}
        toggleUnitMode={toggleUnitMode}
        showMenu={showMenu}
        batchesMap={batchesMap}
        switchBatchWithAutoSplit={switchBatchWithAutoSplit}
        addToCart={addToCart}
        removeDrugFromCart={removeDrugFromCart}
        onClearCart={() => setCart([])}
        t={t.pos}
      />
    </>
  );
};

MobileNavigation.displayName = 'MobileNavigation';
