import type React from 'react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { BadgeStyle, SwitchVariant } from '../types';
import { storage } from '../utils/storage';

export interface UIState {
  navStyle: 1 | 2 | 3;
  sidebarVisible: boolean;
  sidebarStyle: 1 | 2 | 3;
  cardBorderLight: 'default' | 'thin' | 'none';
  borderRadius: 'default' | 'sharp' | 'full';
  customCardCss?: string;
  enableCustomCardCss: boolean;
  hideInactiveModules: boolean;
  developerMode: boolean;
  switchVariant: SwitchVariant;
  badgeStyle: BadgeStyle;
  modalPresentationMode: 'modal' | 'sidebar';
  sidebarModalWidth: 'sm' | 'md' | 'lg' | 'xl';
  navbarMenuLayout: 'single' | 'multi';
  reducedMotion: boolean;
  disableCSSTransitions: boolean;
  activeBranchId: string;
  branchCode: string;
}

export interface UIContextType extends UIState {
  setNavStyle: (style: 1 | 2 | 3) => void;
  setSidebarVisible: (visible: boolean) => void;
  setSidebarStyle: (style: 1 | 2 | 3) => void;
  setCardBorderLight: (style: 'default' | 'thin' | 'none') => void;
  setBorderRadius: (radius: 'default' | 'sharp' | 'full') => void;
  setCustomCardCss: (css: string) => void;
  setEnableCustomCardCss: (enable: boolean) => void;
  setHideInactiveModules: (hide: boolean) => void;
  setDeveloperMode: (mode: boolean) => void;
  setSwitchVariant: (variant: SwitchVariant) => void;
  setBadgeStyle: (style: BadgeStyle) => void;
  setModalPresentationMode: (mode: 'modal' | 'sidebar') => void;
  setSidebarModalWidth: (width: 'sm' | 'md' | 'lg' | 'xl') => void;
  setNavbarMenuLayout: (layout: 'single' | 'multi') => void;
  setReducedMotion: (value: boolean) => void;
  setDisableCSSTransitions: (value: boolean) => void;
  setActiveBranchId: (id: string) => void;
  setBranchCode: (code: string) => void;
}

const defaultUI: UIState = {
  navStyle: 2,
  sidebarVisible: false,
  sidebarStyle: 1,
  cardBorderLight: 'default',
  borderRadius: 'default',
  customCardCss: '',
  enableCustomCardCss: true,
  hideInactiveModules: true,
  developerMode: false,
  switchVariant: 'default',
  badgeStyle: 'pill',
  modalPresentationMode: 'modal',
  sidebarModalWidth: 'md',
  navbarMenuLayout: 'single',
  reducedMotion: false,
  disableCSSTransitions: true,
  activeBranchId: '',
  branchCode: '',
};

