import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AVAILABLE_FONTS_AR, AVAILABLE_FONTS_EN } from '../../../../config/fonts';
import { useNotification } from '../../../../context/NotificationContext';
import { useTheme } from '../../../../context/ThemeContext';
import { useTypography } from '../../../../context/TypographyContext';
import { useUI } from '../../../../context/UIContext';
import { useSmartPosition } from '../../../../hooks/common/useSmartPosition';
import { TRANSLATIONS } from '../../../../i18n/translations';
import { permissionsService } from '../../../../services/auth/permissionsService';
import { useAuthStore } from '../../../../stores/authStore';
import type { Language } from '../../../../types';
import { SegmentedControl } from '../../../common/SegmentedControl';
import { Switch } from '../../../common/Switch';
import { Tooltip } from '../../../common/Tooltip';
import { StatusBarItem } from '../StatusBarItem';

// --- Module-level Style Constants ---

const iconFontSizeStyle: React.CSSProperties = { fontSize: 'var(--icon-settings)' };
const dirRtlStyle: React.CSSProperties = { direction: 'rtl' };
const dirLtrStyle: React.CSSProperties = { direction: 'ltr' };

// --- Utility Components & Helpers ---

const SettingsRow = React.memo<{
  icon: string;
  label: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}>(({ icon, label, children, className = '', onClick }) => (
  <div
    className={`flex items-center justify-between transition-colors px-2 ${onClick ? 'py-1.5 cursor-pointer hover:bg-(--bg-menu-hover) rounded-lg group' : 'py-1'
      } ${className}`}
    onClick={onClick}
  >
    <div className='flex items-center gap-2'>
      <span
        className={`material-symbols-rounded text-(--text-secondary) transition-colors ${onClick ? 'group-hover:text-(--text-primary)' : ''}`}
        style={iconFontSizeStyle}
      >
        {icon}
      </span>
      <span className='text-xs font-medium text-(--text-primary)'>{label}</span>
    </div>
    <div className='flex items-center gap-2'>{children}</div>
  </div>
));

const PillSlider = React.memo<{
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  thumbClass?: string;
  backgroundStyle?: React.CSSProperties;
  formatValue?: (value: number) => React.ReactNode;
  disabled?: boolean;
}>(({ min, max, step = 1, value, onChange, thumbClass = '[&::-webkit-slider-thumb]:bg-(--primary-500)', backgroundStyle, formatValue, disabled }) => {
  const fraction = (value - min) / (max - min);
  const percent = fraction * 100;

  return (
    <div className={`relative w-32 flex items-center ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <input
        dir='ltr'
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-1.5 bg-(--border-divider) appearance-none outline-none relative z-10
          [&::-webkit-slider-thumb]:appearance-none 
          [&::-webkit-slider-thumb]:w-8 
          [&::-webkit-slider-thumb]:h-4.5 
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-white
          dark:[&::-webkit-slider-thumb]:border-(--bg-menu)
          ${thumbClass}`}
        style={backgroundStyle}
      />
      <div
        className='absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-20 flex items-center justify-center text-[9px] font-bold text-white tabular-nums drop-shadow-sm'
        style={{
          left: `calc(${percent}% - ${fraction * 32}px + 16px)`,
          width: '32px',
          height: '18px',
        }}
      >
        {formatValue ? formatValue(value) : value}
      </div>
    </div>
  );
});

const SubmenuWrapper = React.memo<{
  isOpen: boolean;
  isMobile: boolean;
  children: React.ReactNode;
  title?: string;
  side?: 'left' | 'right';
  align?: 'top' | 'bottom';
  maxHeight?: number;
  isRTL?: boolean;
}>(({ isOpen, isMobile, children, title, side = 'left', align = 'top', maxHeight, isRTL = false }) => {
  if (!isOpen) return null;

  const mobileClasses = 'relative w-full mt-2 p-2.5 space-y-2 rounded-xl bg-(--border-divider)';

  const desktopClasses = `absolute ${align === 'top' ? 'top-0' : 'bottom-0'} w-72 rounded-xl shadow-2xl border border-(--border-divider) z-120 p-2.5 space-y-2 bg-(--bg-menu) overflow-y-auto`;

  const useInlineStart = (side === 'right') !== isRTL;
  const desktopStyle: React.CSSProperties = {
    ...(useInlineStart
      ? { insetInlineStart: 'calc(100% + 12px)' }
      : { insetInlineEnd: 'calc(100% + 12px)' }),
    ...(maxHeight ? { maxHeight } : {}),
  };

  return (
    <div
      className={isMobile ? mobileClasses : desktopClasses}
      style={isMobile ? undefined : desktopStyle}
    >
      {title && (
        <label className='text-[10px] font-bold uppercase mb-1 block text-(--text-tertiary) border-b border-(--border-divider)/30 pb-1'>
          {title}
        </label>
      )}
      {children}
    </div>
  );
});

const SubmenuSection = React.memo<{
  id: string;
  icon: string;
  label: string;
  expandedSubmenu: string | null;
  onToggle: (name: string) => void;
  isMobile: boolean;
  title?: string;
  rowExtra?: React.ReactNode;
  isRTL?: boolean;
  children: React.ReactNode;
}>(
  ({
    id,
    icon,
    label,
    expandedSubmenu,
    onToggle,
    isMobile,
    title,
    rowExtra,
    isRTL = false,
    children,
  }) => {
    const isOpen = expandedSubmenu === id;
    const { ref, position, checkPosition } = useSmartPosition({ requiredWidth: 256 });

    useEffect(() => {
      if (isOpen) requestAnimationFrame(checkPosition);
    }, [isOpen, checkPosition]);

    return (
      <div className='space-y-1 relative' ref={ref}>
        <SettingsRow icon={icon} label={label} onClick={() => onToggle(id)}>
          <div className='flex items-center gap-2'>
            {rowExtra}
            <span
              className={`material-symbols-rounded text-lg text-(--text-tertiary) transition-transform duration-200 ${isOpen ? (isMobile ? 'rotate-90' : isRTL ? '-rotate-90' : 'rotate-90') : ''
                }`}
            >
              {isRTL ? 'chevron_left' : 'chevron_right'}
            </span>
          </div>
        </SettingsRow>
        <SubmenuWrapper
          isOpen={isOpen}
          isMobile={isMobile}
          title={title}
          side={position.side}
          align={position.align}
          maxHeight={position.maxHeight}
          isRTL={isRTL}
        >
          {children}
        </SubmenuWrapper>
      </div>
    );
  }
);