const loadUI = (): UIState => {
  if (typeof window === 'undefined') return defaultUI;

  return {
    navStyle: storage.get('pharma_navStyle', defaultUI.navStyle) as 1 | 2 | 3,
    sidebarVisible: storage.get('pharma_sidebarVisible', defaultUI.sidebarVisible),
    sidebarStyle: storage.get('pharma_sidebarStyle', defaultUI.sidebarStyle) as 1 | 2 | 3,
    cardBorderLight: storage.get('pharma_cardBorderLight', defaultUI.cardBorderLight) as
      | 'default'
      | 'thin'
      | 'none',
    borderRadius: storage.get('pharma_borderRadius', defaultUI.borderRadius) as
      | 'default'
      | 'sharp'
      | 'full',
    customCardCss: storage.get('pharma_customCardCss', defaultUI.customCardCss || ''),
    enableCustomCardCss: storage.get('pharma_enableCustomCardCss', defaultUI.enableCustomCardCss),
    hideInactiveModules: storage.get('pharma_hideInactiveModules', defaultUI.hideInactiveModules),
    developerMode: storage.get('pharma_developerMode', defaultUI.developerMode),
    switchVariant: storage.get('pharma_switchVariant', defaultUI.switchVariant) as SwitchVariant,
    badgeStyle: storage.get('pharma_badgeStyle', defaultUI.badgeStyle) as BadgeStyle,
    modalPresentationMode: storage.get(
      'pharma_modalPresentationMode',
      defaultUI.modalPresentationMode
    ) as 'modal' | 'sidebar',
    sidebarModalWidth: storage.get('pharma_sidebarModalWidth', defaultUI.sidebarModalWidth) as
      | 'sm'
      | 'md'
      | 'lg'
      | 'xl',
    navbarMenuLayout: storage.get('pharma_navbarMenuLayout', defaultUI.navbarMenuLayout) as
      | 'single'
      | 'multi',
    reducedMotion: storage.get('pharma_reducedMotion', defaultUI.reducedMotion),
    disableCSSTransitions: storage.get(
      'pharma_disableCSSTransitions',
      defaultUI.disableCSSTransitions
    ),
    activeBranchId: storage.get('pharma_activeBranchId', defaultUI.activeBranchId),
    branchCode: storage.get('pharma_branchCode', defaultUI.branchCode),
  };
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ui, setUI] = useState<UIState>(loadUI);

  useEffect(() => {
    storage.set('pharma_navStyle', ui.navStyle);
    storage.set('pharma_sidebarVisible', ui.sidebarVisible);
    storage.set('pharma_sidebarStyle', ui.sidebarStyle);
    storage.set('pharma_cardBorderLight', ui.cardBorderLight);
    storage.set('pharma_borderRadius', ui.borderRadius);
    storage.set('pharma_customCardCss', ui.customCardCss);
    storage.set('pharma_enableCustomCardCss', ui.enableCustomCardCss);
    storage.set('pharma_hideInactiveModules', ui.hideInactiveModules);
    storage.set('pharma_developerMode', ui.developerMode);
    storage.set('pharma_switchVariant', ui.switchVariant);
    storage.set('pharma_badgeStyle', ui.badgeStyle);
    storage.set('pharma_modalPresentationMode', ui.modalPresentationMode);
    storage.set('pharma_sidebarModalWidth', ui.sidebarModalWidth);
    storage.set('pharma_navbarMenuLayout', ui.navbarMenuLayout);
    storage.set('pharma_reducedMotion', ui.reducedMotion);
    storage.set('pharma_disableCSSTransitions', ui.disableCSSTransitions);
    storage.set('pharma_activeBranchId', ui.activeBranchId);
    storage.set('pharma_branchCode', ui.branchCode);
  }, [ui]);

  // Disable CSS transitions
  useEffect(() => {
    if (ui.disableCSSTransitions) {
      document.documentElement.classList.add('disable-animations');
    } else {
      document.documentElement.classList.remove('disable-animations');
    }
  }, [ui.disableCSSTransitions]);

  // Apply light border mode
  useEffect(() => {
    document.documentElement.classList.remove('thin-border-mode', 'none-border-mode');
    if (ui.cardBorderLight === 'thin') {
      document.documentElement.classList.add('thin-border-mode');
    } else if (ui.cardBorderLight === 'none') {
      document.documentElement.classList.add('none-border-mode');
    }
  }, [ui.cardBorderLight]);

  // Apply border radius
  useEffect(() => {
    let radiusValue = '0.625rem';
    if (ui.borderRadius === 'sharp') radiusValue = '0rem';
    else if (ui.borderRadius === 'full') radiusValue = '0.375rem';

    document.documentElement.style.setProperty('--radius', radiusValue);
  }, [ui.borderRadius]);

  // Apply badge style
  useEffect(() => {
    let radiusValue = '0.5rem';
    let borderWidth = '1px';
    let paddingValue = '0.25rem 0.5rem';
    let fontSize = '0.75rem';
    let textTransform = 'none';
    let letterSpacing = 'normal';

    if (ui.badgeStyle === 'pill') {
      radiusValue = '9999px';
    } else if (ui.badgeStyle === 'slim') {
      radiusValue = '0.25rem';
      borderWidth = '0px';
      paddingValue = '0.125rem 0.375rem';
      fontSize = '0.625rem';
      textTransform = 'uppercase';
      letterSpacing = '0.05em';
    }

    document.documentElement.style.setProperty('--badge-radius', radiusValue);
    document.documentElement.style.setProperty('--badge-border-width', borderWidth);
    document.documentElement.style.setProperty('--badge-padding', paddingValue);
    document.documentElement.style.setProperty('--badge-font-size', fontSize);
    document.documentElement.style.setProperty('--badge-text-transform', textTransform);
    document.documentElement.style.setProperty('--badge-letter-spacing', letterSpacing);
  }, [ui.badgeStyle]);

  // Apply sidebar modal width
  useEffect(() => {
    let widthVal = '512px';
    if (ui.sidebarModalWidth === 'sm') widthVal = '384px';
    else if (ui.sidebarModalWidth === 'lg') widthVal = '640px';
    else if (ui.sidebarModalWidth === 'xl') widthVal = '768px';

    document.documentElement.style.setProperty('--sidebar-modal-width', widthVal);
  }, [ui.sidebarModalWidth]);

  const setNavStyle = useCallback((navStyle: 1 | 2 | 3) => {
    setUI((prev) => ({ ...prev, navStyle }));
  }, []);

  const setSidebarVisible = useCallback((sidebarVisible: boolean) => {
    setUI((prev) => ({ ...prev, sidebarVisible }));
  }, []);

  const setSidebarStyle = useCallback((sidebarStyle: 1 | 2 | 3) => {
    setUI((prev) => ({ ...prev, sidebarStyle }));
  }, []);

  const setCardBorderLight = useCallback((cardBorderLight: 'default' | 'thin' | 'none') => {
    setUI((prev) => ({ ...prev, cardBorderLight }));
  }, []);

  const setBorderRadius = useCallback((borderRadius: 'default' | 'sharp' | 'full') => {
    setUI((prev) => ({ ...prev, borderRadius }));
  }, []);

  const setCustomCardCss = useCallback((customCardCss: string) => {
    setUI((prev) => ({ ...prev, customCardCss }));
  }, []);

  const setEnableCustomCardCss = useCallback((enableCustomCardCss: boolean) => {
    setUI((prev) => ({ ...prev, enableCustomCardCss }));
  }, []);

  const setHideInactiveModules = useCallback((hideInactiveModules: boolean) => {
    setUI((prev) => ({ ...prev, hideInactiveModules }));
  }, []);

  const setDeveloperMode = useCallback((developerMode: boolean) => {
    setUI((prev) => ({ ...prev, developerMode }));
  }, []);

  const setSwitchVariant = useCallback((switchVariant: SwitchVariant) => {
    setUI((prev) => ({ ...prev, switchVariant }));
  }, []);

  const setBadgeStyle = useCallback((badgeStyle: BadgeStyle) => {
    setUI((prev) => ({ ...prev, badgeStyle }));
  }, []);

  const setModalPresentationMode = useCallback((modalPresentationMode: 'modal' | 'sidebar') => {
    setUI((prev) => ({ ...prev, modalPresentationMode }));
  }, []);

  const setSidebarModalWidth = useCallback((sidebarModalWidth: 'sm' | 'md' | 'lg' | 'xl') => {
    setUI((prev) => ({ ...prev, sidebarModalWidth }));
  }, []);

  const setNavbarMenuLayout = useCallback((navbarMenuLayout: 'single' | 'multi') => {
    setUI((prev) => ({ ...prev, navbarMenuLayout }));
  }, []);

  const setReducedMotion = useCallback((reducedMotion: boolean) => {
    setUI((prev) => ({ ...prev, reducedMotion }));
  }, []);

  const setDisableCSSTransitions = useCallback((disableCSSTransitions: boolean) => {
    setUI((prev) => ({ ...prev, disableCSSTransitions }));
  }, []);

  const setActiveBranchId = useCallback((activeBranchId: string) => {
    setUI((prev) => ({ ...prev, activeBranchId }));
  }, []);

  const setBranchCode = useCallback((branchCode: string) => {
    setUI((prev) => ({ ...prev, branchCode }));
  }, []);

  const value = useMemo<UIContextType>(
    () => ({
      ...ui,
      setNavStyle,
      setSidebarVisible,
      setSidebarStyle,
      setCardBorderLight,
      setBorderRadius,
      setCustomCardCss,
      setEnableCustomCardCss,
      setHideInactiveModules,
      setDeveloperMode,
      setSwitchVariant,
      setBadgeStyle,
      setModalPresentationMode,
      setSidebarModalWidth,
      setNavbarMenuLayout,
      setReducedMotion,
      setDisableCSSTransitions,
      setActiveBranchId,
      setBranchCode,
    }),
    [
      ui,
      setNavStyle,
      setSidebarVisible,
      setSidebarStyle,
      setCardBorderLight,
      setBorderRadius,
      setCustomCardCss,
      setEnableCustomCardCss,
      setHideInactiveModules,
      setDeveloperMode,
      setSwitchVariant,
      setBadgeStyle,
      setModalPresentationMode,
      setSidebarModalWidth,
      setNavbarMenuLayout,
      setReducedMotion,
      setDisableCSSTransitions,
      setActiveBranchId,
      setBranchCode,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

export default UIContext;