export interface SettingsMenuProps {
  dropDirection?: 'up' | 'down';
  showTrigger?: boolean;
  align?: 'start' | 'end';
  triggerVariant?: 'statusBar' | 'navbar';
  triggerSize?: number;
  defaultOpen?: boolean;
  onClose?: () => void;
  onNavigate?: (view: string) => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  dropDirection = 'up',
  showTrigger = true,
  align = 'start',
  triggerVariant = 'statusBar',
  triggerSize = 24,
  defaultOpen = false,
  onClose,
  onNavigate,
}) => {
  const {
    theme: currentTheme,
    darkMode,
    setDarkMode,
    setTheme,
    availableThemes,
    vividBg,
    setVividBg,
    backgroundPattern,
    setBackgroundPattern,
    backgroundPatternOpacity,
    setBackgroundPatternOpacity,
    backgroundPatternScale,
    setBackgroundPatternScale,
    backgroundPatternBlur,
    setBackgroundPatternBlur,
    backgroundPatternUseThemeColor,
    setBackgroundPatternUseThemeColor,
    tooltipStyle,
    setTooltipStyle,
  } = useTheme();

  const {
    navStyle,
    setNavStyle,
    sidebarStyle,
    setSidebarStyle,
    switchVariant,
    setSwitchVariant,
    badgeStyle,
    setBadgeStyle,
    borderRadius,
    setBorderRadius,
    modalPresentationMode,
    setModalPresentationMode,
    sidebarModalWidth,
    setSidebarModalWidth,
    customCardCss,
    setCustomCardCss,
    enableCustomCardCss,
    setEnableCustomCardCss,
    hideInactiveModules,
    setHideInactiveModules,
    developerMode,
    setDeveloperMode,
    reducedMotion,
    setReducedMotion,
    disableCSSTransitions,
    setDisableCSSTransitions,
    navbarMenuLayout,
    setNavbarMenuLayout,
  } = useUI();

  const {
    language,
    fontFamilyEN,
    setFontFamilyEN,
    fontFamilyAR,
    setFontFamilyAR,
    textTransform,
    setTextTransform,
    numeralSystem,
    setNumeralSystem,
    graphicStyle,
    setGraphicStyle,
    graphicFontVariant,
    setGraphicFontVariant,
    setLanguage,
  } = useTypography();

  const {
    showTicker,
    setShowTicker,
    showNotificationBell,
    setShowNotificationBell,
    showNotificationOverlay,
    setShowNotificationOverlay,
    showTickerSales,
    setShowTickerSales,
    showTickerInventory,
    setShowTickerInventory,
    showTickerCustomers,
    setShowTickerCustomers,
    showTickerTopSeller,
    setShowTickerTopSeller,
  } = useNotification();

  const branches = useAuthStore((s) => s.branches);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const updateBranch = useAuthStore((s) => s.updateBranch);
  const activeBranch = useMemo(
    () => branches.find((b) => b.id === activeBranchId),
    [branches, activeBranchId]
  );
  const deliveryFee = activeBranch?.deliveryFee ?? 5;
  const daysInMonth = useMemo(
    () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
    []
  );
  const dailyTarget = useMemo(
    () =>
      (activeBranch?.monthlySalesTarget || 0) > 0
        ? Math.round((activeBranch?.monthlySalesTarget || 0) / daysInMonth)
        : 0,
    [activeBranch?.monthlySalesTarget, daysInMonth]
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [localTarget, setLocalTarget] = useState(activeBranch?.monthlySalesTarget || 0);
  const localTargetRef = useRef(localTarget);
  const prevBranchIdRef = useRef(activeBranchId);

  useEffect(() => {
    if (prevBranchIdRef.current !== activeBranchId) {
      clearTimeout(saveTimerRef.current);
      if (prevBranchIdRef.current) {
        updateBranch?.(prevBranchIdRef.current, { monthlySalesTarget: localTargetRef.current });
      }
      prevBranchIdRef.current = activeBranchId;
      const newTarget = activeBranch?.monthlySalesTarget || 0;
      setLocalTarget(newTarget);
      localTargetRef.current = newTarget;
    }
  }, [activeBranchId, activeBranch?.monthlySalesTarget, updateBranch]);

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const statusSmartPos = useSmartPosition({ requiredWidth: 256 });
  const isAR = language === 'AR';
  const t = TRANSLATIONS[language].settings;

  // Mobile Detection
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const checkMobile = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    checkMobile(mq);
    mq.addEventListener('change', checkMobile);
    return () => mq.removeEventListener('change', checkMobile);
  }, []);

  const closeAllSubmenus = useCallback(() => {
    setExpandedSubmenu(null);
  }, []);

  useEffect(() => {
    if (!isOpen) closeAllSubmenus();
  }, [isOpen, closeAllSubmenus]);

  useEffect(() => {
    if (expandedSubmenu === 'status') requestAnimationFrame(statusSmartPos.checkPosition);
  }, [expandedSubmenu, statusSmartPos.checkPosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSubmenu = useCallback((name: string) => {
    setExpandedSubmenu((prev) => (prev === name ? null : name));
  }, []);

  const menuContainerClasses = useMemo(() => {
    if (isMobile) {
      return `
        fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-[calc(100vw-32px)] max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl border border-(--border-divider) z-150 animate-scale-in
        bg-(--bg-menu)
      `;
    }
    return `
      absolute ${dropDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} 
      ${align === 'start' ? 'inset-s-0 origin-top-start' : 'inset-e-0 origin-top-end'}
      w-72 rounded-xl shadow-2xl border border-(--border-divider) z-110 animate-fade-in
      bg-(--bg-menu)
    `;
  }, [dropDirection, align, isMobile]);

  return (
    <div
      className={`relative ${showTrigger && triggerVariant === 'statusBar' ? 'h-full flex items-center' : ''}`}
      ref={dropdownRef}
    >
      {showTrigger &&
        (triggerVariant === 'statusBar' ? (
          <StatusBarItem
            icon='settings'
            tooltip={t.settings}
            variant={isOpen ? 'info' : 'default'}
            onClick={() => setIsOpen(!isOpen)}
          />
        ) : (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center justify-center w-10 h-10 ${isOpen ? 'text-primary-500' : 'text-(--text-primary) opacity-85 hover:opacity-100'}`}
          >
            <span className='material-symbols-rounded' style={iconFontSizeStyle}>
              settings
            </span>
          </button>
        ))}

      {isOpen && (
        <>
          {isMobile && (
            <div
              className='fixed inset-0 bg-black/40 z-140 animate-fade-in'
              onClick={() => {
                setIsOpen(false);
                onClose?.();
              }}
            />
          )}
          <div className={menuContainerClasses}>
            <div className='px-3 py-2 border-b border-(--border-divider) text-center'>
              <span className='text-xs font-bold text-(--text-primary)'>{t.settings}</span>
            </div>

            <div className='p-2 space-y-1.5' style={isAR ? dirRtlStyle : dirLtrStyle}>
              {/* --- Appearance Section --- */}
              <SubmenuSection
                isRTL={isAR}
                id='themes'
                icon='brightness_6'
                label={t.themesMenu}
                expandedSubmenu={expandedSubmenu}
                onToggle={toggleSubmenu}
                isMobile={isMobile}
              >
                <div className='flex items-center gap-1.5 px-2'>
                  <span
                    className='material-symbols-rounded text-(--text-secondary)'
                    style={iconFontSizeStyle}
                  >
                    palette
                  </span>
                  <SegmentedControl
                    value={currentTheme.name}
                    onChange={(val) => setTheme(availableThemes.find((th) => th.name === val)!)}
                    size='xs'
                    fullWidth
                    shape='pill'
                    options={availableThemes.map((th) => ({
                      label: '',
                      value: th.name,
                      dotColor: th.hex,
                    }))}
                  />
                </div>
                <SettingsRow icon='brightness_6' label={t.darkMode}>
                  <SegmentedControl
                    value={darkMode}
                    onChange={(v) => setDarkMode(v as boolean)}
                    size='xs'
                    shape='pill'
                    iconSize='--icon-settings'
                    options={[
                      { label: '', value: false, icon: 'light_mode' },
                      { label: '', value: true, icon: 'dark_mode' },
                    ]}
                  />
                </SettingsRow>
                <SettingsRow icon='ad_units' label={t.badgeStyle}>
                  <SegmentedControl
                    value={badgeStyle || 'default'}
                    onChange={(v) => setBadgeStyle?.(v as any)}
                    size='xs'
                    shape='pill'
                    options={[
                      { label: t.badgeStyleDefault, value: 'default' },
                      { label: t.badgeStylePill, value: 'pill' },
                      { label: t.badgeStyleSlim, value: 'slim' },
                    ]}
                  />
                </SettingsRow>
                <SettingsRow icon='animation' label={t.reducedMotion}>
                  <Switch
                    checked={reducedMotion}
                    onChange={setReducedMotion}
                    theme={currentTheme.name.toLowerCase()}
                    activeColor={currentTheme.hex}
                  />
                </SettingsRow>
                <SettingsRow icon='motion_photos_off' label={t.disableCSSTransitions}>
                  <Switch
                    checked={disableCSSTransitions}
                    onChange={setDisableCSSTransitions}
                    theme={currentTheme.name.toLowerCase()}
                    activeColor={currentTheme.hex}
                  />
                </SettingsRow>
                {developerMode && (
                  <>
                    <SettingsRow icon='rounded_corner' label={t.borderRadius}>
                      <SegmentedControl
                        value={borderRadius || 'default'}
                        onChange={(v) => setBorderRadius?.(v as any)}
                        size='xs'
                        shape='pill'
                        options={[
                          { label: t.radiusSharp, value: 'sharp' },
                          { label: t.radiusFull, value: 'full' },
                          { label: t.radiusDefault, value: 'default' },
                        ]}
                      />
                    </SettingsRow>

                    <div className='flex items-center gap-1.5 py-1'>
                      <span
                        className='material-symbols-rounded text-(--text-secondary)'
                        style={iconFontSizeStyle}
                      >
                        toggle_on
                      </span>
                      <div className='flex-1 overflow-x-auto scrollbar-none pb-0.5'>
                        <SegmentedControl
                          value={switchVariant || 'default'}
                          onChange={(v) => setSwitchVariant?.(v as any)}
                          size='xs'
                          shape='pill'
                          iconSize='--icon-settings'
                          options={[
                            { label: '', value: 'default', icon: 'done' },
                            { label: '', value: 'ios', icon: 'toggle_on' },
                            { label: '', value: 'minimal', icon: 'check_box_outline_blank' },
                            { label: '', value: 'slim', icon: 'horizontal_rule' },
                          ]}
                        />
                      </div>
                    </div>
                  </>
                )}
                {onNavigate && (
                  <SettingsRow
                    icon='palette'
                    label={isAR ? 'استوديو المظهر' : 'Theme Studio'}
                    onClick={() => {
                      onNavigate('theme-studio');
                      setIsOpen(false);
                    }}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={enableCustomCardCss}
                        onChange={setEnableCustomCardCss}
                        theme={currentTheme.name.toLowerCase()}
                        activeColor={currentTheme.hex}
                      />
                    </div>
                    <span className='material-symbols-rounded text-lg text-(--text-tertiary)'>
                      arrow_outward
                    </span>
                  </SettingsRow>
                )}
                {/* --- Background Pattern --- */}
                <div className='border-t border-(--border-divider) my-1 opacity-50' />
                <div className='flex items-center justify-between px-2 py-1'>
                  <span className='text-xs font-semibold text-(--text-primary)'>
                    {t.backgroundPattern}
                  </span>
                  {backgroundPattern !== 'none' && (
                    <Switch
                      checked={backgroundPatternUseThemeColor ?? true}
                      onChange={setBackgroundPatternUseThemeColor}
                      theme={currentTheme.name.toLowerCase()}
                      activeColor={currentTheme.hex}
                    />
                  )}
                </div>
                <div className='flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none px-2'>
                  {(
                    [
                      'none',
                      'dots',
                      'grid',
                      'thick-grid',
                      'blueprint',
                      'rings',
                      'mesh',
                      'noise',
                      'mandala',
                      'diamond',
                      'corners',
                      'cross',
                      'stars',
                      'glowing-stars',
                      'hearts',
                      'bricks',
                      'abstract',
                      'circuit',
                      'ornate',
                      'diagonal-stripes',
                    ] as const
                  )
                    .filter((p) => p !== 'mesh' || (backgroundPatternUseThemeColor && darkMode))
                    .map((p) => (
                      <button
                        key={p}
                        onClick={() => setBackgroundPattern(p)}
                        className={`flex flex-col items-center gap-0.5 flex-shrink-0 p-1 rounded-lg border transition-all ${backgroundPattern === p
                          ? 'border-(--primary-500) bg-(--primary-500)/10'
                          : 'border-(--border-divider) hover:bg-(--bg-menu-hover)'
                          }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-md overflow-hidden ${p !== 'none' ? `bg-pattern-${p}` : 'border border-dashed border-(--border-divider)'}`}
                          style={
                            p !== 'none'
                              ? ({
                                backgroundImage: 'var(--bg-pattern-image)',
                                backgroundSize: (
                                  {
                                    dots: '10px 10px',
                                    grid: '8px 8px, 8px 8px, 40px 40px, 40px 40px',
                                    'thick-grid': '24px 24px',
                                    blueprint: '10px 10px, 10px 10px, 50px 50px, 50px 50px',
                                    rings: '100% 100%',
                                    mesh: '100% 100%',
                                    noise: '24px 24px',
                                    mandala: '18px 18px',
                                    diamond: '40px 40px',
                                    corners: '20px 20px',
                                    cross: '30px 30px',
                                    stars: '35px 35px',
                                    'glowing-stars': '100% 100%',
                                  } as Record<string, string>
                                )[p],
                                backgroundRepeat: 'var(--bg-pattern-repeat)',
                                backgroundPosition: 'var(--bg-pattern-position)',
                                maskImage: 'var(--bg-pattern-mask)',
                                WebkitMaskImage: 'var(--bg-pattern-mask)',
                                maskSize: (
                                  {
                                    dots: '10px 10px',
                                    grid: '8px 8px, 8px 8px, 40px 40px, 40px 40px',
                                    'thick-grid': '24px 24px',
                                    blueprint: '10px 10px, 10px 10px, 50px 50px, 50px 50px',
                                    rings: '100% 100%',
                                    mesh: '100% 100%',
                                    noise: '24px 24px',
                                    mandala: '18px 18px',
                                    diamond: '40px 40px',
                                    corners: '20px 20px',
                                    cross: '30px 30px',
                                    stars: '35px 35px',
                                    'glowing-stars': '100% 100%',
                                    hearts: '35px 35px',
                                  } as Record<string, string>
                                )[p],
                                WebkitMaskSize: (
                                  {
                                    dots: '10px 10px',
                                    grid: '8px 8px, 8px 8px, 40px 40px, 40px 40px',
                                    'thick-grid': '24px 24px',
                                    blueprint: '10px 10px, 10px 10px, 50px 50px, 50px 50px',
                                    rings: '100% 100%',
                                    mesh: '100% 100%',
                                    noise: '24px 24px',
                                    mandala: '18px 18px',
                                    diamond: '40px 40px',
                                    corners: '20px 20px',
                                    cross: '30px 30px',
                                    stars: '35px 35px',
                                    hearts: '35px 35px',
                                  } as Record<string, string>
                                )[p],
                                backgroundColor: 'var(--bg-pattern-solid-color, transparent)',
                                '--bg-pattern-color': 'var(--text-primary)',
                              } as unknown as React.CSSProperties & Record<string, string>)
                              : undefined
                          }
                        />
                        <span className='text-[9px] text-(--text-secondary) leading-none whitespace-nowrap'>
                          {(
                            {
                              none: t.patternNone,
                              dots: t.patternDots,
                              grid: t.patternGrid,
                              'thick-grid': t.patternThickGrid,
                              blueprint: t.patternBlueprint,
                              rings: t.patternRings,
                              mesh: t.patternMesh,
                              noise: t.patternNoise,
                              diamond: t.patternDiamond,
                              corners: t.patternCorners,
                              cross: t.patternCross,
                              stars: t.patternStars,
                              'glowing-stars': t.patternGlowingStars,
                              hearts: t.patternHearts,
                              bricks: t.patternBricks,
                              abstract: t.patternAbstract,
                              circuit: t.patternCircuit,
                              ornate: t.patternOrnate,
                              'diagonal-stripes': t.patternDiagonalStripes,
                            } as Record<string, string>
                          )[p] ?? t.patternMandala}
                        </span>
                      </button>
                    ))}
                </div>
                {backgroundPattern !== 'none' && (
                  <div className='px-2 py-1.5'>
                    <div className='flex justify-between items-center mb-1.5 px-1'>
                      <div className='flex items-center gap-1.5'>
                        <span className='material-symbols-rounded text-(--text-secondary) text-[14px]'>texture</span>
                        <span className='text-[10px] uppercase font-bold text-(--text-tertiary)'>
                          {language === 'AR' ? 'إعدادات النقش' : 'Pattern Settings'}
                        </span>
                      </div>
                    </div>
                    <div className='bg-(--bg-menu-hover) border border-(--border-divider) p-2 rounded-2xl flex flex-col gap-3 relative'>
                      <div className='flex items-center justify-between'>
                        <span className='text-[10px] font-medium text-(--text-secondary) flex items-center gap-1'>
                          <span className='material-symbols-rounded text-[14px]'>opacity</span>
                          {t.patternOpacity}
                        </span>
                        <PillSlider
                          min={5}
                          max={backgroundPatternBlur > 0 ? 100 : 70}
                          step={5}
                          value={backgroundPatternBlur > 0 ? 100 : backgroundPatternOpacity}
                          onChange={setBackgroundPatternOpacity}
                          disabled={backgroundPatternBlur > 0}
                          backgroundStyle={{
                            background: `linear-gradient(to right, var(--primary-500) ${(((backgroundPatternBlur > 0 ? 100 : backgroundPatternOpacity) - 5) / (backgroundPatternBlur > 0 ? 95 : 65)) * 100}%, transparent ${(((backgroundPatternBlur > 0 ? 100 : backgroundPatternOpacity) - 5) / (backgroundPatternBlur > 0 ? 95 : 65)) * 100}%)`,
                          }}
                        />
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-[10px] font-medium text-(--text-secondary) flex items-center gap-1'>
                          <span className='material-symbols-rounded text-[14px]'>zoom_out_map</span>
                          {language === 'AR' ? 'الحجم' : 'Scale'}
                        </span>
                        <PillSlider
                          min={-100}
                          max={100}
                          step={5}
                          value={backgroundPatternScale}
                          onChange={setBackgroundPatternScale}
                          thumbClass={backgroundPatternScale < 0 ? '[&::-webkit-slider-thumb]:bg-(--color-error)' : '[&::-webkit-slider-thumb]:bg-(--color-success)'}
                          formatValue={Math.abs}
                          backgroundStyle={{
                            background: `linear-gradient(to right, transparent ${Math.min(
                              50,
                              50 + backgroundPatternScale / 2
                            )}%, ${backgroundPatternScale < 0 ? 'var(--color-error)' : 'var(--color-success)'} ${Math.min(50, 50 + backgroundPatternScale / 2)}%, ${backgroundPatternScale < 0 ? 'var(--color-error)' : 'var(--color-success)'} ${Math.max(50, 50 + backgroundPatternScale / 2)}%, transparent ${Math.max(
                              50,
                              50 + backgroundPatternScale / 2
                            )}%)`,
                            backgroundColor: 'var(--border-divider)',
                          }}
                        />
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-[10px] font-medium text-(--text-secondary) flex items-center gap-1'>
                          <span className='material-symbols-rounded text-[14px]'>blur_on</span>
                          {language === 'AR' ? 'التمويه' : 'Blur'}
                        </span>
                        <PillSlider
                          min={0}
                          max={5}
                          step={1}
                          value={backgroundPatternBlur}
                          onChange={setBackgroundPatternBlur}
                          backgroundStyle={{
                            background: `linear-gradient(to right, var(--primary-500) ${(backgroundPatternBlur / 5) * 100}%, transparent ${(backgroundPatternBlur / 5) * 100}%)`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {!darkMode && (
                  <SettingsRow icon='gradient' label={t.vividBg}>
                    <SegmentedControl
                      value={vividBg}
                      onChange={(v) => setVividBg(v as 'muted' | 'subtle' | 'vivid')}
                      size='xs'
                      shape='pill'
                      iconSize='--icon-settings'
                      options={[
                        { label: '', value: 'muted', icon: 'blur_off' },
                        { label: '', value: 'subtle', icon: 'blur_on' },
                        { label: '', value: 'vivid', icon: 'blur_circular' },
                      ]}
                    />
                  </SettingsRow>
                )}
                <SettingsRow icon='chat_bubble' label={language === 'AR' ? 'نمط التلميحات' : 'Tooltip Style'}>
                  <SegmentedControl
                    value={tooltipStyle || 'default'}
                    onChange={(v) => setTooltipStyle(v as 'default' | 'box')}
                    size='xs'
                    shape='pill'
                    iconSize='--icon-settings'
                    options={[
                      { label: '', value: 'default', icon: 'play_arrow' },
                      { label: '', value: 'box', icon: 'crop_square' },
                    ]}
                  />
                </SettingsRow>
              </SubmenuSection>

              <div className='border-t border-(--border-divider) my-0.5 opacity-50' />

              {/* --- Sidebar --- */}
              <SubmenuSection
                isRTL={isAR}
                id='sidebar'
                icon='view_sidebar'
                label={t.sidebarSettings}
                expandedSubmenu={expandedSubmenu}
                onToggle={toggleSubmenu}
                isMobile={isMobile}
                title={t.sidebarSettings}
              >
                <SettingsRow icon='dashboard_customize' label={t.navigationLayout}>
                  <SegmentedControl
                    value={navStyle || 1}
                    onChange={(v) => setNavStyle(v as any)}
                    size='xs'
                    shape='pill'
                    iconSize='--icon-settings'
                    options={[
                      { label: '', value: 1, icon: 'view_sidebar' },
                      { label: '', value: 2, icon: 'web_asset' },
                    ]}
                  />
                </SettingsRow>
                {navStyle === 1 && (
                  <SettingsRow icon='view_sidebar' label={t.sidebarStyle}>
                    <SegmentedControl
                      value={sidebarStyle}
                      onChange={(v) => setSidebarStyle(v as any)}
                      size='xs'
                      shape='pill'
                      iconSize='--icon-settings'
                      options={[
                        { label: '', value: 1, icon: 'view_sidebar' },
                        { label: '', value: 2, icon: 'dock_to_left' },
                        { label: '', value: 3, icon: 'mouse' },
                      ]}
                    />
                  </SettingsRow>
                )}
                {navStyle === 2 && (
                  <SettingsRow icon='grid_view' label={t.navbarMenuLayout}>
                    <SegmentedControl
                      value={navbarMenuLayout || 'single'}
                      onChange={(v) => setNavbarMenuLayout(v as 'single' | 'multi')}
                      size='xs'
                      shape='pill'
                      iconSize='--icon-settings'
                      options={[
                        { label: '', value: 'single', icon: 'view_list' },
                        { label: '', value: 'multi', icon: 'grid_view' },
                      ]}
                    />
                  </SettingsRow>
                )}
                <SettingsRow icon='filter_center_focus' label={t.focusMode}>
                  <Switch
                    checked={hideInactiveModules || false}
                    onChange={setHideInactiveModules}
                    theme={currentTheme.name.toLowerCase()}
                    activeColor={currentTheme.hex}
                  />
                </SettingsRow>
              </SubmenuSection>
              <SettingsRow icon='translate' label={t.language}>
                <SegmentedControl
                  value={language}
                  onChange={(v) => setLanguage(v as any)}
                  size='xs'
                  shape='pill'
                  options={[
                    { label: 'EN', value: 'EN' },
                    { label: 'AR', value: 'AR' },
                  ]}
                />
              </SettingsRow>
              <SubmenuSection
                isRTL={isAR}
                id='modalSettings'
                icon='dock_to_left'
                label={t.modalSettings}
                expandedSubmenu={expandedSubmenu}
                onToggle={toggleSubmenu}
                isMobile={isMobile}
                title={t.modalSettings}
              >
                <SettingsRow icon='dock_to_left' label={t.modalPresentationStyle}>
                  <SegmentedControl
                    value={modalPresentationMode || 'modal'}
                    onChange={(v) => setModalPresentationMode?.(v as any)}
                    size='xs'
                    shape='pill'
                    options={[
                      { label: t.modalPresentationModeModal, value: 'modal' },
                      { label: t.modalPresentationModeSidebar, value: 'sidebar' },
                    ]}
                  />
                </SettingsRow>
                {modalPresentationMode === 'sidebar' && (
                  <SettingsRow icon='straighten' label={t.sidebarModalWidth}>
                    <SegmentedControl
                      value={sidebarModalWidth || 'md'}
                      onChange={(v) => setSidebarModalWidth?.(v as any)}
                      size='xs'
                      shape='pill'
                      options={[
                        { label: t.sidebarModalWidthNarrow, value: 'sm' },
                        { label: t.sidebarModalWidthStandard, value: 'md' },
                        { label: t.sidebarModalWidthWide, value: 'lg' },
                        { label: t.sidebarModalWidthExtraWide, value: 'xl' },
                      ]}
                    />
                  </SettingsRow>
                )}
              </SubmenuSection>
              <SettingsRow icon='text_fields' label={t.textTransform}>
                <Switch
                  checked={textTransform === 'uppercase'}
                  onChange={() =>
                    setTextTransform(textTransform === 'normal' ? 'uppercase' : 'normal')
                  }
                  theme={currentTheme.name.toLowerCase()}
                  activeColor={currentTheme.hex}
                />
              </SettingsRow>

              <div className='border-t border-(--border-divider) my-0.5 opacity-50' />

              {/* --- Typography Section --- */}
              <SubmenuSection
                isRTL={isAR}
                id='typography'
                icon='font_download'
                label={t.typography}
                expandedSubmenu={expandedSubmenu}
                onToggle={toggleSubmenu}
                isMobile={isMobile}
              >
                <div className='space-y-1'>
                  <label className='text-xs font-medium flex items-center gap-1.5 text-(--text-primary)'>
                    <span className='material-symbols-rounded' style={iconFontSizeStyle}>
                      text_fields
                    </span>
                    {t.fontEN}
                  </label>
                  <div className='flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none'>
                    {AVAILABLE_FONTS_EN.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFontFamilyEN(f.value)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs transition-all whitespace-nowrap flex-shrink-0 ${fontFamilyEN === f.value ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-(--border-divider) text-(--text-primary)'}`}
                        style={{ fontFamily: f.value }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className='space-y-1'>
                  <label className='text-xs font-medium flex items-center gap-1.5 text-(--text-primary)'>
                    <span className='material-symbols-rounded' style={iconFontSizeStyle}>
                      translate
                    </span>
                    {t.fontAR}
                  </label>
                  <div className='flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none'>
                    {AVAILABLE_FONTS_AR.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFontFamilyAR(f.value)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs transition-all whitespace-nowrap flex-shrink-0 ${fontFamilyAR === f.value ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-(--border-divider) text-(--text-primary)'}`}
                        style={{ fontFamily: f.value }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                {isAR && (
                  <SettingsRow icon='123' label={t.numeralSystem}>
                    <SegmentedControl
                      value={numeralSystem}
                      onChange={(v) => setNumeralSystem(v as any)}
                      size='xs'
                      shape='pill'
                      options={[
                        { label: t.numeralArabic, value: 'AR' },
                        { label: t.numeralLatin, value: 'EN' },
                      ]}
                    />
                  </SettingsRow>
                )}
                {isAR && (
                  <SettingsRow icon='style' label={t.graphicStyle}>
                    <SegmentedControl
                      value={!graphicStyle ? 'off' : graphicFontVariant}
                      onChange={(val) => {
                        if (val === 'off') {
                          setGraphicStyle(false);
                        } else {
                          setGraphicStyle(true);
                          setGraphicFontVariant(val as 'serif' | 'sans');
                        }
                      }}
                      size='xs'
                      fullWidth
                      shape='pill'
                      options={[
                        { label: 'إيقاف', value: 'off' },
                        { label: 'جرافيكي', value: 'serif', fontFamily: '"HeadingFont"' },
                        { label: 'مودرن', value: 'sans', fontFamily: '"GraphicSansFont"' },
                      ]}
                    />
                  </SettingsRow>
                )}
              </SubmenuSection>

              <div className='border-t border-(--border-divider) my-0.5 opacity-50' />

              {/* --- Workspace & Status Bar --- */}
              {permissionsService.isOrgAdmin() && (
                <>
                  <div className='py-1'>
                    <SettingsRow icon='science' label={t.developerMode}>
                      <Tooltip
                        content={
                          <div className='flex flex-col gap-1 text-xs'>
                            <span className='font-bold mb-1'>
                              {isAR ? 'يفتح خيارات متقدمة:' : 'Unlocks advanced options:'}
                            </span>
                            <ul className='list-disc list-inside opacity-90 space-y-0.5'>
                              <li>
                                {isAR
                                  ? 'مخطط الأبعاد (Blueprint)'
                                  : 'Blueprint mode in Label Studio'}
                              </li>
                              <li>
                                {isAR
                                  ? 'أنماط حواف وزوايا البطاقات'
                                  : 'Card border & corner styles'}
                              </li>
                              <li>{isAR ? 'تخصيص CSS للبطاقات' : 'Custom Card CSS'}</li>
                              <li>{isAR ? 'أشكال أزرار السويتش' : 'Switch button variants'}</li>
                              <li>
                                {isAR
                                  ? 'الوصول للموديلات التجريبية (Test Lab)'
                                  : 'Access to Experimental Modules'}
                              </li>
                              <li>
                                {isAR ? 'إظهار الصفحات قيد التطوير' : 'Show Unimplemented Pages'}
                              </li>
                              <li>
                                {isAR
                                  ? 'تخطي الصلاحيات لصفحات الـ Debug'
                                  : 'Bypass permissions for Debug pages'}
                              </li>
                              <li>
                                {isAR
                                  ? 'نسخ تخطيط الأعمدة في الجداول'
                                  : 'Copy column layout in tables'}
                              </li>
                            </ul>
                          </div>
                        }
                        position='top'
                      >
                        <span className='material-symbols-rounded text-[16px] text-gray-400 dark:text-gray-500 hover:text-primary-500 mr-2 rtl:ml-2 rtl:mr-0'>
                          info
                        </span>
                      </Tooltip>
                      <Switch
                        checked={developerMode || false}
                        onChange={setDeveloperMode}
                        theme={currentTheme.name.toLowerCase()}
                        activeColor={currentTheme.hex}
                      />
                    </SettingsRow>
                  </div>
                  <div className='border-t border-(--border-divider) my-0.5 opacity-50' />
                </>
              )}

              {/* --- POS Settings --- */}
              <SubmenuSection
                isRTL={isAR}
                id='pos'
                icon='point_of_sale'
                label={t.posSettings}
                expandedSubmenu={expandedSubmenu}
                onToggle={toggleSubmenu}
                isMobile={isMobile}
                title={t.posSettings}
              >
                <SettingsRow icon='moped' label={t.defaultDeliveryFee}>
                  <div className='flex items-center gap-2'>
                    <input
                      type='number'
                      value={deliveryFee}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        updateBranch?.(activeBranchId, { deliveryFee: Number(e.target.value) })
                      }
                      className='w-14 h-7 bg-black/5 dark:bg-white/5 border-none rounded-md px-2 text-xs font-bold focus:ring-1 focus:ring-primary-500/50 text-left'
                      dir='ltr'
                    />
                    <span className='text-[10px] font-bold text-(--text-tertiary)'>{t.egp}</span>
                  </div>
                </SettingsRow>
                <div className='flex items-center justify-between transition-colors px-2 py-1'>
                  <div className='flex items-center gap-2'>
                    <Tooltip
                      delay={0}
                      content={
                        <div className='flex flex-col gap-0.5 text-xs whitespace-nowrap'>
                          <span>
                            {language === 'AR' ? 'الهدف اليومي:' : 'Daily Target:'}{' '}
                            <strong>{dailyTarget.toLocaleString()}</strong>
                          </span>
                          <span>
                            {language === 'AR' ? 'أيام الشهر:' : 'Days in month:'}{' '}
                            <strong>{daysInMonth}</strong>
                          </span>
                        </div>
                      }
                    >
                      <span
                        className='material-symbols-rounded text-(--text-secondary)'
                        style={iconFontSizeStyle}
                      >
                        track_changes
                      </span>
                    </Tooltip>
                    <span className='text-xs font-medium text-(--text-primary)'>
                      {language === 'AR' ? 'المستهدف الشهري' : 'Monthly Target'}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <input
                      type='number'
                      value={localTarget}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLocalTarget(val);
                        localTargetRef.current = val;
                        clearTimeout(saveTimerRef.current);
                        saveTimerRef.current = setTimeout(() => {
                          updateBranch?.(activeBranchId, { monthlySalesTarget: val });
                        }, 600);
                      }}
                      onBlur={() => {
                        clearTimeout(saveTimerRef.current);
                        updateBranch?.(activeBranchId, {
                          monthlySalesTarget: localTargetRef.current,
                        });
                      }}
                      className='w-28 h-7 bg-black/5 dark:bg-white/5 border-none rounded-md px-2 text-xs font-bold focus:ring-1 focus:ring-primary-500/50 text-left'
                      dir='ltr'
                    />
                    <span className='text-[10px] font-bold text-(--text-tertiary)'>{t.egp}</span>
                  </div>
                </div>
              </SubmenuSection>

              <div className='border-t border-(--border-divider) my-0.5 opacity-50' />

              {showTicker !== undefined && (
                <div className='space-y-1'>
                  <label className='text-[10px] font-bold uppercase text-(--text-tertiary)'>
                    {t.statusBarSettings}
                  </label>
                  <SettingsRow icon='notifications' label={t.showNotificationBell}>
                    <Switch
                      checked={showNotificationBell ?? true}
                      onChange={setShowNotificationBell}
                      theme={currentTheme.name.toLowerCase()}
                      activeColor={currentTheme.hex}
                    />
                  </SettingsRow>
                  <SettingsRow icon='notification_important' label={t.showNotificationToast}>
                    <Switch
                      checked={showNotificationOverlay ?? true}
                      onChange={setShowNotificationOverlay}
                      theme={currentTheme.name.toLowerCase()}
                      activeColor={currentTheme.hex}
                    />
                  </SettingsRow>
                  <div className='relative' ref={statusSmartPos.ref}>
                    <SettingsRow
                      icon='speed'
                      label={t.quickStatuses}
                      onClick={() => showTicker && toggleSubmenu('status')}
                    >
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={showTicker || false}
                          onChange={setShowTicker}
                          theme={currentTheme.name.toLowerCase()}
                          activeColor={currentTheme.hex}
                        />
                      </div>
                      <span
                        className={`material-symbols-rounded text-lg text-(--text-tertiary) transition-transform duration-200 ${expandedSubmenu === 'status' ? (isMobile ? 'rotate-90' : isAR ? '-rotate-90' : 'rotate-90') : ''}`}
                      >
                        {isAR ? 'chevron_left' : 'chevron_right'}
                      </span>
                    </SettingsRow>
                    <SubmenuWrapper
                      isOpen={expandedSubmenu === 'status' && showTicker}
                      isMobile={isMobile}
                      side={statusSmartPos.position.side}
                      align={statusSmartPos.position.align}
                      isRTL={isAR}
                    >
                      <SettingsRow
                        icon='trending_up'
                        label={t.showSales}
                        className='hover:bg-(--bg-menu-hover) px-2 rounded-lg'
                      >
                        <Switch
                          checked={showTickerSales}
                          onChange={setShowTickerSales}
                          theme={currentTheme.name.toLowerCase()}
                          activeColor={currentTheme.hex}
                        />
                      </SettingsRow>
                      <SettingsRow
                        icon='inventory_2'
                        label={t.showInventory}
                        className='hover:bg-(--bg-menu-hover) px-2 rounded-lg'
                      >
                        <Switch
                          checked={showTickerInventory}
                          onChange={setShowTickerInventory}
                          theme={currentTheme.name.toLowerCase()}
                          activeColor={currentTheme.hex}
                        />
                      </SettingsRow>
                      <SettingsRow
                        icon='group'
                        label={t.showCustomers}
                        className='hover:bg-(--bg-menu-hover) px-2 rounded-lg'
                      >
                        <Switch
                          checked={showTickerCustomers}
                          onChange={setShowTickerCustomers}
                          theme={currentTheme.name.toLowerCase()}
                          activeColor={currentTheme.hex}
                        />
                      </SettingsRow>
                      <SettingsRow
                        icon='star'
                        label={t.showTopSeller}
                        className='hover:bg-(--bg-menu-hover) px-2 rounded-lg'
                      >
                        <Switch
                          checked={showTickerTopSeller}
                          onChange={setShowTickerTopSeller}
                          theme={currentTheme.name.toLowerCase()}
                          activeColor={currentTheme.hex}
                        />
                      </SettingsRow>
                    </SubmenuWrapper>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsMenu;
